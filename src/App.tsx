import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogIn, Lock, Unlock, X } from 'lucide-react';
import {
  ALL_RESEARCHER_PERMISSIONS,
  AuthenticatedUser,
  DEFAULT_ASSISTANT_PERMISSIONS,
  MuhallaHadith,
  Narrator,
  NineBookHadith,
  NineBookKey,
  ResearcherAccount,
  ResearcherPermission,
  ResearcherRole,
} from './types/hadith';
import {
  NINE_BOOKS_META,
  SEED_MUHALLA_HADITHS,
  SEED_NARRATORS,
  SEED_NINE_BOOKS,
} from './data/seedData';
import {
  checkD1Health,
  D1Credentials,
  deleteD1Hadith,
  deleteD1Narrator,
  deleteD1User,
  fetchD1Hadiths,
  fetchD1Narrators,
  fetchD1NineBookCounts,
  fetchD1Users,
  saveD1Hadith,
  saveD1HadithsBatch,
  saveD1Narrator,
  saveD1NarratorsBatch,
  saveD1User,
  uploadD1NineBookBatch,
  verifyD1Credentials,
} from './utils/d1Client';
import { HomeView } from './components/HomeView';
import { AboutPlatformView } from './components/AboutPlatformView';
import { MuhallaArchiveView } from './components/MuhallaArchiveView';
import { TakhrijEngineView } from './components/TakhrijEngineView';
import { IsnadTreeView } from './components/IsnadTreeView';
import { NarratorsDirectoryView } from './components/NarratorsDirectoryView';
import { ContentEditorView } from './components/ContentEditorView';

type MainSection = 'home' | 'muhalla' | 'takhrij' | 'tree' | 'narrators' | 'about' | 'editor';

const STORAGE_KEYS = {
  hadiths: 'diwan_muhalla_hadiths_v1',
  narrators: 'diwan_muhalla_narrators_v1',
  authCreds: 'diwan_auth_creds_v2',
  authUser: 'diwan_auth_user_v2',
  bookCounts: 'diwan_d1_book_counts_v1',
  localUsers: 'diwan_local_researchers_v1',
  localUserPwds: 'diwan_local_researcher_pwds_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadBookCountsFromStorage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.bookCounts);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

function loadSessionJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function loadLocalUsers(): ResearcherAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.localUsers);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ResearcherAccount[]).map((u) => ({
      ...u,
      permissions:
        u.role === 'admin'
          ? [...ALL_RESEARCHER_PERMISSIONS]
          : Array.isArray(u.permissions)
            ? u.permissions
            : [...DEFAULT_ASSISTANT_PERMISSIONS],
    }));
  } catch {
    return [];
  }
}

function loadLocalPwds(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.localUserPwds);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<MainSection>('home');
  const [hadiths, setHadiths] = useState<MuhallaHadith[]>(() =>
    loadFromStorage(STORAGE_KEYS.hadiths, SEED_MUHALLA_HADITHS)
  );
  const [narrators, setNarrators] = useState<Narrator[]>(() =>
    loadFromStorage(STORAGE_KEYS.narrators, SEED_NARRATORS)
  );
  const [nineBooksCorpus, setNineBooksCorpus] =
    useState<NineBookHadith[]>(SEED_NINE_BOOKS);

  const [selectedHadithId, setSelectedHadithId] = useState<string>(
    hadiths[0]?.id || 'muhalla_001'
  );
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>(
    narrators[0]?.id || 'ibn_hazm'
  );
  const [takhrijQuery, setTakhrijQuery] = useState<string>('');

  const [editorTab, setEditorTab] = useState<'hadith' | 'narrator' | 'users' | 'export'>(
    'hadith'
  );
  const [editingHadithId, setEditingHadithId] = useState<string | null>(null);
  const [editingNarratorId, setEditingNarratorId] = useState<string | null>(null);

  // Cloudflare D1 integration state
  const [isD1Connected, setIsD1Connected] = useState(false);
  const [d1Reason, setD1Reason] = useState<'no_api' | 'no_db_binding' | 'db_error' | undefined>(
    undefined
  );
  const [d1ErrorDetail, setD1ErrorDetail] = useState<string | undefined>(undefined);
  const [d1HadithCount, setD1HadithCount] = useState(0);
  const [d1BookCounts, setD1BookCounts] = useState<Record<string, number>>(() =>
    loadBookCountsFromStorage()
  );
  const [d1NineBookTotal, setD1NineBookTotal] = useState<number>(() => {
    const cached = loadBookCountsFromStorage();
    return Object.values(cached).reduce((sum, n) => sum + Number(n || 0), 0);
  });

  // Multi-User Authentication State
  const [authCreds, setAuthCreds] = useState<D1Credentials | null>(() =>
    loadSessionJson<D1Credentials>(STORAGE_KEYS.authCreds)
  );
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() =>
    loadSessionJson<AuthenticatedUser>(STORAGE_KEYS.authUser)
  );
  const [researchers, setResearchers] = useState<ResearcherAccount[]>(() =>
    loadLocalUsers()
  );

  const isLoggedIn = Boolean(currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const hasPerm = useCallback(
    (perm: ResearcherPermission): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin') return true;
      return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(perm);
    },
    [currentUser]
  );

  // Header "دخول" dropdown state
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const [loginUsernameInput, setLoginUsernameInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);
  const loginMenuRef = useRef<HTMLDivElement>(null);
  const hasFetchedBookCountsRef = useRef(false);
  const initialAuthCredsRef = useRef(authCreds);

  useEffect(() => {
    if (!isLoginDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (loginMenuRef.current && !loginMenuRef.current.contains(e.target as Node)) {
        setIsLoginDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLoginDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoginDropdownOpen]);

  const refreshD1NineBookCounts = useCallback(async () => {
    const counts = await fetchD1NineBookCounts();
    setD1BookCounts(counts);
    const total = Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0);
    setD1NineBookTotal(total);
    hasFetchedBookCountsRef.current = true;
    try {
      localStorage.setItem(STORAGE_KEYS.bookCounts, JSON.stringify(counts));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initD1() {
      const health = await checkD1Health();
      if (cancelled) return;
      if (!health.connected) {
        setIsD1Connected(false);
        setD1Reason(health.reason);
        setD1ErrorDetail(health.errorDetail);
        return;
      }

      setIsD1Connected(true);
      setD1Reason(undefined);
      setD1ErrorDetail(undefined);
      setD1HadithCount(health.counts?.hadiths || 0);

      try {
        const [d1Hadiths, d1Narrators] = await Promise.all([
          fetchD1Hadiths(),
          fetchD1Narrators(),
        ]);

        if (cancelled) return;

        if (d1Hadiths.length > 0) {
          setHadiths(d1Hadiths);
          setSelectedHadithId((prev) =>
            d1Hadiths.some((h) => h.id === prev) ? prev : d1Hadiths[0].id
          );
        }
        if (d1Narrators.length > 0) {
          setNarrators(d1Narrators);
          setSelectedNarratorId((prev) =>
            d1Narrators.some((n) => n.id === prev) ? prev : d1Narrators[0].id
          );
        }

        const storedCreds = initialAuthCredsRef.current;
        if (storedCreds) {
          const authRes = await verifyD1Credentials(storedCreds);
          if (!cancelled) {
            if (authRes.ok) {
              setCurrentUser(authRes.user);
              try {
                sessionStorage.setItem(
                  STORAGE_KEYS.authUser,
                  JSON.stringify(authRes.user)
                );
              } catch {
                // ignore
              }
              if (authRes.user.role === 'admin') {
                fetchD1Users(storedCreds)
                  .then((users) => {
                    if (!cancelled) setResearchers(users);
                  })
                  .catch(() => {
                    // ignore
                  });
              }
            } else {
              setAuthCreds(null);
              setCurrentUser(null);
              try {
                sessionStorage.removeItem(STORAGE_KEYS.authCreds);
                sessionStorage.removeItem(STORAGE_KEYS.authUser);
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // Keep local data if read fails temporarily
      }
    }

    initD1();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeSection === 'takhrij' && isD1Connected && !hasFetchedBookCountsRef.current) {
      refreshD1NineBookCounts().catch(() => {
        // keep cached counts if temporarily unavailable
      });
    }
  }, [activeSection, isD1Connected, refreshD1NineBookCounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.hadiths, JSON.stringify(hadiths));
    } catch {
      // ignore quota errors
    }
  }, [hadiths]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.narrators, JSON.stringify(narrators));
    } catch {
      // ignore quota errors
    }
  }, [narrators]);

  const handleUnlockUser = async (
    usernameInput: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const username = usernameInput.trim().toLowerCase();
    if (!username) {
      return { ok: false, error: 'يرجى إدخال اسم المستخدم.' };
    }
    const creds: D1Credentials = { username, password };

    if (!isD1Connected) {
      // Local preview mode: supports Master Super Admin 'bweb' and locally created researcher accounts
      if (username === 'bweb') {
        const superAdmin: AuthenticatedUser = {
          id: 'master_bweb',
          username: 'bweb',
          fullName: 'المشرف العام',
          role: 'admin',
          permissions: [...ALL_RESEARCHER_PERMISSIONS],
        };
        setAuthCreds(creds);
        setCurrentUser(superAdmin);
        try {
          sessionStorage.setItem(STORAGE_KEYS.authCreds, JSON.stringify(creds));
          sessionStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(superAdmin));
        } catch {
          // ignore
        }
        return { ok: true };
      }

      const localList = loadLocalUsers();
      const localPwds = loadLocalPwds();
      const found = localList.find((u) => u.username.toLowerCase() === username);
      if (!found) {
        return { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
      }
      if (!found.isActive) {
        return { ok: false, error: 'تم تعطيل هذا الحساب مؤقتاً من قِبل المشرف العام.' };
      }
      if (localPwds[found.id] !== password) {
        return { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
      }
      const userObj: AuthenticatedUser = {
        id: found.id,
        username: found.username,
        fullName: found.fullName,
        role: found.role,
        permissions:
          found.role === 'admin'
            ? [...ALL_RESEARCHER_PERMISSIONS]
            : found.permissions || [...DEFAULT_ASSISTANT_PERMISSIONS],
      };
      setAuthCreds(creds);
      setCurrentUser(userObj);
      try {
        sessionStorage.setItem(STORAGE_KEYS.authCreds, JSON.stringify(creds));
        sessionStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(userObj));
      } catch {
        // ignore
      }
      return { ok: true };
    }

    const res = await verifyD1Credentials(creds);
    if (res.ok) {
      setAuthCreds(creds);
      setCurrentUser(res.user);
      try {
        sessionStorage.setItem(STORAGE_KEYS.authCreds, JSON.stringify(creds));
        sessionStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(res.user));
      } catch {
        // ignore
      }
      if (res.user.role === 'admin') {
        fetchD1Users(creds)
          .then((users) => setResearchers(users))
          .catch(() => {
            // ignore
          });
      }
      return { ok: true };
    }
    return { ok: false, error: res.error };
  };

  const handleLockAdmin = () => {
    setAuthCreds(null);
    setCurrentUser(null);
    setIsLoginDropdownOpen(false);
    setLoginError(null);
    setLoginUsernameInput('');
    setLoginPasswordInput('');
    try {
      sessionStorage.removeItem(STORAGE_KEYS.authCreds);
      sessionStorage.removeItem(STORAGE_KEYS.authUser);
    } catch {
      // ignore
    }
    if (activeSection === 'editor') {
      setActiveSection('home');
    }
  };

  const handleHeaderLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginUsernameInput.trim()) {
      setLoginError('يرجى إدخال اسم المستخدم.');
      return;
    }
    if (isD1Connected && !loginPasswordInput.trim()) {
      setLoginError('يرجى إدخال كلمة المرور.');
      return;
    }
    setIsCheckingLogin(true);
    try {
      const res = await handleUnlockUser(
        loginUsernameInput.trim(),
        loginPasswordInput.trim()
      );
      if (res.ok) {
        setLoginUsernameInput('');
        setLoginPasswordInput('');
        setIsLoginDropdownOpen(false);
        setEditorTab('hadith');
        setEditingHadithId('__NEW__');
        setActiveSection('editor');
      } else {
        setLoginError(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
    } finally {
      setIsCheckingLogin(false);
    }
  };

  const handleRefreshUsers = useCallback(async () => {
    if (!isD1Connected) {
      setResearchers(loadLocalUsers());
      return;
    }
    if (!authCreds || !isAdmin) return;
    const users = await fetchD1Users(authCreds);
    setResearchers(users);
  }, [isD1Connected, authCreds, isAdmin]);

  const handleSaveUser = async (payload: {
    id?: string;
    username: string;
    fullName: string;
    password?: string;
    role: ResearcherRole;
    permissions: ResearcherPermission[];
    isActive: boolean;
  }): Promise<void> => {
    if (!isAdmin) {
      throw new Error('هذه الصلاحية مخصصة للمشرف فقط.');
    }

    if (!isD1Connected) {
      const list = loadLocalUsers();
      const pwds = loadLocalPwds();
      const username = payload.username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,32}$/.test(username) || username === 'bweb') {
        throw new Error(
          'اسم المستخدم يجب أن يكون بالإنجليزية (3-32 حرفاً) ولا يمكن استخدام "bweb".'
        );
      }
      const conflict = list.find(
        (u) => u.username.toLowerCase() === username && u.id !== payload.id
      );
      if (conflict) {
        throw new Error('اسم المستخدم مستعمل مسبقاً لباحث آخر.');
      }
      if (!payload.id && (!payload.password || payload.password.length < 4)) {
        throw new Error('يرجى إدخال كلمة مرور من 4 أحرف على الأقل.');
      }

      const effectivePerms =
        payload.role === 'admin'
          ? [...ALL_RESEARCHER_PERMISSIONS]
          : payload.permissions;

      let nextList: ResearcherAccount[];
      if (payload.id) {
        nextList = list.map((u) =>
          u.id === payload.id
            ? {
                ...u,
                username,
                fullName: payload.fullName,
                role: payload.role,
                permissions: effectivePerms,
                isActive: payload.isActive,
              }
            : u
        );
        if (payload.password) {
          pwds[payload.id] = payload.password;
        }
      } else {
        const newId = `res_${Date.now()}`;
        const created: ResearcherAccount = {
          id: newId,
          username,
          fullName: payload.fullName,
          role: payload.role,
          permissions: effectivePerms,
          isActive: payload.isActive,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        nextList = [created, ...list];
        pwds[newId] = payload.password || '';
      }

      setResearchers(nextList);
      localStorage.setItem(STORAGE_KEYS.localUsers, JSON.stringify(nextList));
      localStorage.setItem(STORAGE_KEYS.localUserPwds, JSON.stringify(pwds));
      return;
    }

    if (!authCreds) throw new Error('يرجى تسجيل الدخول أولاً.');
    const saved = await saveD1User(payload, authCreds);
    setResearchers((prev) => {
      const exists = prev.some((u) => u.id === saved.id);
      return exists
        ? prev.map((u) => (u.id === saved.id ? saved : u))
        : [saved, ...prev];
    });
  };

  const handleDeleteUser = async (id: string): Promise<void> => {
    if (!isAdmin) {
      throw new Error('هذه الصلاحية مخصصة للمشرف فقط.');
    }

    if (!isD1Connected) {
      const next = loadLocalUsers().filter((u) => u.id !== id);
      const pwds = loadLocalPwds();
      delete pwds[id];
      setResearchers(next);
      localStorage.setItem(STORAGE_KEYS.localUsers, JSON.stringify(next));
      localStorage.setItem(STORAGE_KEYS.localUserPwds, JSON.stringify(pwds));
      return;
    }

    if (!authCreds) throw new Error('يرجى تسجيل الدخول أولاً.');
    await deleteD1User(id, authCreds);
    setResearchers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSeedInitialD1 = async (): Promise<void> => {
    if (!authCreds || !isAdmin) {
      throw new Error('هذه الصلاحية مخصصة للمشرف فقط.');
    }
    await saveD1HadithsBatch(SEED_MUHALLA_HADITHS, authCreds);
    await saveD1NarratorsBatch(SEED_NARRATORS, authCreds);

    if (d1NineBookTotal === 0) {
      const byBook = new Map<NineBookKey, NineBookHadith[]>();
      SEED_NINE_BOOKS.forEach((item) => {
        const list = byBook.get(item.bookKey) || [];
        list.push(item);
        byBook.set(item.bookKey, list);
      });
      for (const [bookKey, items] of byBook.entries()) {
        await uploadD1NineBookBatch(bookKey, items, authCreds, false);
      }
    }

    const [d1Hadiths, d1Narrators] = await Promise.all([
      fetchD1Hadiths(),
      fetchD1Narrators(),
    ]);
    await refreshD1NineBookCounts();

    if (d1Hadiths.length > 0) {
      setHadiths(d1Hadiths);
      setD1HadithCount(d1Hadiths.length);
    }
    if (d1Narrators.length > 0) {
      setNarrators(d1Narrators);
    }
  };

  const handleSaveHadith = async (updated: MuhallaHadith): Promise<void> => {
    if (isD1Connected) {
      if (!authCreds) throw new Error('يرجى تسجيل الدخول أولاً.');
      await saveD1Hadith(updated, authCreds);
    }
    setHadiths((prev) => {
      const exists = prev.some((h) => h.id === updated.id);
      if (exists) {
        return prev.map((h) => (h.id === updated.id ? updated : h));
      }
      setD1HadithCount((c) => c + 1);
      return [updated, ...prev];
    });
    setSelectedHadithId(updated.id);
    setEditingHadithId(updated.id);
  };

  const handleDeleteHadith = async (id: string): Promise<void> => {
    if (!hasPerm('delete_records')) throw new Error('لا تملك صلاحية حذف السجلات.');
    if (isD1Connected) {
      if (!authCreds) throw new Error('يرجى تسجيل الدخول أولاً.');
      await deleteD1Hadith(id, authCreds);
    }
    setHadiths((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (selectedHadithId === id) {
        setSelectedHadithId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleSaveNarrator = async (updated: Narrator): Promise<void> => {
    if (isD1Connected) {
      if (!authCreds) throw new Error('يرجى تسجيل الدخول أولاً.');
      await saveD1Narrator(updated, authCreds);
    }
    setNarrators((prev) => {
      const exists = prev.some((n) => n.id === updated.id);
      if (exists) {
        return prev.map((n) => (n.id === updated.id ? updated : n));
      }
      return [updated, ...prev];
    });
    setSelectedNarratorId(updated.id);
    setEditingNarratorId(updated.id);
  };

  const handleDeleteNarrator = async (id: string): Promise<void> => {
    if (!hasPerm('delete_records')) throw new Error('لا تملك صلاحية حذف السجلات.');
    if (isD1Connected) {
      if (!authCreds) throw new Error('يرجى تسجيل الدخول أولاً.');
      await deleteD1Narrator(id, authCreds);
    }
    setNarrators((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (selectedNarratorId === id) {
        setSelectedNarratorId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleImportNineBookHadiths = (
    bookKey: NineBookKey,
    importedItems: NineBookHadith[]
  ) => {
    setNineBooksCorpus((prev) => {
      const others = prev.filter((item) => item.bookKey !== bookKey);
      return [...others, ...importedItems];
    });
  };

  const handleLinkTakhrijToMuhalla = async (
    muhallaId: string,
    bookKey: NineBookKey,
    hadithNumber: number,
    chapterName: string
  ): Promise<void> => {
    if (!hasPerm('link_takhrij')) {
      throw new Error('لا تملك صلاحية ربط التخريج بالمسألة.');
    }
    const target = hadiths.find((h) => h.id === muhallaId);
    if (!target) return;
    const already = target.takhrijLinks.some(
      (l) => l.bookKey === bookKey && l.hadithNumber === hadithNumber
    );
    if (already) return;

    const updatedHadith: MuhallaHadith = {
      ...target,
      takhrijLinks: [
        ...target.takhrijLinks,
        {
          bookKey,
          hadithNumber,
          chapterName,
          matchType: 'مطابق باللفظ',
          ruling: 'مخرج من الكتب التسعة',
        },
      ],
    };

    if (isD1Connected) {
      if (!authCreds) throw new Error('يرجى تسجيل الدخول أولاً.');
      await saveD1Hadith(updatedHadith, authCreds);
    }

    setHadiths((prev) =>
      prev.map((h) => (h.id === muhallaId ? updatedHadith : h))
    );
  };

  const handleResetDefaults = () => {
    localStorage.removeItem(STORAGE_KEYS.hadiths);
    localStorage.removeItem(STORAGE_KEYS.narrators);
    setHadiths(SEED_MUHALLA_HADITHS);
    setNarrators(SEED_NARRATORS);
    setSelectedHadithId(SEED_MUHALLA_HADITHS[0].id);
    setSelectedNarratorId(SEED_NARRATORS[0].id);
  };

  const navItems: { id: MainSection; label: string }[] = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'muhalla', label: 'مرويات المحلّى' },
    { id: 'takhrij', label: 'تخريج الأحاديث' },
    { id: 'tree', label: 'شجرة الإسناد' },
    { id: 'narrators', label: 'دراسة الرواة' },
    { id: 'about', label: 'حول المنصة' },
  ];

  const andalusianCount = narrators.filter((n) => n.origin === 'andalusian').length;
  const userBadgeLabel =
    currentUser?.username === 'bweb'
      ? 'مشرف عام'
      : isAdmin
        ? 'مشرف'
        : 'باحث مساعد';

  return (
    <div className="min-h-screen flex flex-col text-[#1C1917]">
      {/* Strict 3-Zone Top Navigation Header with Clear Animated Buttons */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-xs border-b border-[#D6CEBE]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
          {/* Zone 1: Transparent Platform Logo at Top-Right */}
          <button
            onClick={() => setActiveSection('home')}
            className="btn-hover-motion flex items-center shrink-0 cursor-pointer bg-transparent p-0"
            aria-label="الرئيسية"
          >
            <img
              src="/assets/aistudio/logo_65694aac.png"
              alt="شعار المنصة"
              className="h-14 sm:h-16 w-auto object-contain bg-transparent mix-blend-multiply select-none"
            />
          </button>

          {/* Zone 2: Clear Single-Line Navigation Buttons with Hover Motion */}
          <nav className="hidden xl:flex items-center gap-2 text-sm font-semibold">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`btn-hover-motion px-3.5 py-2 rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#14532D] text-white border-[#14532D] shadow-xs'
                      : 'bg-white/90 text-[#1C1917] border-[#E6E0D4] hover:border-[#14532D] hover:bg-[#F3EFE6] hover:text-[#14532D]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Multi-User Login Dropdown / Lock Editing Toggle */}
          <div className="relative flex items-center gap-2 shrink-0" ref={loginMenuRef}>
            {isLoggedIn ? (
              activeSection === 'editor' ? (
                <button
                  type="button"
                  onClick={handleLockAdmin}
                  className="btn-hover-motion inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer bg-[#854D0E] hover:bg-[#713F12] text-white shadow-xs"
                >
                  <Lock className="w-4 h-4" />
                  <span>خروج ({userBadgeLabel})</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorTab('hadith');
                      setEditingHadithId('__NEW__');
                      setActiveSection('editor');
                    }}
                    className="btn-hover-motion inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer bg-[#854D0E] hover:bg-[#713F12] text-white"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>التعديلات</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLockAdmin}
                    className="btn-hover-motion inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#854D0E] border border-[#D6CEBE]"
                    title="تسجيل الخروج"
                  >
                    <Lock className="w-4 h-4" />
                    <span>خروج</span>
                  </button>
                </>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLoginError(null);
                  setIsLoginDropdownOpen((prev) => !prev);
                }}
                className="btn-hover-motion inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer bg-[#854D0E] hover:bg-[#713F12] text-white"
              >
                <LogIn className="w-4 h-4" />
                <span>دخول</span>
              </button>
            )}

            {isLoginDropdownOpen && !isLoggedIn && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-[#D6CEBE] rounded-xl shadow-lg p-5 z-50 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E6E0D4]">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#1C1917]">
                    <Lock className="w-4 h-4 text-[#854D0E]" />
                    <span>دخول فريق البحث</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLoginDropdownOpen(false)}
                    className="p-1 text-[#6B655E] hover:text-[#1C1917] rounded-md cursor-pointer"
                    aria-label="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleHeaderLoginSubmit} className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-[#44403C]">
                      اسم المستخدم
                    </span>
                    <input
                      type="text"
                      dir="ltr"
                      autoFocus
                      value={loginUsernameInput}
                      onChange={(e) => setLoginUsernameInput(e.target.value)}
                      placeholder="أدخل اسم المستخدم..."
                      className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] text-left font-mono"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-[#44403C]">
                      كلمة المرور
                    </span>
                    <input
                      type="password"
                      value={loginPasswordInput}
                      onChange={(e) => setLoginPasswordInput(e.target.value)}
                      placeholder="أدخل كلمة المرور..."
                      className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                    />
                  </label>

                  {loginError && (
                    <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-md">
                      {loginError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isCheckingLogin}
                    className="btn-hover-motion w-full py-2.5 text-sm font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    {isCheckingLogin ? 'جاري التحقق...' : 'دخول وفتح صفحة التعديلات'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Tablet / Mobile clear button strip */}
        <div className="xl:hidden border-t border-[#E6E0D4] px-4 py-2.5 flex items-center gap-2 overflow-x-auto text-sm font-semibold">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`btn-hover-motion px-3 py-1.5 rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#14532D] text-white border-[#14532D]'
                    : 'bg-white text-[#1C1917] border-[#E6E0D4]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8 space-y-7">
        {activeSection === 'home' && (
          <HomeView
            hadithsCount={hadiths.length}
            andalusiansCount={andalusianCount}
            nineBooksCount={NINE_BOOKS_META.length}
            onNavigate={(target) => {
              if (target === 'editor' && !isLoggedIn) {
                setLoginError(null);
                setIsLoginDropdownOpen(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setActiveSection(target);
              }
            }}
          />
        )}

        {activeSection === 'muhalla' && (
          <MuhallaArchiveView
            hadiths={hadiths}
            narrators={narrators}
            nineBooksCorpus={nineBooksCorpus}
            selectedHadithId={selectedHadithId}
            isAdmin={hasPerm('edit_muhalla_direct')}
            onSelectHadith={setSelectedHadithId}
            onOpenTree={(id) => {
              setSelectedHadithId(id);
              setActiveSection('tree');
            }}
            onOpenNarrator={(nid) => {
              setSelectedNarratorId(nid);
              setActiveSection('narrators');
            }}
            onEditHadith={(id) => {
              setEditingHadithId(id);
              setEditorTab('hadith');
              setActiveSection('editor');
            }}
            onRunAutoTakhrij={(text) => {
              setTakhrijQuery(text);
              setActiveSection('takhrij');
            }}
          />
        )}

        {activeSection === 'takhrij' && (
          <TakhrijEngineView
            muhallaHadiths={hadiths}
            nineBooksCorpus={nineBooksCorpus}
            initialQuery={takhrijQuery}
            isD1Connected={isD1Connected}
            canUploadBooks={hasPerm('upload_nine_books')}
            canLinkMuhalla={hasPerm('link_takhrij')}
            authCreds={authCreds}
            d1BookCounts={d1BookCounts}
            onImportNineBookHadiths={handleImportNineBookHadiths}
            onNineBooksD1Updated={refreshD1NineBookCounts}
            onLinkTakhrijToMuhalla={handleLinkTakhrijToMuhalla}
          />
        )}

        {activeSection === 'tree' && (
          <IsnadTreeView
            hadiths={hadiths}
            narrators={narrators}
            selectedHadithId={selectedHadithId}
            onSelectHadith={setSelectedHadithId}
            onOpenNarratorInDirectory={(nid) => {
              setSelectedNarratorId(nid);
              setActiveSection('narrators');
            }}
          />
        )}

        {activeSection === 'narrators' && (
          <NarratorsDirectoryView
            narrators={narrators}
            selectedNarratorId={selectedNarratorId}
            canEdit={hasPerm('edit_narrators')}
            onSelectNarrator={setSelectedNarratorId}
            onEditNarrator={(nid) => {
              setEditingNarratorId(nid);
              setEditorTab('narrator');
              setActiveSection('editor');
            }}
            onNewNarrator={() => {
              setEditingNarratorId('__NEW__');
              setEditorTab('narrator');
              setActiveSection('editor');
            }}
          />
        )}

        {activeSection === 'about' && (
          <AboutPlatformView onNavigate={(target) => setActiveSection(target)} />
        )}

        {activeSection === 'editor' && (
          <ContentEditorView
            hadiths={hadiths}
            narrators={narrators}
            initialTab={editorTab}
            editingHadithId={editingHadithId}
            editingNarratorId={editingNarratorId}
            isD1Connected={isD1Connected}
            d1Reason={d1Reason}
            d1ErrorDetail={d1ErrorDetail}
            currentUser={currentUser}
            d1HadithCount={d1HadithCount}
            researchers={researchers}
            onUnlockUser={handleUnlockUser}
            onSeedInitialD1={handleSeedInitialD1}
            onSaveHadith={handleSaveHadith}
            onDeleteHadith={handleDeleteHadith}
            onSaveNarrator={handleSaveNarrator}
            onDeleteNarrator={handleDeleteNarrator}
            onRefreshUsers={handleRefreshUsers}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            onResetDefaults={handleResetDefaults}
          />
        )}
      </main>

      {/* Quiet Academic Footer */}
      <footer className="border-t border-[#E6E0D4] bg-[#FBF9F5] py-6 mt-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-[#6B655E]">
          <span>
            مشروع بحث التخرج في ماستر الشريعة والابتكار الرقمي · تحت إشراف الدكتور عبد الكريم خلفي · إعداد الطلبة الباحثين فوج 2025-2027
          </span>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setActiveSection('about')}
              className="hover:text-[#14532D] cursor-pointer"
            >
              حول المنصة
            </button>
            {hasPerm('export_github') && (
              <>
                <button
                  onClick={() => {
                    setEditorTab('export');
                    setActiveSection('editor');
                  }}
                  className="hover:text-[#14532D] cursor-pointer"
                >
                  تصدير JSON لـ GitHub
                </button>
                <a
                  href="https://github.com/bweb-master/alhadith-anawabi-master"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#14532D]"
                >
                  مستودع المشروع
                </a>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
