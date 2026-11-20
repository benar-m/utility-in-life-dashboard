import { CalendarClock, GraduationCap, Sparkles, TrendingUp } from "lucide-react";
import { container } from "./format.js";

const REASONS = [
  {
    icon: GraduationCap,
    title: "Experienced tutors",
    description: "Subject specialists who know the CBC, 8-4-4 and IGCSE syllabuses and how each is examined.",
    tone: "bg-shuleni-aqua text-shuleni-teal",
  },
  {
    icon: CalendarClock,
    title: "Flexible scheduling",
    description: "Weekday evenings, weekends and school holidays, online or at home, around your family's routine.",
    tone: "bg-shuleni-aqua text-shuleni-teal",
  },
  {
    icon: TrendingUp,
    title: "Proven results",
    description: "Students learn to understand and apply each topic, not just memorise it for the exam.",
    tone: "bg-shuleni-aqua text-shuleni-teal",
  },
  {
    icon: Sparkles,
    title: "Interactive & engaging",
    description: "Live, two-way lessons where students ask questions, practise and get feedback as they go.",
    tone: "bg-shuleni-aqua text-shuleni-teal",
  },
];

export default function WhyUs() {
  return (
    <section id="why-us" aria-labelledby="why-heading" className="scroll-mt-16 bg-white">
      <div className={`${container} py-16 md:py-24`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-teal">Why Shuleni Online</p>
          <h2 id="why-heading" className="mt-2 font-display text-4xl font-black uppercase text-shuleni-ink sm:text-5xl">
            Why choose <span className="text-shuleni-teal">us?</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Whether online or at home, our tuition helps students understand, apply and excel.
          </p>
        </div>
        <ul className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ icon: Icon, title, description, tone }) => (
            <li key={title} className="text-center">
              <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${tone}`}>
                <Icon size={24} aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-shuleni-navy">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs leading-relaxed text-slate-600">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
