export type ArabicUiFontKey =
  | 'IBM Plex Sans Arabic'
  | 'Cairo'
  | 'Amiri'
  | 'Noto Naskh Arabic'
  | 'Scheherazade New';

export type ButtonShapeStyle = 'rounded' | 'soft' | 'classic' | 'sharp';
export type MotionLevel = 'smooth' | 'subtle' | 'none';
export type ClickSoundType = 'off' | 'soft' | 'wood' | 'chime';
export type PagePatternType = 'octagonal' | 'dots' | 'grid' | 'none';

export interface HeroMediaItem {
  id: string;
  title: string;
  url: string;
  mediaType?: 'auto' | 'image' | 'video' | 'youtube';
}

export interface PlatformContributor {
  id: string;
  name: string;
  title: string; // الصفة العلمية/الأكاديمية (مثل: المشرف الأكاديمي / طالب باحث)
  role: string;  // الدور في المشروع (مثل: الإشراف والتوجيه / تحقيق المرويات)
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
    pageBgColor: string;
    pagePattern: PagePatternType;
    pageBgImageUrl: string;
    primaryColor: string;
    accentColor: string;
    buttonShape: ButtonShapeStyle;
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

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  home: {
    siteTitle: 'مرويات ابن حزم من طريق الأندلسيين',
    heroEyebrow: 'مشروع بحث التخرج في ماستر الشريعة والابتكار الرقمي · دراسة حديثية ورقمية مقارنة',
    heroDescription:
      'منصة علمية رقمية تعنى بجمع وتحقيق مرويات الإمام أبي محمد بن حزم الأندلسي في كتابه «المحلى بالآثار»، وتخريجها بالاعتماد على الكتب التسعة، مع دراسة شاملة للرواة الأندلسيين ورسم شجرة الإسناد وغريب الحديث وفقهه.',
    supervisionText: 'تحت إشراف الدكتور عبد الكريم خلفي',
    batchText: 'من إعداد الطلبة الباحثين فوج 2025-2027',
    logoUrl: '/assets/aistudio/logo_65694aac.png',
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
    pageBgColor: '#FBF9F5',
    pagePattern: 'octagonal',
    pageBgImageUrl: '',
    primaryColor: '#14532D',
    accentColor: '#854D0E',
    buttonShape: 'rounded',
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
