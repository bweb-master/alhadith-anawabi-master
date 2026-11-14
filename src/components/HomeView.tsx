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
import { CornerArabesque, IslamicDivider } from './IslamicOrnament';

export type NavTarget =
  | 'muhalla'
  | 'takhrij'
  | 'tree'
  | 'narrators'
  | 'editor'
  | 'about';

interface HomeViewProps {
  hadithsCount: number;
  andalusiansCount: number;
  nineBooksCount: number;
  onNavigate: (target: NavTarget) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  hadithsCount,
  andalusiansCount,
  nineBooksCount,
  onNavigate,
}) => {
  const featureCards: {
    id: NavTarget;
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'muhalla',
      title: 'مرويات كتاب المحلّى',
      subtitle: `${hadithsCount} مسائل محققة`,
      description:
        'استعراض أحاديث الإمام ابن حزم في المحلى مع المتن المشكول، السند الأندلسي الكامل، وحكم ابن حزم النقدي على كل رواية.',
      icon: <BookOpen className="w-6 h-6" />,
    },
    {
      id: 'takhrij',
      title: 'تخريج الأحاديث',
      subtitle: `${nineBooksCount} مصادر حديثية`,
      description:
        'تخريج آلي ونصي بالاعتماد على الكتب التسعة عبر تجريد التشكيل وتوحيد الهمزات، مع إمكانية رفع ملفات مستودعك مباشرة.',
      icon: <SearchCheck className="w-6 h-6" />,
    },
    {
      id: 'tree',
      title: 'شجرة الحديث والإسناد',
      subtitle: 'تحليل المدار والطرق',
      description:
        'تمثيل بصري تفاعلي لشبكة الأسانيد يجمع طريق ابن حزم الأندلسي بطرق الكتب التسعة ويُبرز الرواة المشتركين في مدار الإسناد.',
      icon: <GitBranch className="w-6 h-6" />,
    },
    {
      id: 'narrators',
      title: 'دراسة الرواة الأندلسيين',
      subtitle: `${andalusiansCount} أعلام أندلسيين`,
      description:
        'معجم تراجم لشيوخ ابن حزم والرواة الأندلسيين مع طبقاتهم، شيوخهم وتلاميذهم، أقوال الجرح والتعديل، وموقف ابن حزم فيهم.',
      icon: <Users className="w-6 h-6" />,
    },
    {
      id: 'muhalla',
      title: 'فقه الحديث وغريب الألفاظ',
      subtitle: 'دراسة دلالية وفقهية',
      description:
        'تحليل استنباطات ابن حزم الظاهرية ومناقشته للمذاهب الفقهية، إلى جانب ضبط وشرح الألفاظ الغريبة من معاجم غريب الحديث.',
      icon: <Scale className="w-6 h-6" />,
    },
    {
      id: 'editor',
      title: 'التحرير وإضافة الرواة',
      subtitle: 'تحديث وتصدير JSON',
      description:
        'لوحة بحثية مرنة تتيح إضافة أحاديث جديدة من المحلى أو رواة أندلسيين وتعديل جميع الحقول وتصديرها إلى مستودع GitHub.',
      icon: <Database className="w-6 h-6" />,
    },
  ];

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
      body: 'توفير بنية بيانات مهيكلة تتيح للباحث إضافة الرواة الأندلسيين، تنقيح النصوص، ومزامنتها مع مستودع GitHub والنشر السحابي السريع.',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Banner with Subtle Islamic Geometric Pattern */}
      <section className="islamic-hero-pattern relative overflow-hidden border border-[#E6E0D4] rounded-2xl p-8 sm:p-12 lg:p-14">
        <CornerArabesque className="absolute -top-3 -left-3 text-[#854D0E]/15 w-28 h-28" />
        <CornerArabesque className="absolute -bottom-3 -right-3 text-[#14532D]/15 w-28 h-28" />

        <div className="relative max-w-3xl space-y-6">
          <p className="text-sm font-medium text-[#854D0E]">
            بحث ماستر الشريعة والابتكار الرقمي · دراسة حديثية ورقمية مقارنة
          </p>

          <h1 className="font-hadith text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1C1917] leading-tight">
            مرويات ابن حزم من طريق الأندلسيين
          </h1>

          <p className="text-base sm:text-lg text-[#44403C] leading-relaxed max-w-2xl">
            منصة علمية رقمية تعنى بجمع وتحقيق مرويات الإمام أبي محمد بن حزم الأندلسي في كتابه{' '}
            <span className="font-semibold text-[#14532D]">«المحلّى بالآثار»</span>، وتخريجها بالاعتماد على الكتب التسعة، مع دراسة شاملة للرواة الأندلسيين ورسم شجرة الإسناد وغريب الحديث وفقهه.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('muhalla')}
              className="btn-hover-motion inline-flex items-center gap-2 px-6 py-3 text-base font-medium bg-[#14532D] hover:bg-[#114224] text-white rounded-xl cursor-pointer whitespace-nowrap"
            >
              <span>استعراض مرويات المحلّى</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('takhrij')}
              className="btn-hover-motion inline-flex items-center gap-2 px-6 py-3 text-base font-medium bg-white border border-[#D6CEBE] hover:border-[#14532D] text-[#1C1917] rounded-xl cursor-pointer whitespace-nowrap"
            >
              <span>بدء تخريج الأحاديث</span>
            </button>

            <button
              onClick={() => onNavigate('about')}
              className="btn-hover-motion inline-flex items-center gap-2 px-5 py-3 text-base font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-xl cursor-pointer whitespace-nowrap"
            >
              <Info className="w-4 h-4 text-[#854D0E]" />
              <span>حول المنصة</span>
            </button>
          </div>
        </div>
      </section>

      {/* Platform Objectives & Overview */}
      <section className="space-y-6">
        <div className="space-y-2">
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
              className="card-hover-lift bg-white border border-[#E6E0D4] hover:border-[#854D0E]/45 rounded-xl p-6 space-y-3"
            >
              <span className="font-mono text-sm font-semibold text-[#854D0E] tabular-nums block">
                {obj.num}
              </span>
              <h3 className="text-lg font-bold text-[#1C1917] leading-snug">
                {obj.title}
              </h3>
              <p className="text-base text-[#44403C] leading-relaxed">
                {obj.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Modules Grid with Hover Motion */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#1C1917]">
            أقسام المنصة وأدوات البحث التفاعلية
          </h2>
          <p className="text-base text-[#57534E]">
            اختر أي قسم من البطاقات التالية لتجربة الأدوات الحديثية والبرمجية مباشرة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((card, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(card.id)}
              className="card-hover-lift group relative overflow-hidden text-right bg-white border border-[#E6E0D4] hover:border-[#14532D] rounded-xl p-6 space-y-4 cursor-pointer flex flex-col justify-between"
            >
              <CornerArabesque className="absolute -bottom-3 -left-3 text-[#854D0E]/10 group-hover:text-[#14532D]/20 transition-colors w-20 h-20" />

              <div className="space-y-3 relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-11 h-11 rounded-lg bg-[#F3EFE6] group-hover:bg-[#14532D] text-[#14532D] group-hover:text-white flex items-center justify-center transition-colors">
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
    </div>
  );
};
