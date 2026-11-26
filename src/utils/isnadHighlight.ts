import { Narrator } from '../types/hadith';

export type IsnadSegment =
  | { type: 'text'; text: string }
  | { type: 'narrator'; text: string; narrator: Narrator };

const TASHKEEL_OR_TATWEEL = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;
const PUNCT_OR_SPACE = /[،؛؟.«»"'()[\]:\-!.,\s]/;

const AMBIGUOUS_KUNYA = new Set([
  'ابو محمد',
  'ابي محمد',
  'ابا محمد',
  'ابو عبد الله',
  'ابي عبد الله',
  'ابا عبد الله',
  'ابو عمر',
  'ابي عمر',
  'ابا عمر',
  'ابو الوليد',
  'ابي الوليد',
  'ابا الوليد',
  'ابو بكر',
  'ابي بكر',
  'ابا بكر',
  'ابو الحسين',
  'ابي الحسين',
  'ابا الحسين',
  'ابو جعفر',
  'ابي جعفر',
  'ابا جعفر',
  'ابو عبد الرحمن',
  'ابي عبد الرحمن',
  'ابا عبد الرحمن',
  'ابو اسحاق',
  'ابي اسحاق',
  'ابا اسحاق',
  'ابو علي',
  'ابي علي',
  'ابا علي',
  'ابو الحسن',
  'ابي الحسن',
  'ابا الحسن',
  'ابو عمرو',
  'ابي عمرو',
  'ابا عمرو',
  'ابو سعيد',
  'ابي سعيد',
  'ابا سعيد',
]);

const GENERIC_SINGLE_WORDS = new Set([
  'الاندلسي',
  'القرطبي',
  'المدني',
  'البصري',
  'الكوفي',
  'المصري',
  'الشامي',
  'النيسابوري',
  'السجستاني',
  'المروزي',
  'التميمي',
  'الليثي',
  'الانصاري',
  'الازدي',
  'الاموي',
  'المعافري',
  'القرشي',
  'المخزومي',
  'العدوي',
  'الدوسي',
  'البياني',
  'الظاهري',
  'الحارث',
  'عبد الله',
  'عبد الرحمن',
  'عبد الملك',
  'رسول الله',
]);

function normalizeLetter(ch: string): string {
  switch (ch) {
    case 'أ':
    case 'إ':
    case 'آ':
    case 'ٱ':
      return 'ا';
    case 'ى':
      return 'ي';
    case 'ة':
      return 'ه';
    case 'ؤ':
      return 'و';
    case 'ئ':
      return 'ي';
    default:
      return ch;
  }
}

interface NormalizedIndexMap {
  normText: string;
  origStarts: number[];
  origEnds: number[];
}

function buildNormalizedMap(rawText: string): NormalizedIndexMap {
  const normChars: string[] = [];
  const origStarts: number[] = [];
  const origEnds: number[] = [];

  for (let i = 0; i < rawText.length; i++) {
    const ch = rawText[i];
    if (TASHKEEL_OR_TATWEEL.test(ch)) {
      if (origEnds.length > 0 && normChars[normChars.length - 1] !== ' ') {
        origEnds[origEnds.length - 1] = i + 1;
      }
      continue;
    }

    if (PUNCT_OR_SPACE.test(ch)) {
      if (normChars.length > 0 && normChars[normChars.length - 1] !== ' ') {
        normChars.push(' ');
        origStarts.push(i);
        origEnds.push(i + 1);
      }
      continue;
    }

    normChars.push(normalizeLetter(ch));
    origStarts.push(i);
    origEnds.push(i + 1);
  }

  if (normChars.length > 0 && normChars[normChars.length - 1] === ' ') {
    normChars.pop();
    origStarts.pop();
    origEnds.pop();
  }

  return {
    normText: normChars.join(''),
    origStarts,
    origEnds,
  };
}

function normalizePhrase(phrase: string): string {
  return buildNormalizedMap(phrase).normText;
}

function addAliasWithIarab(aliases: Set<string>, raw: string): void {
  const norm = normalizePhrase(raw);
  if (!norm || norm.length < 3 || GENERIC_SINGLE_WORDS.has(norm)) return;
  aliases.add(norm);

  if (norm.startsWith('ابو ')) {
    const rest = norm.slice(4);
    const abu = `ابو ${rest}`;
    const abi = `ابي ${rest}`;
    const aba = `ابا ${rest}`;
    if (!AMBIGUOUS_KUNYA.has(abu)) {
      aliases.add(abi);
      aliases.add(aba);
    } else {
      aliases.delete(abu);
    }
  }

  if (norm.startsWith('القاسم ')) {
    aliases.add(norm.slice(2));
  } else if (norm.startsWith('قاسم ')) {
    aliases.add(`ال${norm}`);
  }
}

function extractNarratorAliases(narrator: Narrator): string[] {
  const aliases = new Set<string>();

  const cleanedFull = narrator.name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/رضي الله عنه(ما)?|رحمه الله/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  addAliasWithIarab(aliases, cleanedFull);

  const parens = narrator.name.match(/\(([^)]+)\)/g) || [];
  for (const p of parens) {
    const inner = p.slice(1, -1).trim();
    if (!inner.includes('صاحب')) {
      addAliasWithIarab(aliases, inner);
    }
  }

  const words = cleanedFull.split(/\s+/).filter(Boolean);

  // Prefix forms: e.g., 3+ words ("قاسم بن أصبغ", "أحمد بن خالد", "محمد بن عبد الملك بن أيمن")
  for (let k = 3; k <= words.length; k++) {
    // Don't end right on "بن" or "ابن" or "أبو"
    const endW = normalizePhrase(words[k - 1]);
    if (endW === 'بن' || endW === 'ابن' || endW === 'ابو' || endW === 'عبد') continue;
    addAliasWithIarab(aliases, words.slice(0, k).join(' '));
  }

  // Extract segments connected by بن/ابن to support omitting intermediate grandfathers
  // e.g. "أحمد بن محمد ... الطلمنكي", "محمد بن أحمد بن مفرج", "يونس بن عبد الله بن مغيث"
  if (words.length >= 4 && normalizePhrase(words[1]) === 'بن') {
    const first3 = words.slice(0, 3).join(' ');
    const lastWord = words[words.length - 1];
    const secondLast = words[words.length - 2];

    if (normalizePhrase(secondLast) === 'بن' || normalizePhrase(secondLast) === 'ابن') {
      // e.g. "محمد بن أحمد" + "بن مفرج" => "محمد بن أحمد بن مفرج"
      addAliasWithIarab(aliases, `${first3} ${secondLast} ${lastWord}`);
      addAliasWithIarab(aliases, `${secondLast === 'بن' ? 'ابن' : secondLast} ${lastWord}`);
    } else {
      // e.g. "أحمد بن محمد" + "الطلمنكي" or "محمد بن إبراهيم" + "التيمي"
      addAliasWithIarab(aliases, `${first3} ${lastWord}`);
      if (words.length >= 5) {
        addAliasWithIarab(aliases, `${first3} ${secondLast}`);
      }
      // If an earlier ancestor is "بن X" (like "يونس بن عبد الله بن محمد بن مغيث القرطبي")
      for (let i = 3; i < words.length - 1; i++) {
        const w = normalizePhrase(words[i]);
        if (w === 'بن' || w === 'ابن') {
          const ancestor = words[i + 1];
          if (ancestor) {
            addAliasWithIarab(aliases, `${first3} بن ${ancestor}`);
            addAliasWithIarab(aliases, `ابن ${ancestor}`);
          }
        }
      }
    }

    // e.g. "أحمد بن محمد بن عبد الله" + "الطلمنكي" (skipping second-last nisbah "المعافري")
    if (words.length >= 6) {
      addAliasWithIarab(aliases, `${words.slice(0, 6).join(' ')} ${lastWord}`);
    }
  }

  // Handle "أم المؤمنين عائشة بنت أبي بكر الصديق" -> "عائشة"
  const normFull = normalizePhrase(cleanedFull);
  if (normFull.includes('عائشه')) addAliasWithIarab(aliases, 'عائشه');
  if (normFull.includes('نافع')) addAliasWithIarab(aliases, 'نافع');
  if (normFull.includes('الزهري')) addAliasWithIarab(aliases, 'الزهري');
  if (normFull.includes('الطلمنكي')) addAliasWithIarab(aliases, 'الطلمنكي');
  if (normFull.includes('ابن حزم')) addAliasWithIarab(aliases, 'ابن حزم');
  if (normFull.includes('ابن وضاح')) addAliasWithIarab(aliases, 'ابن وضاح');
  if (normFull.includes('بقي بن مخلد')) addAliasWithIarab(aliases, 'بقي بن مخلد');
  if (normFull.includes('ابن ايمن')) addAliasWithIarab(aliases, 'ابن ايمن');
  if (normFull.includes('ابن مفرج')) addAliasWithIarab(aliases, 'ابن مفرج');
  if (normFull.includes('ابن مغيث')) addAliasWithIarab(aliases, 'ابن مغيث');
  if (normFull.includes('ابن الفرضي')) addAliasWithIarab(aliases, 'ابن الفرضي');
  if (normFull.includes('ابن الجباب')) addAliasWithIarab(aliases, 'ابن الجباب');
  if (normFull.includes('ابن الصفار')) addAliasWithIarab(aliases, 'ابن الصفار');
  if (normFull.includes('ابن عمر')) addAliasWithIarab(aliases, 'ابن عمر');
  if (normFull.includes('سعيد بن المسيب')) addAliasWithIarab(aliases, 'سعيد بن المسيب');
  if (normFull.includes('ابو هريره') || normFull.includes('ابي هريره')) {
    addAliasWithIarab(aliases, 'ابو هريره');
  }

  // Last word if distinctive scholarly nisbah (>= 6 chars starting with ال)
  if (words.length >= 2) {
    const lastNorm = normalizePhrase(words[words.length - 1]);
    if (lastNorm.startsWith('ال') && lastNorm.length >= 6 && !GENERIC_SINGLE_WORDS.has(lastNorm)) {
      aliases.add(lastNorm);
    }
  }

  if (narrator.kunya) {
    addAliasWithIarab(aliases, narrator.kunya);
  }

  return Array.from(aliases);
}

interface AliasEntry {
  alias: string;
  narrator: Narrator;
  isPreferred: boolean;
}

/**
 * Splits an Arabic isnad text into plain text spans and clickable Narrator spans,
 * preserving exact diacritics, punctuation, and original formatting.
 */
export function segmentIsnadWithNarrators(
  rawText: string,
  narrators: Narrator[],
  preferredNarratorIds: string[] = []
): IsnadSegment[] {
  if (!rawText || !rawText.trim() || narrators.length === 0) {
    return rawText ? [{ type: 'text', text: rawText }] : [];
  }

  const preferredSet = new Set(preferredNarratorIds);
  const { normText, origStarts, origEnds } = buildNormalizedMap(rawText);
  if (!normText) return [{ type: 'text', text: rawText }];

  const entries: AliasEntry[] = [];
  for (const narrator of narrators) {
    const isPreferred = preferredSet.has(narrator.id);
    for (const alias of extractNarratorAliases(narrator)) {
      entries.push({ alias, narrator, isPreferred });
    }
  }

  // Longest match first; if same length, prefer narrators present in this hadith's chain
  entries.sort((a, b) => {
    if (b.alias.length !== a.alias.length) return b.alias.length - a.alias.length;
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    return 0;
  });

  interface SpanMatch {
    origStart: number;
    origEnd: number;
    narrator: Narrator;
  }

  const matches: SpanMatch[] = [];
  const overlapsExisting = (start: number, end: number) =>
    matches.some((m) => start < m.origEnd && end > m.origStart);

  for (const entry of entries) {
    let searchFrom = 0;
    while (searchFrom < normText.length) {
      const idx = normText.indexOf(entry.alias, searchFrom);
      if (idx === -1) break;

      const endIdx = idx + entry.alias.length;
      const startBoundaryOk = idx === 0 || normText[idx - 1] === ' ';
      const endBoundaryOk = endIdx === normText.length || normText[endIdx] === ' ';

      if (startBoundaryOk && endBoundaryOk) {
        const origStart = origStarts[idx];
        const origEnd = origEnds[endIdx - 1];
        if (!overlapsExisting(origStart, origEnd)) {
          matches.push({ origStart, origEnd, narrator: entry.narrator });
        }
      }

      searchFrom = idx + 1;
    }
  }

  if (matches.length === 0) {
    return [{ type: 'text', text: rawText }];
  }

  matches.sort((a, b) => a.origStart - b.origStart);

  const segments: IsnadSegment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.origStart > cursor) {
      segments.push({ type: 'text', text: rawText.slice(cursor, m.origStart) });
    }
    segments.push({
      type: 'narrator',
      text: rawText.slice(m.origStart, m.origEnd),
      narrator: m.narrator,
    });
    cursor = m.origEnd;
  }

  if (cursor < rawText.length) {
    segments.push({ type: 'text', text: rawText.slice(cursor) });
  }

  return segments;
}

/**
 * Splits a full hadith text into its Isnad prefix and Matn body when possible,
 * so the Isnad portion can have clickable narrators without highlighting words inside the Matn.
 */
export function splitFullHadithIntoIsnadAndMatn(
  fullText: string,
  knownMatn?: string
): { isnadPart: string; matnPart: string } {
  const trimmed = fullText.trim();
  if (!trimmed) return { isnadPart: '', matnPart: '' };

  // 1. Try locating knownMatn (first ~24 normalized chars) inside fullText
  if (knownMatn && knownMatn.trim().length >= 8) {
    const fullMap = buildNormalizedMap(trimmed);
    const matnNorm = normalizePhrase(knownMatn);
    const probeLen = Math.min(matnNorm.length, 28);
    const probe = matnNorm.slice(0, probeLen);
    const hitIdx = fullMap.normText.indexOf(probe);
    if (hitIdx > 0) {
      let splitOrigIdx = fullMap.origStarts[hitIdx];
      // Include opening quote mark « if directly preceding
      if (splitOrigIdx > 0 && trimmed[splitOrigIdx - 1] === '«') {
        splitOrigIdx -= 1;
      }
      return {
        isnadPart: trimmed.slice(0, splitOrigIdx).trimEnd(),
        matnPart: trimmed.slice(splitOrigIdx).trimStart(),
      };
    }
  }

  // 2. Fallback: look for opening quote «...»
  const quoteIdx = trimmed.indexOf('«');
  if (quoteIdx > 10) {
    return {
      isnadPart: trimmed.slice(0, quoteIdx).trimEnd(),
      matnPart: trimmed.slice(quoteIdx).trimStart(),
    };
  }

  // 3. Fallback: split right after "رسول الله ﷺ قال:" / "النبي ﷺ يقول:" etc.
  const prophetMarker = trimmed.match(
    /(?:رسول\s+الله|النبي)\s*(?:ﷺ|صلى\s+الله\s+عليه\s+وسلم)[^:]*[:،]\s*/
  );
  if (prophetMarker && prophetMarker.index !== undefined) {
    const splitAt = prophetMarker.index + prophetMarker[0].length;
    if (splitAt < trimmed.length - 5) {
      return {
        isnadPart: trimmed.slice(0, splitAt).trimEnd(),
        matnPart: trimmed.slice(splitAt).trimStart(),
      };
    }
  }

  return { isnadPart: trimmed, matnPart: '' };
}
