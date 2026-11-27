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
  FileSpreadsheet,
  Upload,
  Wand2,
  Palette,
  Info,
} from 'lucide-react';
import { PlatformSettings } from '../types/settings';
import { PlatformSettingsPanel } from './PlatformSettingsPanel';
import {
  ALL_RESEARCHER_PERMISSIONS,
  AuthenticatedUser,
  DEFAULT_ASSISTANT_PERMISSIONS,
  GharibEntry,
  MadhabFiqhEntry,
  MadhabName,
  MuhallaHadith,
  Narrator,
  NarratorGrade,
  NarratorOrigin,
  RESEARCHER_PERMISSION_OPTIONS,
  ResearcherAccount,
  ResearcherPermission,
  ResearcherRole,
} from '../types/hadith';
import {
  autoMatchIsnadChain,
  downloadExcelWorkbook,
  generateMuhallaExcelWorkbook,
  generateMuhallaJsonTemplate,
  generateNarratorsExcelWorkbook,
  generateNarratorsJsonTemplate,
  generateNarratorsReferenceExcelWorkbook,
  ParsedHadithPreview,
  parseHadithsFromFile,
  parseNarratorsFromFile,
} from '../utils/bulkImport';

interface ContentEditorViewProps {
  hadiths: MuhallaHadith[];
  narrators: Narrator[];
  initialTab: 'hadith' | 'narrator' | 'bulk' | 'users' | 'appearance' | 'about_settings' | 'export';
  editingHadithId: string | null;
  editingNarratorId: string | null;
  isD1Connected: boolean;
  d1Reason?: 'no_api' | 'no_db_binding' | 'db_error';
  d1ErrorDetail?: string;
  currentUser: AuthenticatedUser | null;
  d1HadithCount?: number;
  researchers: ResearcherAccount[];
  settings: PlatformSettings;
  onSaveSettings: (next: PlatformSettings) => Promise<void>;
  onUnlockUser: (
    username: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onSeedInitialD1: () => Promise<void>;
  onSaveHadith: (hadith: MuhallaHadith) => Promise<void>;
  onSaveHadithsBatch: (hadiths: MuhallaHadith[]) => Promise<void>;
  onDeleteHadith: (id: string) => Promise<void>;
  onSaveNarrator: (narrator: Narrator) => Promise<void>;
  onSaveNarratorsBatch: (narrators: Narrator[]) => Promise<void>;
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

const DEFAULT_FOUR_MADHAHIB = (): MadhabFiqhEntry[] => [
  { madhab: 'الحنفي', ruling: '', sourceBook: '', author: '', volumePage: '' },
  { madhab: 'المالكي', ruling: '', sourceBook: '', author: '', volumePage: '' },
  { madhab: 'الشافعي', ruling: '', sourceBook: '', author: '', volumePage: '' },
  { madhab: 'الحنبلي', ruling: '', sourceBook: '', author: '', volumePage: '' },
];

const EMPTY_HADITH = (): MuhallaHadith => ({
  id: `muhalla_${Date.now()}`,
  serialNumber: undefined,
  volume: 1,
  page: '',
  issueNumber: 1,
  kitab: 'كتاب الطهارة',
  issueTitle: '',
  fullHadithText: '',
  matnWithTashkeel: '',
  ibnHazmIsnadText: '',
  takhrijSummary: '',
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
  fourMadhahibFiqh: DEFAULT_FOUR_MADHAHIB(),
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
  settings,
  onSaveSettings,
  onUnlockUser,
  onSeedInitialD1,
  onSaveHadith,
  onSaveHadithsBatch,
  onDeleteHadith,
  onSaveNarrator,
  onSaveNarratorsBatch,
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

  const [subTab, setSubTab] = useState<
    'hadith' | 'narrator' | 'bulk' | 'users' | 'appearance' | 'about_settings' | 'export'
  >(initialTab);
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

  // Admin-only bulk templates, import & Isnad auto-linker states
  const [pendingNarrators, setPendingNarrators] = useState<Narrator[]>([]);
  const [pendingNarratorsFile, setPendingNarratorsFile] = useState('');
  const [pendingHadiths, setPendingHadiths] = useState<ParsedHadithPreview[]>([]);
  const [pendingHadithsFile, setPendingHadithsFile] = useState('');
  const [relinkProposals, setRelinkProposals] = useState<ParsedHadithPreview[]>([]);
  const [chainTextDraft, setChainTextDraft] = useState('');

  const isTabAllowed = (
    tab: 'hadith' | 'narrator' | 'bulk' | 'users' | 'appearance' | 'about_settings' | 'export'
  ): boolean => {
    if (tab === 'hadith') return canEditHadiths;
    if (tab === 'narrator') return canEditNarrators;
    if (tab === 'bulk') return isAdmin;
    if (tab === 'users') return isAdmin;
    if (tab === 'appearance') return isAdmin;
    if (tab === 'about_settings') return isAdmin;
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
      setChainTextDraft('');
      if (canEditHadiths) setSubTab('hadith');
    } else if (editingHadithId) {
      const found = hadiths.find((h) => h.id === editingHadithId);
      if (found) {
        setHadithForm(structuredClone(found));
        setChainTextDraft('');
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

  const addNarratorRulingRow = () => {
    setNarratorForm((prev) => ({
      ...prev,
      jarhTaadil: [...(prev.jarhTaadil || []), { scholar: '', verdict: '' }],
    }));
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

  const handleBulkNarratorsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseNarratorsFromFile(file, narrators);
      if (parsed.length === 0) {
        showError('لم يتم العثور على صفوف رواة صالحة في الملف.');
        return;
      }
      setPendingNarrators(parsed);
      setPendingNarratorsFile(file.name);
      showNotice(`تمت قراءة ${parsed.length} بطاقة راوٍ بنجاح. راجعها ثم اضغط اعتماد.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر قراءة ملف الرواة');
    } finally {
      e.target.value = '';
    }
  };

  const handleCommitBulkNarrators = async () => {
    if (pendingNarrators.length === 0) return;
    setIsBusy(true);
    try {
      await onSaveNarratorsBatch(pendingNarrators);
      const savedCount = pendingNarrators.length;
      setPendingNarrators([]);
      setPendingNarratorsFile('');
      showNotice(`تم حفظ ${savedCount} راوياً في المنصة وقاعدة البيانات بنجاح.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر حفظ دفعة الرواة');
    } finally {
      setIsBusy(false);
    }
  };

  const handleBulkHadithsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseHadithsFromFile(file, hadiths, narrators);
      if (parsed.length === 0) {
        showError('لم يتم العثور على أحاديث صالحة في الملف.');
        return;
      }
      setPendingHadiths(parsed);
      setPendingHadithsFile(file.name);
      showNotice(
        `تم تحليل ${parsed.length} حديثاً وربط الرواة تلقائياً في الأسانيد. راجع المعاينة ثم اضغط اعتماد.`
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر قراءة ملف أحاديث المحلّى');
    } finally {
      e.target.value = '';
    }
  };

  const handleCommitBulkHadiths = async () => {
    if (pendingHadiths.length === 0) return;
    setIsBusy(true);
    try {
      await onSaveHadithsBatch(pendingHadiths.map((p) => p.hadith));
      const savedCount = pendingHadiths.length;
      setPendingHadiths([]);
      setPendingHadithsFile('');
      showNotice(
        `تم استيراد ${savedCount} حديثاً وربط سلاسل رواتها بنجاح في المنصة و D1.`
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر استيراد الأحاديث');
    } finally {
      setIsBusy(false);
    }
  };

  const handleScanExistingHadithsLinks = () => {
    const proposals: ParsedHadithPreview[] = [];
    for (const h of hadiths) {
      const auto = autoMatchIsnadChain('', h.ibnHazmIsnadText, narrators);
      if (auto.chainNarratorIds.length === 0) continue;
      const prevIds = h.paths[0]?.chainNarratorIds || [];
      const changed =
        auto.chainNarratorIds.length !== prevIds.length ||
        auto.chainNarratorIds.some((id, idx) => prevIds[idx] !== id);
      if (!changed) continue;

      const updatedPaths = h.paths.length
        ? [{ ...h.paths[0], chainNarratorIds: auto.chainNarratorIds }, ...h.paths.slice(1)]
        : [
            {
              id: `path_${h.id}`,
              sourceLabel: 'طريق ابن حزم الأندلسي في المحلى',
              sourceType: 'muhalla' as const,
              chainNarratorIds: auto.chainNarratorIds,
            },
          ];

      proposals.push({
        hadith: { ...h, paths: updatedPaths },
        matchedNames: auto.matchedNames,
        unmatchedSegments: auto.unmatchedSegments,
        isExistingUpdate: true,
      });
    }

    setRelinkProposals(proposals);
    if (proposals.length === 0) {
      showNotice('جميع الأحاديث الحالية مرتبطة بأسانيدها المطابقة بالفعل.');
    } else {
      showNotice(`تم اقتراح تحديث ربط السند لـ ${proposals.length} حديثاً.`);
    }
  };

  const handleApplyRelinkProposals = async () => {
    if (relinkProposals.length === 0) return;
    setIsBusy(true);
    try {
      await onSaveHadithsBatch(relinkProposals.map((p) => p.hadith));
      const count = relinkProposals.length;
      setRelinkProposals([]);
      showNotice(`تم تحديث وربط سلاسل الرواة لـ ${count} حديثاً في المنصة و D1.`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'تعذر تحديث روابط الأسانيد');
    } finally {
      setIsBusy(false);
    }
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
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#1C1917]">
                    {currentUser
                      ? `مرحباً ${currentUser.fullName} (${isAdmin ? 'مشرف عام' : 'باحث مساعد'})`
                      : 'صفحة الإعدادات والتعديلات — سجّل الدخول للمتابعة'}
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
                {!isLoggedIn && (
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
                )}
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
      {isLoggedIn && (
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
                onClick={() => setSubTab('bulk')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  subTab === 'bulk'
                    ? 'bg-white text-[#854D0E] shadow-xs font-semibold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>قوالب التفريغ والاستيراد الجماعي</span>
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
            {isAdmin && (
              <button
                onClick={() => setSubTab('appearance')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  subTab === 'appearance'
                    ? 'bg-white text-[#14532D] shadow-xs font-semibold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>الواجهة والمظهر والمكونات</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setSubTab('about_settings')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  subTab === 'about_settings'
                    ? 'bg-white text-[#854D0E] shadow-xs font-semibold'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>حول المنصة والمشاركون</span>
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
      )}

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
                  setChainTextDraft('');
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
                onClick={() => {
                  setHadithForm(EMPTY_HADITH());
                  setChainTextDraft('');
                }}
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
                      setChainTextDraft('');
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الرقم الترتيبي</span>
              <input
                type="number"
                value={hadithForm.serialNumber ?? ''}
                onChange={(e) =>
                  setHadithForm({
                    ...hadithForm,
                    serialNumber: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder={`مثال: ${hadiths.length + 1}`}
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg tabular-nums focus:outline-none focus:border-[#14532D]"
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
              <span className="text-xs font-medium text-[#44403C]">الصفحة</span>
              <input
                type="text"
                value={hadithForm.page || ''}
                onChange={(e) =>
                  setHadithForm({ ...hadithForm, page: e.target.value })
                }
                placeholder="مثال: 112 أو 112-113"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg tabular-nums"
              />
            </label>
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
            <span className="text-xs font-medium text-[#44403C]">
              نص الحديث بالسند والمتن (كاملاً كما ورد في المحلّى)
            </span>
            <textarea
              rows={3}
              value={hadithForm.fullHadithText || ''}
              onChange={(e) =>
                setHadithForm({ ...hadithForm, fullHadithText: e.target.value })
              }
              placeholder="أدخل نص الحديث كاملاً بسنده ومتنه من المحلّى..."
              className="w-full px-3 py-2 text-sm font-hadith bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
            />
          </label>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">متن الحديث</span>
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
              سند الحديث (نص سند ابن حزم في المحلّى)
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

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              تخريج الحديث (مواضع الحديث في الكتب التسعة وغيرها)
            </span>
            <textarea
              rows={2}
              value={hadithForm.takhrijSummary || ''}
              onChange={(e) =>
                setHadithForm({ ...hadithForm, takhrijSummary: e.target.value })
              }
              placeholder="مثال: أخرجه البخاري (رقم 1)، ومسلم (رقم 1907)، وأبو داود (رقم 2201)..."
              className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
            />
          </label>

          {/* Chain Narrator Sequence Builder for Ibn Hazm Path */}
          {hadithForm.paths[0] && (
            <div className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1C1917]">
                  سلسلة الرواة (من الصحابي إلى ابن حزم)
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const res = autoMatchIsnadChain(
                        chainTextDraft,
                        hadithForm.ibnHazmIsnadText,
                        narrators
                      );
                      if (res.chainNarratorIds.length === 0) {
                        showError('أدخل نص السند أو سلسلة الرواة ليتم التعرف على الرواة وربطهم.');
                        return;
                      }
                      const updated = structuredClone(hadithForm.paths);
                      updated[0].chainNarratorIds = res.chainNarratorIds;
                      setHadithForm({ ...hadithForm, paths: updated });
                      showNotice(
                        `تم التعرف على ${res.chainNarratorIds.length} راوياً وربطهم بالسند.${
                          res.unmatchedSegments.length > 0
                            ? ` (أسماء غير مطابقة: ${res.unmatchedSegments.join('، ')})`
                            : ''
                        }`
                      );
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#854D0E] hover:underline cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>ربط تلقائي للرواة من السند</span>
                  </button>
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
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={chainTextDraft}
                  onChange={(e) => setChainTextDraft(e.target.value)}
                  placeholder="أو اكتب سلسلة الرواة مفصولة بفاصلة مثل الإكسل: عمر بن الخطاب، علقمة بن وقاص، ...، ابن حزم"
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E6E0D4] rounded-md focus:outline-none focus:border-[#14532D]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!chainTextDraft.trim()) {
                      showError('اكتب أسماء الرواة مفصولة بفاصلة أولاً.');
                      return;
                    }
                    const res = autoMatchIsnadChain(chainTextDraft, '', narrators);
                    if (res.chainNarratorIds.length === 0) {
                      showError('لم يُعثر على رواة مطابقين في قاعدة الرواة الحالية.');
                      return;
                    }
                    const updated = structuredClone(hadithForm.paths);
                    updated[0].chainNarratorIds = res.chainNarratorIds;
                    setHadithForm({ ...hadithForm, paths: updated });
                    showNotice(
                      `تم تطبيق السلسلة (${res.chainNarratorIds.length} راوياً).${
                        res.unmatchedSegments.length > 0
                          ? ` أسماء غير مسجلة بعد: ${res.unmatchedSegments.join('، ')}`
                          : ''
                      }`
                    );
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-[#14532D] hover:bg-[#114224] text-white rounded-md cursor-pointer whitespace-nowrap"
                >
                  تطبيق السلسلة النصية
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
                الحكم على الحديث وتوثيقه (صاحب الحكم والكتاب والصفحة)
              </span>
              <input
                type="text"
                value={hadithForm.ibnHazmHukm}
                onChange={(e) =>
                  setHadithForm({ ...hadithForm, ibnHazmHukm: e.target.value })
                }
                placeholder="مثال: صحيح متصل الإسناد — ابن حزم، المحلّى ج 1 ص 112"
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

          {/* Four Madhahib Documented Fiqh Editor */}
          <div className="space-y-3 pt-2 border-t border-[#E6E0D4]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#1C1917]">
                فقه الحديث في المذاهب الأربعة مع التوثيق (الكتاب والجزء والصفحة)
              </span>
              {(!hadithForm.fourMadhahibFiqh ||
                hadithForm.fourMadhahibFiqh.length === 0) && (
                <button
                  type="button"
                  onClick={() =>
                    setHadithForm((prev) => ({
                      ...prev,
                      fourMadhahibFiqh: DEFAULT_FOUR_MADHAHIB(),
                    }))
                  }
                  className="text-xs font-medium text-[#14532D] hover:underline cursor-pointer"
                >
                  + تهيئة حقول المذاهب الأربعة
                </button>
              )}
            </div>

            {(
              hadithForm.fourMadhahibFiqh && hadithForm.fourMadhahibFiqh.length > 0
                ? hadithForm.fourMadhahibFiqh
                : DEFAULT_FOUR_MADHAHIB()
            ).map((entry, idx) => (
              <div
                key={`${entry.madhab}-${idx}`}
                className="p-3 bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start"
              >
                <div className="md:col-span-2">
                  <select
                    value={entry.madhab}
                    onChange={(e) => {
                      const base =
                        hadithForm.fourMadhahibFiqh &&
                        hadithForm.fourMadhahibFiqh.length > 0
                          ? [...hadithForm.fourMadhahibFiqh]
                          : DEFAULT_FOUR_MADHAHIB();
                      base[idx] = {
                        ...base[idx],
                        madhab: e.target.value as MadhabName,
                      };
                      setHadithForm({ ...hadithForm, fourMadhahibFiqh: base });
                    }}
                    className="w-full px-2.5 py-2 text-xs font-bold text-[#14532D] bg-white border border-[#E6E0D4] rounded-md"
                  >
                    <option value="الحنفي">الحنفي</option>
                    <option value="المالكي">المالكي</option>
                    <option value="الشافعي">الشافعي</option>
                    <option value="الحنبلي">الحنبلي</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <input
                    type="text"
                    placeholder={`القول الفقهي عند المذهب ${entry.madhab}...`}
                    value={entry.ruling}
                    onChange={(e) => {
                      const base =
                        hadithForm.fourMadhahibFiqh &&
                        hadithForm.fourMadhahibFiqh.length > 0
                          ? [...hadithForm.fourMadhahibFiqh]
                          : DEFAULT_FOUR_MADHAHIB();
                      base[idx] = { ...base[idx], ruling: e.target.value };
                      setHadithForm({ ...hadithForm, fourMadhahibFiqh: base });
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E6E0D4] rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="اسم الكتاب"
                    value={entry.sourceBook}
                    onChange={(e) => {
                      const base =
                        hadithForm.fourMadhahibFiqh &&
                        hadithForm.fourMadhahibFiqh.length > 0
                          ? [...hadithForm.fourMadhahibFiqh]
                          : DEFAULT_FOUR_MADHAHIB();
                      base[idx] = { ...base[idx], sourceBook: e.target.value };
                      setHadithForm({ ...hadithForm, fourMadhahibFiqh: base });
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E6E0D4] rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="المؤلف"
                    value={entry.author || ''}
                    onChange={(e) => {
                      const base =
                        hadithForm.fourMadhahibFiqh &&
                        hadithForm.fourMadhahibFiqh.length > 0
                          ? [...hadithForm.fourMadhahibFiqh]
                          : DEFAULT_FOUR_MADHAHIB();
                      base[idx] = { ...base[idx], author: e.target.value };
                      setHadithForm({ ...hadithForm, fourMadhahibFiqh: base });
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E6E0D4] rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="ج ... ص ..."
                    value={entry.volumePage}
                    onChange={(e) => {
                      const base =
                        hadithForm.fourMadhahibFiqh &&
                        hadithForm.fourMadhahibFiqh.length > 0
                          ? [...hadithForm.fourMadhahibFiqh]
                          : DEFAULT_FOUR_MADHAHIB();
                      base[idx] = { ...base[idx], volumePage: e.target.value };
                      setHadithForm({ ...hadithForm, fourMadhahibFiqh: base });
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E6E0D4] rounded-md tabular-nums"
                  />
                </div>
              </div>
            ))}
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">الطبقة</span>
              <input
                type="text"
                list="tabaqah-excel-options"
                value={narratorForm.tabaqah}
                onChange={(e) =>
                  setNarratorForm({ ...narratorForm, tabaqah: e.target.value })
                }
                placeholder="صحابي / تابعي / تابعي التابعين / راو / مصنف"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg"
              />
              <datalist id="tabaqah-excel-options">
                <option value="صحابي" />
                <option value="تابعي" />
                <option value="تابعي التابعين" />
                <option value="راو" />
                <option value="مصنف" />
              </datalist>
            </label>

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
              <span className="text-xs font-medium text-[#44403C]">الرتبة المختصرة</span>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">
                سنة الازدياد (هـ)
              </span>
              <input
                type="number"
                value={narratorForm.birthYearH || ''}
                onChange={(e) =>
                  setNarratorForm({
                    ...narratorForm,
                    birthYearH: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="مثال: 201"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg tabular-nums"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-[#44403C]">
                سنة الوفاة (هـ)
              </span>
              <input
                type="number"
                value={narratorForm.deathYearH || ''}
                onChange={(e) =>
                  setNarratorForm({
                    ...narratorForm,
                    deathYearH: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="مثال: 276"
                className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg tabular-nums"
              />
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
          </div>

          {/* Narrator Ruling & Sources (matches Excel 'الحكم على الراوي (الحكم ومصدره)') */}
          <div className="space-y-2.5 pt-2 border-t border-[#E6E0D4]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C1917]">
                الحكم على الراوي (الحكم ومصدره — أقوال أئمة الجرح والتعديل)
              </span>
              <button
                type="button"
                onClick={addNarratorRulingRow}
                className="text-xs font-medium text-[#14532D] hover:underline cursor-pointer"
              >
                + إضافة حكم ومصدر
              </button>
            </div>
            {(narratorForm.jarhTaadil.length > 0
              ? narratorForm.jarhTaadil
              : [{ scholar: '', verdict: '' }]
            ).map((jt, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  placeholder="الحكم على الراوي (مثال: ثقة حجة مأمون...)"
                  value={jt.verdict}
                  onChange={(e) => {
                    const next =
                      narratorForm.jarhTaadil.length > 0
                        ? [...narratorForm.jarhTaadil]
                        : [{ scholar: '', verdict: '' }];
                    next[idx] = { ...next[idx], verdict: e.target.value };
                    setNarratorForm({ ...narratorForm, jarhTaadil: next });
                  }}
                  className="md:col-span-6 px-3 py-1.5 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-md"
                />
                <input
                  type="text"
                  placeholder="مصدر الحكم (الذهبي، سير أعلام النبلاء ج ... ص ...)"
                  value={jt.scholar}
                  onChange={(e) => {
                    const next =
                      narratorForm.jarhTaadil.length > 0
                        ? [...narratorForm.jarhTaadil]
                        : [{ scholar: '', verdict: '' }];
                    next[idx] = { ...next[idx], scholar: e.target.value };
                    setNarratorForm({ ...narratorForm, jarhTaadil: next });
                  }}
                  className="md:col-span-5 px-3 py-1.5 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-md"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = [...narratorForm.jarhTaadil];
                    next.splice(idx, 1);
                    setNarratorForm({ ...narratorForm, jarhTaadil: next });
                  }}
                  className="md:col-span-1 text-xs text-red-600 hover:underline cursor-pointer"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>

          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-[#44403C]">
              موقف ابن حزم من الراوي (اختياري)
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

      {/* Sub-Tab 2.5: Admin-Only Templates, Bulk Import & Isnad Auto-Linking */}
      {isAdmin && subTab === 'bulk' && (
        <div className="space-y-6">
          {/* Section A: Download Styled Excel Templates for Assistants */}
          <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
            <div className="space-y-1.5 max-w-3xl">
              <h3 className="text-lg font-bold text-[#1C1917]">
                1. تحميل قوالب التفريغ للمساعدين (ملفات Excel منسقة + JSON)
              </h3>
              <p className="text-sm text-[#6B655E] leading-relaxed">
                حمّل ملفات Excel المنسّقة من اليمين لليسار مع التفاف النص التلقائي وتمدد ارتفاع الصفوف ليتكيّف مع المحتوى دون أن يمتد لخانة أخرى. وعند النسخ من مواقع أو ملفات Word، يُنصح باللصق كـ «نص فقط» (Ctrl+Shift+V) للحفاظ على تنسيق الخانات.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#14532D]">
                    قالب تفريغ أحاديث المحلّى (Excel)
                  </p>
                    <p className="text-xs text-[#6B655E]">
                      ترتيب الأعمدة: الرقم الترتيبي، نص الحديث بالسند والمتن، المجلد، الصفحة، الكتاب، رقم المسألة، متن الحديث، سند الحديث، تخريج الحديث، الحكم على الحديث (مع توثيق صاحب الحكم والكتاب والصفحة)، سلسلة الرواة، فقه الحديث، غريب الحديث (1000 صف جاهز).
                    </p>
                  </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true);
                      try {
                        const wb = await generateMuhallaExcelWorkbook(narrators);
                        await downloadExcelWorkbook('قالب_تفريغ_أحاديث_المحلى.xlsx', wb);
                      } catch (err) {
                        showError(
                          err instanceof Error ? err.message : 'تعذر إنشاء ملف Excel'
                        );
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                    className="btn-hover-motion inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل قالب Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadJson(
                        'muhalla_hadiths_template.json',
                        generateMuhallaJsonTemplate()
                      )
                    }
                    className="btn-hover-motion inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-[#D6CEBE] hover:border-[#14532D] text-[#1C1917] rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>قالب JSON</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#854D0E]">
                    قالب بطاقات الرواة ومرجع الأسماء (Excel)
                  </p>
                  <p className="text-xs text-[#6B655E]">
                    يتضمّن الأندلسيين الخمسة الأساسيين + 200 صف فارغ مع خانة سنة الازدياد قبل سنة الوفاة (الاسم الكامل، الكنية، الطبقة، الحكم على الراوي، سنة الازدياد، سنة الوفاة، البلد، ملاحظات). وفي مرجع الأسماء: الاسم الكامل، الكنية، الطبقة، الحكم على الراوي، سنة الوفاة.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true);
                      try {
                        const wb = await generateNarratorsExcelWorkbook(narrators);
                        await downloadExcelWorkbook('قالب_بطاقات_الرواة.xlsx', wb);
                      } catch (err) {
                        showError(
                          err instanceof Error ? err.message : 'تعذر إنشاء ملف Excel'
                        );
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                    className="btn-hover-motion inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#854D0E] hover:bg-[#713F12] text-white rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>قالب الرواة Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={async () => {
                      setIsBusy(true);
                      try {
                        const wb = await generateNarratorsReferenceExcelWorkbook(narrators);
                        await downloadExcelWorkbook('مرجع_الرواة_والأسماء.xlsx', wb);
                      } catch (err) {
                        showError(
                          err instanceof Error ? err.message : 'تعذر إنشاء ملف المرجع'
                        );
                      } finally {
                        setIsBusy(false);
                      }
                    }}
                    className="btn-hover-motion inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>مرجع الأسماء Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadJson(
                        'narrators_template.json',
                        generateNarratorsJsonTemplate()
                      )
                    }
                    className="btn-hover-motion inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-[#D6CEBE] hover:border-[#854D0E] text-[#1C1917] rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>قالب JSON</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Bulk Import Narrators */}
          <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1C1917]">
                  2. استيراد بطاقات الرواة دفعة واحدة (Excel .xlsx / CSV / JSON)
                </h3>
                <p className="text-xs text-[#6B655E]">
                  يفضّل استيراد بطاقات الرواة الجدد قبل استيراد الأحاديث ليتمكن النظام من ربط أسمائهم تلقائياً في الأسانيد.
                </p>
              </div>
              <label className="btn-hover-motion inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] border border-[#D6CEBE] rounded-lg cursor-pointer">
                <Upload className="w-4 h-4 text-[#854D0E]" />
                <span>اختيار ملف رواة (.xlsx / .csv / .json)</span>
                <input
                  type="file"
                  accept=".xlsx,.csv,.json"
                  onChange={handleBulkNarratorsFile}
                  className="hidden"
                />
              </label>
            </div>

            {pendingNarrators.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#E6E0D4]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[#14532D] tabular-nums">
                    الملف: {pendingNarratorsFile} · جاهز للاستيراد: {pendingNarrators.length} راوٍ
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingNarrators([]);
                        setPendingNarratorsFile('');
                      }}
                      className="px-3 py-1.5 text-xs text-[#6B655E] border border-[#E6E0D4] rounded-lg cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleCommitBulkNarrators}
                      className="btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>اعتماد وحفظ الرواة في المنصة و D1</span>
                    </button>
                  </div>
                </div>

                <div className="border border-[#E6E0D4] rounded-lg overflow-x-auto max-h-64">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FBF9F5] border-b border-[#E6E0D4] text-[#6B655E]">
                      <tr>
                        <th className="py-2 px-3 font-medium">الاسم</th>
                        <th className="py-2 px-3 font-medium">الطبقة</th>
                        <th className="py-2 px-3 font-medium">الحكم على الراوي ومصدره</th>
                        <th className="py-2 px-3 font-medium">الوفاة</th>
                        <th className="py-2 px-3 font-medium">البلد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E0D4]">
                      {pendingNarrators.slice(0, 12).map((n) => (
                        <tr key={n.id}>
                          <td className="py-2 px-3 font-semibold text-[#1C1917]">{n.name}</td>
                          <td className="py-2 px-3 text-[#57534E]">{n.tabaqah}</td>
                          <td className="py-2 px-3 text-[#14532D]">
                            {n.jarhTaadil?.[0]?.verdict
                              ? `${n.jarhTaadil[0].verdict} — ${n.jarhTaadil[0].scholar}`
                              : n.grade}
                          </td>
                          <td className="py-2 px-3 tabular-nums">{n.deathYearH || '-'}</td>
                          <td className="py-2 px-3 text-[#57534E]">{n.region}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section C: Bulk Import Muhalla Hadiths + Automatic Isnad Narrator Matching */}
          <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1C1917]">
                  3. الاستيراد الجماعي لأحاديث المحلّى والربط التلقائي للرواة في السند (Excel .xlsx / CSV / JSON)
                </h3>
                <p className="text-xs text-[#6B655E]">
                  تقرأ الأداة ملف Excel مباشرة وتستخرج الرواة من عمود «سلسلة الرواة» أو من «نص السند» وتربطهم ببطاقات الرواة لتعمل شجرة الإسناد والنقر على كل راوٍ فور الاستيراد.
                </p>
              </div>
              <label className="btn-hover-motion inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>اختيار ملف أحاديث المحلّى (.xlsx / .csv / .json)</span>
                <input
                  type="file"
                  accept=".xlsx,.csv,.json"
                  onChange={handleBulkHadithsFile}
                  className="hidden"
                />
              </label>
            </div>

            {pendingHadiths.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#E6E0D4]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[#14532D] tabular-nums">
                    الملف: {pendingHadithsFile} · الأحاديث المقروءة: {pendingHadiths.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingHadiths([]);
                        setPendingHadithsFile('');
                      }}
                      className="px-3 py-1.5 text-xs text-[#6B655E] border border-[#E6E0D4] rounded-lg cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleCommitBulkHadiths}
                      className="btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>اعتماد وحفظ الأحاديث وربط الأسانيد في D1</span>
                    </button>
                  </div>
                </div>

                <div className="border border-[#E6E0D4] rounded-lg overflow-x-auto max-h-80">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FBF9F5] border-b border-[#E6E0D4] text-[#6B655E]">
                      <tr>
                        <th className="py-2 px-3 font-medium">الموضع</th>
                        <th className="py-2 px-3 font-medium">المسألة</th>
                        <th className="py-2 px-3 font-medium">الرواة المربوطون تلقائياً</th>
                        <th className="py-2 px-3 font-medium">ملاحظات المطابقة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E0D4]">
                      {pendingHadiths.slice(0, 20).map((item) => (
                        <tr key={item.hadith.id} className="align-top">
                          <td className="py-2 px-3 tabular-nums whitespace-nowrap text-[#57534E]">
                            ج {item.hadith.volume}
                            {item.hadith.page ? ` · ص ${item.hadith.page}` : ''} · م{' '}
                            {item.hadith.issueNumber}
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#1C1917] max-w-xs">
                            {item.hadith.issueTitle}
                          </td>
                          <td className="py-2 px-3 text-[#14532D] leading-relaxed">
                            {item.matchedNames.length > 0
                              ? [...item.matchedNames].reverse().join(' ← ')
                              : 'لم يُربط راوٍ بعد'}
                          </td>
                          <td className="py-2 px-3 text-[#854D0E]">
                            {item.unmatchedSegments.length > 0
                              ? `غير موجود بالمعجم: ${item.unmatchedSegments.join('، ')}`
                              : 'مطابقة مكتملة'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section D: Scan & Auto-Link Existing Hadiths */}
          <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1C1917]">
                  4. فحص وربط الرواة تلقائياً للأحاديث المسجلة حالياً
                </h3>
                <p className="text-xs text-[#6B655E]">
                  بعد إضافة رواة جدد (مثل الرواة الأندلسيين الأساسيين)، افحص نصوص الأسانيد للأحاديث الحالية لتحديث سلسلة الرواة القابلة للنقر تلقائياً.
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanExistingHadithsLinks}
                className="btn-hover-motion inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] border border-[#D6CEBE] rounded-lg cursor-pointer"
              >
                <Wand2 className="w-4 h-4 text-[#854D0E]" />
                <span>فحص نصوص الأسانيد للأحاديث الحالية</span>
              </button>
            </div>

            {relinkProposals.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#E6E0D4]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-[#14532D] tabular-nums">
                    أحاديث مقترح تحديث ربط رواتها: {relinkProposals.length}
                  </p>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleApplyRelinkProposals}
                    className="btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>اعتماد وحفظ الروابط المحدّثة في D1</span>
                  </button>
                </div>

                <div className="border border-[#E6E0D4] rounded-lg divide-y divide-[#E6E0D4] max-h-64 overflow-y-auto">
                  {relinkProposals.map((item) => (
                    <div key={item.hadith.id} className="p-3 text-xs space-y-1">
                      <p className="font-semibold text-[#1C1917]">
                        ج {item.hadith.volume} · مسألة {item.hadith.issueNumber}:{' '}
                        {item.hadith.issueTitle}
                      </p>
                      <p className="text-[#14532D]">
                        السلسلة الجديدة: {[...item.matchedNames].reverse().join(' ← ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
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

      {/* Sub-Tab: Appearance, Home, Hadith Styling, Tree Styling & Module Controls */}
      {isAdmin && (subTab === 'appearance' || subTab === 'about_settings') && (
        <PlatformSettingsPanel
          key={subTab}
          mode={subTab}
          settings={settings}
          isBusy={isBusy}
          onJumpToTab={(t) => setSubTab(t)}
          onSaveSettings={async (next) => {
            setIsBusy(true);
            try {
              await onSaveSettings(next);
              showNotice('تم حفظ إعدادات وتنسيقات المنصة وتطبيقها بنجاح.');
            } catch (err) {
              showError(
                err instanceof Error ? err.message : 'تعذر حفظ إعدادات المنصة'
              );
            } finally {
              setIsBusy(false);
            }
          }}
        />
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
