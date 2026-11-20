import { useEffect, useState } from "react";
import { BadgeCheck, ClipboardList, GraduationCap, Phone, Video } from "lucide-react";
import { container } from "./format.js";

const STEP_MS = 6000;

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-shuleni-ink">{value}</span>
    </div>
  );
}

function RegisterVisual() {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registration</p>
      <div className="mt-2">
        <Row label="Student" value="Amani Otieno" />
        <Row label="Level" value="Form 3" />
        <Row label="Subject" value="Chemistry" />
      </div>
      <div className="mt-4 rounded-full bg-shuleni-red py-2 text-center text-sm font-bold text-white">Submit</div>
    </div>
  );
}

function ConfirmVisual() {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
      <p className="flex items-center gap-2 text-sm font-bold text-shuleni-teal">
        <BadgeCheck size={17} aria-hidden="true" /> Place confirmed
      </p>
      <div className="mt-2">
        <Row label="Class" value="Form 3 Chemistry" />
        <Row label="When" value="Tue & Thu, 4–5pm" />
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Phone size={13} aria-hidden="true" /> Confirmed with the parent by phone
      </p>
    </div>
  );
}

function PayVisual() {
  return (
    <div className="w-full max-w-xs space-y-3">
      <div className="rounded-2xl bg-white p-5 text-center shadow-xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#2E9E4F]">M-Pesa</p>
        <p className="mt-2 text-sm text-shuleni-ink">
          Pay <strong>KES 1,500</strong> to <strong>Shuleni Online</strong>
        </p>
        <p className="mt-1 text-xs text-slate-400">Enter your M-Pesa PIN</p>
      </div>
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-shuleni-turquoise px-4 py-3 text-sm font-bold text-shuleni-ink shadow-lg">
        <Video size={17} aria-hidden="true" /> Join class on Google Meet
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: ClipboardList,
    title: "Register",
    description: "Tell us the student's level, subjects and how they'd like to learn. It takes two minutes, and no account is needed.",
    Visual: RegisterVisual,
  },
  {
    icon: BadgeCheck,
    title: "We confirm a place",
    description: "Our team matches a tutor and a time, then calls you to confirm the place.",
    Visual: ConfirmVisual,
  },
  {
    icon: GraduationCap,
    title: "Pay and start learning",
    description: "Pay by M-Pesa — group classes weekly, one-on-one lessons before each session — then join online or welcome your tutor home.",
    Visual: PayVisual,
  },
];

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const [isAuto, setIsAuto] = useState(() => !prefersReducedMotion());
  const { title, description, Visual } = STEPS[active];

  useEffect(() => {
    if (!isAuto) return undefined;
    const timer = window.setTimeout(() => setActive((step) => (step + 1) % STEPS.length), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [active, isAuto]);

  const choose = (index) => {
    setActive(index);
    setIsAuto(false);
  };

  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-16 overflow-hidden bg-shuleni-navy text-white">
      <div className={`${container} py-16 md:py-24`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-turquoise">How it works</p>
          <h2 id="how-heading" className="mt-2 text-balance font-display text-3xl font-extrabold sm:text-4xl">
            From sign-up to first lesson in <span className="text-shuleni-yellow">three steps</span>
          </h2>
        </div>

        <ol className="relative mx-auto mt-12 grid max-w-3xl grid-cols-3">
          <span className="absolute left-[16.66%] right-[16.66%] top-7 h-0.5 bg-white/15" aria-hidden="true" />
          <span
            className="absolute left-[16.66%] top-7 h-0.5 bg-shuleni-turquoise transition-all duration-500"
            style={{ width: `${(active / (STEPS.length - 1)) * 66.66}%` }}
            aria-hidden="true"
          />
          {STEPS.map((step, index) => {
            const isActive = index === active;
            const isDone = index < active;
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative flex justify-center">
                <button
                  type="button"
                  onClick={() => choose(index)}
                  aria-current={isActive ? "step" : undefined}
                  className="group flex flex-col items-center gap-3 px-2 text-center"
                >
                  <span
                    className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ring-4 ring-shuleni-navy transition ${
                      isActive
                        ? "bg-shuleni-turquoise text-shuleni-ink"
                        : isDone
                          ? "bg-[#24419E] text-shuleni-turquoise"
                          : "bg-[#24419E] text-white/60 group-hover:text-white"
                    }`}
                  >
                    <Icon size={24} strokeWidth={1.9} aria-hidden="true" />
                    <span
                      className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                        isActive ? "bg-shuleni-yellow text-shuleni-ink" : "bg-white/20 text-white"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </span>
                  <span className={`font-display text-sm font-bold sm:text-base ${isActive ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mx-auto mt-12 grid max-w-4xl items-center gap-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8 md:grid-cols-[1fr_auto] md:gap-12">
          <div key={`text-${active}`} className="motion-safe:animate-fade-up">
            <p className="text-sm font-bold uppercase tracking-wider text-shuleni-turquoise">Step {active + 1} of 3</p>
            <h3 className="mt-2 font-display text-2xl font-extrabold">{title}</h3>
            <p className="mt-3 max-w-md leading-relaxed text-white/80">{description}</p>
            {isAuto && (
              <div className="mt-6 h-1 w-full max-w-[12rem] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div key={`bar-${active}`} className="h-full bg-shuleni-turquoise motion-safe:animate-step-progress" style={{ animationDuration: `${STEP_MS}ms` }} />
              </div>
            )}
          </div>
          <div key={`visual-${active}`} className="flex justify-center motion-safe:animate-fade-up md:w-72" aria-hidden="true">
            <Visual />
          </div>
        </div>
      </div>
    </section>
  );
}
