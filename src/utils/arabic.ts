/**
 * Arabic text normalization and similarity engine for Hadith Takhrij & Search.
 * Strips diacritics (tashkeel), tatweel, and normalizes hamza/alef/teh-marbuta variants.
 */

const TASHKEEL_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_REGEX = /\u0640/g;
const PUNCTUATION_REGEX = /[،؛؟.«»"'\(\)\[\]:\-!.,]/g;

export function stripTashkeel(text: string): string {
  return text.replace(TASHKEEL_REGEX, '').replace(TATWEEL_REGEX, '');
}

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return stripTashkeel(text)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'عن',
  'ان',
  'في',
  'من',
  'الي',
  'علي',
  'قال',
  'رسول',
  'الله',
  'صلي',
  'وسلم',
  'عليه',
  'رضي',
  'عنه',
  'عنها',
  'عنهم',
  'حدثنا',
  'اخبرنا',
  'سمعت',
  'يقول',
  'كان',
  'انه',
  'ما',
  'لا',
  'او',
  'و',
  'ثم',
]);

export function tokenizeForTakhrij(text: string): string[] {
  const norm = normalizeArabic(text);
  return norm
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

export interface TakhrijMatchResult {
  score: number; // 0 to 100
  matchedTokens: string[];
  matchLevel: 'تطابق عالٍ' | 'تطابق متوسط' | 'شاهد جزئي';
}

export function computeTakhrijMatch(
  queryOrMatn: string,
  candidateArabicText: string
): TakhrijMatchResult {
  const normQuery = normalizeArabic(queryOrMatn);
  const normTarget = normalizeArabic(candidateArabicText);

  if (!normQuery || !normTarget) {
    return { score: 0, matchedTokens: [], matchLevel: 'شاهد جزئي' };
  }

  // Exact substring containment gets immediate high score
  if (normTarget.includes(normQuery) && normQuery.length >= 8) {
    const tokens = tokenizeForTakhrij(normQuery);
    return {
      score: 98,
      matchedTokens: tokens,
      matchLevel: 'تطابق عالٍ',
    };
  }

  const queryTokens = Array.from(new Set(tokenizeForTakhrij(normQuery)));
  const targetTokens = new Set(tokenizeForTakhrij(normTarget));

  if (queryTokens.length === 0) {
    // Fallback to raw word check if all words were stopwords
    const rawWords = normQuery.split(' ').filter(Boolean);
    const hits = rawWords.filter((w) => normTarget.includes(w));
    const ratio = rawWords.length ? Math.round((hits.length / rawWords.length) * 100) : 0;
    return {
      score: ratio,
      matchedTokens: hits,
      matchLevel: ratio >= 70 ? 'تطابق عالٍ' : ratio >= 40 ? 'تطابق متوسط' : 'شاهد جزئي',
    };
  }

  const matchedTokens: string[] = [];
  for (const qt of queryTokens) {
    if (targetTokens.has(qt)) {
      matchedTokens.push(qt);
    } else {
      // Check root/stem partial containment (e.g. with prefixes و/ف/ب/ال)
      for (const tt of targetTokens) {
        if (
          (tt.length >= 4 && qt.length >= 4 && (tt.includes(qt) || qt.includes(tt)))
        ) {
          matchedTokens.push(qt);
          break;
        }
      }
    }
  }

  const score = Math.round((matchedTokens.length / queryTokens.length) * 100);
  const matchLevel =
    score >= 70 ? 'تطابق عالٍ' : score >= 40 ? 'تطابق متوسط' : 'شاهد جزئي';

  return { score, matchedTokens, matchLevel };
}
