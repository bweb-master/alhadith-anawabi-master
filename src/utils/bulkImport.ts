import ExcelJS from 'exceljs';
import {
  GharibEntry,
  MuhallaHadith,
  Narrator,
  NarratorGrade,
  NarratorOrigin,
} from '../types/hadith';
import { normalizeArabic } from './arabic';

// ---------- File Download Helpers ----------

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadExcelWorkbook(
  filename: string,
  wb: ExcelJS.Workbook
): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- CSV Serialization & RFC-4180 Parser ----------

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvWithBom(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
}

export function parseCsvText(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        row.push(field.trim());
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\n') {
        row.push(field.trim());
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  row.push(field.trim());
  if (row.some((c) => c !== '')) {
    rows.push(row);
  }
  return rows;
}

// ---------- ExcelJS Cell Value Extractor ----------

function extractCellString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => part.text || '')
        .join('')
        .trim();
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim();
    }
    if ('result' in value && value.result !== undefined) {
      return extractCellString(value.result as ExcelJS.CellValue);
    }
  }
  return String(value).trim();
}

export async function parseExcelBufferToRows(buffer: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: string[][] = [];
  const colCount = ws.actualColumnCount || ws.columnCount || 15;

  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= colCount; c++) {
      cells.push(extractCellString(row.getCell(c).value));
    }
    if (cells.some((cell) => cell !== '')) {
      rows.push(cells);
    }
  });

  return rows;
}

// ---------- Arabic Narrator Matching & Isnad Auto-Linker ----------

const ISNAD_FILLER_REGEX =
  /\b(حدثنا|حدثني|اخبرنا|اخبرني|انبانا|انباني|ثنا|نا|سمعت|يقول|قال|انه|ان|عن|رضي الله عنه|رضي الله عنهما|رضي الله عنها|رحمه الله|صلي الله عليه وسلم|علي المنبر|من طريقه)\b/g;

function cleanNarratorSegment(segment: string): string {
  return normalizeArabic(segment)
    .replace(ISNAD_FILLER_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface NarratorMatcherIndex {
  narrator: Narrator;
  aliases: { text: string; weight: number }[];
}

function buildNarratorIndex(narrators: Narrator[]): NarratorMatcherIndex[] {
  return narrators.map((n) => {
    const aliasMap = new Map<string, number>();
    const addAlias = (raw: string, weight: number) => {
      const cleaned = cleanNarratorSegment(raw);
      if (cleaned.length < 3) return;
      const existing = aliasMap.get(cleaned) || 0;
      if (weight > existing) aliasMap.set(cleaned, weight);
    };

    const mainName = n.name.replace(/\([^)]*\)/g, ' ').trim();
    addAlias(n.name, 100);
    addAlias(mainName, 96);

    const parens = n.name.match(/\(([^)]+)\)/g) || [];
    for (const p of parens) {
      const inner = p.slice(1, -1).trim();
      if (!inner.includes('صاحب')) {
        addAlias(inner, 88);
      }
    }

    const words = normalizeArabic(mainName).split(' ').filter(Boolean);
    if (words.length >= 3) {
      addAlias(words.slice(0, 3).join(' '), 85);
    }
    if (words.length >= 2 && words[1] === 'بن') {
      addAlias(words.slice(0, 3).join(' '), 84);
    }

    if (words.length >= 2) {
      const last = words[words.length - 1];
      const prev = words[words.length - 2];
      if (prev === 'بن' || prev === 'ابن') {
        addAlias(`${prev} ${last}`, 74);
      } else if (
        last.startsWith('ال') &&
        last.length >= 6 &&
        last !== 'الاندلسي' &&
        last !== 'القرطبي' &&
        last !== 'المدني'
      ) {
        addAlias(last, 72);
      }
      if (
        prev.startsWith('ال') &&
        prev.length >= 6 &&
        prev !== 'الاندلسي' &&
        prev !== 'القرطبي' &&
        prev !== 'المدني' &&
        prev !== 'المصري'
      ) {
        addAlias(prev, 70);
      }
    }

    const normMain = normalizeArabic(mainName);
    if (normMain.includes('نافع')) addAlias('نافع', 75);
    if (normMain.includes('مالك بن انس')) addAlias('مالك', 65);
    if (normMain.includes('ابن حزم')) addAlias('ابن حزم', 88);
    if (normMain.includes('ابن وضاح')) addAlias('ابن وضاح', 88);
    if (normMain.includes('ابن ايمن')) addAlias('ابن ايمن', 88);
    if (normMain.includes('ابن مفرج')) addAlias('ابن مفرج', 88);
    if (normMain.includes('ابن مغيث')) addAlias('ابن مغيث', 88);
    if (normMain.includes('ابن عمر')) addAlias('ابن عمر', 82);
    if (normMain.includes('قاسم بن اصبغ')) addAlias('قاسم بن اصبغ', 90);
    if (normMain.includes('القاسم بن اصبغ')) addAlias('قاسم بن اصبغ', 90);
    if (normMain.includes('عائشه')) addAlias('عائشه', 78);
    if (normMain.includes('بقي بن مخلد')) addAlias('بقي بن مخلد', 92);
    if (normMain.includes('احمد بن خالد')) addAlias('احمد بن خالد', 88);

    if (n.kunya) {
      const normKunya = normalizeArabic(n.kunya);
      if (normKunya === 'ابو هريره') {
        addAlias('ابو هريره', 92);
      }
    }

    const aliases = Array.from(aliasMap.entries())
      .map(([text, weight]) => ({ text, weight }))
      .sort((a, b) => b.text.length - a.text.length);

    return { narrator: n, aliases };
  });
}

function matchSingleSegment(
  segment: string,
  index: NarratorMatcherIndex[]
): Narrator | null {
  const cleaned = cleanNarratorSegment(segment);
  if (!cleaned || cleaned.length < 3) return null;

  const directId = index.find((item) => item.narrator.id === segment.trim());
  if (directId) return directId.narrator;

  let best: { narrator: Narrator; score: number } | null = null;

  for (const entry of index) {
    for (const alias of entry.aliases) {
      if (cleaned === alias.text) {
        const score = alias.weight + 50;
        if (!best || score > best.score) best = { narrator: entry.narrator, score };
      } else if (cleaned.includes(alias.text) && alias.text.length >= 4) {
        const score = alias.weight + Math.min(20, alias.text.length);
        if (!best || score > best.score) best = { narrator: entry.narrator, score };
      } else if (alias.text.includes(cleaned) && cleaned.length >= 5) {
        const score = alias.weight - 5 + Math.min(15, cleaned.length);
        if (!best || score > best.score) best = { narrator: entry.narrator, score };
      }
    }
  }

  return best && best.score >= 65 ? best.narrator : null;
}

export interface AutoMatchIsnadResult {
  chainNarratorIds: string[];
  matchedNames: string[];
  unmatchedSegments: string[];
}

export function autoMatchIsnadChain(
  explicitChainText: string,
  isnadProseText: string,
  narrators: Narrator[]
): AutoMatchIsnadResult {
  const index = buildNarratorIndex(narrators);
  const hasIbnHazm = narrators.some((n) => n.id === 'ibn_hazm');

  const explicitClean = (explicitChainText || '').trim();
  if (explicitClean) {
    const rawParts = explicitClean
      .split(/[|؛;,،←\n]|->/)
      .map((s) => s.trim())
      .filter(Boolean);

    const matched: Narrator[] = [];
    const unmatched: string[] = [];

    for (const part of rawParts) {
      const hit = matchSingleSegment(part, index);
      if (hit) {
        if (!matched.some((m) => m.id === hit.id)) {
          matched.push(hit);
        }
      } else {
        unmatched.push(part);
      }
    }

    if (matched.length >= 2) {
      const first = matched[0];
      const last = matched[matched.length - 1];
      const firstIsLater =
        first.id === 'ibn_hazm' ||
        (first.origin === 'andalusian' && last.origin !== 'andalusian') ||
        (first.deathYearH && last.deathYearH && first.deathYearH > last.deathYearH);
      if (firstIsLater) {
        matched.reverse();
      }
    }

    const ids = matched.map((m) => m.id);
    if (hasIbnHazm && ids.length > 0 && !ids.includes('ibn_hazm')) {
      ids.push('ibn_hazm');
    }

    return {
      chainNarratorIds: ids,
      matchedNames: ids.map(
        (id) => narrators.find((n) => n.id === id)?.name.split('(')[0].trim() || id
      ),
      unmatchedSegments: unmatched,
    };
  }

  const rawProse = (isnadProseText || '').trim();
  if (!rawProse) {
    return { chainNarratorIds: [], matchedNames: [], unmatchedSegments: [] };
  }

  const roughSegments = rawProse
    .split(/(?:حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|ثنا|نا|سمعت|عن|،|؛|\.\.\.)/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  const matchedInProseOrder: Narrator[] = [];
  const unmatchedSegments: string[] = [];

  for (const seg of roughSegments) {
    const cleaned = cleanNarratorSegment(seg);
    if (!cleaned || cleaned.length < 3) continue;
    if (normalizeArabic(seg).includes('رسول الله') && matchedInProseOrder.length > 0) {
      const beforeProphet = seg.split(/رسول الله|النبي/)[0]?.trim();
      if (beforeProphet) {
        const hitBefore = matchSingleSegment(beforeProphet, index);
        if (hitBefore && !matchedInProseOrder.some((m) => m.id === hitBefore.id)) {
          matchedInProseOrder.push(hitBefore);
        }
      }
      break;
    }

    const hit = matchSingleSegment(seg, index);
    if (hit) {
      if (!matchedInProseOrder.some((m) => m.id === hit.id)) {
        matchedInProseOrder.push(hit);
      }
    } else if (cleaned.split(' ').length <= 7 && !cleaned.includes('يقول')) {
      unmatchedSegments.push(seg.replace(/^[:\s]+|[:\s]+$/g, ''));
    }
  }

  const ordered = [...matchedInProseOrder].reverse();
  const ids = ordered.map((n) => n.id);
  if (hasIbnHazm && ids.length > 0 && !ids.includes('ibn_hazm')) {
    ids.push('ibn_hazm');
  }

  return {
    chainNarratorIds: ids,
    matchedNames: ids.map(
      (id) => narrators.find((n) => n.id === id)?.name.split('(')[0].trim() || id
    ),
    unmatchedSegments: unmatchedSegments.filter(
      (s) => s.length >= 3 && s.length <= 45
    ),
  };
}

// ---------- Styled Excel (.xlsx) Template Generators ----------

const TABAQAH_ARABIC_LABEL: Record<NarratorOrigin, string> = {
  andalusian: 'راو',
  classical: 'تابعي التابعين',
  companion: 'صحابي',
  compiler: 'مصنف',
};

function getTabaqahLabelForExport(n: Narrator): string {
  const t = (n.tabaqah || '').trim();
  if (t.includes('صحاب')) return 'صحابي';
  if (t.includes('تابعي التابعين')) return 'تابعي التابعين';
  if (t.includes('تابع')) return 'تابعي';
  if (t.includes('مصنف')) return 'مصنف';
  return TABAQAH_ARABIC_LABEL[n.origin] || 'راو';
}

function getNarratorRulingWithSource(n: Narrator): string {
  const firstRef = n.jarhTaadil?.[0];
  if (firstRef && (firstRef.scholar || firstRef.verdict)) {
    const details = [firstRef.verdict, firstRef.scholar].filter(Boolean).join(' — ');
    return n.grade && !details.includes(n.grade) ? `${n.grade}: ${details}` : details;
  }
  return n.grade;
}

function styleHeaderRow(
  row: ExcelJS.Row,
  bgHex: string,
  fontSize = 12
): void {
  row.height = 42;
  row.eachCell((cell) => {
    cell.font = {
      name: 'Traditional Arabic',
      size: fontSize,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${bgHex}` },
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
      readingOrder: 'rtl',
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD6CEBE' } },
      bottom: { style: 'medium', color: { argb: 'FF854D0E' } },
      left: { style: 'thin', color: { argb: 'FFD6CEBE' } },
      right: { style: 'thin', color: { argb: 'FFD6CEBE' } },
    };
  });
}

function styleDataRow(
  row: ExcelJS.Row,
  centeredCols: Set<number>,
  rowIndex: number,
  height: number
): void {
  row.height = height;
  const fillHex = rowIndex % 2 === 0 ? 'FFFBF9F5' : 'FFFFFFFF';
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const isCentered = centeredCols.has(colNumber);
    cell.font = {
      name: 'Arial',
      size: 11,
      color: { argb: 'FF1C1917' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillHex },
    };
    cell.alignment = {
      horizontal: isCentered ? 'center' : 'right',
      vertical: 'top',
      wrapText: true,
      readingOrder: 'rtl',
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE6E0D4' } },
      bottom: { style: 'thin', color: { argb: 'FFE6E0D4' } },
      left: { style: 'thin', color: { argb: 'FFE6E0D4' } },
      right: { style: 'thin', color: { argb: 'FFE6E0D4' } },
    };
  });
}

interface CoreAndalusianRow {
  id: string;
  name: string;
  kunya: string;
  tabaqah: string;
  ruling: string;
  deathYearH: number;
  region: string;
  notes: string;
}

const CORE_ANDALUSIAN_DEFAULTS: CoreAndalusianRow[] = [
  {
    id: 'andalus_baqi_ibn_makhlad',
    name: 'بقي بن مخلد بن يزيد القرطبي الأندلسي',
    kunya: 'أبو عبد الرحمن',
    tabaqah: 'راو',
    ruling:
      'ثقة حجة، الإمام القدوة الحافظ المجتهد شيخ الإسلام بالأندلس — الذهبي، سير أعلام النبلاء ج 13 ص 285؛ ابن الفرضي، تاريخ علماء الأندلس ج 1 ص 91',
    deathYearH: 276,
    region: 'قرطبة - الأندلس',
    notes: 'صاحب المسند الكبير المرتب على الصحابة وأبواب الفقه، وأحد مؤسسي المدرسة الحديثية الأندلسية.',
  },
  {
    id: 'andalus_ahmad_ibn_khalid',
    name: 'أحمد بن خالد بن يزيد القرطبي (ابن الجباب)',
    kunya: 'أبو عمر',
    tabaqah: 'راو',
    ruling:
      'ثقة حجة مأمون، إمام في الحديث والفقه بصير بالرجال — ابن الفرضي، تاريخ علماء الأندلس ج 1 ص 31؛ الذهبي، السير ج 15 ص 232',
    deathYearH: 322,
    region: 'قرطبة - الأندلس',
    notes: 'جمع بين الرواية الحديثية والفقه، وأخذ عن بقي بن مخلد ومحمد بن وضاح، وروى عنه ابن مفرج.',
  },
  {
    id: 'andalus_ibn_waddah',
    name: 'محمد بن وضاح بن بزيع القرطبي',
    kunya: 'أبو عبد الله',
    tabaqah: 'راو',
    ruling:
      'ثقة حجة، إمام أهل الأندلس في الحديث وبصير بعلله — ابن الفرضي، تاريخ علماء الأندلس ج 2 ص 13؛ الذهبي، السير ج 13 ص 445',
    deathYearH: 287,
    region: 'قرطبة - الأندلس',
    notes: 'ممن أدخلوا مصنف ابن أبي شيبة ومسندات المشرق إلى الأندلس.',
  },
  {
    id: 'andalus_ibn_ayman',
    name: 'محمد بن عبد الملك بن أيمن القرطبي',
    kunya: 'أبو عبد الله',
    tabaqah: 'راو',
    ruling:
      'ثقة حجة نبيل مأمون، حافظ للحديث عالم بعلله — ابن الفرضي، تاريخ علماء الأندلس ج 2 ص 44؛ الذهبي، السير ج 15 ص 329',
    deathYearH: 330,
    region: 'قرطبة - الأندلس',
    notes: 'رحل إلى المشرق ولقي أبا داود السجستاني وروى سننه وأدخلها إلى الأندلس، وله كتاب السنن.',
  },
  {
    id: 'andalus_qasim_ibn_asbagh',
    name: 'قاسم بن أصبغ بن محمد البياني القرطبي',
    kunya: 'أبو محمد',
    tabaqah: 'راو',
    ruling:
      'ثقة حجة مأمون، مسند الأندلس وعالمها — الذهبي، سير أعلام النبلاء ج 15 ص 472؛ ابن الفرضي، تاريخ علماء الأندلس ج 1 ص 300',
    deathYearH: 340,
    region: 'بيانة / قرطبة - الأندلس',
    notes: 'صاحب المصنف في السنن والمنتقى، وهو حلقة الوصل الكبرى بين بقي بن مخلد وابن وضاح وبين شيوخ ابن حزم.',
  },
];

function getFiveCoreAndalusians(narrators?: Narrator[]): CoreAndalusianRow[] {
  const list = narrators || [];
  return CORE_ANDALUSIAN_DEFAULTS.map((def) => {
    const normShort = normalizeArabic(def.name.split('(')[0].split(' ').slice(0, 3).join(' '));
    const live =
      list.find((n) => n.id === def.id) ||
      list.find((n) => normalizeArabic(n.name).includes(normShort));
    if (!live) return def;
    const liveRuling = getNarratorRulingWithSource(live);
    return {
      id: live.id,
      name: live.name,
      kunya: live.kunya || def.kunya,
      tabaqah: getTabaqahLabelForExport(live),
      ruling:
        live.jarhTaadil && live.jarhTaadil.length > 0 ? liveRuling : def.ruling,
      deathYearH: live.deathYearH || def.deathYearH,
      region: live.region || def.region,
      notes: live.notes || def.notes,
    };
  });
}

export async function generateMuhallaExcelWorkbook(
  narrators: Narrator[]
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'مرويات ابن حزم من طريق الأندلسيين';
  wb.created = new Date();

  const ws = wb.addWorksheet('تفريغ أحاديث المحلى', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'نص الحديث بالسند والمتن', key: 'fullText', width: 64 },
    { header: 'المجلد', key: 'volume', width: 10 },
    { header: 'الصفحة', key: 'page', width: 11 },
    { header: 'الكتاب', key: 'kitab', width: 24 },
    { header: 'رقم المسألة', key: 'issueNumber', width: 13 },
    { header: 'متن الحديث', key: 'matn', width: 58 },
    { header: 'سند الحديث', key: 'isnad', width: 58 },
    {
      header: 'الحكم على الحديث وتوثيقه (صاحب الحكم والكتاب والصفحة)',
      key: 'hukm',
      width: 48,
    },
    {
      header: 'سلسلة الرواة (من الصحابي إلى ابن حزم مفصولة بـ ,)',
      key: 'chain',
      width: 50,
    },
    { header: 'فقه الحديث', key: 'fiqh', width: 48 },
    { header: 'غريب الحديث', key: 'gharib', width: 38 },
  ];

  styleHeaderRow(ws.getRow(1), '14532D', 12);

  const sampleRows = [
    [
      'حدثنا أحمد بن محمد الطلمنكي، حدثنا ابن مفرج، حدثنا قاسم بن أصبغ، عن بقي بن مخلد... عن يحيى بن سعيد الأنصاري، عن محمد بن إبراهيم التيمي، عن علقمة بن وقاص، عن عمر بن الخطاب رضي الله عنه قال: سمعت رسول الله ﷺ يقول: «إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى...».',
      1,
      '112',
      'كتاب الطهارة',
      65,
      'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ.',
      'حدثنا أحمد بن محمد الطلمنكي، حدثنا ابن مفرج، حدثنا قاسم بن أصبغ، حدثنا بقي بن مخلد... عن يحيى بن سعيد الأنصاري، عن محمد بن إبراهيم التيمي، عن علقمة بن وقاص الليثي، عن عمر بن الخطاب رضي الله عنه.',
      'صحيح متصل الإسناد بنقل العدول — ابن حزم، المحلّى بالآثار، ج 1 ص 112 (وأخرجه البخاري رقم 1 ومسلم رقم 1907).',
      'عمر بن الخطاب، علقمة بن وقاص، محمد بن إبراهيم التيمي، يحيى بن سعيد الأنصاري، بقي بن مخلد، قاسم بن أصبغ، ابن مفرج، الطلمنكي، ابن حزم',
      'استدل ابن حزم بهذا الحديث على وجوب النية في كل عبادة من وضوء وغسل وتيمم وصلاة.',
      'النيات: جمع نية وهي القصد وعزم القلب | امرئ: كل شخص مكلف',
    ],
    [
      'حدثنا أحمد بن محمد الطلمنكي، حدثنا ابن مفرج، حدثنا قاسم بن أصبغ... عن مالك بن أنس، عن نافع، عن عبد الله بن عمر رضي الله عنهما أن رسول الله ﷺ قال: «صلاة الجماعة تفضل صلاة الفذ بسبع وعشرين درجة».',
      3,
      '45',
      'كتاب الصلاة',
      505,
      'صَلَاةُ الْجَمَاعَةِ تَفْضُلُ صَلَاةَ الْفَذِّ بِسَبْعٍ وَعِشْرِينَ دَرَجَةً.',
      'حدثنا أحمد بن محمد الطلمنكي، حدثنا ابن مفرج، حدثنا قاسم بن أصبغ... عن مالك بن أنس، عن نافع، عن عبد الله بن عمر رضي الله عنهما.',
      'صحيح متصل الإسناد إلى مالك عن نافع عن ابن عمر — ابن حزم، المحلّى بالآثار، ج 3 ص 45 (وأخرجه البخاري رقم 645).',
      'عبد الله بن عمر، نافع، مالك بن أنس، قاسم بن أصبغ، ابن مفرج، الطلمنكي، ابن حزم',
      'بيان فضل صلاة الجماعة ومناقشة مذهب ابن حزم في وجوبها على الأعيان عند القدرة.',
      'الفذ: المنفرد الذي يصلي وحده دون جماعة',
    ],
  ];

  const centeredCols = new Set([2, 3, 5]);
  sampleRows.forEach((values, i) => {
    const r = ws.addRow(values);
    styleDataRow(r, centeredCols, i, 108);
  });

  // Pre-formatted empty workspace rows (1000 rows) for easy data entry
  for (let i = 0; i < 1000; i++) {
    const empty = ws.addRow(new Array(11).fill(''));
    styleDataRow(empty, centeredCols, i + 2, 68);
  }

  // Second sheet: Core 5 Andalusian Narrators Reference
  const refSheet = wb.addWorksheet('مرجع أسماء الرواة', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });
  refSheet.columns = [
    { header: 'الاسم الكامل', key: 'name', width: 42 },
    { header: 'الكنية', key: 'kunya', width: 18 },
    { header: 'الطبقة', key: 'tabaqah', width: 18 },
    { header: 'الحكم على الراوي', key: 'ruling', width: 52 },
    { header: 'سنة الوفاة', key: 'death', width: 14 },
  ];
  styleHeaderRow(refSheet.getRow(1), '854D0E', 11);
  const refCentered = new Set([3, 5]);
  const coreFive = getFiveCoreAndalusians(narrators);
  coreFive.forEach((n, idx) => {
    const r = refSheet.addRow([
      n.name,
      n.kunya,
      n.tabaqah,
      n.ruling,
      n.deathYearH,
    ]);
    styleDataRow(r, refCentered, idx, 42);
  });

  return wb;
}

export async function generateNarratorsExcelWorkbook(
  narrators?: Narrator[]
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'مرويات ابن حزم من طريق الأندلسيين';
  wb.created = new Date();

  const ws = wb.addWorksheet('بطاقات الرواة', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'الاسم الكامل', key: 'name', width: 40 },
    { header: 'الكنية', key: 'kunya', width: 18 },
    { header: 'الطبقة', key: 'tabaqah', width: 20 },
    { header: 'الحكم على الراوي (الحكم ومصدره)', key: 'ruling', width: 48 },
    { header: 'سنة الوفاة هـ', key: 'death', width: 14 },
    { header: 'البلد / الإقليم', key: 'region', width: 24 },
    { header: 'ملاحظات علمية', key: 'notes', width: 44 },
  ];

  styleHeaderRow(ws.getRow(1), '854D0E', 12);

  const coreFive = getFiveCoreAndalusians(narrators);
  const centeredCols = new Set([3, 5]);
  coreFive.forEach((n, i) => {
    const r = ws.addRow([
      n.name,
      n.kunya,
      n.tabaqah,
      n.ruling,
      n.deathYearH,
      n.region,
      n.notes,
    ]);
    styleDataRow(r, centeredCols, i, 58);
  });

  for (let i = 0; i < 200; i++) {
    const empty = ws.addRow(new Array(7).fill(''));
    styleDataRow(empty, centeredCols, coreFive.length + i, 48);
  }

  // Dropdown validation strictly for الطبقة (Col C) across core 5 + 200 blank rows; NO dropdown on الحكم على الراوي (Col D)
  const totalNarratorRows = coreFive.length + 200 + 1;
  for (let r = 2; r <= totalNarratorRows; r++) {
    ws.getCell(`C${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"صحابي,تابعي,تابعي التابعين,راو,مصنف"'],
    };
  }

  return wb;
}

export async function generateNarratorsReferenceExcelWorkbook(
  narrators: Narrator[]
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'مرويات ابن حزم من طريق الأندلسيين';
  wb.created = new Date();

  const ws = wb.addWorksheet('مرجع الرواة والأسماء', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'الاسم الكامل', key: 'name', width: 42 },
    { header: 'الكنية', key: 'kunya', width: 18 },
    { header: 'الطبقة', key: 'tabaqah', width: 20 },
    { header: 'الحكم على الراوي', key: 'ruling', width: 52 },
    { header: 'سنة الوفاة', key: 'death', width: 14 },
  ];

  styleHeaderRow(ws.getRow(1), '14532D', 12);

  const centeredCols = new Set([3, 5]);
  const coreFive = getFiveCoreAndalusians(narrators);
  coreFive.forEach((n, idx) => {
    const r = ws.addRow([
      n.name,
      n.kunya,
      n.tabaqah,
      n.ruling,
      n.deathYearH,
    ]);
    styleDataRow(r, centeredCols, idx, 46);
  });

  // Pre-formatted empty workspace rows (200 rows) for direct entry
  for (let i = 0; i < 200; i++) {
    const empty = ws.addRow(new Array(5).fill(''));
    styleDataRow(empty, centeredCols, coreFive.length + i, 44);
  }

  const totalRows = coreFive.length + 200 + 1;
  for (let r = 2; r <= totalRows; r++) {
    ws.getCell(`C${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"صحابي,تابعي,تابعي التابعين,راو,مصنف"'],
    };
  }

  return wb;
}

// ---------- JSON Template Generators ----------

export function generateMuhallaJsonTemplate(): object[] {
  return [
    {
      volume: 1,
      page: '112',
      kitab: 'كتاب الطهارة',
      issueNumber: 65,
      fullHadithText:
        'حدثنا الطلمنكي، حدثنا ابن مفرج، حدثنا قاسم بن أصبغ... عن عمر بن الخطاب رضي الله عنه: «إنما الأعمال بالنيات».',
      matnWithTashkeel: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى.',
      ibnHazmIsnadText:
        'حدثنا الطلمنكي، حدثنا ابن مفرج، حدثنا قاسم بن أصبغ... عن يحيى بن سعيد، عن محمد بن إبراهيم التيمي، عن علقمة بن وقاص، عن عمر بن الخطاب.',
      ibnHazmHukm:
        'صحيح متصل الإسناد — ابن حزم، المحلّى بالآثار، ج 1 ص 112 (وأخرجه البخاري رقم 1 ومسلم رقم 1907).',
      chainNames: [
        'عمر بن الخطاب',
        'علقمة بن وقاص',
        'محمد بن إبراهيم التيمي',
        'يحيى بن سعيد الأنصاري',
        'قاسم بن أصبغ',
        'ابن مفرج',
        'الطلمنكي',
        'ابن حزم',
      ],
      fiqhAnalysis: 'استدل به ابن حزم على وجوب النية في الوضوء والغسل.',
      gharib: 'النيات: جمع نية وهي القصد وعزم القلب',
    },
  ];
}

export function generateNarratorsJsonTemplate(): object[] {
  return [
    {
      name: 'خالد بن سعد القرطبي',
      kunya: 'أبو القاسم',
      tabaqah: 'راو',
      ruling: 'ثقة حجة حافظ — ابن الفرضي، تاريخ علماء الأندلس ج 1 ص 134',
      deathYearH: 352,
      region: 'قرطبة - الأندلس',
      notes: 'من كبار محدثي قرطبة في القرن الرابع.',
    },
  ];
}

// ---------- Bulk Parsing Helpers (Excel .xlsx, CSV, JSON) ----------

export interface ParsedHadithPreview {
  hadith: MuhallaHadith;
  matchedNames: string[];
  unmatchedSegments: string[];
  isExistingUpdate: boolean;
}

const VALID_ORIGINS = new Set<NarratorOrigin>([
  'andalusian',
  'classical',
  'companion',
  'compiler',
]);

const VALID_GRADES = new Set<NarratorGrade>([
  'ثقة حجة',
  'ثقة',
  'صدوق',
  'مختلف فيه',
  'صحابي',
  'إمام مصنف',
]);

function inferOriginFromTabaqahAndRegion(rawTabaqah: string, region: string): NarratorOrigin {
  const v = (rawTabaqah || '').trim().toLowerCase();
  const r = (region || '').trim();
  if (VALID_ORIGINS.has(v as NarratorOrigin)) return v as NarratorOrigin;
  if (v.includes('صحاب')) return 'companion';
  if (v.includes('مصنف')) return 'compiler';
  if (v.includes('أندلس') || v.includes('اندلس')) return 'andalusian';
  if (v === 'راو' || v === 'راوٍ') {
    return r.includes('أندلس') || r.includes('قرطب') || r.includes('إشبيل') || r.includes('طليطل')
      ? 'andalusian'
      : 'classical';
  }
  if (v.includes('تابع')) return 'classical';
  if (r.includes('أندلس') || r.includes('قرطب')) return 'andalusian';
  return 'andalusian';
}

function normalizeGrade(raw: string): NarratorGrade {
  const v = (raw || '').trim();
  if (VALID_GRADES.has(v as NarratorGrade)) return v as NarratorGrade;
  if (v.includes('حجة')) return 'ثقة حجة';
  if (v.includes('صدوق')) return 'صدوق';
  if (v.includes('مختلف') || v.includes('ضعيف')) return 'مختلف فيه';
  if (v.includes('صحاب')) return 'صحابي';
  if (v.includes('مصنف')) return 'إمام مصنف';
  return 'ثقة';
}

function parseNarratorRulingEntry(
  rawRuling: string
): { scholar: string; verdict: string }[] {
  const clean = (rawRuling || '').trim();
  if (!clean) return [];
  const parts = clean.split(/[—\-|]/);
  if (parts.length >= 2) {
    return [
      {
        verdict: parts[0].trim(),
        scholar: parts.slice(1).join(' — ').trim(),
      },
    ];
  }
  return [{ scholar: 'توثيق الحكم على الراوي', verdict: clean }];
}

function slugifyNarratorId(name: string, idx: number): string {
  const hash = Array.from(normalizeArabic(name)).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0,
    7
  );
  return `narr_${hash.toString(36)}_${idx}`;
}

function findHeaderCol(headers: string[], candidates: string[]): number {
  const normHeaders = headers.map((h) => normalizeArabic(h));
  for (const cand of candidates) {
    const normCand = normalizeArabic(cand);
    const exact = normHeaders.findIndex((h) => h === normCand);
    if (exact !== -1) return exact;
  }
  for (const cand of candidates) {
    const normCand = normalizeArabic(cand);
    const partial = normHeaders.findIndex((h) => h.includes(normCand));
    if (partial !== -1) return partial;
  }
  return -1;
}

function parseGharibString(raw: string): GharibEntry[] {
  const clean = (raw || '').trim();
  if (!clean) return [];
  return clean
    .split(/[|؛\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((entry) => {
      const sepIdx = entry.search(/[:\-–]/);
      if (sepIdx === -1) {
        return { word: entry, meaning: entry, source: 'غريب الحديث' };
      }
      return {
        word: entry.slice(0, sepIdx).trim(),
        meaning: entry.slice(sepIdx + 1).trim(),
        source: 'غريب الحديث',
      };
    })
    .filter((g) => g.word && g.meaning);
}

function deriveConciseTitle(
  explicitTitle: string,
  matn: string,
  fullText: string,
  kitab: string,
  issueNum: number
): string {
  if (explicitTitle.trim()) return explicitTitle.trim();
  const base = (matn || fullText || '').replace(/[«»]/g, '').trim();
  if (!base) return `مسألة ${issueNum} (${kitab})`;
  if (base.length <= 72) return `مسألة ${issueNum}: ${base}`;
  const cut = base.slice(0, 72);
  const lastSpace = cut.lastIndexOf(' ');
  const snippet = lastSpace > 30 ? cut.slice(0, lastSpace) : cut;
  return `مسألة ${issueNum}: ${snippet}...`;
}

export async function parseNarratorsFromFile(
  file: File,
  existingNarrators: Narrator[]
): Promise<Narrator[]> {
  const existingByName = new Map<string, Narrator>();
  const existingById = new Map<string, Narrator>();
  existingNarrators.forEach((n) => {
    existingById.set(n.id, n);
    existingByName.set(normalizeArabic(n.name.replace(/\([^)]*\)/g, '')), n);
  });

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.json')) {
    const content = await file.text();
    const raw = JSON.parse(content);
    const list: Record<string, unknown>[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.narrators)
        ? raw.narrators
        : [];
    return list
      .map((item, idx): Narrator | null => {
        const name = String(item.name || item['الاسم الكامل'] || item['الاسم'] || '').trim();
        if (!name) return null;
        const rawId = String(item.id || item['معرف الراوي'] || '').trim();
        const normName = normalizeArabic(name.replace(/\([^)]*\)/g, ''));
        const existing = (rawId && existingById.get(rawId)) || existingByName.get(normName);
        const id = existing?.id || rawId || slugifyNarratorId(name, idx);

        const teachersRaw = item.teachers ?? item['الشيوخ'];
        const studentsRaw = item.students ?? item['التلاميذ'];
        const teachers = Array.isArray(teachersRaw)
          ? teachersRaw.map((x) => String(x).trim()).filter(Boolean)
          : String(teachersRaw || '')
              .split(/[|؛,]/)
              .map((s) => s.trim())
              .filter(Boolean);
        const students = Array.isArray(studentsRaw)
          ? studentsRaw.map((x) => String(x).trim()).filter(Boolean)
          : String(studentsRaw || '')
              .split(/[|؛,]/)
              .map((s) => s.trim())
              .filter(Boolean);

        const birth = Number(item.birthYearH ?? item['سنة الميلاد هـ']);
        const death = Number(item.deathYearH ?? item['سنة الوفاة هـ']);
        const regionStr = String(
          item.region || item['البلد / الإقليم'] || item['البلد'] || 'قرطبة - الأندلس'
        ).trim();
        const tabaqahStr = String(
          item.tabaqah || item['الطبقة'] || item.origin || item['التصنيف'] || 'راو'
        ).trim();
        const rawRuling = String(
          item.ruling || item['الحكم على الراوي'] || item.grade || item['الرتبة'] || ''
        ).trim();
        const parsedJarh = parseNarratorRulingEntry(rawRuling);

        return {
          id,
          name,
          kunya: String(item.kunya || item['الكنية'] || '').trim(),
          origin: inferOriginFromTabaqahAndRegion(
            String(item.origin || tabaqahStr),
            regionStr
          ),
          grade: normalizeGrade(rawRuling || String(item.grade || 'ثقة')),
          region: regionStr,
          tabaqah: tabaqahStr,
          birthYearH: Number.isFinite(birth) && birth > 0 ? birth : undefined,
          deathYearH: Number.isFinite(death) && death > 0 ? death : undefined,
          ibnHazmVerdict: String(
            item.ibnHazmVerdict || item['موقف ابن حزم'] || existing?.ibnHazmVerdict || ''
          ).trim(),
          teachers,
          students,
          jarhTaadil: parsedJarh.length > 0 ? parsedJarh : existing?.jarhTaadil || [],
          notes: String(item.notes || item['ملاحظات علمية'] || '').trim(),
        };
      })
      .filter((n): n is Narrator => Boolean(n));
  }

  const rows = lowerName.endsWith('.xlsx')
    ? await parseExcelBufferToRows(await file.arrayBuffer())
    : parseCsvText(await file.text());

  if (rows.length < 2) return [];
  const headers = rows[0];
  const colId = findHeaderCol(headers, ['معرف الراوي', 'id']);
  const colName = findHeaderCol(headers, ['الاسم الكامل', 'الاسم', 'name']);
  const colKunya = findHeaderCol(headers, ['الكنية', 'kunya']);
  const colTabaqah = findHeaderCol(headers, ['الطبقة', 'التصنيف', 'tabaqah', 'origin']);
  const colRuling = findHeaderCol(headers, [
    'الحكم على الراوي',
    'الحكم ومصدره',
    'الرتبة',
    'grade',
    'ruling',
  ]);
  const colRegion = findHeaderCol(headers, ['البلد', 'الاقليم', 'region']);
  const colDeath = findHeaderCol(headers, ['الوفاة', 'death']);
  const colNotes = findHeaderCol(headers, ['ملاحظات', 'notes']);

  if (colName === -1) {
    throw new Error('لم يتم العثور على عمود "الاسم الكامل" في الملف.');
  }

  const parsed: Narrator[] = [];
  rows.slice(1).forEach((r, idx) => {
    const name = (r[colName] || '').trim();
    if (!name) return;

    const rawId = colId !== -1 ? (r[colId] || '').trim() : '';
    const normName = normalizeArabic(name.replace(/\([^)]*\)/g, ''));
    const existing = (rawId && existingById.get(rawId)) || existingByName.get(normName);
    const id = existing?.id || rawId || slugifyNarratorId(name, idx);

    const deathNum = colDeath !== -1 ? Number(r[colDeath]) : NaN;
    const region =
      colRegion !== -1 && r[colRegion] ? r[colRegion].trim() : 'قرطبة - الأندلس';
    const rawTabaqah = colTabaqah !== -1 ? (r[colTabaqah] || '').trim() : 'راو';
    const origin = inferOriginFromTabaqahAndRegion(rawTabaqah, region);
    const rawRuling = colRuling !== -1 ? (r[colRuling] || '').trim() : '';
    const parsedJarh = parseNarratorRulingEntry(rawRuling);

    parsed.push({
      id,
      name,
      kunya: colKunya !== -1 ? (r[colKunya] || '').trim() : '',
      origin,
      grade: normalizeGrade(rawRuling || 'ثقة'),
      region,
      tabaqah: rawTabaqah || 'راو',
      birthYearH: existing?.birthYearH,
      deathYearH: Number.isFinite(deathNum) && deathNum > 0 ? deathNum : undefined,
      ibnHazmVerdict: existing?.ibnHazmVerdict || '',
      teachers: existing?.teachers || [],
      students: existing?.students || [],
      jarhTaadil: parsedJarh.length > 0 ? parsedJarh : existing?.jarhTaadil || [],
      notes: colNotes !== -1 ? (r[colNotes] || '').trim() : '',
    });
  });

  return parsed;
}

export async function parseHadithsFromFile(
  file: File,
  existingHadiths: MuhallaHadith[],
  narrators: Narrator[]
): Promise<ParsedHadithPreview[]> {
  const existingById = new Map<string, MuhallaHadith>();
  const existingByKey = new Map<string, MuhallaHadith>();
  existingHadiths.forEach((h) => {
    existingById.set(h.id, h);
    existingByKey.set(`${h.volume}:${h.issueNumber}`, h);
  });

  const buildPreview = (
    raw: {
      id?: string;
      volume: number;
      page?: string;
      kitab: string;
      issueNumber: number;
      explicitTitle?: string;
      fullText?: string;
      matnWithTashkeel: string;
      ibnHazmIsnadText: string;
      ibnHazmHukm: string;
      explicitChainText: string;
      fiqhAnalysis: string;
      gharibText?: string;
      otherMadhahibNotes?: string;
    },
    idx: number
  ): ParsedHadithPreview => {
    const existing =
      (raw.id && existingById.get(raw.id)) ||
      existingByKey.get(`${raw.volume}:${raw.issueNumber}`);

    const id =
      existing?.id ||
      raw.id ||
      `muhalla_v${raw.volume}_i${raw.issueNumber}_${Date.now().toString(36)}_${idx}`;

    const effectiveMatn = (raw.matnWithTashkeel || raw.fullText || '').trim();
    const effectiveIsnad = (raw.ibnHazmIsnadText || raw.fullText || '').trim();

    const auto = autoMatchIsnadChain(
      raw.explicitChainText,
      effectiveIsnad,
      narrators
    );

    const primaryChain =
      auto.chainNarratorIds.length > 0
        ? auto.chainNarratorIds
        : existing?.paths?.[0]?.chainNarratorIds || ['ibn_hazm'];

    const paths = existing?.paths?.length
      ? [
          {
            ...existing.paths[0],
            chainNarratorIds: primaryChain,
          },
          ...existing.paths.slice(1),
        ]
      : [
          {
            id: `path_${id}`,
            sourceLabel: 'طريق ابن حزم الأندلسي في المحلى',
            sourceType: 'muhalla' as const,
            chainNarratorIds: primaryChain,
          },
        ];

    const parsedGharib = parseGharibString(raw.gharibText || '');
    const issueTitle = deriveConciseTitle(
      raw.explicitTitle || '',
      effectiveMatn,
      raw.fullText || '',
      raw.kitab || 'كتاب الطهارة',
      Number(raw.issueNumber || 1)
    );

    const hadith: MuhallaHadith = {
      id,
      volume: Number(raw.volume || 1),
      page: (raw.page || '').trim(),
      issueNumber: Number(raw.issueNumber || 1),
      kitab: raw.kitab || 'كتاب الطهارة',
      issueTitle,
      matnWithTashkeel: effectiveMatn || issueTitle,
      ibnHazmIsnadText: raw.ibnHazmIsnadText || raw.fullText || '',
      ibnHazmHukm: raw.ibnHazmHukm || 'صحيح متصل الإسناد',
      paths,
      takhrijLinks: existing?.takhrijLinks || [],
      gharib: parsedGharib.length > 0 ? parsedGharib : existing?.gharib || [],
      fiqhAnalysis: raw.fiqhAnalysis || '',
      otherMadhahibNotes: raw.otherMadhahibNotes || existing?.otherMadhahibNotes || '',
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    return {
      hadith,
      matchedNames: auto.matchedNames,
      unmatchedSegments: auto.unmatchedSegments,
      isExistingUpdate: Boolean(existing),
    };
  };

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.json')) {
    const content = await file.text();
    const raw = JSON.parse(content);
    const list: Record<string, unknown>[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.hadiths)
        ? raw.hadiths
        : [];
    const results: ParsedHadithPreview[] = [];
    list.forEach((item, idx) => {
      const fullText = String(
        item.fullHadithText || item['نص الحديث بالسند والمتن'] || ''
      ).trim();
      const matn = String(item.matnWithTashkeel || item['متن الحديث'] || '').trim();
      const title = String(item.issueTitle || item['عنوان المسألة'] || '').trim();
      if (!matn && !fullText && !title) return;

      const chainRaw = item.chainNames ?? item['سلسلة الرواة'];
      const explicitChainText = Array.isArray(chainRaw)
        ? chainRaw.map((x) => String(x).trim()).filter(Boolean).join(' , ')
        : String(chainRaw || '');

      results.push(
        buildPreview(
          {
            id: item.id ? String(item.id) : undefined,
            volume: Number(item.volume ?? item['المجلد'] ?? 1) || 1,
            page: String(item.page ?? item['الصفحة'] ?? '').trim(),
            kitab: String(item.kitab || item['الكتاب'] || 'كتاب الطهارة').trim(),
            issueNumber: Number(item.issueNumber ?? item['رقم المسألة'] ?? idx + 1) || 1,
            explicitTitle: title,
            fullText,
            matnWithTashkeel: matn,
            ibnHazmIsnadText: String(
              item.ibnHazmIsnadText || item['سند الحديث'] || item['نص السند'] || ''
            ).trim(),
            ibnHazmHukm: String(
              item.ibnHazmHukm || item['الحكم على الحديث'] || item['حكم ابن حزم'] || ''
            ).trim(),
            explicitChainText,
            fiqhAnalysis: String(item.fiqhAnalysis || item['فقه الحديث'] || '').trim(),
            gharibText: String(item['غريب الحديث'] || ''),
            otherMadhahibNotes: String(
              item.otherMadhahibNotes || item['مقارنة المذاهب'] || ''
            ).trim(),
          },
          idx
        )
      );
    });
    return results;
  }

  const rows = lowerName.endsWith('.xlsx')
    ? await parseExcelBufferToRows(await file.arrayBuffer())
    : parseCsvText(await file.text());

  if (rows.length < 2) return [];
  const headers = rows[0];
  const colVol = findHeaderCol(headers, ['المجلد', 'الجزء', 'volume']);
  const colPage = findHeaderCol(headers, ['الصفحة', 'صفحة', 'page']);
  const colKitab = findHeaderCol(headers, ['الكتاب', 'kitab']);
  const colIssue = findHeaderCol(headers, ['رقم المسألة', 'المسألة', 'issueNumber']);
  const colFullText = findHeaderCol(headers, [
    'نص الحديث بالسند والمتن',
    'الحديث كاملا',
    'fullHadithText',
  ]);
  const colTitle = findHeaderCol(headers, ['عنوان المسألة', 'العنوان', 'issueTitle']);
  const colMatn = findHeaderCol(headers, ['متن الحديث', 'المتن', 'matn']);
  const colIsnad = findHeaderCol(headers, ['سند الحديث', 'نص السند', 'السند', 'isnad']);
  const colHukm = findHeaderCol(headers, [
    'الحكم على الحديث',
    'حكم ابن حزم',
    'الحكم',
    'hukm',
  ]);
  const colChain = findHeaderCol(headers, ['سلسلة الرواة', 'الرواة', 'chain']);
  const colFiqh = findHeaderCol(headers, ['فقه الحديث', 'الفقه', 'fiqh']);
  const colGharib = findHeaderCol(headers, ['غريب الحديث', 'الغريب', 'gharib']);
  const colMadhahib = findHeaderCol(headers, ['مقارنة المذاهب', 'المذاهب', 'madhahib']);

  if (colMatn === -1 && colFullText === -1 && colTitle === -1) {
    throw new Error(
      'لم يتم العثور على عمود "متن الحديث" أو "نص الحديث بالسند والمتن" في الملف.'
    );
  }

  const results: ParsedHadithPreview[] = [];
  rows.slice(1).forEach((r, idx) => {
    const fullText = colFullText !== -1 ? (r[colFullText] || '').trim() : '';
    const matn = colMatn !== -1 ? (r[colMatn] || '').trim() : '';
    const title = colTitle !== -1 ? (r[colTitle] || '').trim() : '';
    if (!matn && !fullText && !title) return;

    const vol = colVol !== -1 ? Number(r[colVol]) || 1 : 1;
    const issueNum = colIssue !== -1 ? Number(r[colIssue]) || idx + 1 : idx + 1;

    results.push(
      buildPreview(
        {
          volume: vol,
          page: colPage !== -1 ? (r[colPage] || '').trim() : '',
          kitab: colKitab !== -1 && r[colKitab] ? r[colKitab].trim() : 'كتاب الطهارة',
          issueNumber: issueNum,
          explicitTitle: title,
          fullText,
          matnWithTashkeel: matn,
          ibnHazmIsnadText: colIsnad !== -1 ? (r[colIsnad] || '').trim() : '',
          ibnHazmHukm:
            colHukm !== -1 && r[colHukm]
              ? r[colHukm].trim()
              : 'صحيح متصل الإسناد',
          explicitChainText: colChain !== -1 ? (r[colChain] || '').trim() : '',
          fiqhAnalysis: colFiqh !== -1 ? (r[colFiqh] || '').trim() : '',
          gharibText: colGharib !== -1 ? (r[colGharib] || '').trim() : '',
          otherMadhahibNotes:
            colMadhahib !== -1 ? (r[colMadhahib] || '').trim() : '',
        },
        idx
      )
    );
  });

  return results;
}
