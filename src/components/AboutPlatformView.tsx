import React, { useState } from 'react';
import { ChevronDown, BookOpenCheck, ArrowLeft, Users } from 'lucide-react';
import { CornerArabesque, IslamicDivider } from './IslamicOrnament';
import { NavTarget } from './HomeView';
import { PlatformSettings } from '../types/settings';
import { SmartImage } from './SmartMedia';

interface AboutPlatformViewProps {
  settings: PlatformSettings;
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
    question: 'كيف أتصفح مرويات الأندلسيين وشروحها الفقهية واللغوية؟',
    answer:
      'من قسم «مرويات الأندلسيين»، يمكنك اختيار أي مسألة من الفهرس الجانبي أو البحث باسم الكتاب الفقهي أو لفظ الحديث أو اسم الراوي، ليظهر لك الحديث كاملاً بسنده القابل للنقر على كل راوٍ فيه ومتنه، وتحته تبويبات للتخريج من الكتب التسعة، وفقه الحديث، وغريب الألفاظ، وطرق الرواية.',
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
      'في قسم «شجرة الإسناد»، اختر المسألة المطلوبة لتظهر لك خريطة بصرية تجمع سلسلة إسناد ابن حزم مع طرق الكتب التسعة. وعند التقاء أكثر من طريق عند راوٍ واحد مشترك تُميزه المنصة بوصف «مدار»، مع إمكانية تكبير الشجرة وتصغيرها وتحميلها والنقر على أي راوٍ لمعاينة ترجمته.',
  },
  {
    question: 'كيف أستفيد من قسم «دراسة الرواة» والتنقل بين الشيوخ والتلاميذ؟',
    answer:
      'يقدّم قسم «دراسة الرواة» معجماً للرواة الأندلسيين ورواة الأسانيد؛ يمكنك تصفية القائمة (مثل: الرواة الأندلسيون أو الصحابة) أو البحث بالاسم، وعرض بطاقة الراوي في صفحة واحدة منسقة للطباعة أو النقر على أي شيخ أو تلميذ للانتقال مباشرة إلى ترجمته.',
  },
];

export const AboutPlatformView: React.FC<AboutPlatformViewProps> = ({
  settings,
  onNavigate,
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { about } = settings;

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Platform Overview Hero */}
      <section className="islamic-hero-pattern relative overflow-hidden border border-[#E6E0D4] rounded-2xl p-8 sm:p-10 space-y-5">
        <CornerArabesque className="absolute -top-4 -left-4 text-[#854D0E]/10 w-28 h-28" />

        <div className="relative space-y-4">
          <p className="text-sm font-semibold text-[#854D0E]">{about.eyebrow}</p>
          <h1 className="font-hadith text-3xl sm:text-4xl font-bold text-[#1C1917]">
            {about.title}
          </h1>
          <p className="text-base sm:text-lg text-[#44403C] leading-relaxed">
            {about.description}
          </p>

          <div className="pt-2 border-t border-[#E6E0D4]/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm sm:text-base font-semibold text-[#14532D]">
            <span>{about.supervisionText}</span>
            <span className="text-[#854D0E]/50" aria-hidden="true">·</span>
            <span className="text-[#44403C] font-medium">{about.batchText}</span>
          </div>
        </div>
      </section>

      {/* Contributors & Research Team Portraits */}
      {about.contributors.length > 0 && (
        <section className="bg-white border border-[#E6E0D4] rounded-2xl p-7 sm:p-9 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-[#1C1917]">
                المشاركون وهيئة الإشراف والبحث
              </h2>
              <p className="text-base text-[#57534E]">
                الأساتذة المشرفون والباحثون المساهمون في إعداد المنصة وتحقيق مادتها العلمية:
              </p>
            </div>
            <Users className="w-6 h-6 text-[#854D0E]" />
          </div>

          <IslamicDivider />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {about.contributors.map((person) => {
              const initials = (person.name || 'ب').trim().slice(0, 2);
              return (
                <div
                  key={person.id}
                  className="card-hover-lift bg-[#FBF9F5] border border-[#E6E0D4] rounded-2xl p-5 flex flex-col items-center text-center space-y-3"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#14532D]/25 bg-white flex items-center justify-center shrink-0 shadow-xs">
                    <SmartImage
                      src={person.photoUrl}
                      alt={person.name}
                      className="w-full h-full object-cover"
                      fallbackElement={
                        <span className="font-hadith text-2xl font-bold text-[#14532D]">
                          {initials}
                        </span>
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#1C1917]">{person.name}</h3>
                    <p className="text-xs font-semibold text-[#854D0E]">{person.title}</p>
                    <p className="text-xs text-[#44403C] leading-relaxed pt-1">
                      {person.role}
                    </p>
                    {person.bio && person.bio.trim() && (
                      <p className="text-xs text-[#6B655E] leading-relaxed pt-1">
                        {person.bio}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
          {about.objectives.map((obj, idx) => (
            <div
              key={`${obj.num}-${idx}`}
              className="card-hover-lift p-5 bg-[#FBF9F5] border border-[#E6E0D4] rounded-xl space-y-2"
            >
              <span className="font-mono text-sm font-bold text-[#854D0E]">
                {obj.num || `0${idx + 1}`}
              </span>
              <h3 className="text-lg font-bold text-[#1C1917]">{obj.title}</h3>
              <p className="text-base text-[#44403C] leading-relaxed">{obj.body}</p>
            </div>
          ))}
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
            <span>الانتقال إلى مرويات الأندلسيين</span>
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
