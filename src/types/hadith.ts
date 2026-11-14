export type NarratorOrigin = 'andalusian' | 'classical' | 'companion' | 'compiler';

export type NarratorGrade = 'ثقة حجة' | 'ثقة' | 'صدوق' | 'مختلف فيه' | 'صحابي' | 'إمام مصنف';

export interface JarhTaadilEntry {
  scholar: string;
  verdict: string;
}

export interface Narrator {
  id: string;
  name: string;
  kunya?: string;
  birthYearH?: number;
  deathYearH?: number;
  region: string;
  origin: NarratorOrigin;
  tabaqah: string;
  grade: NarratorGrade;
  ibnHazmVerdict: string;
  teachers: string[];
  students: string[];
  jarhTaadil: JarhTaadilEntry[];
  notes: string;
}

export interface IsnadPath {
  id: string;
  sourceLabel: string; // e.g., "طريق ابن حزم في المحلى", "طريق البخاري", "طريق مالك"
  sourceType: 'muhalla' | 'nine_books';
  bookKey?: NineBookKey;
  hadithNumber?: number;
  // Ordered from Prophet / Sahabi (oldest) down to Collector / Ibn Hazm (latest)
  // OR stored from Collector up to Sahabi; we standardize: [Sahabi, Tabi'i, ..., Collector]
  chainNarratorIds: string[];
}

export interface GharibEntry {
  word: string;
  diacriticsNote?: string;
  meaning: string;
  source: string;
}

export interface TakhrijLink {
  bookKey: NineBookKey;
  hadithNumber: number;
  chapterName: string;
  matchType: 'مطابق باللفظ' | 'بالمعنى' | 'مختصر' | 'شاهد';
  ruling?: string;
}

export interface MuhallaHadith {
  id: string;
  volume: number;
  issueNumber: number;
  kitab: string; // e.g., كتاب الطهارة، كتاب البيوع
  issueTitle: string;
  matnWithTashkeel: string;
  ibnHazmIsnadText: string;
  ibnHazmHukm: string;
  paths: IsnadPath[];
  takhrijLinks: TakhrijLink[];
  gharib: GharibEntry[];
  fiqhAnalysis: string;
  otherMadhahibNotes?: string;
  updatedAt: string;
}

export type NineBookKey =
  | 'bukhari'
  | 'muslim'
  | 'abudawud'
  | 'tirmidhi'
  | 'nasai'
  | 'ibnmajah'
  | 'malik'
  | 'ahmad'
  | 'darimi';

export interface NineBookMeta {
  key: NineBookKey;
  arabicName: string;
  author: string;
  shortName: string;
}

export interface NineBookHadith {
  id: number | string;
  idInBook?: number;
  bookKey: NineBookKey;
  chapterName: string;
  arabicText: string;
  narratorIntro?: string;
}
