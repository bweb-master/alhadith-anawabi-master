import React, { useEffect, useState } from 'react';
import {
  Plus,
  Save,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  GharibEntry,
  MuhallaHadith,
  Narrator,
  NarratorGrade,
  NarratorOrigin,
} from '../types/hadith';

interface ContentEditorViewProps {
  hadiths: MuhallaHadith[];
  narrators: Narrator[];
  initialTab: 'hadith' | 'narrator' | 'export';
  editingHadithId: string | null;
  editingNarratorId: string | null;
  onSaveHadith: (hadith: MuhallaHadith) => void;
  onDeleteHadith: (id: string) => void;
  onSaveNarrator: (narrator: Narrator) => void;
  onDeleteNarrator: (id: string) => void;
  onResetDefaults: () => void;
}

const EMPTY_HADITH = (): MuhallaHadith => ({
  id: `muhalla_${Date.now()}`,
  volume: 1,
  issueNumber: 1,
  kitab: 'كتاب الطهارة',
  issueTitle: '',
  matnWithTashkeel: '',
  ibnHazmIsnadText: '',
  ibnHazmHukm: 'صحيح متصل الإسناد',
  paths: [
    {
      id: `path_${Date.now()}`,
      sourceLabel: 'طريق ابن حزم الأندلسي في المحلى',
      sourceType: 'muhalla',
      chainNarratorIds: ['umar_khattab', 'andalus_talamanki', 'ibn_hazm'],
    },
  ],
  takhrijLinks: [],
  gharib: [],
  fiqhAnalysis: '',
  otherMadhahibNotes: '',
  updatedAt: new Date().toISOString().slice(0, 10),
});

const EMPTY_NARRATOR = (): Narrator => ({
  id: `narr_andalus_${Date.now()}`,
  name: '',
  kunya: '',
  birthYearH: undefined,
  deathYearH: undefined,
  region: 'قرطبة - الأندلس',
  origin: 'andalusian',
  tabaqah: 'شيوخ ابن حزم (أهل الأندلس)',
  grade: 'ثقة',
  ibnHazmVerdict: '',
  teachers: [],
  students: ['ibn_hazm'],
  jarhTaadil: [{ scholar: 'ابن بشكوال', verdict: '' }],
  notes: '',
});

export const ContentEditorView: React.FC<ContentEditorViewProps> = ({
  hadiths,
  narrators,
  initialTab,
  editingHadithId,
  editingNarratorId,
  onSaveHadith,
  onDeleteHadith,
  onSaveNarrator,
  onDeleteNarrator,
  onResetDefaults,
}) => {
  const [subTab, setSubTab] = useState<'hadith' | 'narrator' | 'export'>(initialTab);
  const [hadithForm, setHadithForm] = useState<MuhallaHadith>(() => {
    const found = hadiths.find((h) => h.id === editingHadithId);
    return found ? structuredClone(found) : hadiths[0] ? structuredClone(hadiths[0]) : EMPTY_HADITH();
  });
  const [narratorForm, setNarratorForm] = useState<Narrator>(() => {
    const found = narrators.find((n) => n.id === editingNarratorId);
    return found ? structuredClone(found) : narrators[0] ? structuredClone(narrators[0]) : EMPTY_NARRATOR();
  });
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (editingHadithId === '__NEW__') {
      setHadithForm(EMPTY_HADITH());
      setSubTab('hadith');
    } else if (editingHadithId) {
      const found = hadiths.find((h) => h.id === editingHadithId);
      if (found) {
        setHadithForm(structuredClone(found));
        setSubTab('hadith');
      }
    }
  }, [editingHadithId, hadiths]);

  useEffect(() => {
    if (editingNarratorId === '__NEW__') {
      setNarratorForm(EMPTY_NARRATOR());
      setSubTab('narrator');
    } else if (editingNarratorId) {
      const found = narrators.find((n) => n.id === editingNarratorId);
      if (found) {
        setNarratorForm(structuredClone(found));
        setSubTab('narrator');
      }
    }
  }, [editingNarratorId, narrators]);

  const showNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleHadithSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hadithForm.issueTitle.trim() || !hadithForm.matnWithTashkeel.trim()) return;
    onSaveHadith({
      ...hadithForm,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    showNotice('تم حفظ الحديث وتحديثه في المنصة بنجاح.');
  };

  const handleNarratorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!narratorForm.name.trim()) return;
    onSaveNarrator({
      ...narratorForm,
      jarhTaadil: narratorForm.jarhTaadil.filter((j) => j.scholar.trim() || j.verdict.trim()),
    });
    showNotice('تم حفظ بيانات الراوي في معجم الرواة بنجاح.');
  };

  const addGharibRow = () => {
    const newEntry: GharibEntry = { word: '', meaning: '', source: 'النهاية لابن الأثير' };
    setHadithForm((prev) => ({ ...prev, gharib: [...prev.gharib, newEntry] }));
  };

  const downloadJson = (filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Editor Sub-navigation */}
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg">
          <button
            onClick={() => setSubTab('hadith')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'hadith'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            تحرير وإضافة أحاديث المحلّى
          </button>
          <button
            onClick={() => setSubTab('narrator')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'narrator'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            إضافة وتعديل الرواة الأندلسيين
          </button>
          <button
            onClick={() => setSubTab('export')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'export'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            تصدير الملفات لمستودع GitHub
          </button>
        </div>

        {savedNotice && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#14532D]">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      {/* Sub-Tab 1: Muhalla Hadith Editor */}
      {subTab === 'hadith' && (
        <form
          onSubmit={handleHadithSubmit}
          className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6E0D4]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#1C1917]">اختر مسألة للتعديل:</span>
              <select
                value={hadiths.some((h) => h.id === hadithForm.id) ? hadithForm.id : '__NEW__'}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setHadithForm(EMPTY_HADITH());
                  } else {
                    const found = hadiths.find((h) => h.id === e.target.value);
                    if (found) setHadithForm(structuredClone(found));
                  }
                }}
                className="px-3 py-1.5 text-xs bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              >
                <option value="__NEW__">+ إنشاء حديث جديد من المحلى</option>
                {hadiths.map((h) => (
                  <option key={h.id} value={h.id}>
                    مسألة {h.issueNumber}: {h.issueTitle.slice(0, 45)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHadithForm(EMPTY_HADITH())}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>حديث جديد</span>
              </button>
              {hadiths.some((h) => h.id === hadithForm.id) && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteHadith(hadithForm.id);
                    setHadithForm(EMPTY_HADITH());
                    showNotice('تم حذف السجل.');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الكتاب الفقهي</span>
              <input
                type="text"
                value={hadithForm.kitab}
                onChange={(e) => setHadithForm({ ...hadithForm, kitab: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">المجلد</span>
              <input
                type="number"
                value={hadithForm.volume}
                onChange={(e) =>
                  setHadithForm({ ...hadithForm, volume: Number(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg tabular-nums"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">رقم المسألة</span>
              <input
                type="number"
                value={hadithForm.issueNumber}
                onChange={(e) =>
                  setHadithForm({ ...hadithForm, issueNumber: Number(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg tabular-nums"
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">عنوان المسألة في المحلّى</span>
            <input
              type="text"
              required
              value={hadithForm.issueTitle}
              onChange={(e) => setHadithForm({ ...hadithForm, issueTitle: e.target.value })}
              placeholder="مثال: مسألة: حكم التيمم عند عدم الماء..."
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">متن الحديث النبوي</span>
            <textarea
              rows={3}
              required
              value={hadithForm.matnWithTashkeel}
              onChange={(e) =>
                setHadithForm({ ...hadithForm, matnWithTashkeel: e.target.value })
              }
              className="w-full px-3 py-2 text-base font-hadith bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">نص سند ابن حزم في المحلى</span>
            <textarea
              rows={2}
              value={hadithForm.ibnHazmIsnadText}
              onChange={(e) =>
                setHadithForm({ ...hadithForm, ibnHazmIsnadText: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-hadith bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>

          {/* Chain Narrator Sequence Builder for Ibn Hazm Path */}
          {hadithForm.paths[0] && (
            <div className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1C1917]">
                  تكوين شجرة سلسلة إسناد ابن حزم (من الصحابي إلى ابن حزم)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const updated = structuredClone(hadithForm.paths);
                    updated[0].chainNarratorIds.push(narrators[0]?.id || 'ibn_hazm');
                    setHadithForm({ ...hadithForm, paths: updated });
                  }}
                  className="text-xs font-medium text-[#14532D] hover:underline cursor-pointer"
                >
                  + إضافة طبقة راوٍ
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hadithForm.paths[0].chainNarratorIds.map((nid, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <select
                      value={nid}
                      onChange={(e) => {
                        const updated = structuredClone(hadithForm.paths);
                        updated[0].chainNarratorIds[idx] = e.target.value;
                        setHadithForm({ ...hadithForm, paths: updated });
                      }}
                      className="px-2 py-1.5 text-xs bg-white border border-[#E6E0D4] rounded-md"
                    >
                      {narrators.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name.split('(')[0].trim()}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = structuredClone(hadithForm.paths);
                        updated[0].chainNarratorIds.splice(idx, 1);
                        setHadithForm({ ...hadithForm, paths: updated });
                      }}
                      className="text-xs text-red-600 px-1 cursor-pointer"
                      title="إزالة"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">حكم ابن حزم على الحديث</span>
              <input
                type="text"
                value={hadithForm.ibnHazmHukm}
                onChange={(e) => setHadithForm({ ...hadithForm, ibnHazmHukm: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">مقارنة المذاهب الفقهية</span>
              <input
                type="text"
                value={hadithForm.otherMadhahibNotes || ''}
                onChange={(e) =>
                  setHadithForm({ ...hadithForm, otherMadhahibNotes: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">فقه الحديث واستنباط ابن حزم</span>
            <textarea
              rows={3}
              value={hadithForm.fiqhAnalysis}
              onChange={(e) => setHadithForm({ ...hadithForm, fiqhAnalysis: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>

          {/* Gharib Editor */}
          <div className="space-y-3 pt-2 border-t border-[#E6E0D4]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C1917]">مفردات غريب الحديث</span>
              <button
                type="button"
                onClick={addGharibRow}
                className="text-xs font-medium text-[#14532D] hover:underline cursor-pointer"
              >
                + إضافة لفظ غريب
              </button>
            </div>
            {hadithForm.gharib.map((g, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اللفظ"
                  value={g.word}
                  onChange={(e) => {
                    const next = [...hadithForm.gharib];
                    next[idx] = { ...next[idx], word: e.target.value };
                    setHadithForm({ ...hadithForm, gharib: next });
                  }}
                  className="px-3 py-1.5 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-md"
                />
                <input
                  type="text"
                  placeholder="المعنى اللغوي"
                  value={g.meaning}
                  onChange={(e) => {
                    const next = [...hadithForm.gharib];
                    next[idx] = { ...next[idx], meaning: e.target.value };
                    setHadithForm({ ...hadithForm, gharib: next });
                  }}
                  className="px-3 py-1.5 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-md"
                />
                <input
                  type="text"
                  placeholder="المصدر"
                  value={g.source}
                  onChange={(e) => {
                    const next = [...hadithForm.gharib];
                    next[idx] = { ...next[idx], source: e.target.value };
                    setHadithForm({ ...hadithForm, gharib: next });
                  }}
                  className="px-3 py-1.5 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-md"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t border-[#E6E0D4]">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الحديث في المنصة</span>
            </button>
          </div>
        </form>
      )}

      {/* Sub-Tab 2: Narrator Editor */}
      {subTab === 'narrator' && (
        <form
          onSubmit={handleNarratorSubmit}
          className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6E0D4]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#1C1917]">اختر راوياً للتعديل:</span>
              <select
                value={narrators.some((n) => n.id === narratorForm.id) ? narratorForm.id : '__NEW__'}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setNarratorForm(EMPTY_NARRATOR());
                  } else {
                    const found = narrators.find((n) => n.id === e.target.value);
                    if (found) setNarratorForm(structuredClone(found));
                  }
                }}
                className="px-3 py-1.5 text-xs bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              >
                <option value="__NEW__">+ إضافة راوٍ أندلسي / محدث جديد</option>
                {narrators.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNarratorForm(EMPTY_NARRATOR())}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>راوٍ جديد</span>
              </button>
              {narrators.some((n) => n.id === narratorForm.id) && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteNarrator(narratorForm.id);
                    setNarratorForm(EMPTY_NARRATOR());
                    showNotice('تم حذف الراوي.');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الاسم الكامل للراوي</span>
              <input
                type="text"
                required
                value={narratorForm.name}
                onChange={(e) => setNarratorForm({ ...narratorForm, name: e.target.value })}
                placeholder="مثال: بقي بن مخلد القرطبي الأندلسي"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الكنية</span>
              <input
                type="text"
                value={narratorForm.kunya || ''}
                onChange={(e) => setNarratorForm({ ...narratorForm, kunya: e.target.value })}
                placeholder="أبو عبد الرحمن"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">التصنيف / المدرسة</span>
              <select
                value={narratorForm.origin}
                onChange={(e) =>
                  setNarratorForm({ ...narratorForm, origin: e.target.value as NarratorOrigin })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              >
                <option value="andalusian">راوٍ أندلسي</option>
                <option value="classical">راوٍ من الطبقات</option>
                <option value="companion">صحابي</option>
                <option value="compiler">إمام مصنف</option>
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الرتبة</span>
              <select
                value={narratorForm.grade}
                onChange={(e) =>
                  setNarratorForm({ ...narratorForm, grade: e.target.value as NarratorGrade })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              >
                <option value="ثقة حجة">ثقة حجة</option>
                <option value="ثقة">ثقة</option>
                <option value="صدوق">صدوق</option>
                <option value="مختلف فيه">مختلف فيه</option>
                <option value="صحابي">صحابي</option>
                <option value="إمام مصنف">إمام مصنف</option>
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">البلد / الإقليم</span>
              <input
                type="text"
                value={narratorForm.region}
                onChange={(e) => setNarratorForm({ ...narratorForm, region: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">سنة الوفاة (هـ)</span>
              <input
                type="number"
                value={narratorForm.deathYearH || ''}
                onChange={(e) =>
                  setNarratorForm({
                    ...narratorForm,
                    deathYearH: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg tabular-nums"
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">الطبقة</span>
            <input
              type="text"
              value={narratorForm.tabaqah}
              onChange={(e) => setNarratorForm({ ...narratorForm, tabaqah: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">موقف ابن حزم من الراوي</span>
            <textarea
              rows={2}
              value={narratorForm.ibnHazmVerdict}
              onChange={(e) =>
                setNarratorForm({ ...narratorForm, ibnHazmVerdict: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">ملاحظات علمية وبحثية</span>
            <textarea
              rows={2}
              value={narratorForm.notes}
              onChange={(e) => setNarratorForm({ ...narratorForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>

          <div className="flex justify-end pt-3 border-t border-[#E6E0D4]">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ بيانات الراوي</span>
            </button>
          </div>
        </form>
      )}

      {/* Sub-Tab 3: Export JSON for GitHub */}
      {subTab === 'export' && (
        <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-6">
          <div className="space-y-1.5 max-w-2xl">
            <h3 className="text-lg font-bold text-[#1C1917]">
              تصدير بياناتك المحدّثة إلى مستودع GitHub
            </h3>
            <p className="text-sm text-[#6B655E] leading-relaxed">
              كل ما تضيفه أو تعدله في المنصة يُحفظ فوراً في متصفحك. يمكنك تنزيل ملفات JSON المحدثة ووضعها في مجلد <code className="font-mono text-xs">data/</code> بمستودعك <code className="font-mono text-xs">bweb-master/alhadith-anawabi-master</code> ثم رفعها عبر GitHub Desktop.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => downloadJson('muhalla_hadiths.json', hadiths)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل أحاديث المحلّى (JSON)</span>
            </button>

            <button
              onClick={() =>
                downloadJson(
                  'andalusians_and_narrators.json',
                  narrators
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل الرواة والأندلسيين (JSON)</span>
            </button>

            <button
              onClick={() => {
                onResetDefaults();
                showNotice('تمت استعادة البيانات البحثية الافتراضية.');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#6B655E] hover:text-[#1C1917] border border-[#E6E0D4] rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>استعادة البيانات الافتراضية</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
