import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  MuhallaHadith,
  Narrator,
  NineBookHadith,
  NineBookKey,
} from './types/hadith';
import {
  NINE_BOOKS_META,
  SEED_MUHALLA_HADITHS,
  SEED_NARRATORS,
  SEED_NINE_BOOKS,
} from './data/seedData';
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

  const [editorTab, setEditorTab] = useState<'hadith' | 'narrator' | 'export'>('hadith');
  const [editingHadithId, setEditingHadithId] = useState<string | null>(null);
  const [editingNarratorId, setEditingNarratorId] = useState<string | null>(null);

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

  const handleSaveHadith = (updated: MuhallaHadith) => {
    setHadiths((prev) => {
      const exists = prev.some((h) => h.id === updated.id);
      if (exists) {
        return prev.map((h) => (h.id === updated.id ? updated : h));
      }
      return [updated, ...prev];
    });
    setSelectedHadithId(updated.id);
    setEditingHadithId(updated.id);
  };

  const handleDeleteHadith = (id: string) => {
    setHadiths((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (selectedHadithId === id) {
        setSelectedHadithId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleSaveNarrator = (updated: Narrator) => {
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

  const handleDeleteNarrator = (id: string) => {
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

  const handleLinkTakhrijToMuhalla = (
    muhallaId: string,
    bookKey: NineBookKey,
    hadithNumber: number,
    chapterName: string
  ) => {
    setHadiths((prev) =>
      prev.map((h) => {
        if (h.id !== muhallaId) return h;
        const already = h.takhrijLinks.some(
          (l) => l.bookKey === bookKey && l.hadithNumber === hadithNumber
        );
        if (already) return h;
        return {
          ...h,
          takhrijLinks: [
            ...h.takhrijLinks,
            {
              bookKey,
              hadithNumber,
              chapterName,
              matchType: 'مطابق باللفظ',
              ruling: 'مخرج من الكتب التسعة',
            },
          ],
        };
      })
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

  return (
    <div className="min-h-screen flex flex-col text-[#1C1917]">
      {/* Strict 3-Zone Top Navigation Header with Clear Animated Buttons */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-xs border-b border-[#D6CEBE]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            onClick={() => setActiveSection('home')}
            className="btn-hover-motion font-hadith text-xl sm:text-2xl font-bold text-[#14532D] whitespace-nowrap shrink-0 cursor-pointer"
          >
            مرويات ابن حزم من طريق الأندلسيين
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

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => {
                setEditorTab('hadith');
                setEditingHadithId('__NEW__');
                setActiveSection('editor');
              }}
              className={`btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'editor'
                  ? 'bg-[#854D0E] text-white shadow-xs'
                  : 'bg-[#854D0E] hover:bg-[#713F12] text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة وتعديل</span>
            </button>
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
            onNavigate={(target) => setActiveSection(target)}
          />
        )}

        {activeSection === 'muhalla' && (
          <MuhallaArchiveView
            hadiths={hadiths}
            narrators={narrators}
            nineBooksCorpus={nineBooksCorpus}
            selectedHadithId={selectedHadithId}
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
            onImportNineBookHadiths={handleImportNineBookHadiths}
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
            onSaveHadith={handleSaveHadith}
            onDeleteHadith={handleDeleteHadith}
            onSaveNarrator={handleSaveNarrator}
            onDeleteNarrator={handleDeleteNarrator}
            onResetDefaults={handleResetDefaults}
          />
        )}
      </main>

      {/* Quiet Academic Footer */}
      <footer className="border-t border-[#E6E0D4] bg-[#FBF9F5] py-6 mt-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-sm text-[#6B655E]">
          <span>
            مرويات ابن حزم من طريق الأندلسيين — بحث ماستر الشريعة والابتكار الرقمي
          </span>
          <div className="flex items-center gap-5">
            <button
              onClick={() => setActiveSection('about')}
              className="hover:text-[#14532D] cursor-pointer"
            >
              حول المنصة
            </button>
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
          </div>
        </div>
      </footer>
    </div>
  );
}

