import { ArrowRight, Bus, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import useSiteInfo from "../../hooks/useSiteInfo.js";
import { container } from "./format.js";

export default function EnrollCta({ onAskAboutTrips }) {
  const { contactPhone, contactPhoneIntl } = useSiteInfo();

  return (
    <section id="contact" aria-labelledby="enroll-heading" className="scroll-mt-16 bg-gradient-to-br from-shuleni-turquoise to-shuleni-aqua">
      <div className={`${container} py-16 text-center md:py-24`}>
        <h2 id="enroll-heading" className="font-display text-4xl font-black uppercase text-shuleni-navy sm:text-5xl">
          Enroll <span className="text-[#B3261E]">today!</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-shuleni-ink/80">
          Not sure where to start? Register in two minutes and we'll call you to find the right class, tutor and time.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/register"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-shuleni-red px-8 py-4 font-display font-extrabold uppercase tracking-wide text-white shadow-lg shadow-shuleni-red/25 hover:bg-[#cf3330] sm:w-auto"
          >
            Register now <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {contactPhone && (
            <a href={`tel:${contactPhoneIntl}`} className="inline-flex items-center gap-2 font-semibold text-shuleni-navy hover:underline">
              <Phone size={18} aria-hidden="true" /> Call {contactPhone}
            </a>
          )}
        </div>
        <p className="mx-auto mt-10 max-w-md text-sm font-semibold text-shuleni-ink/80">
          <Bus size={17} className="mr-1.5 inline-block align-[-3px]" aria-hidden="true" />
          We also run academic trips every school holiday.{" "}
          <button type="button" onClick={onAskAboutTrips} className="underline underline-offset-2 hover:text-shuleni-navy">
            Ask about trips
          </button>
        </p>
      </div>
    </section>
  );
}
