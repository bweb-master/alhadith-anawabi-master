import React, { useState } from 'react';
import { ChevronDown, BookOpenCheck, ArrowLeft } from 'lucide-react';
import { CornerArabesque, IslamicDivider } from './IslamicOrnament';
import { NavTarget } from './HomeView';

interface AboutPlatformViewProps {
  onNavigate: (target: NavTarget) => void;
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    question: 'ما الغاية العلمية من منصة «مرويات ابن حزم من طريق الأندلسيين»؟',
    answer:
      'تتيح المنصة لطلبة العلم والباحثين استكشاف الأحاديث التي رواها الإمام أبو محمد بن حزم الأندلسي (ت 456هـ) في كتابه «المحلى بالآثار» بأسانيده الأندلسية عن شيوخه في قرطبة وطلمنكة وغيرهما، مع تخريجها من الكتب التسعة ودراسة رواتها وفقهها وغريب ألفاظها في واجهة واحدة ميسّرة.',
  },
  {
    question: 'كيف أتصفح مرويات المحلّى وشروحها الفقهية واللغوية؟',
    answer:
      'من قسم «مرويات المحلّى»، يمكنك اختيار أي مسألة من الفهرس الجانبي أو البحث باسم الكتاب الفقهي أو لفظ الحديث، ليظهر لك المتن مشكولاً مع سند ابن حزم القابل للنقر على كل راوٍ فيه، وتحته تبويبات للتخريج من الكتب التسعة، وفقه الحديث، وغريب الألفاظ، وطرق الرواية.',
  },
  {
    question: 'كيف أستخدم محرك «تخريج الأحاديث» في الكتب التسعة؟',
    answer:
      'انتقل إلى قسم «تخريج الأحاديث»، ثم الصق متن الحديث أو جزءاً يسيراً منه في خانة البحث، ويمكنك تصفية النتائج حسب كتاب معين (كصحيح البخاري أو موطأ مالك) أو البحث في الكتب التسعة مجتمعة، لتظهر لك المواضع المطابقة مع رقم الحديث واسم الباب ونسبة التطابق.',
  },
  {
    question: 'هل يجب كتابة الحديث بالتشكيل والهمزات الصحيحة عند البحث؟',
    answer:
      'لا، يراعي محرك البحث اختلاف الرسم الإملائي؛ إذ يجرد النص آلياً من التشكيل وعلامات الترقيم ويوحد الهمزات والألف المقصورة والتاء المربوطة، بحيث تصل إلى الحديث بسهولة سواء كتبته مشكولاً أو دون تشكيل.',
  },
  {
    question: 'كيف أقرأ «شجرة الإسناد» وما دلالة تمييز الراوي بلفظ «مدار»؟',
    answer:
      'في قسم «شجرة الإسناد»، اختر المسألة المطلوبة لتظهر لك خريطة بصرية تجمع سلسلة إسناد ابن حزم مع طرق الكتب التسعة. وعند التقاء أكثر من طريق عند راوٍ واحد مشترك تُميزه المنصة بوصف «مدار»، مع إمكانية تكبير الشجرة وتصغيرها والنقر على أي راوٍ لمعاينة ترجمته.',
  },
  {
    question: 'كيف أستفيد من قسم «دراسة الرواة» والتنقل بين الشيوخ والتلاميذ؟',
    answer:
      'يقدّم قسم «دراسة الرواة» معجماً للرواة الأندلسيين ورواة الأسانيد؛ يمكنك تصفية القائمة (مثل: الرواة الأندلسيون أو الصحابة) أو البحث بالاسم، ثم النقر على أي شيخ أو تلميذ داخل بطاقة الراوي للانتقال مباشرة إلى ترجمته ورتبته وأقوال أئمة الجرح والتعديل وموقف ابن حزم فيه.',
  },
];

export const AboutPlatformView: React.FC<AboutPlatformViewProps> = ({
  onNavigate,
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Platform Overview Hero */}
      <section className="islamic-hero-pattern relative overflow-hidden border border-[#E6E0D4] rounded-2xl p-8 sm:p-10 space-y-5">
        <CornerArabesque className="absolute -top-4 -left-4 text-[#854D0E]/10 w-28 h-28" />

        <div className="relative space-y-4">
          <p className="text-sm font-semibold text-[#854D0E]">
            حول المنصة · التعريف والأهداف ودليل الاستخدام
          </p>
          <h1 className="font-hadith text-3xl sm:text-4xl font-bold text-[#1C1917]">
            منصة مرويات ابن حزم من طريق الأندلسيين
          </h1>
          <p className="text-base sm:text-lg text-[#44403C] leading-relaxed">
            منصة علمية رقمية أُنجزت في إطار{' '}
            <span className="font-semibold text-[#1C1917]">
              مشروع بحث التخرج في ماستر الشريعة والابتكار الرقمي
            </span>
            ، وتهدف إلى خدمة المرويات الحديثية التي أوردها الإمام ابن حزم الأندلسي من طريق شيوخه الأندلسيين في كتابه «المحلى بالآثار»، وتقديمها لطلبة العلم والباحثين في بيئة تفاعلية تجمع بين أصالة التحقيق الحديثي ودقة الأدوات الرقمية.
          </p>

          <div className="pt-2 border-t border-[#E6E0D4]/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm sm:text-base font-semibold text-[#14532D]">
            <span>تحت إشراف الدكتور عبد الكريم خلفي</span>
            <span className="text-[#854D0E]/50" aria-hidden="true">·</span>
            <span className="text-[#44403C] font-medium">
              من إعداد الطلبة الباحثين فوج 2025-2027
            </span>
          </div>
        </div>
      </section>

      {/* Mission & Objectives */}
      <section className="bg-white border border-[#E6E0D4] rounded-2xl p-7 sm:p-9 space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-[#1C1917]">أهداف المنصة</h2>
          <p className="text-base text-[#57534E]">
            المقاصد العلمية والبحثية التي تقدمها المنصة لمستعمليها:
          </p>
        </div>

        <IslamicDivider />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-hover-lift p-5 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2">
            <span className="font-mono text-sm font-bold text-[#854D0E]">01</span>
            <h3 className="text-lg font-bold text-[#1C1917]">
              العناية بالرواية الأندلسية في المحلى
            </h3>
            <p className="text-base text-[#44403C] leading-relaxed">
              إبراز الخصائص الإسنادية لمدرسة الحديث بالأندلس من خلال تتبع أسانيد ابن حزم عن شيوخه القرطبيين والأندلسيين ومقارنتها بمرويات المشرق.
            </p>
          </div>

          <div className="card-hover-lift p-5 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2">
            <span className="font-mono text-sm font-bold text-[#854D0E]">02</span>
            <h3 className="text-lg font-bold text-[#1C1917]">
              تسهيل التخريج والمقارنة النصية
            </h3>
            <p className="text-base text-[#44403C] leading-relaxed">
              ربط أحاديث المحلى بمواضعها الدقيقة في الكتب التسعة مع بحث ذكي يراعي اختلافات الرسم الإملائي والتشكيل في النصوص التراثية.
            </p>
          </div>

          <div className="card-hover-lift p-5 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2">
            <span className="font-mono text-sm font-bold text-[#854D0E]">03</span>
            <h3 className="text-lg font-bold text-[#1C1917]">
              التمثيل البصري لشجرة الإسناد
            </h3>
            <p className="text-base text-[#44403C] leading-relaxed">
              تحويل السلاسل الإسنادية النصية إلى رسوم بيانية تفاعلية توضّح طرق الحديث وتكشف عن مدار الإسناد وتفردات الرواة.
            </p>
          </div>

          <div className="card-hover-lift p-5 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2">
            <span className="font-mono text-sm font-bold text-[#854D0E]">04</span>
            <h3 className="text-lg font-bold text-[#1C1917]">
              التكامل بين السند والفقه واللغة
            </h3>
            <p className="text-base text-[#44403C] leading-relaxed">
              تيسير وصول الباحث وطالب العلم إلى ترجمة الراوي، وحكم ابن حزم على السند، والاستنباط الفقهي، وشرح غريب الحديث في مكان واحد.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Q&A (FAQ) for Platform Users */}
      <section className="bg-white border border-[#E6E0D4] rounded-2xl p-7 sm:p-9 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#1C1917]">أسئلة وأجوبة</h2>
            <p className="text-base text-[#57534E]">
              دليل إرشادي لمستعمل المنصة حول كيفية الاستفادة من أقسامها وأدواتها البحثية.
            </p>
          </div>
          <BookOpenCheck className="w-6 h-6 text-[#14532D]" />
        </div>

        <div className="divide-y divide-[#E6E0D4] border border-[#E6E0D4] rounded-xl overflow-hidden">
          {FAQ_LIST.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="bg-white">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-right flex items-center justify-between gap-4 hover:bg-[#EEF6F1]/70 transition-colors cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-semibold text-[#1C1917]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#854D0E] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-base text-[#44403C] leading-relaxed bg-[#FBF9F5]/70">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('muhalla')}
            className="btn-hover-motion inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium bg-[#14532D] hover:bg-[#114224] text-white rounded-lg cursor-pointer"
          >
            <span>الانتقال إلى مرويات المحلّى</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('takhrij')}
            className="btn-hover-motion inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg cursor-pointer"
          >
            <span>تجربة تخريج الأحاديث</span>
          </button>
        </div>
      </section>
    </div>
  );
};

