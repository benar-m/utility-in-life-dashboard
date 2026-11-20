import { ArrowRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import useSiteInfo from "../../hooks/useSiteInfo.js";
import { container } from "./format.js";

// Catch-all for anyone the scheduled classes don't fit.
export default function CtaBar() {
  const { contactPhone, contactPhoneIntl } = useSiteInfo();

  return (
    <section aria-labelledby="cta-bar-heading" className="relative overflow-hidden bg-shuleni-navy">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-shuleni-turquoise/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-shuleni-red/20 blur-3xl" aria-hidden="true" />
      <div className={`${container} relative py-16 text-center md:py-20`}>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-shuleni-turquoise">Can't find the right class?</p>
        <h2 id="cta-bar-heading" className="mx-auto mt-3 max-w-3xl text-balance font-display text-3xl font-extrabold text-white sm:text-5xl">
          Need a different subject or <span className="text-shuleni-yellow">time?</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
          Tell us what the student needs. We'll match them with a tutor and a schedule that works for your family.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            to="/register"
            className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-shuleni-red px-8 py-4 font-display font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/20 hover:bg-[#cf3330] sm:w-auto"
          >
            Register now <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {contactPhone && (
            <a
              href={`tel:${contactPhoneIntl}`}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-white/40 px-7 py-3.5 font-bold text-white hover:border-white hover:bg-white/10 sm:w-auto"
            >
              <Phone size={18} aria-hidden="true" /> Call {contactPhone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
