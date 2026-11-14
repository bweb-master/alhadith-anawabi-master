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
} from 'lucide-react';
import {
  MuhallaHadith,
  Narrator,
  NineBookHadith,
} from '../types/hadith';
import { NINE_BOOKS_META } from '../data/seedData';
import { computeTakhrijMatch, normalizeArabic } from '../utils/arabic';

interface MuhallaArchiveViewProps {
  hadiths: MuhallaHadith[];
  narrators: Narrator[];
  nineBooksCorpus: NineBookHadith[];
  selectedHadithId: string;
  onSelectHadith: (id: string) => void;
  onOpenTree: (hadithId: string) => void;
  onOpenNarrator: (narratorId: string) => void;
  onEditHadith: (hadithId: string) => void;
  onRunAutoTakhrij: (text: string) => void;
}

type DetailTab = 'takhrij' | 'fiqh' | 'gharib' | 'paths';

export const MuhallaArchiveView: React.FC<MuhallaArchiveViewProps> = ({
  hadiths,
  narrators,
  nineBooksCorpus,
  selectedHadithId,
  onSelectHadith,
  onOpenTree,
  onOpenNarrator,
  onEditHadith,
  onRunAutoTakhrij,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKitab, setSelectedKitab] = useState<string>('الكل');
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

  const filteredHadiths = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return hadiths.filter((h) => {
      const matchesKitab = selectedKitab === 'الكل' || h.kitab === selectedKitab;
      if (!matchesKitab) return false;
      if (!q) return true;
      const searchable = normalizeArabic(
        `${h.issueTitle} ${h.matnWithTashkeel} ${h.ibnHazmIsnadText} ${h.kitab} ${h.issueNumber}`
      );
      return searchable.includes(q);
    });
  }, [hadiths, searchQuery, selectedKitab]);

  const activeHadith = useMemo(
    () =>
      hadiths.find((h) => h.id === selectedHadithId) ||
      filteredHadiths[0] ||
      hadiths[0],
    [hadiths, filteredHadiths, selectedHadithId]
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
        <p className="text-sm text-[#6B655E] mt-2">
          انتقل إلى تبويب «إدارة المحتوى والتعديل» لإضافة أول حديث من المحلى.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Right Sidebar (RTL): Search & List of Muhalla Issues */}
      <aside className="lg:col-span-4 bg-white border border-[#E6E0D4] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#E6E0D4] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#1C1917]">فهرس مرويات المحلّى</h2>
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
              placeholder="ابحث في المتن أو رقم المسألة..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] transition-colors"
            />
          </div>

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
                  <div className="flex items-center gap-2 text-xs text-[#6B655E] tabular-nums mb-1.5">
                    <span>{item.kitab}</span>
                    <span aria-hidden="true">·</span>
                    <span>ج {item.volume}</span>
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
              <span>المحلى بالآثار</span>
              <span aria-hidden="true">·</span>
              <span>{activeHadith.kitab}</span>
              <span aria-hidden="true">·</span>
              <span>المجلد {activeHadith.volume}</span>
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
            <button
              onClick={() => onEditHadith(activeHadith.id)}
              className="btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#1C1917] bg-[#F3EFE6] hover:bg-[#E6E0D4] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              <span>تعديل</span>
            </button>
          </div>
        </div>

        {/* Prophetic Text (Matn) & Ibn Hazm Isnad */}
        <div className="space-y-5 max-w-prose">
          <div className="islamic-hero-pattern border border-[#E6E0D4] rounded-xl p-6 space-y-4">
            <p className="text-sm font-semibold text-[#854D0E]">متن الحديث النبوي</p>
            <p className="font-hadith text-2xl lg:text-3xl text-[#1C1917]">
              «{activeHadith.matnWithTashkeel}»
            </p>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-base font-semibold text-[#1C1917]">
              سند ابن حزم الأندلسي في المحلّى
            </h3>
            <p className="font-hadith text-xl text-[#44403C] leading-relaxed">
              {activeHadith.ibnHazmIsnadText}
            </p>
          </div>

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
                          onClick={() => onOpenNarrator(nid)}
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

        {/* Sub-Navigation for Scholarly Disciplines */}
        <div className="pt-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg w-fit">
            <button
              onClick={() => setActiveDetailTab('takhrij')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeDetailTab === 'takhrij'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>التخريج في الكتب التسعة ({activeHadith.takhrijLinks.length})</span>
            </button>
            <button
              onClick={() => setActiveDetailTab('fiqh')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeDetailTab === 'fiqh'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>فقه الحديث</span>
            </button>
            <button
              onClick={() => setActiveDetailTab('gharib')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeDetailTab === 'gharib'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>غريب الحديث ({activeHadith.gharib.length})</span>
            </button>
            <button
              onClick={() => setActiveDetailTab('paths')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeDetailTab === 'paths'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>طرق الحديث ({activeHadith.paths.length})</span>
            </button>
          </div>

          {/* Tab Panel Content */}
          <div className="mt-5">
            {activeDetailTab === 'takhrij' && (
              <div className="space-y-6">
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
                    <p className="text-sm text-[#6B655E]">لم يتم ربط مواضع تخريج بعد.</p>
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
              <div className="space-y-5 max-w-prose">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#1C1917]">
                    استنباط ابن حزم الأندلسي ومنهجه الفقهي في المسألة
                  </h4>
                  <p className="text-[15px] leading-relaxed text-[#292524]">
                    {activeHadith.fiqhAnalysis}
                  </p>
                </div>
                {activeHadith.otherMadhahibNotes && (
                  <div className="pt-4 border-t border-[#E6E0D4] space-y-1.5">
                    <h4 className="text-sm font-semibold text-[#1C1917]">
                      مقارنة بمذاهب الفقهاء
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
