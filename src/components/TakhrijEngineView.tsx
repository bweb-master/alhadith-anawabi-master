import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Upload,
  RefreshCw,
  CheckCircle2,
  Link2,
  Database,
  Lock,
  AlertCircle,
} from 'lucide-react';
import {
  MuhallaHadith,
  NineBookHadith,
  NineBookKey,
} from '../types/hadith';
import { NINE_BOOKS_META } from '../data/seedData';
import {
  computeTakhrijMatch,
  normalizeArabic,
  tokenizeForTakhrij,
} from '../utils/arabic';
import { searchD1NineBooks, uploadD1NineBookBatch } from '../utils/d1Client';

interface TakhrijEngineViewProps {
  muhallaHadiths: MuhallaHadith[];
  nineBooksCorpus: NineBookHadith[];
  initialQuery: string;
  isD1Connected: boolean;
  isAdminUnlocked: boolean;
  adminPassword: string;
  d1BookCounts: Record<string, number>;
  onImportNineBookHadiths: (bookKey: NineBookKey, items: NineBookHadith[]) => void;
  onNineBooksD1Updated: () => Promise<void>;
  onOpenEditorAuth: () => void;
  onLinkTakhrijToMuhalla: (
    muhallaId: string,
    bookKey: NineBookKey,
    hadithNumber: number,
    chapterName: string
  ) => Promise<void>;
}

export const TakhrijEngineView: React.FC<TakhrijEngineViewProps> = ({
  muhallaHadiths,
  nineBooksCorpus,
  initialQuery,
  isD1Connected,
  isAdminUnlocked,
  adminPassword,
  d1BookCounts,
  onImportNineBookHadiths,
  onNineBooksD1Updated,
  onOpenEditorAuth,
  onLinkTakhrijToMuhalla,
}) => {
  const [queryText, setQueryText] = useState(
    initialQuery || 'إنما الأعمال بالنيات'
  );
  const [selectedBookFilter, setSelectedBookFilter] = useState<NineBookKey | 'all'>('all');
  const [targetMuhallaId, setTargetMuhallaId] = useState<string>(
    muhallaHadiths[0]?.id || ''
  );
  const [uploadBookKey, setUploadBookKey] = useState<NineBookKey>('bukhari');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);

  const [d1Results, setD1Results] = useState<NineBookHadith[]>([]);
  const [isSearchingD1, setIsSearchingD1] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    bookKey: NineBookKey;
    items: NineBookHadith[];
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isUploadingD1, setIsUploadingD1] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQueryText(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!targetMuhallaId && muhallaHadiths[0]?.id) {
      setTargetMuhallaId(muhallaHadiths[0].id);
    }
  }, [muhallaHadiths, targetMuhallaId]);

  const searchCacheRef = useRef<Map<string, NineBookHadith[]>>(new Map());

  useEffect(() => {
    if (!isD1Connected) {
      setD1Results([]);
      return;
    }
    const cleanQ = normalizeArabic(queryText);
    if (cleanQ.length < 3) {
      setD1Results([]);
      return;
    }

    const cacheKey = `${selectedBookFilter}::${cleanQ}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      setD1Results(cached);
      setIsSearchingD1(false);
      return;
    }

    let cancelled = false;
    setIsSearchingD1(true);
    const timer = setTimeout(async () => {
      try {
        const items = await searchD1NineBooks(queryText, selectedBookFilter);
        if (!cancelled) {
          searchCacheRef.current.set(cacheKey, items);
          setD1Results(items);
        }
      } catch {
        if (!cancelled) setD1Results([]);
      } finally {
        if (!cancelled) setIsSearchingD1(false);
      }
    }, 550);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [queryText, selectedBookFilter, isD1Connected]);

  const bookCountMap = useMemo(() => {
    const counts = new Map<NineBookKey, number>();
    nineBooksCorpus.forEach((h) => {
      counts.set(h.bookKey, (counts.get(h.bookKey) || 0) + 1);
    });
    return counts;
  }, [nineBooksCorpus]);

  const totalIndexedCount = useMemo(() => {
    let total = 0;
    NINE_BOOKS_META.forEach((book) => {
      const localCount = bookCountMap.get(book.key) || 0;
      const d1Count = isD1Connected ? d1BookCounts[book.key] || 0 : 0;
      total += Math.max(localCount, d1Count);
    });
    return total;
  }, [bookCountMap, d1BookCounts, isD1Connected]);

  const bookMetaMap = useMemo(() => {
    const map = new Map<NineBookKey, string>();
    NINE_BOOKS_META.forEach((b) => map.set(b.key, b.arabicName));
    return map;
  }, []);

  const searchResults = useMemo(() => {
    const cleanQ = normalizeArabic(queryText);
    if (!cleanQ) return [];

    const mergedMap = new Map<string, NineBookHadith>();
    d1Results.forEach((item) => {
      const uid = `${item.bookKey}:${item.idInBook ?? item.id}`;
      mergedMap.set(uid, item);
    });
    nineBooksCorpus.forEach((item) => {
      const uid = `${item.bookKey}:${item.idInBook ?? item.id}`;
      if (!mergedMap.has(uid)) {
        mergedMap.set(uid, item);
      }
    });

    const meaningfulTokenCount = tokenizeForTakhrij(queryText).length;
    const minScore = meaningfulTokenCount >= 3 ? 45 : 50;

    return Array.from(mergedMap.values())
      .filter((h) => selectedBookFilter === 'all' || h.bookKey === selectedBookFilter)
      .map((item) => ({
        item,
        match: computeTakhrijMatch(queryText, item.arabicText),
      }))
      .filter((r) => r.match.score >= minScore)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 50);
  }, [queryText, nineBooksCorpus, d1Results, selectedBookFilter]);

  const handleParseHadithJson = (rawJson: unknown, bookKey: NineBookKey) => {
    let rawArray: Record<string, unknown>[] = [];
    const chapterLookup = new Map<number | string, string>();

    if (Array.isArray(rawJson)) {
      rawArray = rawJson as Record<string, unknown>[];
    } else if (rawJson && typeof rawJson === 'object') {
      const obj = rawJson as Record<string, unknown>;
      if (Array.isArray(obj.chapters)) {
        (obj.chapters as Record<string, unknown>[]).forEach((ch) => {
          if (ch.id !== undefined) {
            chapterLookup.set(
              ch.id as number | string,
              String(ch.arabic || ch.english || `باب ${ch.id}`)
            );
          }
        });
      }
      if (Array.isArray(obj.hadiths)) {
        rawArray = obj.hadiths as Record<string, unknown>[];
      }
    }

    const parsed: NineBookHadith[] = rawArray
      .map((entry, idx) => {
        const arabic = String(
          entry.arabic || entry.arabicText || entry.text || ''
        ).trim();
        if (!arabic) return null;
        const chapterId = entry.chapterId as number | string | undefined;
        const chapterName =
          String(entry.chapterName || '') ||
          (chapterId !== undefined ? chapterLookup.get(chapterId) : '') ||
          'متن الكتاب';
        return {
          id: (entry.id as number | string) ?? idx + 1,
          idInBook: Number(entry.idInBook || entry.id || idx + 1),
          bookKey,
          chapterName,
          arabicText: arabic,
        };
      })
      .filter(Boolean) as NineBookHadith[];

    if (parsed.length === 0) {
      setErrorMessage('لم يتم التعرف على صيغة الأحاديث داخل الملف المحدد.');
      setStatusMessage(null);
      return;
    }

    setErrorMessage(null);
    onImportNineBookHadiths(bookKey, parsed);
    setPendingUpload({ bookKey, items: parsed });
    setStatusMessage(
      `تمت قراءة ${parsed.length.toLocaleString('en-US')} حديثاً من كتاب ${bookMetaMap.get(bookKey)} للتخريج الفوري.`
    );
  };

  const handleUploadToD1 = async () => {
    if (!pendingUpload || !isD1Connected || !isAdminUnlocked) return;
    setIsUploadingD1(true);
    setErrorMessage(null);
    const { bookKey, items } = pendingUpload;
    const chunkSize = 120;
    try {
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const done = Math.min(i + chunk.length, items.length);
        setUploadProgress(
          `جاري الحفظ الدائم في Cloudflare D1: ${done.toLocaleString('en-US')} من ${items.length.toLocaleString('en-US')} حديث...`
        );
        await uploadD1NineBookBatch(bookKey, chunk, adminPassword, i === 0);
      }
      await onNineBooksD1Updated();
      searchCacheRef.current.clear();
      setPendingUpload(null);
      setUploadProgress(null);
      setStatusMessage(
        `تم حفظ ${items.length.toLocaleString('en-US')} حديثاً من كتاب ${bookMetaMap.get(bookKey)} في قاعدة بيانات Cloudflare D1 بنجاح.`
      );
    } catch (err) {
      setUploadProgress(null);
      setErrorMessage(
        err instanceof Error ? err.message : 'تعذر رفع الكتاب إلى قاعدة بيانات Cloudflare D1'
      );
    } finally {
      setIsUploadingD1(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        handleParseHadithJson(data, uploadBookKey);
      } catch {
        setErrorMessage('حدث خطأ أثناء قراءة ملف JSON؛ تأكد من سلامة صيغة الملف.');
        setStatusMessage(null);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleFetchFromGithub = async () => {
    setIsFetchingGithub(true);
    setStatusMessage(null);
    setErrorMessage(null);
    const urls = [
      `https://raw.githubusercontent.com/bweb-master/alhadith-anawabi-master/main/data/nine-books/${uploadBookKey}.json`,
      `https://raw.githubusercontent.com/bweb-master/alhadith-anawabi-master/main/${uploadBookKey}.json`,
    ];
    let loaded = false;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          handleParseHadithJson(json, uploadBookKey);
          loaded = true;
          break;
        }
      } catch {
        // try next path
      }
    }
    if (!loaded) {
      setErrorMessage(
        `لم يتم العثور على ${uploadBookKey}.json في المسار العام لمستودع GitHub بعد (أو المستودع خاص). يمكنك رفع الملف محلياً من جهازك مباشرة عبر زر «رفع ملف JSON».`
      );
    }
    setIsFetchingGithub(false);
  };

  const handleLinkClick = async (
    item: NineBookHadith
  ) => {
    if (!targetMuhallaId) return;
    setErrorMessage(null);
    try {
      await onLinkTakhrijToMuhalla(
        targetMuhallaId,
        item.bookKey,
        item.idInBook || Number(item.id) || 1,
        item.chapterName
      );
      setStatusMessage('تم ربط التخريج بالمسألة وحفظه بنجاح.');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ الربط؛ تأكد من تفعيل وضع الباحث بكلمة المرور.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Normalization Engine Card */}
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#1C1917]">
              محرك التخريج الآلي في الكتب التسعة
            </h2>
            <p className="text-sm text-[#6B655E]">
              يعتمد المحرك على تجريد التشكيل وتوحيد الهمزات والألف المقصورة والتاء المربوطة للمقارنة الفورية بين رواية المحلى والكتب التسعة.
            </p>
          </div>
          <div className="text-xs text-[#6B655E] tabular-nums">
            إجمالي الأحاديث المفهرسة حالياً: {totalIndexedCount.toLocaleString('en-US')} حديث
            {isD1Connected ? ' (متصل بـ D1)' : ''}
          </div>
        </div>

        {/* Quick pick from Al-Muhalla */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#6B655E]">تخريج سريع من أحاديث المحلّى:</span>
          {muhallaHadiths.map((mh) => (
            <button
              key={mh.id}
              onClick={() => {
                setQueryText(mh.matnWithTashkeel);
                setTargetMuhallaId(mh.id);
              }}
              className="px-2.5 py-1 rounded-md bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] transition-colors cursor-pointer whitespace-nowrap"
            >
              مسألة {mh.issueNumber}: {mh.issueTitle.replace('مسألة:', '').slice(0, 28)}...
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B655E] absolute right-3.5 top-3.5 pointer-events-none" />
          <textarea
            rows={2}
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="الصق متن الحديث أو طرفاً منه (بالتشكيل أو بدونه) للبحث والتخريج في الكتب التسعة..."
            className="w-full pr-10 pl-4 py-2.5 text-base font-hadith bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D] resize-none"
          />
        </div>

        {/* Normalized Preview + Book Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedBookFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                selectedBookFilter === 'all'
                  ? 'bg-[#14532D] text-white'
                  : 'bg-[#F3EFE6] text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              جميع الكتب ({totalIndexedCount})
            </button>
            {NINE_BOOKS_META.map((book) => {
              const localCount = bookCountMap.get(book.key) || 0;
              const d1Count = isD1Connected ? d1BookCounts[book.key] || 0 : 0;
              const count = Math.max(localCount, d1Count);
              return (
                <button
                  key={book.key}
                  onClick={() => setSelectedBookFilter(book.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    selectedBookFilter === book.key
                      ? 'bg-[#14532D] text-white'
                      : 'bg-[#F3EFE6] text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {book.shortName} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Import Real Nine-Books JSON from User's Repo or Local Computer */}
      <div className="bg-[#F3EFE6]/60 border border-[#E6E0D4] rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-[#1C1917]">
              فهرسة الكتب التسعة الكاملة (بصيغة hadith-json)
            </h3>
            <p className="text-xs text-[#6B655E]">
              اختر ملف أي كتاب (مثل <code className="font-mono">bukhari.json</code> أو <code className="font-mono">malik.json</code>) من جهازك أو من GitHub ثم احفظه دائماً في قاعدة بيانات Cloudflare D1.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={uploadBookKey}
              onChange={(e) => setUploadBookKey(e.target.value as NineBookKey)}
              className="px-3 py-2 text-xs bg-white border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
            >
              {NINE_BOOKS_META.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.arabicName} ({b.key}.json)
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E6E0D4] hover:border-[#14532D] text-[#1C1917] rounded-lg cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              <span>رفع ملف JSON من جهازك</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={handleFetchFromGithub}
              disabled={isFetchingGithub || isUploadingD1}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#14532D] text-white hover:bg-[#114224] rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGithub ? 'animate-spin' : ''}`} />
              <span>جلب من GitHub</span>
            </button>
          </div>
        </div>

        {/* Save imported book permanently into Cloudflare D1 */}
        {isD1Connected && pendingUpload && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D6CEBE] rounded-lg px-4 py-3">
            <div className="text-xs text-[#1C1917] space-y-0.5">
              <p className="font-semibold">
                الملف جاهز للحفظ الدائم في قاعدة البيانات السحابية ({pendingUpload.items.length.toLocaleString('en-US')} حديثاً من {bookMetaMap.get(pendingUpload.bookKey)})
              </p>
              {uploadProgress && (
                <p className="text-[#14532D] font-medium tabular-nums">{uploadProgress}</p>
              )}
            </div>

            {isAdminUnlocked ? (
              <button
                type="button"
                onClick={handleUploadToD1}
                disabled={isUploadingD1}
                className="btn-hover-motion inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#854D0E] hover:bg-[#713F12] text-white rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Database className="w-3.5 h-3.5" />
                <span>
                  {isUploadingD1
                    ? 'جاري الحفظ في D1...'
                    : 'حفظ الكتاب في قاعدة بيانات Cloudflare D1'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenEditorAuth}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#854D0E] rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>فعّل وضع الباحث بكلمة المرور للحفظ في D1</span>
              </button>
            )}
          </div>
        )}

        {statusMessage && (
          <div className="flex items-center gap-2 text-xs text-[#14532D] bg-white border border-[#E6E0D4] px-3.5 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3.5 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#1C1917] tabular-nums">
            نتائج التخريج ({searchResults.length})
            {isSearchingD1 ? ' — جاري البحث في Cloudflare D1...' : ''}
          </h3>
          {muhallaHadiths.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#6B655E]">ربط النتائج بمسألة المحلى:</span>
              <select
                value={targetMuhallaId}
                onChange={(e) => setTargetMuhallaId(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#E6E0D4] rounded-md text-xs"
              >
                {muhallaHadiths.map((mh) => (
                  <option key={mh.id} value={mh.id}>
                    مسألة {mh.issueNumber} — {mh.kitab}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {searchResults.length === 0 ? (
          <div className="bg-white border border-[#E6E0D4] rounded-xl p-10 text-center space-y-2">
            <p className="text-sm font-medium text-[#1C1917]">
              لا توجد نتائج مطابقة للنص المدخل في الكتب المحددة.
            </p>
            <p className="text-xs text-[#6B655E]">
              جرّب كتابة كلمات مفتاحية أقل (مثل: «الماء طهور» أو «البيعان بالخيار» أو «بغير طهور»)، أو استورد ملف كتاب كامل من جهازك.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {searchResults.map(({ item, match }, index) => {
              const targetMuhalla = muhallaHadiths.find((m) => m.id === targetMuhallaId);
              const alreadyLinked = targetMuhalla?.takhrijLinks.some(
                (l) =>
                  l.bookKey === item.bookKey &&
                  l.hadithNumber === (item.idInBook || Number(item.id))
              );
              return (
                <article
                  key={`${item.bookKey}-${item.id}-${index}`}
                  className="bg-white border border-[#E6E0D4] rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B655E] tabular-nums">
                      <span className="font-semibold text-[#14532D] text-sm">
                        {bookMetaMap.get(item.bookKey)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>حديث رقم {item.idInBook || item.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.chapterName}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#854D0E] tabular-nums">
                        {match.matchLevel} ({match.score}%)
                      </span>
                      {targetMuhallaId && (
                        <button
                          onClick={() => handleLinkClick(item)}
                          disabled={alreadyLinked}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                            alreadyLinked
                              ? 'bg-[#F3EFE6] text-[#14532D] cursor-default'
                              : 'bg-[#F3EFE6] hover:bg-[#14532D] hover:text-white text-[#1C1917]'
                          }`}
                        >
                          <Link2 className="w-3 h-3" />
                          <span>{alreadyLinked ? 'مرتبط بالمسألة' : 'ربط بالمحلى'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {item.narratorIntro && (
                    <p className="text-xs text-[#6B655E]">{item.narratorIntro}</p>
                  )}

                  <p className="font-hadith text-xl text-[#1C1917] leading-relaxed">
                    {item.arabicText}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

