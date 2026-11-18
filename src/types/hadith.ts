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

export type MadhabName = 'الحنفي' | 'المالكي' | 'الشافعي' | 'الحنبلي';

export interface MadhabFiqhEntry {
  madhab: MadhabName;
  ruling: string;
  sourceBook: string;
  author?: string;
  volumePage: string;
}

export interface MuhallaHadith {
  id: string;
  volume: number;
  page?: string;
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
  fourMadhahibFiqh?: MadhabFiqhEntry[];
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

export type ResearcherRole = 'admin' | 'assistant';

export type ResearcherPermission =
  | 'edit_hadiths'
  | 'edit_muhalla_direct'
  | 'edit_narrators'
  | 'link_takhrij'
  | 'delete_records'
  | 'upload_nine_books'
  | 'export_github';

export const RESEARCHER_PERMISSION_OPTIONS: {
  key: ResearcherPermission;
  label: string;
  description: string;
}[] = [
  {
    key: 'edit_hadiths',
    label: 'إضافة وتعديل أحاديث المحلّى',
    description: 'الدخول لتبويب تحرير وإضافة أحاديث المحلّى وحفظها',
  },
  {
    key: 'edit_muhalla_direct',
    label: 'زر «تعديل» في صفحة مرويات المحلّى',
    description: 'إظهار زر «تعديل» داخل فهرس مرويات المحلّى للانتقال المباشر للتعديل',
  },
  {
    key: 'edit_narrators',
    label: 'إضافة وتعديل الرواة الأندلسيين',
    description: 'إظهار أزرار «إضافة راوٍ» و«تعديل الترجمة» وتحرير تراجم الرواة',
  },
  {
    key: 'link_takhrij',
    label: 'ربط نتائج التخريج بمسائل المحلّى',
    description: 'إظهار أزرار «ربط بالمحلى» و«مرتبط بالمسألة» في محرك التخريج',
  },
  {
    key: 'delete_records',
    label: 'حذف السجلات (أحاديث / رواة)',
    description: 'إظهار زر «حذف» لحذف الأحاديث أو الرواة من المنصة وقاعدة البيانات',
  },
  {
    key: 'upload_nine_books',
    label: 'فهرسة الكتب التسعة (JSON / GitHub)',
    description: 'إظهار أزرار «رفع ملف JSON من جهازك» و«جلب من GitHub» في التخريج',
  },
  {
    key: 'export_github',
    label: 'تصدير JSON لـ GitHub ومستودع المشروع',
    description: 'إظهار تبويب تصدير البيانات وروابط GitHub في تذييل الصفحة',
  },
];

export const ALL_RESEARCHER_PERMISSIONS: ResearcherPermission[] =
  RESEARCHER_PERMISSION_OPTIONS.map((p) => p.key);

export const DEFAULT_ASSISTANT_PERMISSIONS: ResearcherPermission[] = [
  'edit_hadiths',
  'edit_narrators',
];

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  role: ResearcherRole;
  permissions: ResearcherPermission[];
}

export interface ResearcherAccount {
  id: string;
  username: string;
  fullName: string;
  role: ResearcherRole;
  permissions: ResearcherPermission[];
  isActive: boolean;
  createdAt: string;
}


