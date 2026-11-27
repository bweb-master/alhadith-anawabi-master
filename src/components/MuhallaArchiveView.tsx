import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  GitBranch,
  Search,
  Pencil,
  BookMarked,
  Scale,
  Languages,
  ArrowUpLeft,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  MadhabName,
  MuhallaHadith,
  Narrator,
  NineBookHadith,
} from '../types/hadith';
import { getFontCssValue, PlatformSettings } from '../types/settings';
import { NINE_BOOKS_META } from '../data/seedData';
import { computeTakhrijMatch, normalizeArabic } from '../utils/arabic';
import {
  segmentIsnadWithNarrators,
  splitFullHadithIntoIsnadAndMatn,
} from '../utils/isnadHighlight';

interface MuhallaArchiveViewProps {
  hadiths: MuhallaHadith[];
  narrators: Narrator[];
  nineBooksCorpus: NineBookHadith[];
  selectedHadithId: string;
  isAdmin: boolean;
  hadithTextStyle?: PlatformSettings['hadithTextStyle'];
  onSelectHadith: (id: string) => void;
  onOpenTree: (hadithId: string) => void;
  onOpenNarrator: (narratorId: string, fromHadithId?: string) => void;
  onEditHadith: (hadithId: string) => void;
  onRunAutoTakhrij: (text: string) => void;
}

type DetailTab = 'takhrij' | 'fiqh' | 'gharib' | 'paths';

export const MuhallaArchiveView: React.FC<MuhallaArchiveViewProps> = ({
  hadiths,
  narrators,
  nineBooksCorpus,
  selectedHadithId,
  isAdmin,
  hadithTextStyle,
  onSelectHadith,
  onOpenTree,
  onOpenNarrator,
  onEditHadith,
  onRunAutoTakhrij,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKitab, setSelectedKitab] = useState<string>('الكل');
  const [selectedVolume, setSelectedVolume] = useState<string>('الكل');
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>('الكل');
  const [selectedMadhab, setSelectedMadhab] = useState<'الكل' | MadhabName>('الكل');
  const [selectedHukm, setSelectedHukm] = useState<'الكل' | 'صحيح' | 'الزيادة / فيه نظر'>('الكل');
  const [issueNumberFilter, setIssueNumberFilter] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('takhrij');

  const narratorMap = useMemo(() => {
    const map = new Map<string, Narrator>();
    narrators.forEach((n) => map.set(n.id, n));
    return map;
  }, [narrators]);

  const bookMap = useMemo(() => {
    const map = new Map<string, string>();
    NINE_BOOKS_META.forEach((b) => map.set(b.key, b.arabicName));
    return map;
  }, []);

  const kutubList = useMemo(() => {
    const set = new Set<string>(hadiths.map((h) => h.kitab));
    return ['الكل', ...Array.from(set)];
  }, [hadiths]);

  const volumesList = useMemo(() => {
    const set = new Set<number>(hadiths.map((h) => h.volume));
    return Array.from(set).sort((a, b) => a - b);
  }, [hadiths]);

  const linkedNarratorsList = useMemo(() => {
    const usedIds = new Set<string>();
    hadiths.forEach((h) =>
      h.paths.forEach((p) => p.chainNarratorIds.forEach((id) => usedIds.add(id)))
    );
    return narrators.filter((n) => usedIds.has(n.id));
  }, [hadiths, narrators]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(issueNumberFilter.trim()) ||
    selectedKitab !== 'الكل' ||
    selectedVolume !== 'الكل' ||
    selectedNarratorId !== 'الكل' ||
    selectedMadhab !== 'الكل' ||
    selectedHukm !== 'الكل';

  const resetFilters = () => {
    setSearchQuery('');
    setIssueNumberFilter('');
    setSelectedKitab('الكل');
    setSelectedVolume('الكل');
    setSelectedNarratorId('الكل');
    setSelectedMadhab('الكل');
    setSelectedHukm('الكل');
  };

  const filteredHadiths = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    const issueQ = issueNumberFilter.trim();
    return hadiths.filter((h) => {
      if (selectedKitab !== 'الكل' && h.kitab !== selectedKitab) return false;
      if (selectedVolume !== 'الكل' && String(h.volume) !== selectedVolume) {
        return false;
      }
      if (selectedNarratorId !== 'الكل') {
        const hasNarrator = h.paths.some((p) =>
          p.chainNarratorIds.includes(selectedNarratorId)
        );
        if (!hasNarrator) return false;
      }
      if (selectedMadhab !== 'الكل') {
        const hasMadhab = (h.fourMadhahibFiqh || []).some(
          (m) => m.madhab === selectedMadhab && m.ruling?.trim()
        );
        if (!hasMadhab) return false;
      }
      if (selectedHukm !== 'الكل') {
        const hukmNorm = normalizeArabic(h.ibnHazmHukm);
        if (selectedHukm === 'صحيح') {
          if (!hukmNorm.includes('صحيح') && !hukmNorm.includes('ثابت') && !hukmNorm.includes('حسن')) {
            return false;
          }
        } else if (selectedHukm === 'الزيادة / فيه نظر') {
          if (
            !hukmNorm.includes('زيادة') &&
            !hukmNorm.includes('ضعيف') &&
            !hukmNorm.includes('مرسل') &&
            !hukmNorm.includes('نظر') &&
            !hukmNorm.includes('شاذ')
          ) {
            return false;
          }
        }
      }
      if (issueQ && !String(h.issueNumber).includes(issueQ)) {
        return false;
      }
      if (!q) return true;

      const linkedNames = h.paths
        .flatMap((p) => p.chainNarratorIds)
        .map((id) => {
          const n = narratorMap.get(id);
          return n ? `${n.name} ${n.kunya || ''}` : id;
        })
        .join(' ');

      const fiqhText = (h.fourMadhahibFiqh || [])
        .map(
          (m) =>
            `${m.madhab} ${m.ruling} ${m.sourceBook} ${m.author || ''} ${m.volumePage}`
        )
        .join(' ');

      const searchable = normalizeArabic(
        `${h.serialNumber ?? ''} ${h.issueTitle} ${h.fullHadithText || ''} ${h.matnWithTashkeel} ${h.ibnHazmIsnadText} ${h.takhrijSummary || ''} ${h.ibnHazmHukm} ${h.kitab} ${h.volume} الجزء ${h.volume} ج ${h.volume} ${h.page || ''} ${h.issueNumber} مسألة ${h.issueNumber} ${linkedNames} ${fiqhText}`
      );
      return searchable.includes(q);
    });
  }, [
    hadiths,
    searchQuery,
    issueNumberFilter,
    selectedKitab,
    selectedVolume,
    selectedNarratorId,
    selectedMadhab,
    selectedHukm,
    narratorMap,
  ]);

  const activeHadith = useMemo(
    () =>
      hadiths.find((h) => h.id === selectedHadithId) ||
      filteredHadiths[0] ||
      hadiths[0],
    [hadiths, filteredHadiths, selectedHadithId]
  );

  const preferredChainIds = useMemo(() => {
    if (!activeHadith) return [];
    return activeHadith.paths.flatMap((p) => p.chainNarratorIds);
  }, [activeHadith]);

  const fullHadithComposition = useMemo(() => {
    if (!activeHadith) {
      return { isnadText: '', matnText: '', isSeparateFallback: false };
    }
    const rawFull = activeHadith.fullHadithText?.trim();
    const rawMatn = activeHadith.matnWithTashkeel?.trim() || '';
    const rawIsnad = activeHadith.ibnHazmIsnadText?.trim() || '';

    if (rawFull) {
      const { isnadPart, matnPart } = splitFullHadithIntoIsnadAndMatn(
        rawFull,
        rawMatn
      );
      if (matnPart) {
        return {
          isnadText: isnadPart,
          matnText: matnPart,
          isSeparateFallback: false,
        };
      }
      // fullHadithText may not contain matnWithTashkeel verbatim; check if matn is separate
      const matnAlreadyInside =
        rawMatn.length >= 8 &&
        normalizeArabic(rawFull).includes(normalizeArabic(rawMatn).slice(0, 20));
      return {
        isnadText: isnadPart,
        matnText: matnAlreadyInside ? '' : rawMatn ? `«${rawMatn}»` : '',
        isSeparateFallback: false,
      };
    }

    // Compose complete hadith from ibnHazmIsnadText + matnWithTashkeel
    const { isnadPart } = splitFullHadithIntoIsnadAndMatn(rawIsnad, rawMatn);
    const cleanedIsnad = (isnadPart || rawIsnad)
      .replace(/\s*\.\.\.\s*$/, '')
      .replace(/\.$/, ':')
      .trim();

    return {
      isnadText: cleanedIsnad,
      matnText: rawMatn ? `«${rawMatn}»` : '',
      isSeparateFallback: true,
    };
  }, [activeHadith]);

  const isnadSegments = useMemo(
    () =>
      segmentIsnadWithNarrators(
        fullHadithComposition.isnadText,
        narrators,
        preferredChainIds
      ),
    [fullHadithComposition.isnadText, narrators, preferredChainIds]
  );

  const hasSeparateIsnadNote = useMemo(() => {
    if (!activeHadith || fullHadithComposition.isSeparateFallback) return false;
    const rawIsnad = activeHadith.ibnHazmIsnadText?.trim();
    if (!rawIsnad) return false;
    return (
      normalizeArabic(rawIsnad) !==
      normalizeArabic(fullHadithComposition.isnadText)
    );
  }, [activeHadith, fullHadithComposition]);

  const separateIsnadSegments = useMemo(
    () =>
      hasSeparateIsnadNote && activeHadith
        ? segmentIsnadWithNarrators(
            activeHadith.ibnHazmIsnadText,
            narrators,
            preferredChainIds
          )
        : [],
    [hasSeparateIsnadNote, activeHadith, narrators, preferredChainIds]
  );

  // Compute live automatic Takhrij candidates from the loaded Nine Books corpus
  const autoCandidates = useMemo(() => {
    if (!activeHadith) return [];
    return nineBooksCorpus
      .map((nb) => ({
        item: nb,
        match: computeTakhrijMatch(activeHadith.matnWithTashkeel, nb.arabicText),
      }))
      .filter((r) => r.match.score >= 35)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 6);
  }, [activeHadith, nineBooksCorpus]);

  if (!activeHadith) {
    return (
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-12 text-center">
        <p className="text-lg font-medium text-[#1C1917]">لا توجد أحاديث مضافة بعد في المحلى</p>
        {isAdmin && (
          <p className="text-sm text-[#6B655E] mt-2">
            انتقل إلى صفحة «التعديلات» لإضافة أول حديث من المحلى.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Right Sidebar (RTL): Search & List of Muhalla Issues */}
      <aside className="lg:col-span-4 bg-white border border-[#E6E0D4] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#E6E0D4] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#1C1917]">
              فهرس مرويات الأندلسيين
            </h2>
            <span className="text-xs text-[#6B655E] tabular-nums">
              {filteredHadiths.length} من {hadiths.length}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#6B655E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المتن، الرواة، المسألة، الجزء، الرقم..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {kutubList.map((kitab) => (
                <button
                  key={kitab}
                  onClick={() => setSelectedKitab(kitab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedKitab === kitab
                      ? 'bg-[#14532D] text-white'
                      : 'bg-[#F3EFE6] text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {kitab}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-[#6B655E] flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>تصفية بالجزء</span>
                </span>
                <select
                  value={selectedVolume}
                  onChange={(e) => setSelectedVolume(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] cursor-pointer"
                >
                  <option value="الكل">جميع الأجزاء</option>
                  {volumesList.map((v) => (
                    <option key={v} value={String(v)}>
                      المجلد / الجزء {v}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-[#6B655E]">
                  تصفية بالراوي
                </span>
                <select
                  value={selectedNarratorId}
                  onChange={(e) => setSelectedNarratorId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] cursor-pointer"
                >
                  <option value="الكل">جميع الرواة</option>
                  {linkedNarratorsList.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name.split('(')[0].trim()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-[#6B655E]">
                  تصفية بالمذهب الفقهي
                </span>
                <select
                  value={selectedMadhab}
                  onChange={(e) =>
                    setSelectedMadhab(e.target.value as 'الكل' | MadhabName)
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] cursor-pointer"
                >
                  <option value="الكل">جميع المذاهب</option>
                  <option value="الحنفي">المذهب الحنفي</option>
                  <option value="المالكي">المذهب المالكي</option>
                  <option value="الشافعي">المذهب الشافعي</option>
                  <option value="الحنبلي">المذهب الحنبلي</option>
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] font-medium text-[#6B655E]">
                  تصفية بالحكم على الحديث
                </span>
                <select
                  value={selectedHukm}
                  onChange={(e) =>
                    setSelectedHukm(
                      e.target.value as 'الكل' | 'صحيح' | 'الزيادة / فيه نظر'
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] cursor-pointer"
                >
                  <option value="الكل">جميع الأحكام</option>
                  <option value="صحيح">صحيح / ثابت</option>
                  <option value="الزيادة / فيه نظر">زيادة / فيه نظر</option>
                </select>
              </label>

              <label className="space-y-1 block col-span-2">
                <span className="text-[11px] font-medium text-[#6B655E]">
                  تصفية برقم المسألة في المحلّى
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={issueNumberFilter}
                  onChange={(e) => setIssueNumberFilter(e.target.value)}
                  placeholder="أدخل رقم المسألة (مثال: 112 أو 277)..."
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] tabular-nums"
                />
              </label>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#854D0E] hover:text-[#14532D] cursor-pointer pt-0.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>مسح الفلاتر والبحث</span>
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-[#E6E0D4] max-h-[680px] overflow-y-auto">
          {filteredHadiths.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6B655E]">
              لم يتم العثور على مسائل مطابقة لبحثك.
            </div>
          ) : (
            filteredHadiths.map((item) => {
              const isSelected = item.id === activeHadith.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectHadith(item.id)}
                  className={`w-full text-right p-4 transition-colors cursor-pointer block ${
                    isSelected
                      ? 'bg-[#F3EFE6]'
                      : 'bg-white hover:bg-[#FBF9F5]'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B655E] tabular-nums mb-1.5">
                    {typeof item.serialNumber === 'number' && (
                      <>
                        <span className="font-semibold text-[#14532D]">
                          #{item.serialNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span>{item.kitab}</span>
                    <span aria-hidden="true">·</span>
                    <span>ج {item.volume}</span>
                    {item.page && item.page.trim() && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>ص {item.page}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>مسألة {item.issueNumber}</span>
                  </div>
                  <p
                    className={`text-base font-semibold leading-snug ${
                      isSelected ? 'text-[#14532D]' : 'text-[#1C1917]'
                    }`}
                  >
                    {item.issueTitle}
                  </p>
                  <p className="text-[#6B655E] mt-1.5 line-clamp-2 font-hadith text-lg">
                    {item.matnWithTashkeel}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Scholarly Reading & Analysis Pane */}
      <section className="lg:col-span-8 bg-white border border-[#E6E0D4] rounded-xl p-6 lg:p-8 space-y-7">
        {/* Top Metadata & Actions */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E6E0D4]">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#6B655E] tabular-nums">
              {typeof activeHadith.serialNumber === 'number' && (
                <>
                  <span className="font-semibold text-[#14532D]">
                    الرقم الترتيبي {activeHadith.serialNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>المحلى بالآثار</span>
              <span aria-hidden="true">·</span>
              <span>{activeHadith.kitab}</span>
              <span aria-hidden="true">·</span>
              <span>المجلد {activeHadith.volume}</span>
              {activeHadith.page && activeHadith.page.trim() && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>الصفحة {activeHadith.page}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>المسألة {activeHadith.issueNumber}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#1C1917] leading-snug">
              {activeHadith.issueTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenTree(activeHadith.id)}
              className="btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-[#14532D] hover:bg-[#114224] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <GitBranch className="w-4 h-4" />
              <span>شجرة الإسناد</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => onEditHadith(activeHadith.id)}
                className="btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#1C1917] bg-[#F3EFE6] hover:bg-[#E6E0D4] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                <span>تعديل</span>
              </button>
            )}
          </div>
        </div>

        {/* Complete Hadith (Isnad with Clickable Narrators + Prophetic Matn) */}
        <div className="space-y-5 w-full">
          <div
            className={`w-full ${
              hadithTextStyle?.showPattern === false ? '' : 'islamic-hero-pattern'
            } p-6 sm:p-7 space-y-4`}
            style={{
              backgroundColor: hadithTextStyle?.bgColor || '#FFFFFF',
              borderColor: hadithTextStyle?.borderColor || '#E6E0D4',
              borderWidth: `${hadithTextStyle?.borderWidthPx ?? 1}px`,
              borderStyle: hadithTextStyle?.borderStyle || 'solid',
              borderRadius: `${hadithTextStyle?.borderRadiusPx ?? 12}px`,
            }}
          >
            <p className="text-sm font-semibold text-[#854D0E]">
              نص الحديث كاملاً بالسند والمتن (من المحلّى)
            </p>

            <div
              className="leading-[2.15] font-normal"
              style={{
                fontFamily: hadithTextStyle
                  ? getFontCssValue(hadithTextStyle.fontFamily)
                  : '"Amiri", Georgia, serif',
                fontSize: `${hadithTextStyle?.fontSizePx ?? 24}px`,
                color: hadithTextStyle?.textColor || '#1C1917',
              }}
            >
              {isnadSegments.length > 0 && (
                <span>
                  {isnadSegments.map((seg, idx) =>
                    seg.type === 'text' ? (
                      <React.Fragment key={`seg-t-${idx}`}>
                        {seg.text}
                      </React.Fragment>
                    ) : (
                      <button
                        key={`seg-n-${seg.narrator.id}-${idx}`}
                        type="button"
                        onClick={() => onOpenNarrator(seg.narrator.id, activeHadith.id)}
                        title={`${seg.narrator.name} — اضغط لعرض ترجمة الراوي ودراسته`}
                        style={{
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                        }}
                        className={`inline font-normal underline decoration-dotted underline-offset-[6px] hover:decoration-solid rounded px-0.5 transition-colors cursor-pointer ${
                          seg.narrator.origin === 'andalusian'
                            ? 'text-[#854D0E] decoration-[#854D0E]/55 hover:bg-[#854D0E]/12'
                            : 'text-[#14532D] decoration-[#14532D]/50 hover:bg-[#14532D]/10'
                        }`}
                      >
                        {seg.text}
                      </button>
                    )
                  )}{' '}
                </span>
              )}
              {fullHadithComposition.matnText && (
                <span
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    color: 'inherit',
                  }}
                  className="font-normal"
                >
                  {fullHadithComposition.matnText}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-[#E6E0D4]/80 text-xs text-[#57534E]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#854D0E]" />
                <span>راوٍ أندلسي (قابل للنقر)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#14532D]" />
                <span>صحابي أو راوٍ مشرقي (قابل للنقر)</span>
              </span>
            </div>
          </div>

          {hasSeparateIsnadNote && separateIsnadSegments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#1C1917]">
                سند ابن حزم الأندلسي المختصر في المحلّى
              </h3>
              <p className="font-hadith text-xl lg:text-2xl leading-[2.15] font-normal text-[#44403C]">
                {separateIsnadSegments.map((seg, idx) =>
                  seg.type === 'text' ? (
                    <React.Fragment key={`sep-t-${idx}`}>
                      {seg.text}
                    </React.Fragment>
                  ) : (
                    <button
                      key={`sep-n-${seg.narrator.id}-${idx}`}
                      type="button"
                      onClick={() => onOpenNarrator(seg.narrator.id, activeHadith.id)}
                      title={`${seg.narrator.name} — اضغط لعرض ترجمة الراوي`}
                      className={`inline font-hadith text-[length:inherit] leading-[inherit] font-normal underline decoration-dotted underline-offset-[5px] hover:decoration-solid rounded px-0.5 transition-colors cursor-pointer ${
                        seg.narrator.origin === 'andalusian'
                          ? 'text-[#854D0E] decoration-[#854D0E]/55 hover:bg-[#854D0E]/12'
                          : 'text-[#14532D] decoration-[#14532D]/50 hover:bg-[#14532D]/10'
                      }`}
                    >
                      {seg.text}
                    </button>
                  )
                )}
              </p>
            </div>
          )}

          {/* Clickable Narrator Chain Sequence */}
          {activeHadith.paths[0] && (
            <div className="space-y-2">
              <p className="text-sm text-[#6B655E]">
                سلسلة الرواة (اضغط على أي راوٍ لعرض ترجمته ودراسته):
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                {[...activeHadith.paths[0].chainNarratorIds]
                  .reverse()
                  .map((nid, idx, arr) => {
                    const narrator = narratorMap.get(nid);
                    const isAndalusian = narrator?.origin === 'andalusian';
                    return (
                      <React.Fragment key={`${nid}-${idx}`}>
                        <button
                          onClick={() => onOpenNarrator(nid, activeHadith.id)}
                          className={`btn-hover-motion px-3 py-1.5 rounded-md border cursor-pointer whitespace-nowrap ${
                            isAndalusian
                              ? 'border-[#854D0E]/35 bg-[#854D0E]/5 text-[#78350F] hover:bg-[#854D0E]/15'
                              : 'border-[#E6E0D4] bg-[#FBF9F5] text-[#1C1917] hover:border-[#14532D]'
                          }`}
                        >
                          {narrator ? narrator.name.split('(')[0].trim() : nid}
                        </button>
                        {idx < arr.length - 1 && (
                          <span className="text-[#A8A092] select-none">←</span>
                        )}
                      </React.Fragment>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Ibn Hazm Ruling */}
          <div className="pt-2 border-t border-[#E6E0D4]">
            <p className="text-xs text-[#6B655E] mb-1">حكم الإمام ابن حزم على الحديث:</p>
            <p className="text-sm font-medium text-[#14532D]">
              {activeHadith.ibnHazmHukm}
            </p>
          </div>
        </div>

        {/* Sub-Navigation for Scholarly Disciplines — Large Interactive Buttons */}
        <div className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setActiveDetailTab('takhrij')}
              className={`btn-hover-motion group text-right p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                activeDetailTab === 'takhrij'
                  ? 'bg-[#14532D] text-white border-[#14532D] shadow-sm'
                  : 'bg-[#FBF9F5] text-[#1C1917] border-[#E6E0D4] hover:border-[#14532D] hover:bg-[#EEF6F1]'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeDetailTab === 'takhrij'
                    ? 'bg-white/15 text-white'
                    : 'bg-[#F3EFE6] text-[#14532D] group-hover:bg-[#14532D] group-hover:text-white'
                }`}
              >
                <BookMarked className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug">
                  التخريج في الكتب التسعة
                </p>
                <p
                  className={`text-xs tabular-nums mt-0.5 ${
                    activeDetailTab === 'takhrij' ? 'text-white/85' : 'text-[#6B655E]'
                  }`}
                >
                  {activeHadith.takhrijLinks.length} مواضع موثّقة
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveDetailTab('fiqh')}
              className={`btn-hover-motion group text-right p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                activeDetailTab === 'fiqh'
                  ? 'bg-[#14532D] text-white border-[#14532D] shadow-sm'
                  : 'bg-[#FBF9F5] text-[#1C1917] border-[#E6E0D4] hover:border-[#14532D] hover:bg-[#EEF6F1]'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeDetailTab === 'fiqh'
                    ? 'bg-white/15 text-white'
                    : 'bg-[#F3EFE6] text-[#14532D] group-hover:bg-[#14532D] group-hover:text-white'
                }`}
              >
                <Scale className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug">فقه الحديث</p>
                <p
                  className={`text-xs mt-0.5 ${
                    activeDetailTab === 'fiqh' ? 'text-white/85' : 'text-[#6B655E]'
                  }`}
                >
                  ابن حزم والمذاهب الأربعة
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveDetailTab('gharib')}
              className={`btn-hover-motion group text-right p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                activeDetailTab === 'gharib'
                  ? 'bg-[#14532D] text-white border-[#14532D] shadow-sm'
                  : 'bg-[#FBF9F5] text-[#1C1917] border-[#E6E0D4] hover:border-[#14532D] hover:bg-[#EEF6F1]'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeDetailTab === 'gharib'
                    ? 'bg-white/15 text-white'
                    : 'bg-[#F3EFE6] text-[#14532D] group-hover:bg-[#14532D] group-hover:text-white'
                }`}
              >
                <Languages className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug">غريب الحديث</p>
                <p
                  className={`text-xs tabular-nums mt-0.5 ${
                    activeDetailTab === 'gharib' ? 'text-white/85' : 'text-[#6B655E]'
                  }`}
                >
                  {activeHadith.gharib.length} مفردات مشروحة
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveDetailTab('paths')}
              className={`btn-hover-motion group text-right p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                activeDetailTab === 'paths'
                  ? 'bg-[#14532D] text-white border-[#14532D] shadow-sm'
                  : 'bg-[#FBF9F5] text-[#1C1917] border-[#E6E0D4] hover:border-[#14532D] hover:bg-[#EEF6F1]'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  activeDetailTab === 'paths'
                    ? 'bg-white/15 text-white'
                    : 'bg-[#F3EFE6] text-[#14532D] group-hover:bg-[#14532D] group-hover:text-white'
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug">طرق الحديث</p>
                <p
                  className={`text-xs tabular-nums mt-0.5 ${
                    activeDetailTab === 'paths' ? 'text-white/85' : 'text-[#6B655E]'
                  }`}
                >
                  {activeHadith.paths.length} أسانيد مسجلة
                </p>
              </div>
            </button>
          </div>

          {/* Tab Panel Content */}
          <div className="mt-5">
            {activeDetailTab === 'takhrij' && (
              <div className="space-y-6">
                {activeHadith.takhrijSummary && activeHadith.takhrijSummary.trim() && (
                  <div className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-1.5">
                    <h4 className="text-sm font-semibold text-[#14532D]">
                      خلاصة تخريج الحديث
                    </h4>
                    <p className="text-sm leading-relaxed text-[#292524]">
                      {activeHadith.takhrijSummary}
                    </p>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <h4 className="text-sm font-semibold text-[#1C1917]">
                      المواضع الموثّقة في الكتب التسعة
                    </h4>
                    <button
                      onClick={() => onRunAutoTakhrij(activeHadith.matnWithTashkeel)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#14532D] hover:underline cursor-pointer whitespace-nowrap"
                    >
                      <span>فحص التخريج الآلي الموسّع</span>
                      <ArrowUpLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {activeHadith.takhrijLinks.length === 0 ? (
                    <p className="text-sm text-[#6B655E]">
                      {activeHadith.takhrijSummary?.trim()
                        ? 'لم تُربط صفوف تفصيلية في جدول الكتب التسعة بعد.'
                        : 'لم يتم ربط مواضع تخريج بعد.'}
                    </p>
                  ) : (
                    <div className="border border-[#E6E0D4] rounded-lg overflow-hidden">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-[#FBF9F5] border-b border-[#E6E0D4] text-xs text-[#6B655E]">
                          <tr>
                            <th className="py-2.5 px-4 font-medium">المصدر</th>
                            <th className="py-2.5 px-4 font-medium">الرقم</th>
                            <th className="py-2.5 px-4 font-medium">الكتاب / الباب</th>
                            <th className="py-2.5 px-4 font-medium">نوع التطابق</th>
                            <th className="py-2.5 px-4 font-medium">الحكم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6E0D4]">
                          {activeHadith.takhrijLinks.map((link, idx) => (
                            <tr key={idx} className="hover:bg-[#FBF9F5]">
                              <td className="py-2.5 px-4 font-medium text-[#1C1917]">
                                {bookMap.get(link.bookKey) || link.bookKey}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-xs tabular-nums text-[#44403C]">
                                {link.hadithNumber}
                              </td>
                              <td className="py-2.5 px-4 text-[#44403C]">
                                {link.chapterName}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-[#854D0E]">
                                {link.matchType}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-[#14532D]">
                                {link.ruling || 'صحيح'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Live Auto-Takhrij Suggestions */}
                {autoCandidates.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-[#E6E0D4]">
                    <h4 className="text-sm font-semibold text-[#1C1917]">
                      نتائج المطابقة النصية المباشرة في مدونة الكتب التسعة
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {autoCandidates.map(({ item, match }, i) => (
                        <div
                          key={`${item.bookKey}-${item.id}-${i}`}
                          className="p-3.5 bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-[#6B655E] tabular-nums">
                            <span className="font-semibold text-[#1C1917]">
                              {bookMap.get(item.bookKey)} · رقم {item.idInBook || item.id}
                            </span>
                            <span className="text-[#14532D] font-medium">
                              تطابق {match.score}%
                            </span>
                          </div>
                          <p className="font-hadith text-base text-[#292524] line-clamp-2">
                            {item.arabicText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'fiqh' && (
              <div className="space-y-5">
                <div className="space-y-2 w-full">
                  <h4 className="text-sm font-semibold text-[#1C1917]">
                    استنباط ابن حزم الأندلسي ومنهجه الفقهي في المسألة
                  </h4>
                  <p className="text-[15px] leading-relaxed text-[#292524]">
                    {activeHadith.fiqhAnalysis}
                  </p>
                </div>

                {activeHadith.fourMadhahibFiqh &&
                  activeHadith.fourMadhahibFiqh.length > 0 && (
                    <div className="pt-4 border-t border-[#E6E0D4] space-y-3">
                      <h4 className="text-sm font-semibold text-[#1C1917]">
                        فقه الحديث في المذاهب الأربعة مع التوثيق
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeHadith.fourMadhahibFiqh.map((entry, idx) => (
                          <div
                            key={`${entry.madhab}-${idx}`}
                            className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#E6E0D4]/70">
                              <span className="text-sm font-bold text-[#14532D]">
                                المذهب {entry.madhab}
                              </span>
                              <span className="text-xs font-semibold text-[#854D0E] tabular-nums">
                                {entry.volumePage}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-[#292524]">
                              {entry.ruling}
                            </p>
                            <div className="pt-2 border-t border-[#E6E0D4]/70 text-xs text-[#57534E] space-y-0.5">
                              <p>
                                <span className="font-semibold text-[#44403C]">
                                  التوثيق — اسم الكتاب:{' '}
                                </span>
                                <span>{entry.sourceBook}</span>
                              </p>
                              <p>
                                <span className="font-semibold text-[#44403C]">
                                  المؤلف:{' '}
                                </span>
                                <span>{entry.author || 'معتمد المذهب'}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {activeHadith.otherMadhahibNotes && (
                  <div className="pt-4 border-t border-[#E6E0D4] space-y-1.5 w-full">
                    <h4 className="text-sm font-semibold text-[#1C1917]">
                      خلاصة المقارنة الفقهية
                    </h4>
                    <p className="text-sm leading-relaxed text-[#44403C]">
                      {activeHadith.otherMadhahibNotes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'gharib' && (
              <div className="space-y-3">
                {activeHadith.gharib.length === 0 ? (
                  <p className="text-sm text-[#6B655E]">لا توجد مفردات غريبة مضافة لهذا الحديث.</p>
                ) : (
                  <div className="divide-y divide-[#E6E0D4] border border-[#E6E0D4] rounded-lg">
                    {activeHadith.gharib.map((g, idx) => (
                      <div key={idx} className="p-4 space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-hadith text-xl font-bold text-[#854D0E]">
                            {g.word}
                          </span>
                          {g.diacriticsNote && (
                            <span className="text-xs text-[#6B655E]">
                              ({g.diacriticsNote})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#1C1917] leading-relaxed">
                          {g.meaning}
                        </p>
                        <p className="text-xs text-[#6B655E]">المصدر: {g.source}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'paths' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#44403C]">
                    الطرق المجمعة لهذا الحديث من المحلى والكتب التسعة:
                  </p>
                  <button
                    onClick={() => onOpenTree(activeHadith.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#14532D] hover:underline cursor-pointer"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>فتح الشجرة الإسنادية التفاعلية</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {activeHadith.paths.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1C1917]">
                          {p.sourceLabel}
                        </span>
                        <span className="text-[#6B655E]">
                          {p.sourceType === 'muhalla' ? 'رواية المحلى' : 'الكتب التسعة'}
                        </span>
                      </div>
                      <p className="text-xs text-[#44403C] leading-relaxed">
                        {[...p.chainNarratorIds]
                          .reverse()
                          .map((id) => narratorMap.get(id)?.name.split('(')[0].trim() || id)
                          .join('  ←  ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
