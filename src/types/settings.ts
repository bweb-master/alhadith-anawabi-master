export type ArabicUiFontKey =
  | 'IBM Plex Sans Arabic'
  | 'Cairo'
  | 'Amiri'
  | 'Noto Naskh Arabic'
  | 'Scheherazade New';

export type ButtonShapeStyle = 'rounded' | 'soft' | 'classic' | 'sharp';
export type ButtonFillStyle = 'solid' | 'bordered' | 'gradient';
export type IconStyle = 'default' | 'thin' | 'bold' | 'framed';
export type MotionLevel = 'smooth' | 'subtle' | 'none';
export type ClickSoundType = 'off' | 'soft' | 'wood' | 'chime';
export type PagePatternType =
  | 'octagonal'
  | 'stars'
  | 'mihrab'
  | 'dots'
  | 'grid'
  | 'none';

export interface HeroMediaItem {
  id: string;
  title: string;
  url: string;
  mediaType?: 'auto' | 'image' | 'video' | 'youtube';
}

export interface PlatformContributor {
  id: string;
  name: string;
  title: string;
  role: string;
  photoUrl: string;
  bio?: string;
}

export interface AboutObjectiveItem {
  num: string;
  title: string;
  body: string;
}

export interface PlatformSettings {
  home: {
    siteTitle: string;
    heroEyebrow: string;
    heroDescription: string;
    supervisionText: string;
    batchText: string;
    logoUrl: string;
    heroImageUrl: string;
    heroImageFrame: 'logo' | 'rounded' | 'circle';
    footerText: string;
    heroMedia: HeroMediaItem[];
  };
  typography: {
    fontFamily: ArabicUiFontKey;
    baseFontSizePx: number;
  };
  hadithTextStyle: {
    fontFamily: ArabicUiFontKey;
    fontSizePx: number;
    textColor: string;
    bgColor: string;
    borderColor: string;
    borderWidthPx: number;
    borderStyle: 'solid' | 'double' | 'dashed';
    borderRadiusPx: number;
    showPattern: boolean;
  };
  theme: {
    activePresetId?: string;
    pageBgColor: string;
    cardBgColor: string;
    borderColor: string;
    pagePattern: PagePatternType;
    pageBgImageUrl: string;
    primaryColor: string;
    accentColor: string;
    buttonShape: ButtonShapeStyle;
    buttonFillStyle: ButtonFillStyle;
    iconStyle: IconStyle;
    motionLevel: MotionLevel;
    clickSound: ClickSoundType;
  };
  isnadTreeStyle: {
    layout: 'vertical' | 'horizontal';
    nodeShape: 'rounded' | 'soft' | 'square';
    connectorStyle: 'curved' | 'straight' | 'step';
    frameColor: string;
    frameBorderWidthPx: number;
    canvasBgColor: string;
    andalusianNodeColor: string;
    muhallaEdgeColor: string;
    nineBooksEdgeColor: string;
    enableDownload: boolean;
  };
  reading: {
    contentWidth: 'compact' | 'normal' | 'wide';
    showIslamicOrnaments: boolean;
    enableGuestPrint: boolean;
    defaultHadithSort: 'issue' | 'serial' | 'volume';
  };
  about: {
    eyebrow: string;
    title: string;
    description: string;
    supervisionText: string;
    batchText: string;
    objectives: AboutObjectiveItem[];
    contributors: PlatformContributor[];
  };
  moduleControls: {
    showHomeStats: boolean;
    showHomeModules: boolean;
    showHomeObjectives: boolean;
    showHeroMedia: boolean;
    enableMuhalla: boolean;
    enableTakhrij: boolean;
    enableTree: boolean;
    enableNarrators: boolean;
    enableFiqh: boolean;
    enableAbout: boolean;
  };
}

export const ARABIC_FONT_OPTIONS: { key: ArabicUiFontKey; label: string; cssValue: string }[] = [
  {
    key: 'IBM Plex Sans Arabic',
    label: 'IBM Plex Sans Arabic (عصري واضح)',
    cssValue: '"IBM Plex Sans Arabic", system-ui, sans-serif',
  },
  {
    key: 'Cairo',
    label: 'Cairo (القاهرة الحديث)',
    cssValue: '"Cairo", system-ui, sans-serif',
  },
  {
    key: 'Amiri',
    label: 'Amiri (الأميري التراثي)',
    cssValue: '"Amiri", Georgia, serif',
  },
  {
    key: 'Noto Naskh Arabic',
    label: 'Noto Naskh Arabic (خط النسخ الرقمي)',
    cssValue: '"Noto Naskh Arabic", Georgia, serif',
  },
  {
    key: 'Scheherazade New',
    label: 'Scheherazade New (خط النسخ التراثي الموسّع)',
    cssValue: '"Scheherazade New", "Amiri", serif',
  },
];

export function getFontCssValue(fontKey: ArabicUiFontKey): string {
  return (
    ARABIC_FONT_OPTIONS.find((f) => f.key === fontKey)?.cssValue ||
    '"IBM Plex Sans Arabic", system-ui, sans-serif'
  );
}

export interface IslamicThemePreset {
  id: string;
  name: string;
  subtitle: string;
  pageBgColor: string;
  cardBgColor: string;
  borderColor: string;
  primaryColor: string;
  accentColor: string;
  pagePattern: PagePatternType;
  buttonShape: ButtonShapeStyle;
  buttonFillStyle: ButtonFillStyle;
  iconStyle: IconStyle;
  hadithBoxBg: string;
  hadithBoxBorder: string;
  hadithBorderStyle: 'solid' | 'double' | 'dashed';
}

export const ISLAMIC_THEME_PRESETS: IslamicThemePreset[] = [
  {
    id: 'cordoba_heritage',
    name: 'قرطبة التراثي (الافتراضي)',
    subtitle: 'عاجي هادئ مع أخضر أندلسي وذهبي عتيق وزخرفة ثمانية',
    pageBgColor: '#FBF9F5',
    cardBgColor: '#FFFFFF',
    borderColor: '#E6E0D4',
    primaryColor: '#14532D',
    accentColor: '#854D0E',
    pagePattern: 'octagonal',
    buttonShape: 'rounded',
    buttonFillStyle: 'solid',
    iconStyle: 'default',
    hadithBoxBg: '#FFFFFF',
    hadithBoxBorder: '#E6E0D4',
    hadithBorderStyle: 'solid',
  },
  {
    id: 'andalusian_manuscript',
    name: 'المخطوط الأندلسي',
    subtitle: 'ورق رقّ عتيق وإطار مزدوج مذهب لصفحات المرويات',
    pageBgColor: '#F6F0E4',
    cardBgColor: '#FCF9F2',
    borderColor: '#DFCFAF',
    primaryColor: '#1B4332',
    accentColor: '#9A6B16',
    pagePattern: 'stars',
    buttonShape: 'classic',
    buttonFillStyle: 'bordered',
    iconStyle: 'thin',
    hadithBoxBg: '#FFFDF7',
    hadithBoxBorder: '#D4B982',
    hadithBorderStyle: 'double',
  },
  {
    id: 'prophetic_emerald',
    name: 'الزمرد النبوي',
    subtitle: 'صفاء أخضر هادئ مريح للعين في القراءة المطوّلة',
    pageBgColor: '#F4F8F5',
    cardBgColor: '#FFFFFF',
    borderColor: '#CFE2D5',
    primaryColor: '#0F5132',
    accentColor: '#8C6239',
    pagePattern: 'mihrab',
    buttonShape: 'soft',
    buttonFillStyle: 'gradient',
    iconStyle: 'framed',
    hadithBoxBg: '#FAFDFB',
    hadithBoxBorder: '#B7D4C0',
    hadithBorderStyle: 'solid',
  },
  {
    id: 'qayrawan_lapis',
    name: 'القيروان الأزرق',
    subtitle: 'زرقة حجرية وقورة مستوحاة من الزليج المغربي الأندلسي',
    pageBgColor: '#F4F6FA',
    cardBgColor: '#FFFFFF',
    borderColor: '#D4DCE8',
    primaryColor: '#1E3A5F',
    accentColor: '#9A6E2B',
    pagePattern: 'stars',
    buttonShape: 'rounded',
    buttonFillStyle: 'solid',
    iconStyle: 'default',
    hadithBoxBg: '#FFFFFF',
    hadithBoxBorder: '#CBD5E1',
    hadithBorderStyle: 'solid',
  },
  {
    id: 'rawdah_olive',
    name: 'روضة المحلّى',
    subtitle: 'درجات الزيتوني الهادئ والبيج التراثي بلمسة بسيطة',
    pageBgColor: '#F8F5EE',
    cardBgColor: '#FFFDF9',
    borderColor: '#E1D6C1',
    primaryColor: '#2D4A2B',
    accentColor: '#A16207',
    pagePattern: 'octagonal',
    buttonShape: 'soft',
    buttonFillStyle: 'solid',
    iconStyle: 'bold',
    hadithBoxBg: '#FFFDF8',
    hadithBoxBorder: '#D8C7A6',
    hadithBorderStyle: 'double',
  },
  {
    id: 'dawn_minimal',
    name: 'نور الفجر (بسيط ونقي)',
    subtitle: 'خلفية ناصعة نقية بأعلى درجات البساطة والوضوح',
    pageBgColor: '#FAFAFA',
    cardBgColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    primaryColor: '#14532D',
    accentColor: '#78350F',
    pagePattern: 'dots',
    buttonShape: 'rounded',
    buttonFillStyle: 'solid',
    iconStyle: 'thin',
    hadithBoxBg: '#FFFFFF',
    hadithBoxBorder: '#E5E7EB',
    hadithBorderStyle: 'solid',
  },
];

export const BACKGROUND_PATTERN_CARDS: {
  key: PagePatternType;
  title: string;
  desc: string;
}[] = [
  { key: 'octagonal', title: 'مثمّن أندلسي', desc: 'زخرفة هندسية ثمانية هادئة' },
  { key: 'stars', title: 'نجوم الزليج', desc: 'تقاطعات نجمية إسلامية خفيفة' },
  { key: 'mihrab', title: 'أقواس محرابية', desc: 'قناطر تراثية رقيقة جداً' },
  { key: 'dots', title: 'نقاط لطيفة', desc: 'خلفية منقطة ناعمة وبسيطة' },
  { key: 'grid', title: 'تخطيط دفتري', desc: 'شبكة بحثية دقيقة' },
  { key: 'none', title: 'صفاء سادة', desc: 'لون موحّد بدون زخرفة' },
];

export const BACKGROUND_COLOR_SWATCHES: { color: string; label: string }[] = [
  { color: '#FBF9F5', label: 'ورق عاجي (الافتراضي)' },
  { color: '#F6F0E4', label: 'رقّ مخطوط دافئ' },
  { color: '#F4F8F5', label: 'نسيم زمردي' },
  { color: '#F4F6FA', label: 'سماوي حجري' },
  { color: '#F8F5EE', label: 'رملي أندلسي' },
  { color: '#FFFFFF', label: 'أبيض ناصع' },
];

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  home: {
    siteTitle: 'مرويات ابن حزم من طريق الأندلسيين',
    heroEyebrow: 'مشروع بحث التخرج في ماستر الشريعة والابتكار الرقمي · دراسة حديثية ورقمية مقارنة',
    heroDescription:
      'منصة علمية رقمية تعنى بجمع وتحقيق مرويات الإمام أبي محمد بن حزم الأندلسي في كتابه «المحلى بالآثار»، وتخريجها بالاعتماد على الكتب التسعة، مع دراسة شاملة للرواة الأندلسيين ورسم شجرة الإسناد وغريب الحديث وفقهه.',
    supervisionText: 'تحت إشراف الدكتور عبد الكريم خلفي',
    batchText: 'من إعداد الطلبة الباحثين فوج 2025-2027',
    logoUrl: '/assets/aistudio/logo_65694aac.png',
    heroImageUrl: '/assets/aistudio/logo_65694aac.png',
    heroImageFrame: 'logo',
    footerText: 'مشروع بحث التخرج في ماستر الشريعة والابتكار الرقمي - فوج 2025-2027',
    heroMedia: [],
  },
  typography: {
    fontFamily: 'IBM Plex Sans Arabic',
    baseFontSizePx: 17,
  },
  hadithTextStyle: {
    fontFamily: 'Amiri',
    fontSizePx: 24,
    textColor: '#1C1917',
    bgColor: '#FFFFFF',
    borderColor: '#E6E0D4',
    borderWidthPx: 1,
    borderStyle: 'solid',
    borderRadiusPx: 12,
    showPattern: true,
  },
  theme: {
    activePresetId: 'cordoba_heritage',
    pageBgColor: '#FBF9F5',
    cardBgColor: '#FFFFFF',
    borderColor: '#E6E0D4',
    pagePattern: 'octagonal',
    pageBgImageUrl: '',
    primaryColor: '#14532D',
    accentColor: '#854D0E',
    buttonShape: 'rounded',
    buttonFillStyle: 'solid',
    iconStyle: 'default',
    motionLevel: 'smooth',
    clickSound: 'off',
  },
  isnadTreeStyle: {
    layout: 'vertical',
    nodeShape: 'rounded',
    connectorStyle: 'curved',
    frameColor: '#E6E0D4',
    frameBorderWidthPx: 1,
    canvasBgColor: '#FBF9F5',
    andalusianNodeColor: '#FFFBEB',
    muhallaEdgeColor: '#854D0E',
    nineBooksEdgeColor: '#14532D',
    enableDownload: true,
  },
  reading: {
    contentWidth: 'normal',
    showIslamicOrnaments: true,
    enableGuestPrint: true,
    defaultHadithSort: 'issue',
  },
  about: {
    eyebrow: 'حول المنصة · التعريف والأهداف ودليل الاستخدام',
    title: 'منصة مرويات ابن حزم من طريق الأندلسيين',
    description:
      'منصة علمية رقمية أُنجزت في إطار مشروع بحث التخرج في ماستر الشريعة والابتكار الرقمي، وتهدف إلى خدمة المرويات الحديثية التي أوردها الإمام ابن حزم الأندلسي من طريق شيوخه الأندلسيين في كتابه «المحلى بالآثار»، وتقديمها لطلبة العلم والباحثين في بيئة تفاعلية تجمع بين أصالة التحقيق الحديثي ودقة الأدوات الرقمية.',
    supervisionText: 'تحت إشراف الدكتور عبد الكريم خلفي',
    batchText: 'من إعداد الطلبة الباحثين فوج 2025-2027',
    objectives: [
      {
        num: '01',
        title: 'العناية بالرواية الأندلسية في المحلى',
        body: 'إبراز الخصائص الإسنادية لمدرسة الحديث بالأندلس من خلال تتبع أسانيد ابن حزم عن شيوخه القرطبيين والأندلسيين ومقارنتها بمرويات المشرق.',
      },
      {
        num: '02',
        title: 'تسهيل التخريج والمقارنة النصية',
        body: 'ربط أحاديث المحلى بمواضعها الدقيقة في الكتب التسعة مع بحث ذكي يراعي اختلافات الرسم الإملائي والتشكيل في النصوص التراثية.',
      },
      {
        num: '03',
        title: 'التمثيل البصري لشجرة الإسناد',
        body: 'تحويل السلاسل الإسنادية النصية إلى رسوم بيانية تفاعلية توضّح طرق الحديث وتكشف عن مدار الإسناد وتفردات الرواة.',
      },
      {
        num: '04',
        title: 'التكامل بين السند والفقه واللغة',
        body: 'تيسير وصول الباحث وطالب العلم إلى ترجمة الراوي، وحكم ابن حزم على السند، والاستنباط الفقهي، وشرح غريب الحديث في مكان واحد.',
      },
    ],
    contributors: [
      {
        id: 'contrib_supervisor',
        name: 'الدكتور عبد الكريم خلفي',
        title: 'المشرف العلمي والأكاديمي',
        role: 'الإشراف والتوجيه العلمي في ماستر الشريعة والابتكار الرقمي',
        photoUrl: '',
      },
      {
        id: 'contrib_team',
        name: 'فريق الطلبة الباحثين (فوج 2025-2027)',
        title: 'ماستر الشريعة والابتكار الرقمي',
        role: 'جمع مرويات المحلّى وتوثيق الرواة الأندلسيين وتطوير المنصة الرقمية',
        photoUrl: '',
      },
    ],
  },
  moduleControls: {
    showHomeStats: true,
    showHomeModules: true,
    showHomeObjectives: true,
    showHeroMedia: true,
    enableMuhalla: true,
    enableTakhrij: true,
    enableTree: true,
    enableNarrators: true,
    enableFiqh: true,
    enableAbout: true,
  },
};

export function mergeWithDefaultSettings(
  partial?: Partial<PlatformSettings> | null
): PlatformSettings {
  if (!partial || typeof partial !== 'object') {
    return structuredClone(DEFAULT_PLATFORM_SETTINGS);
  }
  return {
    home: { ...DEFAULT_PLATFORM_SETTINGS.home, ...(partial.home || {}) },
    typography: {
      ...DEFAULT_PLATFORM_SETTINGS.typography,
      ...(partial.typography || {}),
    },
    hadithTextStyle: {
      ...DEFAULT_PLATFORM_SETTINGS.hadithTextStyle,
      ...(partial.hadithTextStyle || {}),
    },
    theme: { ...DEFAULT_PLATFORM_SETTINGS.theme, ...(partial.theme || {}) },
    isnadTreeStyle: {
      ...DEFAULT_PLATFORM_SETTINGS.isnadTreeStyle,
      ...(partial.isnadTreeStyle || {}),
    },
    reading: {
      ...DEFAULT_PLATFORM_SETTINGS.reading,
      ...(partial.reading || {}),
    },
    about: {
      ...DEFAULT_PLATFORM_SETTINGS.about,
      ...(partial.about || {}),
      objectives: Array.isArray(partial.about?.objectives)
        ? partial.about.objectives
        : DEFAULT_PLATFORM_SETTINGS.about.objectives,
      contributors: Array.isArray(partial.about?.contributors)
        ? partial.about.contributors
        : DEFAULT_PLATFORM_SETTINGS.about.contributors,
    },
    moduleControls: {
      ...DEFAULT_PLATFORM_SETTINGS.moduleControls,
      ...(partial.moduleControls || {}),
    },
  };
}
