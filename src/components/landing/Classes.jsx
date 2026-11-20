import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import ClassCard from "./ClassCard.jsx";
import { CURRICULA, curriculumOf, sameText, wideContainer } from "./format.js";

const PAGE_SIZE = 8;

const chipClass = (isActive) =>
  `shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
    isActive ? "border-shuleni-navy bg-shuleni-navy text-white" : "border-slate-200 bg-white text-shuleni-navy hover:border-shuleni-navy"
  }`;

// The live classes are the product: this section is the catalogue.
export default function Classes({ catalog, onRequestClass }) {
  const [subject, setSubject] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const { classes } = catalog;

  // Filters come from the classes that exist, not a fixed list.
  const subjects = useMemo(() => {
    const counts = new Map();
    for (const classGroup of classes) counts.set(classGroup.subject, (counts.get(classGroup.subject) || 0) + 1);
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }, [classes]);
  const curricula = CURRICULA.filter(([key]) => classes.some((classGroup) => curriculumOf(classGroup.grade_level) === key));

  const filtered = classes.filter(
    (classGroup) =>
      (!subject || sameText(classGroup.subject, subject)) && (!curriculum || curriculumOf(classGroup.grade_level) === curriculum)
  );
  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  return (
    <section id="classes" aria-labelledby="classes-heading" className="scroll-mt-16 bg-white">
      <div className={`${wideContainer} py-16 md:py-24`}>
        <div>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-teal">Live classes</p>
            <h2 id="classes-heading" className="mt-2 font-display text-3xl font-extrabold text-shuleni-navy sm:text-4xl">
              Join a class this week
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Small groups taught live online by our tutors, on a fixed weekly timetable. Request a place and we'll
              confirm it with you.
            </p>
          </div>
        </div>

        {(subjects.length > 1 || curricula.length > 1) && (
          <div className="-mx-4 mt-10 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 sm:pb-0" role="group" aria-label="Filter classes">
            {subjects.length > 1 && (
              <>
                <button type="button" aria-pressed={!subject} onClick={() => setSubject(null)} className={chipClass(!subject)}>
                  All subjects
                </button>
                {subjects.map(([name]) => (
                  <button key={name} type="button" aria-pressed={subject === name} onClick={() => setSubject(name)} className={chipClass(subject === name)}>
                    {name}
                  </button>
                ))}
              </>
            )}
            {curricula.length > 1 && (
              <label className="relative shrink-0">
                <span className="sr-only">Level</span>
                <select
                  value={curriculum ?? ""}
                  onChange={(event) => setCurriculum(event.target.value || null)}
                  className="appearance-none rounded-full border-2 border-slate-200 bg-white py-1.5 pl-4 pr-10 text-sm font-bold text-shuleni-navy hover:border-shuleni-navy focus:border-shuleni-navy"
                >
                  <option value="">All levels</option>
                  {curricula.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-shuleni-navy" aria-hidden="true" />
              </label>
            )}
          </div>
        )}

        <div className="mt-10">
          {catalog.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading classes">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="h-80 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center">
              <p className="font-display text-xl font-bold text-shuleni-navy">
                {catalog.error ? "Classes couldn't load just now." : "No class scheduled for this choice yet."}
              </p>
              <p className="mx-auto mt-2 max-w-md text-slate-600">
                Register with the subject and level you need, and we'll place you in a class or arrange a tutor.
              </p>
              <Link to="/register" className="mt-6 inline-flex items-center gap-2 rounded-full bg-shuleni-red px-6 py-3 font-bold text-white hover:bg-[#cf3330]">
                Register <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((classGroup) => (
                <li key={classGroup.id} className="flex">
                  <ClassCard classGroup={classGroup} onRequest={onRequestClass} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          {filtered.length > visible.length && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-full border-2 border-shuleni-navy px-6 py-2.5 text-sm font-bold text-shuleni-navy hover:bg-shuleni-navy hover:text-white"
            >
              Show all {filtered.length} classes
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
