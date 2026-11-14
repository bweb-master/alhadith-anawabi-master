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
    question: 'ما الفكرة العلمية الأساسية لمنصة «مرويات ابن حزم من طريق الأندلسيين»؟',
    answer:
      'تركّز المنصة على دراسة الأحاديث التي رواها الإمام أبو محمد بن حزم الأندلسي (ت 456هـ) في كتابه «المحلى بالآثار» بأسانيده الخاصة عن شيوخه الأندلسيين (مثل أبي عمر الطلمنكي، ويونس بن مغيث، وابن الفرضي)، ثم مقارنتها بروايات أصحاب الكتب التسعة في شجرة إسناد موحدة مع دراسة الرواة وفقه الحديث وغريبه.',
  },
  {
    question: 'ما المصادر الحديثية التي تعتمدها المنصة في التخريج؟',
    answer:
      'تعتمد المنصة في التخريج والمقارنة على الكتب التسعة المعتمدة: صحيح البخاري، صحيح مسلم، سنن أبي داود، جامع الترمذي، سنن النسائي، سنن ابن ماجه، موطأ الإمام مالك، مسند الإمام أحمد، وسنن الدارمي، إلى جانب كتب التراجم الأندلسية والمشرقية كـ «تاريخ علماء الأندلس» لابن الفرضي و«الصلة» لابن بشكوال و«تقريب التهذيب».',
  },
  {
    question: 'كيف يعمل محرك تخريج الأحاديث آلياً؟',
    answer:
      'يقوم المحرك بمعالجة النص العربي قبل البحث (إزالة التشكيل وعلامات الترقيم، وتوحيد الهمزات أ/إ/آ إلى ا، والتاء المربوطة إلى هـ، والألف المقصورة إلى ي)، ثم يحسب نسبة التطابق اللفظي والدلالي بين متن حديث المحلى ونصوص الكتب التسعة لعرض أدق الشواهد والمواضع.',
  },
  {
    question: 'كيف تُرسم شجرة الحديث والإسناد وكيف يظهر «مدار الإسناد»؟',
    answer:
      'يُخزّن كل طريق إسنادي كسلسلة معرفات متتابعة للرواة. تقوم خوارزمية الرسم البياني (DAG) بدمج الرواة المشتركين بين طريق ابن حزم وطرق الكتب التسعة تلقائياً في عقدة واحدة مميزة باسم «مدار»، مما يسهّل على الباحث تتبع نقطة التقاء الأسانيد الأندلسية بالمشرقية.',
  },
  {
    question: 'هل يمكنني تعديل المحتوى وإضافة رواة أندلسيين وأحاديث جديدة بنفسي؟',
    answer:
      'نعم، عبر قسم «التحرير والبيانات» يمكن للباحث إضافة مسائل جديدة من المحلى، إضافة رواة أندلسيين جدد، تعديل أقوال الجرح والتعديل، شرح غريب الحديث، ثم تصدير البيانات بصيغة JSON لرفعها إلى مستودع GitHub أو ربطها لاحقاً بقاعدة بيانات Cloudflare D1.',
  },
  {
    question: 'كيف يمكن تجربة الكتب التسعة كاملة داخل المنصة؟',
    answer:
      'من تبويب «تخريج الأحاديث»، يمكنك رفع أي ملف JSON من مجلد الكتب التسعة في مستودعك (مثل bukhari.json أو malik.json) من جهازك مباشرة ليقوم المحرك بفهرسة آلاف الأحاديث والبحث فيها لحظياً داخل المتصفح.',
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
        <CornerArabesque className="absolute -top-3 -left-3 text-[#854D0E]/15 w-24 h-24" />

        <div className="relative space-y-4">
          <p className="text-sm font-semibold text-[#854D0E]">
            حول المنصة · التعريف والأهداف والمنهجية
          </p>
          <h1 className="font-hadith text-3xl sm:text-4xl font-bold text-[#1C1917]">
            منصة مرويات ابن حزم من طريق الأندلسيين
          </h1>
          <p className="text-base sm:text-lg text-[#44403C] leading-relaxed">
            مشروع بحثي تطبيقي مُعد في إطار{' '}
            <span className="font-semibold text-[#1C1917]">
              ماستر الشريعة والابتكار الرقمي
            </span>
            ، يهدف إلى رقمنة المرويات الحديثية التي أوردها الإمام ابن حزم الأندلسي من طريق شيوخه الأندلسيين في كتابه «المحلى بالآثار»، وتقديمها في بيئة ويب تفاعلية تجمع بين أصالة التحقيق الحديثي ودقة الأدوات الرقمية الحديثة.
          </p>
        </div>
      </section>

      {/* Mission & Objectives */}
      <section className="bg-white border border-[#E6E0D4] rounded-2xl p-7 sm:p-9 space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-[#1C1917]">أهداف المنصة</h2>
          <p className="text-base text-[#57534E]">
            المقاصد العلمية والتقنية التي بُنيت عليها المنصة:
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
              ربط أحاديث المحلى بمواضعها الدقيقة في الكتب التسعة مع فهرسة ذكية تراعي اختلافات الرسم الإملائي والتشكيل في النصوص التراثية.
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
              مرونة التعديل والبحث المستمر
            </h3>
            <p className="text-base text-[#44403C] leading-relaxed">
              توفير واجهة تحرير كاملة تمكّن الباحث من إضافة الرواة الأندلسيين والأحاديث وتحديث التراجم وفقه الحديث دون عوائق برمجية.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Q&A (FAQ) */}
      <section className="bg-white border border-[#E6E0D4] rounded-2xl p-7 sm:p-9 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#1C1917]">أسئلة وأجوبة</h2>
            <p className="text-base text-[#57534E]">
              إجابات وافية حول المنهجية العلمية وآلية عمل المنصة.
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
                  className="w-full px-6 py-4 text-right flex items-center justify-between gap-4 hover:bg-[#FBF9F5] transition-colors cursor-pointer"
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
                  <div className="px-6 pb-5 pt-1 text-base text-[#44403C] leading-relaxed bg-[#FBF9F5]/60">
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
