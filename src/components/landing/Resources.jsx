import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { wideContainer } from "./format.js";

const PLURALS = { EXAM_PAPER: "Exam papers", NOTES: "Notes", STUDY_GUIDE: "Study guides", BOOK: "Books", OTHER: "Other" };

const PAGE_SIZE = 10;

// Past papers and notes. Opening one needs an account; see LandingPage.
export default function Resources({ catalog, onOpen }) {
  const [type, setType] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const { currentUser } = useAuth();
  const { resources } = catalog;

  const types = [...new Map(resources.map((resource) => [resource.resource_type, resource.resource_type_label]))];
  const filtered = type ? resources.filter((resource) => resource.resource_type === type) : resources;
  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  const tabClass = (isActive) =>
    `shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
      isActive ? "border-shuleni-navy bg-shuleni-navy text-white" : "border-slate-200 bg-white text-shuleni-navy hover:border-shuleni-navy"
    }`;

  return (
    <section id="resources" aria-labelledby="resources-heading" className="scroll-mt-16 bg-slate-50">
      <div className={`${wideContainer} py-16 md:py-24`}>
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-teal">Resources</p>
            <h2 id="resources-heading" className="mt-2 font-display text-3xl font-extrabold text-shuleni-navy sm:text-4xl">
              Past papers &amp; notes
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Revision material prepared by our tutors. Free resources open with a student account; the rest come with
              your classes.
            </p>
          </div>
          {types.length > 1 && (
            <div className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:justify-center sm:px-0 sm:pb-0" role="group" aria-label="Filter by type">
              <button type="button" aria-pressed={!type} onClick={() => setType(null)} className={tabClass(!type)}>
                All
              </button>
              {types.map(([key, label]) => (
                <button key={key} type="button" aria-pressed={type === key} onClick={() => setType(key)} className={tabClass(type === key)}>
                  {PLURALS[key] || label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          {catalog.isLoading ? null : resources.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center">
              <p className="font-display text-xl font-bold text-shuleni-navy">Past papers and notes are on their way.</p>
              <p className="mt-2 text-slate-600">
                <Link to="/register" className="font-bold text-shuleni-teal underline underline-offset-2">
                  Register
                </Link>{" "}
                to get them with your classes.
              </p>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
              {visible.map((resource) => (
                <li
                  key={resource.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{resource.resource_type_label}</p>
                  <h3 className="mt-3 font-display text-lg font-bold leading-snug text-shuleni-navy">{resource.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{[resource.subject, resource.grade_level].filter(Boolean).join(" · ")}</p>
                  <div className="mt-auto pt-5 sm:pt-6">
                    {currentUser ? (
                      <button
                        type="button"
                        onClick={() => onOpen(resource)}
                        className="w-full rounded-full bg-shuleni-navy py-2.5 text-sm font-bold text-white transition hover:bg-shuleni-ink"
                      >
                        Read
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        state={{ from: { pathname: "/", search: `?resource=${resource.id}` } }}
                        className="block w-full rounded-full bg-slate-100 py-2.5 text-center text-sm font-bold text-slate-500 transition hover:bg-slate-200 hover:text-shuleni-navy"
                      >
                        Sign in to read
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {filtered.length > visible.length && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-full border-2 border-shuleni-navy px-6 py-2.5 text-sm font-bold text-shuleni-navy hover:bg-shuleni-navy hover:text-white"
            >
              Show all {filtered.length} resources
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
