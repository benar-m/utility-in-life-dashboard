import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroStudent from "../../assets/hero-student.jpg";
import { container } from "./format.js";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-shuleni-turquoise via-[#7FE8E0] to-shuleni-aqua">
      <div className={`${container} grid items-center gap-8 pb-12 pt-6 md:grid-cols-[1.15fr_1fr] md:gap-12 md:py-20`}>
        {/* On phones the photo leads, cropped wide, so the first screen shows who we teach. */}
        <div className="relative order-first mr-3 md:order-none md:mx-auto md:w-full md:max-w-none md:mr-0 md:[grid-column:2]">
          <div className="absolute -bottom-3 -right-3 h-full w-full rounded-[1.75rem] bg-shuleni-navy md:-bottom-4 md:-right-4 md:rounded-[2rem]" aria-hidden="true" />
          <img
            src={heroStudent}
            alt="A student wearing headphones writing notes during an online lesson"
            className="relative aspect-[16/11] w-full rounded-[1.75rem] object-cover object-[50%_30%] md:aspect-square md:rounded-[2rem]"
          />
        </div>

        <div className="md:[grid-column:1] md:[grid-row:1]">
          <h1 className="font-display font-black uppercase leading-[0.95] text-shuleni-navy">
            <span className="block whitespace-nowrap text-[2.25rem] min-[360px]:text-[2.6rem] sm:text-6xl md:text-5xl lg:text-6xl xl:text-[4.25rem]">Home-based</span>
            <span className="mt-1 block text-[1.9rem] min-[360px]:text-[2.15rem] text-shuleni-yellow [text-shadow:0_2px_0_#18308F] sm:text-5xl lg:text-6xl">
              &amp; Online
            </span>
            <span className="mt-2 block text-lg font-extrabold tracking-wide text-white [text-shadow:0_1px_2px_rgba(15,31,92,0.45)] sm:text-2xl">
              Tuition services
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-shuleni-ink sm:mt-6 sm:text-lg">
            Personalized tuition for CBC, 8-4-4 and IGCSE students, in small live classes online, one-on-one, or at home
            with a qualified tutor.
          </p>
          <div className="mt-7 flex gap-3 sm:mt-8">
            <a
              href="#classes"
              className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-shuleni-red px-5 py-3.5 font-display text-sm font-extrabold uppercase tracking-wide text-white shadow-lg shadow-shuleni-red/25 hover:bg-[#cf3330] sm:flex-none sm:px-7 sm:text-base"
            >
              Find a class <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link
              to="/register"
              className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-full border-2 border-shuleni-navy px-5 py-3 text-sm font-bold text-shuleni-navy hover:bg-shuleni-navy hover:text-white sm:flex-none sm:px-6 sm:text-base"
            >
              Register<span className="hidden sm:inline">&nbsp;for tuition</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
