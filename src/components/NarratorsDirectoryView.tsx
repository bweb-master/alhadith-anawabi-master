import React, { useMemo, useState } from 'react';
import { Search, Pencil, UserPlus } from 'lucide-react';
import { Narrator, NarratorOrigin } from '../types/hadith';
import { normalizeArabic } from '../utils/arabic';

interface NarratorsDirectoryViewProps {
  narrators: Narrator[];
  selectedNarratorId: string;
  onSelectNarrator: (id: string) => void;
  onEditNarrator: (id: string) => void;
  onNewNarrator: () => void;
}

const ORIGIN_LABELS: Record<NarratorOrigin | 'all', string> = {
  all: 'جميع الرواة',
  andalusian: 'الرواة الأندلسيون',
  classical: 'رواة الطبقات',
  companion: 'الصحابة',
  compiler: 'أئمة الكتب التسعة',
};

export const NarratorsDirectoryView: React.FC<NarratorsDirectoryViewProps> = ({
  narrators,
  selectedNarratorId,
  onSelectNarrator,
  onEditNarrator,
  onNewNarrator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState<NarratorOrigin | 'all'>('all');

  const narratorMap = useMemo(() => {
    const map = new Map<string, Narrator>();
    narrators.forEach((n) => map.set(n.id, n));
    return map;
  }, [narrators]);

  const filteredNarrators = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return narrators.filter((n) => {
      if (originFilter !== 'all' && n.origin !== originFilter) return false;
      if (!q) return true;
      const hay = normalizeArabic(
        `${n.name} ${n.kunya || ''} ${n.region} ${n.tabaqah} ${n.notes}`
      );
      return hay.includes(q);
    });
  }, [narrators, searchQuery, originFilter]);

  const activeNarrator = useMemo(
    () =>
      narrators.find((n) => n.id === selectedNarratorId) ||
      filteredNarrators[0] ||
      narrators[0],
    [narrators, filteredNarrators, selectedNarratorId]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Sidebar Directory */}
      <aside className="lg:col-span-4 bg-white border border-[#E6E0D4] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#E6E0D4] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#1C1917]">معجم الرواة والأندلسيين</h2>
            <button
              onClick={onNewNarrator}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#14532D] hover:underline cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة راوٍ</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#6B655E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو البلد (قرطبة، طلمنكة)..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ORIGIN_LABELS) as (NarratorOrigin | 'all')[]).map((key) => (
              <button
                key={key}
                onClick={() => setOriginFilter(key)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  originFilter === key
                    ? 'bg-[#14532D] text-white'
                    : 'bg-[#F3EFE6] text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {ORIGIN_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#E6E0D4] max-h-[650px] overflow-y-auto">
          {filteredNarrators.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6B655E]">
              لا يوجد رواة مطابقون للبحث.
            </div>
          ) : (
            filteredNarrators.map((n) => {
              const isSelected = activeNarrator?.id === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => onSelectNarrator(n.id)}
                  className={`w-full text-right p-4 transition-colors cursor-pointer block ${
                    isSelected ? 'bg-[#F3EFE6]' : 'bg-white hover:bg-[#FBF9F5]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-[#6B655E] tabular-nums mb-1">
                    <span
                      className={
                        n.origin === 'andalusian'
                          ? 'text-[#854D0E] font-medium'
                          : 'text-[#14532D]'
                      }
                    >
                      {ORIGIN_LABELS[n.origin]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{n.region}</span>
                    {n.deathYearH && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>ت {n.deathYearH}هـ</span>
                      </>
                    )}
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-[#14532D]' : 'text-[#1C1917]'
                    }`}
                  >
                    {n.name}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Narrator Detail Biography */}
      <section className="lg:col-span-8 bg-white border border-[#E6E0D4] rounded-xl p-6 lg:p-8 space-y-6">
        {!activeNarrator ? (
          <p className="text-sm text-[#6B655E]">اختر راوياً لعرض ترجمته.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E6E0D4]">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B655E] tabular-nums">
                  <span className="text-[#854D0E] font-medium">
                    {ORIGIN_LABELS[activeNarrator.origin]}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeNarrator.tabaqah}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeNarrator.region}</span>
                  {activeNarrator.birthYearH && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>ولد {activeNarrator.birthYearH}هـ</span>
                    </>
                  )}
                  {activeNarrator.deathYearH && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>توفي {activeNarrator.deathYearH}هـ</span>
                    </>
                  )}
                </div>

                <h1 className="text-xl lg:text-2xl font-bold text-[#1C1917]">
                  {activeNarrator.name}
                </h1>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[#44403C]">
                  {activeNarrator.kunya && <span>الكنية: {activeNarrator.kunya}</span>}
                  {activeNarrator.kunya && <span aria-hidden="true">·</span>}
                  <span className="font-semibold text-[#14532D]">
                    الرتبة الحديثية: {activeNarrator.grade}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onEditNarrator(activeNarrator.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>تعديل الترجمة</span>
              </button>
            </div>

            {/* Ibn Hazm's Verdict */}
            <div className="bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl p-5 space-y-1.5 max-w-prose">
              <h3 className="text-xs font-semibold text-[#854D0E]">
                موقف الإمام ابن حزم الأندلسي من الراوي
              </h3>
              <p className="text-sm text-[#1C1917] leading-relaxed">
                {activeNarrator.ibnHazmVerdict}
              </p>
            </div>

            {/* Jarh and Taadil */}
            <div className="space-y-3 max-w-prose">
              <h3 className="text-sm font-semibold text-[#1C1917]">
                أقوال أئمة الجرح والتعديل
              </h3>
              {activeNarrator.jarhTaadil.length === 0 ? (
                <p className="text-sm text-[#6B655E]">لم تضاف أقوال بعد.</p>
              ) : (
                <div className="divide-y divide-[#E6E0D4] border border-[#E6E0D4] rounded-lg">
                  {activeNarrator.jarhTaadil.map((jt, idx) => (
                    <div key={idx} className="p-3.5 space-y-1">
                      <p className="text-xs font-semibold text-[#14532D]">{jt.scholar}</p>
                      <p className="text-sm text-[#292524] leading-relaxed">{jt.verdict}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teachers & Students Network */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#E6E0D4]">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#6B655E]">شيوخه (روى عن)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeNarrator.teachers.length === 0 ? (
                    <span className="text-xs text-[#6B655E]">—</span>
                  ) : (
                    activeNarrator.teachers.map((tid) => {
                      const linked = narratorMap.get(tid);
                      return linked ? (
                        <button
                          key={tid}
                          onClick={() => onSelectNarrator(linked.id)}
                          className="px-2.5 py-1 text-xs bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-md cursor-pointer"
                        >
                          {linked.name.split('(')[0].trim()}
                        </button>
                      ) : (
                        <span
                          key={tid}
                          className="px-2.5 py-1 text-xs bg-[#FBF9F5] border border-[#E6E0D4] text-[#44403C] rounded-md"
                        >
                          {tid}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#6B655E]">تلاميذه (روى عنه)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeNarrator.students.length === 0 ? (
                    <span className="text-xs text-[#6B655E]">—</span>
                  ) : (
                    activeNarrator.students.map((sid) => {
                      const linked = narratorMap.get(sid);
                      return linked ? (
                        <button
                          key={sid}
                          onClick={() => onSelectNarrator(linked.id)}
                          className="px-2.5 py-1 text-xs bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-md cursor-pointer"
                        >
                          {linked.name.split('(')[0].trim()}
                        </button>
                      ) : (
                        <span
                          key={sid}
                          className="px-2.5 py-1 text-xs bg-[#FBF9F5] border border-[#E6E0D4] text-[#44403C] rounded-md"
                        >
                          {sid}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {activeNarrator.notes && (
              <div className="pt-3 border-t border-[#E6E0D4] space-y-1 max-w-prose">
                <h4 className="text-xs font-semibold text-[#6B655E]">ملاحظات علمية</h4>
                <p className="text-sm text-[#44403C] leading-relaxed">
                  {activeNarrator.notes}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
