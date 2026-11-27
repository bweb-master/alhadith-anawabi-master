import React from 'react';
import {
  BookOpen,
  SearchCheck,
  GitBranch,
  Users,
  Scale,
  Database,
  ArrowLeft,
  Info,
} from 'lucide-react';
import {
  CornerArabesque,
  IslamicDivider,
  OctagonalHalo,
} from './IslamicOrnament';
import { PlatformSettings } from '../types/settings';
import { SmartImage, SmartMediaViewer } from './SmartMedia';

export type NavTarget =
  | 'muhalla'
  | 'takhrij'
  | 'tree'
  | 'narrators'
  | 'fiqh'
  | 'editor'
  | 'about';

interface HomeViewProps {
  hadithsCount: number;
  andalusiansCount: number;
  nineBooksCount: number;
  isLoggedIn: boolean;
  settings: PlatformSettings;
  onNavigate: (target: NavTarget) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  hadithsCount,
  andalusiansCount,
  nineBooksCount,
  isLoggedIn,
  settings,
  onNavigate,
}) => {
  const { home, moduleControls } = settings;

  const allFeatureCards: {
    id: NavTarget;
    enabled: boolean;
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'muhalla',
      enabled: moduleControls.enableMuhalla,
      title: 'مرويات الأندلسيين',
      subtitle: `${hadithsCount} مسائل محققة`,
      description:
        'استعراض أحاديث الإمام ابن حزم في المحلى مع المتن المشكول، السند الأندلسي الكامل، وحكم ابن حزم النقدي على كل رواية.',
      icon: <BookOpen className="w-6 h-6" />,
    },
    {
      id: 'takhrij',
      enabled: moduleControls.enableTakhrij,
      title: 'تخريج الأحاديث',
      subtitle: `${nineBooksCount} مصادر حديثية`,
      description:
        'تخريج آلي ونصي بالاعتماد على الكتب التسعة عبر تجريد التشكيل وتوحيد الهمزات، مع البحث الفوري في قاعدة البيانات.',
      icon: <SearchCheck className="w-6 h-6" />,
    },
    {
      id: 'tree',
      enabled: moduleControls.enableTree,
      title: 'شجرة الحديث والإسناد',
      subtitle: 'تحليل المدار والطرق',
      description:
        'تمثيل بصري تفاعلي لشبكة الأسانيد يجمع طريق ابن حزم الأندلسي بطرق الكتب التسعة ويُبرز الرواة المشتركين في مدار الإسناد.',
      icon: <GitBranch className="w-6 h-6" />,
    },
    {
      id: 'narrators',
      enabled: moduleControls.enableNarrators,
      title: 'دراسة الرواة الأندلسيين',
      subtitle: `${andalusiansCount} أعلام أندلسيين`,
      description:
        'معجم تراجم لشيوخ ابن حزم والرواة الأندلسيين مع طبقاتهم، شيوخهم وتلاميذهم، أقوال الجرح والتعديل، ودراستهم.',
      icon: <Users className="w-6 h-6" />,
    },
    {
      id: 'fiqh',
      enabled: moduleControls.enableFiqh,
      title: 'فقه الحديث والمذاهب الأربعة',
      subtitle: 'فقه مقارن موثّق',
      description:
        'عرض استنباطات ابن حزم الظاهرية وأقوال المذاهب الأربعة (الحنفي والمالكي والشافعي والحنبلي) موثقة بالكتب والأجزاء والصفحات.',
      icon: <Scale className="w-6 h-6" />,
    },
    {
      id: 'editor',
      enabled: isLoggedIn,
      title: 'لوحة الباحث والتحرير',
      subtitle: 'إدارة وتحديث البيانات',
      description:
        'مساحة خاصة للباحث لإضافة أحاديث جديدة من المحلى أو رواة أندلسيين وتنقيح الشروح والحقول وحفظها مباشرة في السحابة.',
      icon: <Database className="w-6 h-6" />,
    },
  ];

  const featureCards = allFeatureCards.filter((c) => c.enabled);

  const objectives = [
    {
      num: '01',
      title: 'توثيق الأسانيد الأندلسية عند ابن حزم',
      body: 'إبراز سلسلة الرواية المغربية والأندلسية التي انفرد بها الإمام ابن حزم عن شيوخه في قرطبة وطلمنكة وغيرهما، وربطها بمصادر السنة المشرقية.',
    },
    {
      num: '02',
      title: 'الجمع بين التحقيق الحديثي والابتكار الرقمي',
      body: 'توظيف خوارزميات معالجة النص العربي وهندسة الشبكات الإسنادية لتسهيل التخريج الآلي وبناء شجرة الإسناد التفاعلية لطلبة العلم والباحثين.',
    },
    {
      num: '03',
      title: 'بناء مدونة حديثية مفتوحة وقابلة للتطوير',
      body: 'توفير بنية بيانات مهيكلة تتيح للباحث إضافة الرواة الأندلسيين وتنقيح النصوص وفهرسة كتب السنة بأعلى معايير الدقة البحثية.',
    },
  ];

  const summaryHighlights = [
    {
      value: hadithsCount.toLocaleString('en-US'),
      label: 'مسائل محققة من المحلّى',
      target: 'muhalla' as NavTarget,
      enabled: moduleControls.enableMuhalla,
    },
    {
      value: andalusiansCount.toLocaleString('en-US'),
      label: 'راوياً وعَلَماً أندلسياً',
      target: 'narrators' as NavTarget,
      enabled: moduleControls.enableNarrators,
    },
    {
      value: nineBooksCount.toLocaleString('en-US'),
      label: 'دواوين الكتب التسعة للتخريج',
      target: 'takhrij' as NavTarget,
      enabled: moduleControls.enableTakhrij,
    },
    {
      value: 'تفاعلية',
      label: 'شجرة الإسناد وتحليل المدار',
      target: 'tree' as NavTarget,
      enabled: moduleControls.enableTree,
    },
  ].filter((s) => s.enabled);

  return (
    <div className="space-y-12">
      {/* Modern Responsive Hero Section */}
      <section className="islamic-hero-pattern relative overflow-hidden border border-[#E6E0D4] rounded-2xl shadow-xs">
        <CornerArabesque className="absolute -top-4 -left-4 text-[#854D0E]/8 w-32 h-32" />
        <CornerArabesque className="absolute -bottom-4 -right-4 text-[#14532D]/8 w-32 h-32" />

        <div className="relative px-6 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            {/* Editorial Headline, Supervision Attribution & Primary CTAs */}
            <div className="flex-1 text-center lg:text-right space-y-5 max-w-3xl">
              <p className="text-sm font-semibold tracking-wide text-[#854D0E]">
                {home.heroEyebrow}
              </p>

              <h1 className="font-hadith text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1C1917] leading-tight">
                {home.siteTitle}
              </h1>

              <p className="text-base sm:text-lg text-[#44403C] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {home.heroDescription}
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-1.5 text-sm font-semibold text-[#14532D]">
                <span>{home.supervisionText}</span>
                <span className="text-[#854D0E]/50 hidden sm:inline" aria-hidden="true">·</span>
                <span className="text-[#57534E] font-medium">
                  {home.batchText}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                {moduleControls.enableMuhalla && (
                  <button
                    onClick={() => onNavigate('muhalla')}
                    className="btn-hover-motion inline-flex items-center gap-2 px-6 py-3 text-base font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-xl shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <span>استعراض مرويات الأندلسيين</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                {moduleControls.enableTakhrij && (
                  <button
                    onClick={() => onNavigate('takhrij')}
                    className="btn-hover-motion inline-flex items-center gap-2 px-6 py-3 text-base font-semibold bg-white border border-[#D6CEBE] hover:border-[#14532D] hover:bg-[#EEF6F1] text-[#1C1917] rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    <span>بدء تخريج الأحاديث</span>
                  </button>
                )}

                {moduleControls.enableAbout && (
                  <button
                    onClick={() => onNavigate('about')}
                    className="btn-hover-motion inline-flex items-center gap-2 px-5 py-3 text-base font-medium bg-[#F3EFE6]/90 hover:bg-[#EEF6F1] text-[#1C1917] rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    <Info className="w-4 h-4 text-[#854D0E]" />
                    <span>حول المنصة</span>
                  </button>
                )}
              </div>
            </div>

            {/* Large Prominent Platform Hero Image / Emblem beside Hero Title */}
            <div className="relative flex items-center justify-center shrink-0">
              <OctagonalHalo className="w-64 h-64 sm:w-72 sm:h-72 text-[#14532D]/10 absolute pointer-events-none" />
              <SmartImage
                src={
                  home.heroImageUrl ||
                  home.logoUrl ||
                  '/assets/aistudio/logo_65694aac.png'
                }
                alt={`صورة الواجهة — ${home.siteTitle}`}
                className={
                  home.heroImageFrame === 'circle'
                    ? 'relative w-52 h-52 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-full object-cover border-2 border-[#E6E0D4] shadow-sm bg-white select-none'
                    : home.heroImageFrame === 'rounded'
                      ? 'relative w-56 h-48 sm:w-68 sm:h-56 lg:w-80 lg:h-64 rounded-2xl object-cover border border-[#E6E0D4] shadow-sm bg-white select-none'
                      : 'relative w-48 h-48 sm:w-56 sm:h-56 lg:w-72 lg:h-72 object-contain bg-transparent mix-blend-multiply select-none'
                }
                fallbackElement={
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-full border-2 border-[#14532D]/20 bg-[#FBF9F5] flex items-center justify-center font-hadith text-3xl text-[#14532D] font-bold">
                    المحلّى
                  </div>
                }
              />
            </div>
          </div>
        </div>

        {/* Clean Integrated Research Summary Strip */}
        {moduleControls.showHomeStats && summaryHighlights.length > 0 && (
          <div className="relative border-t border-[#E6E0D4] bg-[#FBF9F5]/85 grid grid-cols-2 lg:grid-cols-4 divide-x divide-x-reverse divide-[#E6E0D4]">
            {summaryHighlights.map((stat, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate(stat.target)}
                className="group px-5 py-4 text-center lg:text-right hover:bg-[#EEF6F1] transition-colors cursor-pointer"
              >
                <div className="font-hadith text-2xl sm:text-3xl font-bold text-[#14532D] tabular-nums group-hover:text-[#114224] transition-colors">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-[#57534E] mt-0.5">
                  {stat.label}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Hero Showcase Images / YouTube / Google Drive Media Gallery */}
      {moduleControls.showHeroMedia && home.heroMedia.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#1C1917]">
            معرض الوسائط والشروحات التعريفية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {home.heroMedia.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#E6E0D4] rounded-2xl p-4 space-y-3"
              >
                <SmartMediaViewer
                  url={item.url}
                  title={item.title}
                  mediaType={item.mediaType || 'auto'}
                />
                {item.title && (
                  <p className="text-sm font-semibold text-[#1C1917]">{item.title}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Interactive Modules Grid */}
      {moduleControls.showHomeModules && featureCards.length > 0 && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-[#1C1917]">
                أقسام المنصة وأدوات البحث التفاعلية
              </h2>
              <p className="text-base text-[#57534E]">
                اختر أي قسم للانتقال المباشر إلى المدونة الحديثية أو أدوات التخريج والشبكات الإسنادية.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureCards.map((card, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate(card.id)}
                className="card-hover-lift group relative overflow-hidden text-right bg-white border border-[#E6E0D4] hover:border-[#14532D] hover:bg-[#EEF6F1] rounded-2xl p-6 space-y-4 cursor-pointer flex flex-col justify-between"
              >
                <CornerArabesque className="absolute -bottom-4 -left-4 text-[#854D0E]/7 group-hover:text-[#14532D]/12 transition-colors w-24 h-24" />

                <div className="space-y-3.5 relative">
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#F3EFE6] group-hover:bg-[#14532D] text-[#14532D] group-hover:text-white flex items-center justify-center transition-colors">
                      {card.icon}
                    </div>
                    <span className="text-sm text-[#854D0E] font-medium tabular-nums">
                      {card.subtitle}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#1C1917] group-hover:text-[#14532D] transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-base text-[#44403C] leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="relative pt-2 flex items-center gap-1.5 text-sm font-semibold text-[#14532D]">
                  <span>الدخول إلى القسم</span>
                  <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Platform Objectives & Overview */}
      {moduleControls.showHomeObjectives && (
        <section className="space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-[#1C1917]">
              أهداف المنصة ومرتكزاتها العلمية
            </h2>
            <p className="text-base text-[#57534E] max-w-3xl">
              تسعى المنصة إلى تقديم نموذج تطبيقي يخدم التراث الحديثي الأندلسي بأدوات المعالجة الرقمية المعاصرة.
            </p>
          </div>

          <IslamicDivider />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {objectives.map((obj) => (
              <div
                key={obj.num}
                className="card-hover-lift relative overflow-hidden bg-white border border-[#E6E0D4] hover:border-[#14532D]/45 hover:bg-[#EEF6F1] rounded-2xl p-6 space-y-3"
              >
                <CornerArabesque className="absolute -bottom-5 -left-5 text-[#854D0E]/6 w-24 h-24" />
                <span className="font-mono text-sm font-semibold text-[#854D0E] tabular-nums block relative">
                  {obj.num}
                </span>
                <h3 className="text-lg font-bold text-[#1C1917] leading-snug relative">
                  {obj.title}
                </h3>
                <p className="text-base text-[#44403C] leading-relaxed relative">
                  {obj.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
