import { ArrowRight, Check, Home, Laptop, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { wideContainer } from "./format.js";

const OFFERS = [
  {
    icon: Users,
    title: "Group classes",
    tagline: "Small live classes online",
    summary: "Join a class for your level and subject, taught live on Google Meet on a fixed weekly timetable.",
    includes: ["Weekly timetable you can plan around", "Taught live by a subject tutor", "Notes and past papers included"],
    billing: "Billed weekly",
    href: "#classes",
  },
  {
    icon: Laptop,
    title: "One-on-one online",
    tagline: "Personal lessons from home",
    summary: "Lessons for one student, at times that suit you, paced to what they need most.",
    includes: ["You choose the subject and times", "Focus on the topics they find hardest", "Ideal for exam revision"],
    billing: "Pay per lesson",
    to: "/register?mode=ONLINE_INDIVIDUAL",
  },
  {
    icon: Home,
    title: "Home tuition",
    tagline: "A tutor comes to you",
    summary: "A qualified tutor visits your home for face-to-face lessons with one student.",
    includes: ["Face-to-face, one-on-one teaching", "Days and times agreed with you", "CBC, 8-4-4 and IGCSE subjects"],
    billing: "Pay per lesson",
    to: "/register?mode=FACE_TO_FACE_INDIVIDUAL",
  },
];

function OfferCard({ icon: Icon, title, tagline, summary, includes, billing }) {
  return (
    <>
      <div className="text-center md:text-left lg:text-center">
        <span className="mx-auto flex h-16 w-16 md:mx-0 lg:mx-auto items-center justify-center rounded-2xl bg-shuleni-aqua text-shuleni-teal ring-1 ring-shuleni-teal/15">
          <Icon size={30} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h3 className="mt-6 font-display text-2xl font-extrabold text-shuleni-navy">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-shuleni-teal">{tagline}</p>
        <p className="mx-auto mt-4 max-w-xs leading-relaxed text-slate-600 md:mx-0 lg:mx-auto lg:min-h-[4.875rem]">{summary}</p>
      </div>
      <div className="flex flex-1 flex-col">
      <ul className="mb-8 mt-8 space-y-3 border-t border-slate-100 pt-6 md:mt-0 md:border-t-0 md:pt-0 lg:mt-8 lg:border-t lg:pt-6">
        {includes.map((item) => (
          <li key={item} className="flex items-start gap-3 text-slate-700">
            <Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-shuleni-teal" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-5 py-3.5">
        <span className="text-sm font-semibold text-slate-500">{billing}</span>
        <span className="inline-flex items-center gap-1.5 font-bold text-shuleni-navy">
          Explore <ArrowRight size={17} className="transition group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
      </div>
    </>
  );
}

export default function Offer() {
  const cardClass =
    "group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 transition md:grid md:grid-cols-2 md:items-center md:gap-10 lg:flex lg:items-stretch lg:gap-0 sm:p-8 hover:-translate-y-1 hover:border-shuleni-teal/40 hover:shadow-xl hover:shadow-shuleni-navy/10 lg:p-10";

  return (
    <section id="ways-to-learn" aria-labelledby="offer-heading" className="scroll-mt-16 bg-slate-50">
      <div className={`${wideContainer} py-16 md:py-24`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-teal">Ways to learn</p>
          <h2 id="offer-heading" className="mt-2 font-display text-3xl font-extrabold text-shuleni-navy sm:text-4xl">
            Three ways to learn
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Join a small group class, or book lessons for one student, online or at home.
          </p>
        </div>

        <ul className="mt-14 grid gap-6 lg:grid-cols-3 xl:gap-8">
          {OFFERS.map((offer) => (
            <li key={offer.title} className="flex">
              {offer.href ? (
                <a href={offer.href} className={`${cardClass} w-full`} aria-label={`Explore ${offer.title}`}>
                  <OfferCard {...offer} />
                </a>
              ) : (
                <Link to={offer.to} className={`${cardClass} w-full`} aria-label={`Explore ${offer.title}`}>
                  <OfferCard {...offer} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
