import React, { useEffect, useState } from 'react';
import {
  Plus,
  Save,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  Database,
  AlertCircle,
  Users,
  UserPlus,
  Pencil,
  Shield,
  RefreshCw,
} from 'lucide-react';
import {
  ALL_RESEARCHER_PERMISSIONS,
  AuthenticatedUser,
  DEFAULT_ASSISTANT_PERMISSIONS,
  GharibEntry,
  MuhallaHadith,
  Narrator,
  NarratorGrade,
  NarratorOrigin,
  RESEARCHER_PERMISSION_OPTIONS,
  ResearcherAccount,
  ResearcherPermission,
  ResearcherRole,
} from '../types/hadith';

interface ContentEditorViewProps {
  hadiths: MuhallaHadith[];
  narrators: Narrator[];
  initialTab: 'hadith' | 'narrator' | 'users' | 'export';
  editingHadithId: string | null;
  editingNarratorId: string | null;
  isD1Connected: boolean;
  d1Reason?: 'no_api' | 'no_db_binding' | 'db_error';
  d1ErrorDetail?: string;
  currentUser: AuthenticatedUser | null;
  d1HadithCount?: number;
  researchers: ResearcherAccount[];
  onUnlockUser: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onSeedInitialD1: () => Promise<void>;
  onSaveHadith: (hadith: MuhallaHadith) => Promise<void>;
  onDeleteHadith: (id: string) => Promise<void>;
  onSaveNarrator: (narrator: Narrator) => Promise<void>;
  onDeleteNarrator: (id: string) => Promise<void>;
  onRefreshUsers: () => Promise<void>;
  onSaveUser: (payload: {
    id?: string;
    username: string;
    fullName: string;
    password?: string;
    role: ResearcherRole;
    permissions: ResearcherPermission[];
    isActive: boolean;
  }) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
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

const EMPTY_USER_FORM = () => ({
  id: '',
  fullName: '',
  username: '',
  password: '',
  role: 'assistant' as ResearcherRole,
  permissions: [...DEFAULT_ASSISTANT_PERMISSIONS] as ResearcherPermission[],
  isActive: true,
});

const PERMISSION_LABEL_MAP = new Map<ResearcherPermission, string>(
  RESEARCHER_PERMISSION_OPTIONS.map((p) => [p.key, p.label])
);

export const ContentEditorView: React.FC<ContentEditorViewProps> = ({
  hadiths,
  narrators,
  initialTab,
  editingHadithId,
  editingNarratorId,
  isD1Connected,
  d1Reason,
  d1ErrorDetail,
  currentUser,
  d1HadithCount = 0,
  researchers,
  onUnlockUser,
  onSeedInitialD1,
  onSaveHadith,
  onDeleteHadith,
  onSaveNarrator,
  onDeleteNarrator,
  onRefreshUsers,
  onSaveUser,
  onDeleteUser,
  onResetDefaults,
}) => {
  const isLoggedIn = Boolean(currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const userPerms = currentUser?.permissions || [];

  const canEditHadiths =
    isAdmin ||
    userPerms.includes('edit_hadiths') ||
    userPerms.includes('edit_muhalla_direct');
  const canEditNarrators = isAdmin || userPerms.includes('edit_narrators');
  const canDeleteRecords = isAdmin || userPerms.includes('delete_records');
  const canExportGithub = isAdmin || userPerms.includes('export_github');

  const [subTab, setSubTab] = useState<'hadith' | 'narrator' | 'users' | 'export'>(
    initialTab
  );
  const [hadithForm, setHadithForm] = useState<MuhallaHadith>(() => {
    const found = hadiths.find((h) => h.id === editingHadithId);
    return found
      ? structuredClone(found)
      : hadiths[0]
        ? structuredClone(hadiths[0])
        : EMPTY_HADITH();
  });
  const [narratorForm, setNarratorForm] = useState<Narrator>(() => {
    const found = narrators.find((n) => n.id === editingNarratorId);
    return found
      ? structuredClone(found)
      : narrators[0]
        ? structuredClone(narrators[0])
        : EMPTY_NARRATOR();
  });
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const isTabAllowed = (tab: 'hadith' | 'narrator' | 'users' | 'export'): boolean => {
    if (tab === 'hadith') return canEditHadiths;
    if (tab === 'narrator') return canEditNarrators;
    if (tab === 'users') return isAdmin;
    if (tab === 'export') return canExportGithub;
    return false;
  };

  useEffect(() => {
    if (isTabAllowed(initialTab)) {
      setSubTab(initialTab);
    } else if (canEditHadiths) {
      setSubTab('hadith');
    } else if (canEditNarrators) {
      setSubTab('narrator');
    } else if (canExportGithub) {
      setSubTab('export');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab, isAdmin, canEditHadiths, canEditNarrators, canExportGithub]);

  useEffect(() => {
    if (isLoggedIn && !isTabAllowed(subTab)) {
      if (canEditHadiths) setSubTab('hadith');
      else if (canEditNarrators) setSubTab('narrator');
      else if (canExportGithub) setSubTab('export');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, subTab, isAdmin, canEditHadiths, canEditNarrators, canExportGithub]);

  useEffect(() => {
    if (editingHadithId === '__NEW__') {
      setHadithForm(EMPTY_HADITH());
      if (canEditHadiths) setSubTab('hadith');
    } else if (editingHadithId) {
      const found = hadiths.find((h) => h.id === editingHadithId);
      if (found) {
        setHadithForm(structuredClone(found));
        if (canEditHadiths) setSubTab('hadith');
      }
    }
  }, [editingHadithId, hadiths, canEditHadiths]);

  useEffect(() => {
    if (editingNarratorId === '__NEW__') {
      setNarratorForm(EMPTY_NARRATOR());
      if (canEditNarrators) setSubTab('narrator');
    } else if (editingNarratorId) {
      const found = narrators.find((n) => n.id === editingNarratorId);
      if (found) {
        setNarratorForm(structuredClone(found));
        if (canEditNarrators) setSubTab('narrator');
      }
    }
  }, [editingNarratorId, narrators, canEditNarrators]);

  useEffect(() => {
    if (subTab === 'users' && isAdmin && isD1Connected) {
      onRefreshUsers().catch(() => {
        // handled quietly if network unavailable
      });
    }
  }, [subTab, isAdmin, isD1Connected, onRefreshUsers]);

  const showNotice = (msg: string) => {
    setErrorNotice(null);
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 4500);
  };

  const showError = (msg: string) => {
    setSavedNotice(null);
    setErrorNotice(msg);
    setTimeout(() => setErrorNotice(null), 5500);
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      showError('يرجى إدخال اسم المستخدم.');
      return;
    }
    if (isD1Connected && !passwordInput.trim()) {
      showError('يرجى إدخال كلمة المرور.');
      return;
    }
    setIsBusy(true);
    try {
      const res = await onUnlockUser(usernameInput.trim(), passwordInput.trim());
      if (res.ok) {
        setUsernameInput('');
        setPasswordInput('');
        showNotice('تم تسجيل الدخول وتفعيل وضع التحرير بنجاح.');
      } else {
        showError(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleSeedClick = async () => {
    setIsBusy(true);
    try {
      await onSeedInitialD1();
      showNotice(
        'تم رفع البيانات الأولية (أحاديث المحلى والرواة الأندلسيين) إلى قاعدة بيانات D1 بنجاح.'
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر تهيئة قاعدة البيانات');
    } finally {
      setIsBusy(false);
    }
  };

  const handleHadithSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hadithForm.issueTitle.trim() || !hadithForm.matnWithTashkeel.trim()) return;
    setIsBusy(true);
    try {
      await onSaveHadith({
        ...hadithForm,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      showNotice(
        isD1Connected
          ? 'تم حفظ الحديث وتحديثه في قاعدة بيانات Cloudflare D1 بنجاح.'
          : 'تم حفظ الحديث وتحديثه في المتصفح بنجاح.'
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر حفظ الحديث');
    } finally {
      setIsBusy(false);
    }
  };

  const handleNarratorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narratorForm.name.trim()) return;
    setIsBusy(true);
    try {
      await onSaveNarrator({
        ...narratorForm,
        jarhTaadil: narratorForm.jarhTaadil.filter(
          (j) => j.scholar.trim() || j.verdict.trim()
        ),
      });
      showNotice(
        isD1Connected
          ? 'تم حفظ بيانات الراوي في قاعدة بيانات Cloudflare D1 بنجاح.'
          : 'تم حفظ بيانات الراوي في المتصفح بنجاح.'
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر حفظ الراوي');
    } finally {
      setIsBusy(false);
    }
  };

  const togglePermission = (perm: ResearcherPermission) => {
    if (userForm.role === 'admin') return;
    setUserForm((prev) => {
      const exists = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== perm)
          : [...prev.permissions, perm],
      };
    });
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
      const effectivePermissions =
        userForm.role === 'admin'
          ? [...ALL_RESEARCHER_PERMISSIONS]
          : userForm.permissions;

      await onSaveUser({
        id: userForm.id || undefined,
        username: userForm.username.trim().toLowerCase(),
        fullName: userForm.fullName.trim(),
        password: userForm.password.trim() || undefined,
        role: userForm.role,
        permissions: effectivePermissions,
        isActive: userForm.isActive,
      });
      const wasEdit = Boolean(userForm.id);
      setUserForm(EMPTY_USER_FORM());
      showNotice(
        wasEdit
          ? 'تم تحديث بيانات حساب الباحث ومهامه بنجاح.'
          : 'تم إنشاء حساب الباحث وتحديد مهامه بنجاح.'
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر حفظ حساب الباحث');
    } finally {
      setIsBusy(false);
    }
  };

  const addGharibRow = () => {
    const newEntry: GharibEntry = {
      word: '',
      meaning: '',
      source: 'النهاية لابن الأثير',
    };
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
      {/* Cloudflare D1 Status & Multi-User Authentication Banner */}
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-5 space-y-3">
        {isD1Connected ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm">
              {isLoggedIn ? (
                <Unlock className="w-4 h-4 text-[#14532D] shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-[#854D0E] shrink-0" />
              )}
              <div>
                <p className="font-semibold text-[#1C1917]">
                  {isLoggedIn
                    ? `متصل بقاعدة بيانات Cloudflare D1 — مرحباً ${currentUser?.fullName} (${
                        isAdmin ? 'مشرف بصلاحيات كاملة' : 'باحث مساعد'
                      })`
                    : 'متصل بقاعدة بيانات Cloudflare D1 — سجّل الدخول للتحرير الدائم'}
                </p>
                <p className="text-xs text-[#6B655E]">
                  {isLoggedIn
                    ? isAdmin
                      ? 'صلاحياتك الكاملة تشمل الإضافة والتعديل والحذف، وإدارة الكتب التسعة وفريق البحث ومهامه، والتصدير إلى GitHub.'
                      : `المهام المتاحة لك حالياً: ${
                          userPerms.length > 0
                            ? userPerms
                                .map((p) => PERMISSION_LABEL_MAP.get(p) || p)
                                .join(' · ')
                            : 'لا توجد مهام مفعلة — راجع المشرف العام'
                        }.`
                    : 'أدخل اسم المستخدم وكلمة المرور المخصصة لك للحفظ الدائم في السحابة.'}
                </p>
              </div>
            </div>

            {!isLoggedIn ? (
              <form
                onSubmit={handleUnlockSubmit}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="اسم المستخدم..."
                  dir="ltr"
                  className="px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] w-40 text-left"
                />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="كلمة المرور..."
                  className="px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  className="btn-hover-motion px-4 py-2 text-sm font-medium bg-[#14532D] text-white rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  دخول للتحرير
                </button>
              </form>
            ) : (
              isAdmin && (
                <button
                  type="button"
                  onClick={handleSeedClick}
                  disabled={isBusy}
                  className="btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  <Database className="w-4 h-4 text-[#854D0E]" />
                  <span>
                    {d1HadithCount === 0
                      ? 'تهيئة D1 بالبيانات الأولية (مطلوب أول مرة)'
                      : 'مزامنة العينة الأولية مع D1'}
                  </span>
                </button>
              )
            )}
          </div>
        ) : (
          <div className="space-y-2 text-sm text-[#57534E]">
            {d1Reason === 'no_db_binding' ? (
              <>
                <p className="font-semibold text-[#854D0E]">
                  تم العثور على خادم Cloudflare Pages Functions، لكن ربط قاعدة البيانات (DB) غير مُفعّل بعد في هذا النشر.
                </p>
                <p className="text-xs text-[#6B655E]">
                  تأكد في لوحة Cloudflare Pages من ربط D1 باسم <code className="font-mono">DB</code> في بيئة <strong>Production</strong> ثم أعد نشر الموقع لتفعيل الحفظ السحابي.
                </p>
              </>
            ) : d1Reason === 'db_error' ? (
              <>
                <p className="font-semibold text-red-700">
                  تم ربط قاعدة البيانات DB لكن تعذر قراءة الجداول منها.
                </p>
                <p className="text-xs text-[#6B655E]">
                  تأكد من تنفيذ أوامر إنشاء الجداول في Console قاعدة <code className="font-mono">mohala-db</code>. ({d1ErrorDetail || 'خطأ غير معروف'})
                </p>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#1C1917]">
                    {currentUser
                      ? `مرحباً ${currentUser.fullName} (${isAdmin ? 'مشرف عام' : 'باحث مساعد'})`
                      : 'لوحة التحرير وإدارة المحتوى'}
                  </p>
                  {!isAdmin && currentUser && (
                    <p className="text-xs text-[#6B655E]">
                      المهام المتاحة لك:{' '}
                      {userPerms.length > 0
                        ? userPerms
                            .map((p) => PERMISSION_LABEL_MAP.get(p) || p)
                            .join(' · ')
                        : 'لا توجد مهام مفعلة'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {errorNotice && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3.5 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}
      </div>

      {/* Editor Sub-navigation */}
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg">
          {canEditHadiths && (
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
          )}
          {canEditNarrators && (
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
          )}
          {isAdmin && (
            <button
              onClick={() => setSubTab('users')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                subTab === 'users'
                  ? 'bg-white text-[#14532D] shadow-xs font-semibold'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>فريق البحث والمهام</span>
            </button>
          )}
          {canExportGithub && (
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
          )}
        </div>

        {savedNotice && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#14532D]">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      {/* Empty permission notice if an assistant has no editor tabs enabled */}
      {isLoggedIn && !canEditHadiths && !canEditNarrators && !canExportGithub && !isAdmin && (
        <div className="bg-white border border-[#E6E0D4] rounded-xl p-8 text-center space-y-2">
          <p className="text-base font-semibold text-[#1C1917]">
            لم يتم تفعيل مهام تحرير في لوحة التعديلات لحسابك بعد
          </p>
          <p className="text-sm text-[#6B655E]">
            تواصل مع المشرف العام لتحديد المهام المسموحة لحسابك.
          </p>
        </div>
      )}

      {/* Sub-Tab 1: Muhalla Hadith Editor */}
      {canEditHadiths && subTab === 'hadith' && (
        <form
          onSubmit={handleHadithSubmit}
          className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6E0D4]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#1C1917]">
                اختر مسألة للتعديل:
              </span>
              <select
                value={
                  hadiths.some((h) => h.id === hadithForm.id) ? hadithForm.id : '__NEW__'
                }
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
              {canDeleteRecords && hadiths.some((h) => h.id === hadithForm.id) && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    setIsBusy(true);
                    try {
                      await onDeleteHadith(hadithForm.id);
                      setHadithForm(EMPTY_HADITH());
                      showNotice('تم حذف السجل.');
                    } catch (err) {
                      showError(err instanceof Error ? err.message : 'تعذر حذف السجل');
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer disabled:opacity-60"
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
                  setHadithForm({
                    ...hadithForm,
                    issueNumber: Number(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg tabular-nums"
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              عنوان المسألة في المحلّى
            </span>
            <input
              type="text"
              required
              value={hadithForm.issueTitle}
              onChange={(e) =>
                setHadithForm({ ...hadithForm, issueTitle: e.target.value })
              }
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
            <span className="text-xs font-medium text-[#44403C]">
              نص سند ابن حزم في المحلى
            </span>
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
              <span className="text-xs font-medium text-[#44403C]">
                حكم ابن حزم على الحديث
              </span>
              <input
                type="text"
                value={hadithForm.ibnHazmHukm}
                onChange={(e) =>
                  setHadithForm({ ...hadithForm, ibnHazmHukm: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">
                مقارنة المذاهب الفقهية
              </span>
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
            <span className="text-xs font-medium text-[#44403C]">
              فقه الحديث واستنباط ابن حزم
            </span>
            <textarea
              rows={3}
              value={hadithForm.fiqhAnalysis}
              onChange={(e) =>
                setHadithForm({ ...hadithForm, fiqhAnalysis: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>

          {/* Gharib Editor */}
          <div className="space-y-3 pt-2 border-t border-[#E6E0D4]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C1917]">
                مفردات غريب الحديث
              </span>
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
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isBusy ? 'جاري الحفظ...' : 'حفظ الحديث في المنصة'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Sub-Tab 2: Narrator Editor */}
      {canEditNarrators && subTab === 'narrator' && (
        <form
          onSubmit={handleNarratorSubmit}
          className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6E0D4]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#1C1917]">
                اختر راوياً للتعديل:
              </span>
              <select
                value={
                  narrators.some((n) => n.id === narratorForm.id)
                    ? narratorForm.id
                    : '__NEW__'
                }
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
              {canDeleteRecords && narrators.some((n) => n.id === narratorForm.id) && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    setIsBusy(true);
                    try {
                      await onDeleteNarrator(narratorForm.id);
                      setNarratorForm(EMPTY_NARRATOR());
                      showNotice('تم حذف الراوي.');
                    } catch (err) {
                      showError(err instanceof Error ? err.message : 'تعذر حذف الراوي');
                    } finally {
                      setIsBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">
                الاسم الكامل للراوي
              </span>
              <input
                type="text"
                required
                value={narratorForm.name}
                onChange={(e) =>
                  setNarratorForm({ ...narratorForm, name: e.target.value })
                }
                placeholder="مثال: بقي بن مخلد القرطبي الأندلسي"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الكنية</span>
              <input
                type="text"
                value={narratorForm.kunya || ''}
                onChange={(e) =>
                  setNarratorForm({ ...narratorForm, kunya: e.target.value })
                }
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
                  setNarratorForm({
                    ...narratorForm,
                    origin: e.target.value as NarratorOrigin,
                  })
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
                  setNarratorForm({
                    ...narratorForm,
                    grade: e.target.value as NarratorGrade,
                  })
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
                onChange={(e) =>
                  setNarratorForm({ ...narratorForm, region: e.target.value })
                }
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
              onChange={(e) =>
                setNarratorForm({ ...narratorForm, tabaqah: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              موقف ابن حزم من الراوي
            </span>
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
            <span className="text-xs font-medium text-[#44403C]">
              ملاحظات علمية وبحثية
            </span>
            <textarea
              rows={2}
              value={narratorForm.notes}
              onChange={(e) =>
                setNarratorForm({ ...narratorForm, notes: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
            />
          </label>

          <div className="flex justify-end pt-3 border-t border-[#E6E0D4]">
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isBusy ? 'جاري الحفظ...' : 'حفظ بيانات الراوي'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Sub-Tab 3: Multi-User Research Team & Per-Researcher Task System (Admin Only) */}
      {isAdmin && subTab === 'users' && (
        <div className="space-y-6">
          {/* Role & Tasks Guide */}
          <div className="bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl p-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1C1917]">
                <Shield className="w-4 h-4 text-[#14532D]" />
                <span>تنظيم فريق البحث وتحديد المهام لكل باحث</span>
              </div>
              {isD1Connected && (
                <button
                  type="button"
                  onClick={() => onRefreshUsers()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E6E0D4] hover:border-[#14532D] rounded-lg cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث القائمة</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#44403C] leading-relaxed">
              <div className="bg-white border border-[#E6E0D4] rounded-lg p-3.5 space-y-1">
                <p className="font-semibold text-[#14532D]">
                  المشرف العام (<code className="font-mono">bweb</code>) والمشرفون
                </p>
                <p>
                  يملك المشرف جميع الصلاحيات تلقائياً (7/7): تعديل مرويات المحلّى، فهرسة الكتب التسعة، ربط التخريج، حذف السجلات، التصدير إلى GitHub، وتعيين المهام لبقية الباحثين.
                </p>
              </div>
              <div className="bg-white border border-[#E6E0D4] rounded-lg p-3.5 space-y-1">
                <p className="font-semibold text-[#854D0E]">
                  الباحث المساعد (تحديد مهام مخصص)
                </p>
                <p>
                  يمكنك تحديد المهام المسموحة لكل باحث مساعد على حدة عبر مربعات الاختيار أدناه (مثل: إتاحة تحرير المحلّى أو الرواة فقط، أو السماح له بربط التخريج أو فهرسة الكتب التسعة).
                </p>
              </div>
            </div>
          </div>

          {/* Add / Edit Researcher & Task Assignment Form */}
          <form
            onSubmit={handleUserSubmit}
            className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E0D4]">
              <div className="flex items-center gap-2 text-base font-bold text-[#1C1917]">
                <UserPlus className="w-4 h-4 text-[#14532D]" />
                <span>
                  {userForm.id ? 'تعديل حساب ومهام باحث' : 'إضافة باحث جديد وتحديد مهامه'}
                </span>
              </div>
              {userForm.id && (
                <button
                  type="button"
                  onClick={() => setUserForm(EMPTY_USER_FORM())}
                  className="text-xs font-medium text-[#854D0E] hover:underline cursor-pointer"
                >
                  إلغاء والعودة لإضافة حساب جديد
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-[#44403C]">
                  الاسم الكامل للباحث
                </span>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) =>
                    setUserForm({ ...userForm, fullName: e.target.value })
                  }
                  placeholder="مثال: الباحث محمد بن علي"
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-[#44403C]">
                  اسم المستخدم (بالإنجليزية)
                </span>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      username: e.target.value.replace(/\s+/g, '').toLowerCase(),
                    })
                  }
                  placeholder="researcher1"
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg text-left font-mono"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-[#44403C]">
                  {userForm.id
                    ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)'
                    : 'كلمة المرور'}
                </span>
                <input
                  type="password"
                  required={!userForm.id}
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  placeholder="4 أحرف على الأقل..."
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs font-medium text-[#44403C]">الدور الأساسي</span>
                <select
                  value={userForm.role}
                  onChange={(e) => {
                    const nextRole = e.target.value as ResearcherRole;
                    setUserForm({
                      ...userForm,
                      role: nextRole,
                      permissions:
                        nextRole === 'admin'
                          ? [...ALL_RESEARCHER_PERMISSIONS]
                          : [...DEFAULT_ASSISTANT_PERMISSIONS],
                    });
                  }}
                  className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
                >
                  <option value="assistant">باحث مساعد (حسب المهام المحددة)</option>
                  <option value="admin">مشرف (جميع الصلاحيات)</option>
                </select>
              </label>
            </div>

            {/* Per-Researcher Task Checkboxes */}
            <div className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-[#1C1917]">
                    المهام المخصصة لهذا الباحث ({userForm.role === 'admin' ? ALL_RESEARCHER_PERMISSIONS.length : userForm.permissions.length} من {ALL_RESEARCHER_PERMISSIONS.length})
                  </p>
                  <p className="text-xs text-[#6B655E]">
                    {userForm.role === 'admin'
                      ? 'المشرف يمتلك تلقائياً جميع المهام والصلاحيات في المنصة.'
                      : 'اختر بدقة المهام والأزرار التي تريد إتاحتها لهذا الباحث عند تسجيل دخوله.'}
                  </p>
                </div>

                {userForm.role === 'assistant' && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setUserForm((prev) => ({
                          ...prev,
                          permissions: [...ALL_RESEARCHER_PERMISSIONS],
                        }))
                      }
                      className="px-2.5 py-1 bg-white border border-[#E6E0D4] hover:border-[#14532D] rounded-md cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setUserForm((prev) => ({
                          ...prev,
                          permissions: [...DEFAULT_ASSISTANT_PERMISSIONS],
                        }))
                      }
                      className="px-2.5 py-1 bg-white border border-[#E6E0D4] hover:border-[#14532D] rounded-md cursor-pointer"
                    >
                      الافتراضي (تحرير المحلّى والرواة)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setUserForm((prev) => ({ ...prev, permissions: [] }))
                      }
                      className="px-2.5 py-1 bg-white border border-[#E6E0D4] hover:border-red-500 text-red-700 rounded-md cursor-pointer"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {RESEARCHER_PERMISSION_OPTIONS.map((perm) => {
                  const checked =
                    userForm.role === 'admin' ||
                    userForm.permissions.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border transition-colors ${
                        userForm.role === 'admin'
                          ? 'bg-white/70 border-[#D6CEBE] opacity-85 cursor-default'
                          : checked
                            ? 'bg-[#EEF6F1] border-[#14532D]/45 cursor-pointer'
                            : 'bg-white border-[#E6E0D4] hover:border-[#14532D]/40 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={userForm.role === 'admin'}
                        onChange={() => togglePermission(perm.key)}
                        className="mt-0.5 w-4 h-4 accent-[#14532D] shrink-0"
                      />
                      <div className="space-y-0.5">
                        <span className="block text-xs font-semibold text-[#1C1917]">
                          {perm.label}
                        </span>
                        <span className="block text-[11px] text-[#6B655E] leading-relaxed">
                          {perm.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E6E0D4]">
              <label className="inline-flex items-center gap-2 text-sm text-[#1C1917] cursor-pointer">
                <input
                  type="checkbox"
                  checked={userForm.isActive}
                  onChange={(e) =>
                    setUserForm({ ...userForm, isActive: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#14532D]"
                />
                <span>الحساب نشط ويُسمح له بالدخول</span>
              </label>

              <button
                type="submit"
                disabled={isBusy}
                className="btn-hover-motion inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isBusy
                    ? 'جاري الحفظ...'
                    : userForm.id
                      ? 'حفظ تعديلات الحساب والمهام'
                      : 'إنشاء حساب الباحث'}
                </span>
              </button>
            </div>
          </form>

          {/* Researchers List */}
          <div className="bg-white border border-[#E6E0D4] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E6E0D4] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1C1917] tabular-nums">
                الحسابات المسجلة ({researchers.length + 1})
              </h3>
              <span className="text-xs text-[#6B655E]">
                كلمات المرور مشفّرة ولا يمكن عرضها بعد الحفظ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-[#FBF9F5] border-b border-[#E6E0D4] text-xs text-[#6B655E]">
                  <tr>
                    <th className="py-3 px-5 font-medium">الاسم الكامل</th>
                    <th className="py-3 px-5 font-medium">اسم المستخدم</th>
                    <th className="py-3 px-5 font-medium">الدور</th>
                    <th className="py-3 px-5 font-medium">المهام المفعّلة</th>
                    <th className="py-3 px-5 font-medium">الحالة</th>
                    <th className="py-3 px-5 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E0D4]">
                  {/* Built-in Master Super Admin Row (bweb) */}
                  <tr className="bg-[#EEF6F1]/50">
                    <td className="py-3 px-5 font-semibold text-[#1C1917]">
                      المشرف العام للمنصة
                    </td>
                    <td className="py-3 px-5 font-mono text-xs text-[#44403C]" dir="ltr">
                      bweb
                    </td>
                    <td className="py-3 px-5 text-xs font-semibold text-[#14532D]">
                      مشرف عام
                    </td>
                    <td className="py-3 px-5 text-xs text-[#14532D]">
                      جميع الصلاحيات والمهام (7/7)
                    </td>
                    <td className="py-3 px-5 text-xs text-[#14532D]">نشط دائماً</td>
                    <td className="py-3 px-5 text-xs text-[#6B655E]">
                      حساب رئيسي من إعدادات Cloudflare
                    </td>
                  </tr>

                  {researchers.map((u) => {
                    const userPermList =
                      u.role === 'admin'
                        ? ALL_RESEARCHER_PERMISSIONS
                        : u.permissions || DEFAULT_ASSISTANT_PERMISSIONS;
                    return (
                      <tr key={u.id} className="hover:bg-[#FBF9F5]">
                        <td className="py-3 px-5 font-semibold text-[#1C1917]">
                          {u.fullName}
                        </td>
                        <td className="py-3 px-5 font-mono text-xs text-[#44403C]" dir="ltr">
                          {u.username}
                        </td>
                        <td className="py-3 px-5 text-xs font-medium">
                          <span
                            className={
                              u.role === 'admin' ? 'text-[#14532D]' : 'text-[#854D0E]'
                            }
                          >
                            {u.role === 'admin' ? 'مشرف' : 'باحث مساعد'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-xs text-[#44403C] max-w-xs">
                          {u.role === 'admin' ? (
                            <span className="text-[#14532D] font-medium">
                              جميع المهام (7/7)
                            </span>
                          ) : userPermList.length === 0 ? (
                            <span className="text-[#6B655E]">بدون مهام تحرير</span>
                          ) : (
                            <span className="leading-relaxed">
                              {userPermList
                                .map((p) => PERMISSION_LABEL_MAP.get(p) || p)
                                .join(' · ')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-xs">
                          <span
                            className={
                              u.isActive ? 'text-[#14532D]' : 'text-red-700 font-medium'
                            }
                          >
                            {u.isActive ? 'نشط' : 'معطّل'}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setUserForm({
                                  id: u.id,
                                  fullName: u.fullName,
                                  username: u.username,
                                  password: '',
                                  role: u.role,
                                  permissions:
                                    u.role === 'admin'
                                      ? [...ALL_RESEARCHER_PERMISSIONS]
                                      : [...(u.permissions || DEFAULT_ASSISTANT_PERMISSIONS)],
                                  isActive: u.isActive,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-md cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>تعديل المهام</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async () => {
                                setIsBusy(true);
                                try {
                                  await onDeleteUser(u.id);
                                  if (userForm.id === u.id) {
                                    setUserForm(EMPTY_USER_FORM());
                                  }
                                  showNotice('تم حذف حساب الباحث.');
                                } catch (err) {
                                  showError(
                                    err instanceof Error ? err.message : 'تعذر حذف الحساب'
                                  );
                                } finally {
                                  setIsBusy(false);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md cursor-pointer disabled:opacity-60"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Export JSON for GitHub (Admin or permitted researcher) */}
      {canExportGithub && subTab === 'export' && (
        <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-6">
          <div className="space-y-1.5 max-w-2xl">
            <h3 className="text-lg font-bold text-[#1C1917]">
              تصدير بياناتك المحدّثة إلى مستودع GitHub
            </h3>
            <p className="text-sm text-[#6B655E] leading-relaxed">
              كل ما تضيفه أو تعدله في المنصة يُحفظ فوراً. يمكنك تنزيل ملفات JSON المحدثة ووضعها في مجلد <code className="font-mono text-xs">data/</code> بمستودعك <code className="font-mono text-xs">bweb-master/alhadith-anawabi-master</code> ثم رفعها عبر GitHub Desktop.
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
              onClick={() => downloadJson('andalusians_and_narrators.json', narrators)}
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
