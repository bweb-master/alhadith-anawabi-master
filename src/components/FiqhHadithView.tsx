import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Scale,
  Search,
  BookMarked,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import {
  MadhabFiqhEntry,
  MadhabName,
  MuhallaHadith,
} from '../types/hadith';
import { normalizeArabic } from '../utils/arabic';

interface FiqhHadithViewProps {
  hadiths: MuhallaHadith[];
  selectedHadithId: string;
  canEdit: boolean;
  onSelectHadith: (id: string) => void;
  onOpenMuhalla: (hadithId: string) => void;
  onEditHadith: (hadithId: string) => void;
}

const MADHAHIB_ORDER: MadhabName[] = ['الحنفي', 'المالكي', 'الشافعي', 'الحنبلي'];

export const FiqhHadithView: React.FC<FiqhHadithViewProps> = ({
  hadiths,
  selectedHadithId,
  canEdit,
  onSelectHadith,
  onOpenMuhalla,
  onEditHadith,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKitab, setSelectedKitab] = useState<string>('الكل');
  const [selectedMadhab, setSelectedMadhab] = useState<'الكل' | MadhabName>('الكل');

  const kutubList = useMemo(() => {
    const set = new Set<string>(hadiths.map((h) => h.kitab));
    return ['الكل', ...Array.from(set)];
  }, [hadiths]);

  const filteredHadiths = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return hadiths.filter((h) => {
      if (selectedKitab !== 'الكل' && h.kitab !== selectedKitab) return false;
      if (!q) return true;
      const madhahibText = (h.fourMadhahibFiqh || [])
        .map(
          (m) =>
            `${m.madhab} ${m.ruling} ${m.sourceBook} ${m.author || ''} ${m.volumePage}`
        )
        .join(' ');
      const searchable = normalizeArabic(
        `${h.issueTitle} ${h.matnWithTashkeel} ${h.fiqhAnalysis} ${h.otherMadhahibNotes || ''} ${madhahibText} ${h.kitab} ${h.volume} ${h.issueNumber}`
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

  const orderedEntries: MadhabFiqhEntry[] = useMemo(() => {
    if (!activeHadith?.fourMadhahibFiqh?.length) return [];
    const byMadhab = new Map<MadhabName, MadhabFiqhEntry>();
    activeHadith.fourMadhahibFiqh.forEach((entry) => {
      byMadhab.set(entry.madhab, entry);
    });
    const sorted = MADHAHIB_ORDER.map((m) => byMadhab.get(m)).filter(
      (x): x is MadhabFiqhEntry => Boolean(x)
    );
    if (selectedMadhab === 'الكل') return sorted;
    return sorted.filter((e) => e.madhab === selectedMadhab);
  }, [activeHadith, selectedMadhab]);

  if (!activeHadith) {
    return (
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-12 text-center">
        <p className="text-lg font-medium text-[#1C1917]">
          لا توجد مسائل مضافة بعد في المنصة
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#854D0E]">
            <Scale className="w-4 h-4" />
            <span>الفقه المقارن الموثّق · المذاهب الأربعة ومذهب ابن حزم</span>
          </div>
          <h1 className="font-hadith text-2xl sm:text-3xl font-bold text-[#1C1917]">
            فقه الحديث في المذاهب الأربعة مع التوثيق
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            استعراض الأقوال الفقهية للمذاهب الأربعة (الحنفي، المالكي، الشافعي، الحنبلي) في كل حديث من مرويات المحلّى موثقة بأسماء المصادر الفقهية المعتمدة وأرقام الأجزاء والصفحات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['الكل', ...MADHAHIB_ORDER] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMadhab(m)}
              className={`btn-hover-motion px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg border cursor-pointer transition-colors ${
                selectedMadhab === m
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-[#FBF9F5] text-[#1C1917] border-[#E6E0D4] hover:border-[#14532D] hover:bg-[#EEF6F1]'
              }`}
            >
              {m === 'الكل' ? 'جميع المذاهب (4)' : `المذهب ${m}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar: Issue Selector */}
        <aside className="lg:col-span-4 bg-white border border-[#E6E0D4] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#E6E0D4] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#1C1917]">
                المسائل الفقهية
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
                placeholder="ابحث في المسألة أو المذهب أو الكتاب أو المؤلف..."
                className="w-full pr-9 pl-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {kutubList.map((kitab) => (
                <button
                  key={kitab}
                  type="button"
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

            {(searchQuery || selectedKitab !== 'الكل') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedKitab('الكل');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#854D0E] hover:text-[#14532D] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط البحث</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-[#E6E0D4] max-h-[650px] overflow-y-auto">
            {filteredHadiths.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#6B655E]">
                لا توجد مسائل مطابقة للبحث الحالي.
              </div>
            ) : (
              filteredHadiths.map((item) => {
                const isSelected = item.id === activeHadith.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectHadith(item.id)}
                    className={`w-full text-right p-4 transition-colors cursor-pointer block ${
                      isSelected ? 'bg-[#F3EFE6]' : 'bg-white hover:bg-[#FBF9F5]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B655E] tabular-nums mb-1">
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
                      className={`text-sm font-semibold leading-snug ${
                        isSelected ? 'text-[#14532D]' : 'text-[#1C1917]'
                      }`}
                    >
                      {item.issueTitle}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Fiqh Comparison & Documentation View */}
        <section className="lg:col-span-8 bg-white border border-[#E6E0D4] rounded-xl p-6 lg:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E6E0D4]">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#6B655E] tabular-nums">
                <span>المحلّى بالآثار</span>
                <span aria-hidden="true">·</span>
                <span>{activeHadith.kitab}</span>
                <span aria-hidden="true">·</span>
                <span>ج {activeHadith.volume}</span>
                {activeHadith.page && activeHadith.page.trim() && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>ص {activeHadith.page}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>مسألة {activeHadith.issueNumber}</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-[#1C1917] leading-snug">
                {activeHadith.issueTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenMuhalla(activeHadith.id)}
                className="btn-hover-motion inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#14532D] bg-[#EEF6F1] border border-[#14532D]/25 hover:bg-[#14532D] hover:text-white rounded-lg cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>نص الحديث والسند</span>
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEditHadith(activeHadith.id)}
                  className="btn-hover-motion inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#1C1917] bg-[#F3EFE6] hover:bg-[#E6E0D4] rounded-lg cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                  <span>تعديل</span>
                </button>
              )}
            </div>
          </div>

          {/* Hadith Text Reference */}
          <div className="islamic-hero-pattern border border-[#E6E0D4] rounded-xl p-5 space-y-2">
            <p className="text-xs font-semibold text-[#854D0E]">الحديث محل الدراسة الفقهية</p>
            <p className="font-hadith text-xl sm:text-2xl text-[#1C1917]">
              «{activeHadith.matnWithTashkeel}»
            </p>
          </div>

          {/* Ibn Hazm Fiqh View */}
          <div className="p-5 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-[#14532D]">
                مذهب الإمام ابن حزم الظاهري (المحلّى بالآثار)
              </h3>
              <span className="text-xs font-semibold text-[#854D0E] tabular-nums">
                ج {activeHadith.volume}
                {activeHadith.page ? ` ص ${activeHadith.page}` : ''} · مسألة{' '}
                {activeHadith.issueNumber}
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-[#292524]">
              {activeHadith.fiqhAnalysis || 'لم تُضف دراسة ابن حزم لهذه المسألة بعد.'}
            </p>
          </div>

          {/* Four Madhahib Documented Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-[#854D0E]" />
                <span>أقوال المذاهب الأربعة وتوثيقها بالكتاب والجزء والصفحة</span>
              </h3>
            </div>

            {orderedEntries.length > 0 ? (
              <>
                {/* Structured Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orderedEntries.map((entry, idx) => (
                    <div
                      key={`${entry.madhab}-${idx}`}
                      className="card-hover-lift p-5 bg-white border border-[#E6E0D4] hover:border-[#14532D] rounded-xl space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E6E0D4]">
                          <span className="text-base font-bold text-[#14532D]">
                            المذهب {entry.madhab}
                          </span>
                          <span className="text-xs font-semibold text-[#854D0E] bg-[#FBF9F5] border border-[#E6E0D4] px-2.5 py-1 rounded-md tabular-nums">
                            {entry.volumePage}
                          </span>
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-[#1C1917]">
                          {entry.ruling}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[#E6E0D4]/70 text-xs text-[#57534E] space-y-1">
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

                {/* Academic Documentation Table */}
                <div className="border border-[#E6E0D4] rounded-xl overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-[#FBF9F5] border-b border-[#E6E0D4] text-xs text-[#6B655E]">
                      <tr>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">المذهب</th>
                        <th className="py-3 px-4 font-semibold">الحكم والقول الفقهي</th>
                        <th className="py-3 px-4 font-semibold">اسم الكتاب</th>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">المؤلف</th>
                        <th className="py-3 px-4 font-semibold whitespace-nowrap">الجزء والصفحة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E0D4]">
                      {orderedEntries.map((entry, idx) => (
                        <tr key={`row-${entry.madhab}-${idx}`} className="hover:bg-[#FBF9F5]">
                          <td className="py-3 px-4 font-bold text-[#14532D] whitespace-nowrap">
                            {entry.madhab}
                          </td>
                          <td className="py-3 px-4 text-[#1C1917] leading-relaxed">
                            {entry.ruling}
                          </td>
                          <td className="py-3 px-4 text-[#44403C]">
                            {entry.sourceBook}
                          </td>
                          <td className="py-3 px-4 text-[#44403C] whitespace-nowrap">
                            {entry.author || 'معتمد المذهب'}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#854D0E] whitespace-nowrap tabular-nums">
                            {entry.volumePage}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-5 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2 text-sm text-[#44403C]">
                <p className="font-semibold text-[#1C1917]">
                  ملحوظة المقارنة المذهبية:
                </p>
                <p className="leading-relaxed">
                  {activeHadith.otherMadhahibNotes ||
                    'لم تُفصّل أقوال المذاهب الأربعة وتوثيق الكتب والصفحات لهذا الحديث بعد.'}
                </p>
              </div>
            )}

            {activeHadith.otherMadhahibNotes && orderedEntries.length > 0 && (
              <div className="p-4 bg-[#F3EFE6]/60 border border-[#E6E0D4] rounded-xl text-sm text-[#44403C]">
                <span className="font-semibold text-[#1C1917]">خلاصة مقارنة المذاهب: </span>
                <span>{activeHadith.otherMadhahibNotes}</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
