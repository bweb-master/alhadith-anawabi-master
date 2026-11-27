import React, { useState } from 'react';
import {
  Palette,
  LayoutGrid,
  Type,
  GitBranch,
  Users,
  Volume2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Image as ImageIcon,
  Youtube,
  BookOpen,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  ARABIC_FONT_OPTIONS,
  ArabicUiFontKey,
  ButtonShapeStyle,
  ClickSoundType,
  DEFAULT_PLATFORM_SETTINGS,
  getFontCssValue,
  MotionLevel,
  PagePatternType,
  PlatformSettings,
} from '../types/settings';
import { SmartImage, SmartMediaViewer } from './SmartMedia';
import { playClickSound } from '../utils/soundEffects';

interface PlatformSettingsPanelProps {
  mode: 'appearance' | 'about_settings';
  settings: PlatformSettings;
  isBusy: boolean;
  onSaveSettings: (next: PlatformSettings) => Promise<void>;
  onJumpToTab: (
    tab: 'hadith' | 'narrator' | 'bulk' | 'users' | 'export'
  ) => void;
}

export const PlatformSettingsPanel: React.FC<PlatformSettingsPanelProps> = ({
  mode,
  settings,
  isBusy,
  onSaveSettings,
  onJumpToTab,
}) => {
  const [draft, setDraft] = useState<PlatformSettings>(() =>
    structuredClone(settings)
  );
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<
    'auto' | 'image' | 'video' | 'youtube'
  >('auto');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(draft);
  };

  const handleAddMedia = () => {
    if (!newMediaUrl.trim()) return;
    setDraft((prev) => ({
      ...prev,
      home: {
        ...prev.home,
        heroMedia: [
          ...prev.home.heroMedia,
          {
            id: `media_${Date.now()}`,
            title: newMediaTitle.trim(),
            url: newMediaUrl.trim(),
            mediaType: newMediaType,
          },
        ],
      },
    }));
    setNewMediaTitle('');
    setNewMediaUrl('');
    setNewMediaType('auto');
  };

  const handleAddContributor = () => {
    setDraft((prev) => ({
      ...prev,
      about: {
        ...prev.about,
        contributors: [
          ...prev.about.contributors,
          {
            id: `contrib_${Date.now()}`,
            name: '',
            title: 'طالب باحث',
            role: '',
            photoUrl: '',
            bio: '',
          },
        ],
      },
    }));
  };

  const handleAddObjective = () => {
    setDraft((prev) => ({
      ...prev,
      about: {
        ...prev.about,
        objectives: [
          ...prev.about.objectives,
          {
            num: `0${prev.about.objectives.length + 1}`,
            title: '',
            body: '',
          },
        ],
      },
    }));
  };

  if (mode === 'about_settings') {
    return (
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D4] pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#1C1917]">
                تعديل محور «حول المنصة» والمشاركون
              </h3>
              <p className="text-xs text-[#6B655E]">
                تعديل التعريف بالمنصة وأهدافها وإضافة المشاركين وصفاتهم وأدوارهم وروابط صورهم الشخصية (يدعم Google Drive والروابط المباشرة).
              </p>
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="btn-hover-motion inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isBusy ? 'جاري الحفظ...' : 'حفظ محور حول المنصة'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">العنوان التمهيدي العلوي</span>
              <input
                type="text"
                value={draft.about.eyebrow}
                onChange={(e) =>
                  setDraft({ ...draft, about: { ...draft.about, eyebrow: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">العنوان الرئيسي لصفحة حول المنصة</span>
              <input
                type="text"
                value={draft.about.title}
                onChange={(e) =>
                  setDraft({ ...draft, about: { ...draft.about, title: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الإشراف العلمي</span>
              <input
                type="text"
                value={draft.about.supervisionText}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    about: { ...draft.about, supervisionText: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الفوج / الإعداد</span>
              <input
                type="text"
                value={draft.about.batchText}
                onChange={(e) =>
                  setDraft({ ...draft, about: { ...draft.about, batchText: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">النص التعريفي حول المنصة</span>
            <textarea
              rows={3}
              value={draft.about.description}
              onChange={(e) =>
                setDraft({ ...draft, about: { ...draft.about, description: e.target.value } })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>
        </div>

        {/* Contributors Manager */}
        <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#854D0E]" />
              <div>
                <h4 className="text-base font-bold text-[#1C1917]">
                  المشاركون وصفاتهم وأدوارهم وروابط صورهم الشخصية
                </h4>
                <p className="text-xs text-[#6B655E]">
                  يمكنك لصق رابط صورة مباشر أو رابط مشاركة من Google Drive (تُعرض الصورة تلقائياً).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddContributor}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة مشارك</span>
            </button>
          </div>

          <div className="space-y-4">
            {draft.about.contributors.map((person, idx) => (
              <div
                key={person.id}
                className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-[#D6CEBE] bg-white flex items-center justify-center shrink-0">
                      <SmartImage
                        src={person.photoUrl}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        fallbackElement={
                          <span className="text-xs font-bold text-[#14532D]">
                            {(person.name || 'ص').slice(0, 2)}
                          </span>
                        }
                      />
                    </div>
                    <span className="text-xs font-bold text-[#854D0E]">
                      المشارك رقم {idx + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        about: {
                          ...draft.about,
                          contributors: draft.about.contributors.filter(
                            (c) => c.id !== person.id
                          ),
                        },
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded-md cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-xs font-medium text-[#44403C]">الاسم الكامل</span>
                    <input
                      type="text"
                      value={person.name}
                      onChange={(e) => {
                        const next = [...draft.about.contributors];
                        next[idx] = { ...person, name: e.target.value };
                        setDraft({ ...draft, about: { ...draft.about, contributors: next } });
                      }}
                      placeholder="مثال: د. عبد الكريم خلفي / الباحث فلان..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D4] rounded-lg"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs font-medium text-[#44403C]">الصفة العلمية / الأكاديمية</span>
                    <input
                      type="text"
                      value={person.title}
                      onChange={(e) => {
                        const next = [...draft.about.contributors];
                        next[idx] = { ...person, title: e.target.value };
                        setDraft({ ...draft, about: { ...draft.about, contributors: next } });
                      }}
                      placeholder="مثال: المشرف العلمي / طالب باحث..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D4] rounded-lg"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs font-medium text-[#44403C]">الدور في المشروع</span>
                    <input
                      type="text"
                      value={person.role}
                      onChange={(e) => {
                        const next = [...draft.about.contributors];
                        next[idx] = { ...person, role: e.target.value };
                        setDraft({ ...draft, about: { ...draft.about, contributors: next } });
                      }}
                      placeholder="مثال: تخريج أحاديث الطهارة وتوثيق التراجم..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E6E0D4] rounded-lg"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs font-medium text-[#44403C]">
                      رابط الصورة الشخصية (Google Drive أو رابط مباشر)
                    </span>
                    <input
                      type="url"
                      dir="ltr"
                      value={person.photoUrl}
                      onChange={(e) => {
                        const next = [...draft.about.contributors];
                        next[idx] = { ...person, photoUrl: e.target.value };
                        setDraft({ ...draft, about: { ...draft.about, contributors: next } });
                      }}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E6E0D4] rounded-lg text-left font-mono"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Objectives Editor */}
        <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-base font-bold text-[#1C1917]">أهداف المنصة المعروضة</h4>
            <button
              type="button"
              onClick={handleAddObjective}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#F3EFE6] hover:bg-[#E6E0D4] rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة هدف</span>
            </button>
          </div>
          <div className="space-y-3">
            {draft.about.objectives.map((obj, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={obj.num}
                    onChange={(e) => {
                      const next = [...draft.about.objectives];
                      next[idx] = { ...obj, num: e.target.value };
                      setDraft({ ...draft, about: { ...draft.about, objectives: next } });
                    }}
                    className="w-20 px-2.5 py-1 text-xs font-mono bg-white border border-[#E6E0D4] rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        about: {
                          ...draft.about,
                          objectives: draft.about.objectives.filter((_, i) => i !== idx),
                        },
                      })
                    }
                    className="text-xs text-red-700 hover:underline cursor-pointer"
                  >
                    حذف الهدف
                  </button>
                </div>
                <input
                  type="text"
                  value={obj.title}
                  onChange={(e) => {
                    const next = [...draft.about.objectives];
                    next[idx] = { ...obj, title: e.target.value };
                    setDraft({ ...draft, about: { ...draft.about, objectives: next } });
                  }}
                  placeholder="عنوان الهدف..."
                  className="w-full px-3 py-1.5 text-sm font-semibold bg-white border border-[#E6E0D4] rounded-lg"
                />
                <textarea
                  rows={2}
                  value={obj.body}
                  onChange={(e) => {
                    const next = [...draft.about.objectives];
                    next[idx] = { ...obj, body: e.target.value };
                    setDraft({ ...draft, about: { ...draft.about, objectives: next } });
                  }}
                  placeholder="تفصيل الهدف..."
                  className="w-full px-3 py-1.5 text-sm bg-white border border-[#E6E0D4] rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      </form>
    );
  }

  // mode === 'appearance'
  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Sticky / Top Save Bar */}
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#1C1917]">
            تخصيص الواجهة والمظهر والتحكم بمكونات المنصة
          </h3>
          <p className="text-xs text-[#6B655E]">
            عدّل الصفحة الرئيسية، الشعار، الخطوط، الألوان، الخلفية، الأزرار، أصوات النقر، نص الحديث، وشجرة الإسناد.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDraft(structuredClone(DEFAULT_PLATFORM_SETTINGS))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="btn-hover-motion inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isBusy ? 'جاري الحفظ...' : 'حفظ إعدادات المنصة'}</span>
          </button>
        </div>
      </div>

      {/* 1. Module Control Cards & Quick Action Buttons */}
      <section className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-[#14532D]" />
          <h4 className="text-base font-bold text-[#1C1917]">
            أزرار وبطاقات التحكم بمكونات المنصة
          </h4>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onJumpToTab('hadith')}
            className="card-hover-lift text-right p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-1.5 cursor-pointer"
          >
            <BookOpen className="w-5 h-5 text-[#14532D]" />
            <p className="text-sm font-bold text-[#1C1917]">إدارة أحاديث المحلّى</p>
            <p className="text-xs text-[#6B655E]">إضافة وتعديل وحذف المرويات والأسانيد</p>
          </button>
          <button
            type="button"
            onClick={() => onJumpToTab('narrator')}
            className="card-hover-lift text-right p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-1.5 cursor-pointer"
          >
            <Users className="w-5 h-5 text-[#854D0E]" />
            <p className="text-sm font-bold text-[#1C1917]">إدارة بطاقات الرواة</p>
            <p className="text-xs text-[#6B655E]">تعديل تراجم الأندلسيين والجرح والتعديل</p>
          </button>
          <button
            type="button"
            onClick={() => onJumpToTab('bulk')}
            className="card-hover-lift text-right p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-5 h-5 text-[#14532D]" />
            <p className="text-sm font-bold text-[#1C1917]">قوالب التفريغ Excel</p>
            <p className="text-xs text-[#6B655E]">تنزيل القوالب المنسقة والاستيراد الجماعي</p>
          </button>
          <button
            type="button"
            onClick={() => onJumpToTab('export')}
            className="card-hover-lift text-right p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-1.5 cursor-pointer"
          >
            <Download className="w-5 h-5 text-[#854D0E]" />
            <p className="text-sm font-bold text-[#1C1917]">مستودع GitHub والتصدير</p>
            <p className="text-xs text-[#6B655E]">تنزيل نسخ JSON المحدثة ورفعها</p>
          </button>
        </div>

        {/* Component Visibility Toggle Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {(
            [
              ['enableMuhalla', 'تفعيل قسم «مرويات الأندلسيين»'],
              ['enableTakhrij', 'تفعيل قسم «تخريج الأحاديث»'],
              ['enableTree', 'تفعيل قسم «شجرة الإسناد»'],
              ['enableNarrators', 'تفعيل قسم «دراسة الرواة»'],
              ['enableFiqh', 'تفعيل قسم «فقه الحديث»'],
              ['enableAbout', 'تفعيل قسم «حول المنصة»'],
              ['showHomeStats', 'إظهار شريط الإحصائيات في الرئيسية'],
              ['showHomeModules', 'إظهار بطاقات الأقسام في الرئيسية'],
              ['showHomeObjectives', 'إظهار محور الأهداف في الرئيسية'],
              ['showHeroMedia', 'إظهار معرض الصور والفيديو في الرئيسية'],
            ] as [keyof PlatformSettings['moduleControls'], string][]
          ).map(([key, label]) => {
            const active = draft.moduleControls[key];
            return (
              <label
                key={key}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#EEF6F1] border-[#14532D]/40'
                    : 'bg-[#FBF9F5] border-[#E6E0D4]'
                }`}
              >
                <span className="text-xs font-semibold text-[#1C1917]">{label}</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      moduleControls: {
                        ...draft.moduleControls,
                        [key]: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 accent-[#14532D] shrink-0"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* 2. Home Identity, Logo, Title & Media Links */}
      <section className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-[#854D0E]" />
          <h4 className="text-base font-bold text-[#1C1917]">
            الصفحة الرئيسية: الشعار والعنوان وروابط صور ووسائط الواجهة
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">عنوان المنصة الرئيسي</span>
            <input
              type="text"
              value={draft.home.siteTitle}
              onChange={(e) =>
                setDraft({ ...draft, home: { ...draft.home, siteTitle: e.target.value } })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              رابط الشعار (يدعم Google Drive والروابط المباشرة)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                dir="ltr"
                value={draft.home.logoUrl}
                onChange={(e) =>
                  setDraft({ ...draft, home: { ...draft.home, logoUrl: e.target.value } })
                }
                placeholder="/assets/aistudio/logo_65694aac.png أو رابط Drive"
                className="w-full px-3 py-2 text-xs bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left font-mono"
              />
              <div className="w-10 h-10 rounded-lg border border-[#E6E0D4] bg-[#FBF9F5] flex items-center justify-center shrink-0 overflow-hidden">
                <SmartImage
                  src={draft.home.logoUrl}
                  alt="معاينة الشعار"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">العبارة التمهيدية فوق العنوان</span>
            <input
              type="text"
              value={draft.home.heroEyebrow}
              onChange={(e) =>
                setDraft({ ...draft, home: { ...draft.home, heroEyebrow: e.target.value } })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">الإشراف الأكاديمي</span>
            <input
              type="text"
              value={draft.home.supervisionText}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  home: { ...draft.home, supervisionText: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">الفوج البحثي</span>
            <input
              type="text"
              value={draft.home.batchText}
              onChange={(e) =>
                setDraft({ ...draft, home: { ...draft.home, batchText: e.target.value } })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">عبارة تذييل الصفحة (الأسفل)</span>
            <input
              type="text"
              value={draft.home.footerText}
              onChange={(e) =>
                setDraft({ ...draft, home: { ...draft.home, footerText: e.target.value } })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>
        </div>

        <label className="space-y-1.5 block">
          <span className="text-xs font-medium text-[#44403C]">الوصف التعريفي بالواجهة الرئيسية</span>
          <textarea
            rows={2}
            value={draft.home.heroDescription}
            onChange={(e) =>
              setDraft({
                ...draft,
                home: { ...draft.home, heroDescription: e.target.value },
              })
            }
            className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
          />
        </label>

        {/* Hero Media Links (YouTube, Google Drive, Direct Images) */}
        <div className="pt-4 border-t border-[#E6E0D4] space-y-3">
          <div className="flex items-center gap-2">
            <Youtube className="w-4 h-4 text-[#854D0E]" />
            <span className="text-xs font-bold text-[#1C1917]">
              روابط صور وفيديوهات الواجهة (تقبل يوتيوب، Google Drive، والروابط المباشرة)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E6E0D4]">
            <label className="space-y-1 block md:col-span-4">
              <span className="text-[11px] text-[#6B655E]">عنوان الصورة أو الفيديو</span>
              <input
                type="text"
                value={newMediaTitle}
                onChange={(e) => setNewMediaTitle(e.target.value)}
                placeholder="مثال: عرض تقديمي للمنصة / صورة المخطوط..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#E6E0D4] rounded-lg"
              />
            </label>
            <label className="space-y-1 block md:col-span-5">
              <span className="text-[11px] text-[#6B655E]">الرابط (YouTube / Google Drive / رابط مباشر)</span>
              <input
                type="url"
                dir="ltr"
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/... أو https://youtu.be/..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#E6E0D4] rounded-lg text-left font-mono"
              />
            </label>
            <label className="space-y-1 block md:col-span-2">
              <span className="text-[11px] text-[#6B655E]">النوع</span>
              <select
                value={newMediaType}
                onChange={(e) =>
                  setNewMediaType(
                    e.target.value as 'auto' | 'image' | 'video' | 'youtube'
                  )
                }
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E6E0D4] rounded-lg"
              >
                <option value="auto">تلقائي</option>
                <option value="image">صورة / Drive</option>
                <option value="youtube">فيديو يوتيوب</option>
                <option value="video">فيديو Drive/MP4</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleAddMedia}
              className="md:col-span-1 px-3 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer"
            >
              إضافة
            </button>
          </div>

          {draft.home.heroMedia.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draft.home.heroMedia.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2"
                >
                  <SmartMediaViewer
                    url={m.url}
                    title={m.title}
                    mediaType={m.mediaType || 'auto'}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1C1917] truncate">
                      {m.title || m.url}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          home: {
                            ...draft.home,
                            heroMedia: draft.home.heroMedia.filter((x) => x.id !== m.id),
                          },
                        })
                      }
                      className="text-xs text-red-700 hover:underline cursor-pointer shrink-0"
                    >
                      إزالة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Global Fonts, Background, Button Shapes, Motion & Click Sounds */}
      <section className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#14532D]" />
          <h4 className="text-base font-bold text-[#1C1917]">
            الخطوط والخلفية وشكل الأزرار والحركة وأصوات النقر
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">نوع الخط العام للمنصة</span>
            <select
              value={draft.typography.fontFamily}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  typography: {
                    ...draft.typography,
                    fontFamily: e.target.value as ArabicUiFontKey,
                  },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              {ARABIC_FONT_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              حجم الخط الأساسي ({draft.typography.baseFontSizePx}px)
            </span>
            <input
              type="range"
              min={14}
              max={22}
              value={draft.typography.baseFontSizePx}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  typography: {
                    ...draft.typography,
                    baseFontSizePx: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-[#14532D]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">نمط الخلفية الهندسية</span>
            <select
              value={draft.theme.pagePattern}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: { ...draft.theme, pagePattern: e.target.value as PagePatternType },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              <option value="octagonal">زخرفة ثمانية إسلامية خفيفة</option>
              <option value="dots">نقاط هندسية ناعمة</option>
              <option value="grid">شبكة تخطيط خفيفة</option>
              <option value="none">لون سادة بدون زخرفة</option>
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">لون الخلفية العام</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.theme.pageBgColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    theme: { ...draft.theme, pageBgColor: e.target.value },
                  })
                }
                className="w-10 h-9 rounded border border-[#E6E0D4] cursor-pointer"
              />
              <input
                type="text"
                dir="ltr"
                value={draft.theme.pageBgColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    theme: { ...draft.theme, pageBgColor: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs font-mono bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left"
              />
            </div>
          </label>

          <label className="space-y-1.5 block sm:col-span-2">
            <span className="text-xs font-medium text-[#44403C]">
              رابط صورة خلفية مخصصة (اختياري — Google Drive أو رابط مباشر)
            </span>
            <input
              type="url"
              dir="ltr"
              value={draft.theme.pageBgImageUrl}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: { ...draft.theme, pageBgImageUrl: e.target.value },
                })
              }
              placeholder="اتركه فارغاً لاستخدام الخلفية التراثية الافتراضية"
              className="w-full px-3 py-2 text-xs font-mono bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">شكل الأزرار</span>
            <select
              value={draft.theme.buttonShape}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: {
                    ...draft.theme,
                    buttonShape: e.target.value as ButtonShapeStyle,
                  },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              <option value="rounded">دائري الحواف (متوازن)</option>
              <option value="soft">مستدير ناعم (Soft)</option>
              <option value="classic">كلاسيكي قليل الاستدارة</option>
              <option value="sharp">زوايا قائمة حادة</option>
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">الحركة والتفاعل</span>
            <select
              value={draft.theme.motionLevel}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  theme: { ...draft.theme, motionLevel: e.target.value as MotionLevel },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              <option value="smooth">حركة انسيابية كاملة</option>
              <option value="subtle">حركة هادئة وخفيفة</option>
              <option value="none">إيقاف الحركة</option>
            </select>
          </label>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[#44403C] block">أصوات النقر على الأزرار</span>
            <div className="flex items-center gap-2">
              <select
                value={draft.theme.clickSound}
                onChange={(e) => {
                  const nextSound = e.target.value as ClickSoundType;
                  setDraft({
                    ...draft,
                    theme: { ...draft.theme, clickSound: nextSound },
                  });
                  playClickSound(nextSound);
                }}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              >
                <option value="off">صامت (بدون صوت)</option>
                <option value="soft">نقرة ناعمة</option>
                <option value="wood">نقرة خشبية تراثية</option>
                <option value="chime">رنين لطيف</option>
              </select>
              <button
                type="button"
                onClick={() => playClickSound(draft.theme.clickSound)}
                title="معاينة الصوت"
                className="p-2.5 bg-[#F3EFE6] hover:bg-[#E6E0D4] rounded-lg cursor-pointer shrink-0"
              >
                <Volume2 className="w-4 h-4 text-[#14532D]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Full Hadith Text Card Formatting in مرويات الأندلسيين */}
      <section className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-[#854D0E]" />
          <h4 className="text-base font-bold text-[#1C1917]">
            تنسيق «نص الحديث كاملاً بالسند والمتن (من المحلّى)» في مرويات الأندلسيين
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">خط نص الحديث</span>
            <select
              value={draft.hadithTextStyle.fontFamily}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  hadithTextStyle: {
                    ...draft.hadithTextStyle,
                    fontFamily: e.target.value as ArabicUiFontKey,
                  },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              {ARABIC_FONT_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              حجم خط الحديث ({draft.hadithTextStyle.fontSizePx}px)
            </span>
            <input
              type="range"
              min={18}
              max={36}
              value={draft.hadithTextStyle.fontSizePx}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  hadithTextStyle: {
                    ...draft.hadithTextStyle,
                    fontSizePx: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-[#14532D]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">لون النص</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.hadithTextStyle.textColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hadithTextStyle: {
                      ...draft.hadithTextStyle,
                      textColor: e.target.value,
                    },
                  })
                }
                className="w-10 h-9 rounded border border-[#E6E0D4] cursor-pointer"
              />
              <input
                type="text"
                dir="ltr"
                value={draft.hadithTextStyle.textColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hadithTextStyle: {
                      ...draft.hadithTextStyle,
                      textColor: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-2 text-xs font-mono bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left"
              />
            </div>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">لون خلفية بطاقة الحديث</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.hadithTextStyle.bgColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hadithTextStyle: {
                      ...draft.hadithTextStyle,
                      bgColor: e.target.value,
                    },
                  })
                }
                className="w-10 h-9 rounded border border-[#E6E0D4] cursor-pointer"
              />
              <input
                type="text"
                dir="ltr"
                value={draft.hadithTextStyle.bgColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hadithTextStyle: {
                      ...draft.hadithTextStyle,
                      bgColor: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-2 text-xs font-mono bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left"
              />
            </div>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">لون الإطار</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.hadithTextStyle.borderColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hadithTextStyle: {
                      ...draft.hadithTextStyle,
                      borderColor: e.target.value,
                    },
                  })
                }
                className="w-10 h-9 rounded border border-[#E6E0D4] cursor-pointer"
              />
              <input
                type="text"
                dir="ltr"
                value={draft.hadithTextStyle.borderColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    hadithTextStyle: {
                      ...draft.hadithTextStyle,
                      borderColor: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-2 text-xs font-mono bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left"
              />
            </div>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">نوع الإطار</span>
            <select
              value={draft.hadithTextStyle.borderStyle}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  hadithTextStyle: {
                    ...draft.hadithTextStyle,
                    borderStyle: e.target.value as 'solid' | 'double' | 'dashed',
                  },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              <option value="solid">متصل (Solid)</option>
              <option value="double">مزدوج تراثي (Double)</option>
              <option value="dashed">متقطع (Dashed)</option>
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              سمك الإطار ({draft.hadithTextStyle.borderWidthPx}px)
            </span>
            <input
              type="range"
              min={0}
              max={6}
              value={draft.hadithTextStyle.borderWidthPx}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  hadithTextStyle: {
                    ...draft.hadithTextStyle,
                    borderWidthPx: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-[#14532D]"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#1C1917] pt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.hadithTextStyle.showPattern}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  hadithTextStyle: {
                    ...draft.hadithTextStyle,
                    showPattern: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 accent-[#14532D]"
            />
            <span>إظهار الزخرفة الخفيفة داخل إطار الحديث</span>
          </label>
        </div>

        {/* Live Preview of Hadith Box */}
        <div
          className={`${draft.hadithTextStyle.showPattern ? 'islamic-hero-pattern' : ''} p-5`}
          style={{
            backgroundColor: draft.hadithTextStyle.bgColor,
            borderColor: draft.hadithTextStyle.borderColor,
            borderWidth: `${draft.hadithTextStyle.borderWidthPx}px`,
            borderStyle: draft.hadithTextStyle.borderStyle,
            borderRadius: `${draft.hadithTextStyle.borderRadiusPx}px`,
          }}
        >
          <p className="text-xs font-semibold text-[#854D0E] mb-2">
            معاينة مباشرة لبطاقة الحديث:
          </p>
          <p
            style={{
              fontFamily: getFontCssValue(draft.hadithTextStyle.fontFamily),
              fontSize: `${draft.hadithTextStyle.fontSizePx}px`,
              color: draft.hadithTextStyle.textColor,
              lineHeight: 2.1,
            }}
          >
            حدثنا <span className="text-[#854D0E] underline decoration-dotted">أحمد بن محمد الطلمنكي</span>، عن{' '}
            <span className="text-[#14532D] underline decoration-dotted">عمر بن الخطاب</span> قال: سمعت رسول الله ﷺ يقول: «إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ...»
          </p>
        </div>
      </section>

      {/* 5. Isnad Tree Appearance & Download Toggle */}
      <section className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#14532D]" />
          <h4 className="text-base font-bold text-[#1C1917]">
            تخصيص شجرة الإسناد وإطارها وخيار تحميلها
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">اتجاه وشكل الشجرة</span>
            <select
              value={draft.isnadTreeStyle.layout}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  isnadTreeStyle: {
                    ...draft.isnadTreeStyle,
                    layout: e.target.value as 'vertical' | 'horizontal',
                  },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              <option value="vertical">عمودية (من الأعلى للأسفل)</option>
              <option value="horizontal">أفقية (من اليمين لليسار)</option>
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">شكل عقد الرواة</span>
            <select
              value={draft.isnadTreeStyle.nodeShape}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  isnadTreeStyle: {
                    ...draft.isnadTreeStyle,
                    nodeShape: e.target.value as 'rounded' | 'soft' | 'square',
                  },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              <option value="rounded">مستطيل متوازن</option>
              <option value="soft">مستدير الحواف</option>
              <option value="square">زوايا قائمة حادة</option>
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">شكل الخطوط الواصلة</span>
            <select
              value={draft.isnadTreeStyle.connectorStyle}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  isnadTreeStyle: {
                    ...draft.isnadTreeStyle,
                    connectorStyle: e.target.value as 'curved' | 'straight' | 'step',
                  },
                })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            >
              <option value="curved">منحنية انسيابية</option>
              <option value="step">متدرجة هندسية</option>
              <option value="straight">مستقيمة</option>
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">لون خلفية لوحة الشجرة</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.isnadTreeStyle.canvasBgColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    isnadTreeStyle: {
                      ...draft.isnadTreeStyle,
                      canvasBgColor: e.target.value,
                    },
                  })
                }
                className="w-10 h-9 rounded border border-[#E6E0D4] cursor-pointer"
              />
              <input
                type="text"
                dir="ltr"
                value={draft.isnadTreeStyle.canvasBgColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    isnadTreeStyle: {
                      ...draft.isnadTreeStyle,
                      canvasBgColor: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-2 text-xs font-mono bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left"
              />
            </div>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">لون إطار الشجرة</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.isnadTreeStyle.frameColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    isnadTreeStyle: {
                      ...draft.isnadTreeStyle,
                      frameColor: e.target.value,
                    },
                  })
                }
                className="w-10 h-9 rounded border border-[#E6E0D4] cursor-pointer"
              />
              <input
                type="text"
                dir="ltr"
                value={draft.isnadTreeStyle.frameColor}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    isnadTreeStyle: {
                      ...draft.isnadTreeStyle,
                      frameColor: e.target.value,
                    },
                  })
                }
                className="w-full px-2.5 py-2 text-xs font-mono bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left"
              />
            </div>
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              سمك إطار الشجرة ({draft.isnadTreeStyle.frameBorderWidthPx}px)
            </span>
            <input
              type="range"
              min={0}
              max={6}
              value={draft.isnadTreeStyle.frameBorderWidthPx}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  isnadTreeStyle: {
                    ...draft.isnadTreeStyle,
                    frameBorderWidthPx: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-[#14532D]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">لون مسار ابن حزم</span>
            <input
              type="color"
              value={draft.isnadTreeStyle.muhallaEdgeColor}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  isnadTreeStyle: {
                    ...draft.isnadTreeStyle,
                    muhallaEdgeColor: e.target.value,
                  },
                })
              }
              className="w-full h-9 rounded border border-[#E6E0D4] cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#1C1917] pt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isnadTreeStyle.enableDownload}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  isnadTreeStyle: {
                    ...draft.isnadTreeStyle,
                    enableDownload: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 accent-[#14532D]"
            />
            <span>إتاحة أزرار تحميل الشجرة (PNG و SVG)</span>
          </label>
        </div>
      </section>
    </form>
  );
};
