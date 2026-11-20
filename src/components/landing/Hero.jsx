import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroStudent from "../../assets/hero-student.jpg";
import { container } from "./format.js";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-shuleni-turquoise via-[#7FE8E0] to-shuleni-aqua">
      <div className={`${container} grid items-center gap-12 py-14 md:grid-cols-[1.15fr_1fr] md:py-20`}>
        <div>
          <h1 className="font-display font-black uppercase leading-[0.95] text-shuleni-navy">
            <span className="block text-5xl sm:whitespace-nowrap sm:text-6xl md:text-5xl lg:text-6xl xl:text-[4.25rem]">Home-based</span>
            <span className="mt-1 block text-4xl text-shuleni-yellow [text-shadow:0_2px_0_#18308F] sm:text-5xl lg:text-6xl">
              &amp; Online
            </span>
            <span className="mt-2 block text-xl font-extrabold tracking-wide text-white [text-shadow:0_1px_2px_rgba(15,31,92,0.45)] sm:text-2xl">
              Tuition services
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-shuleni-ink">
            Personalized tuition for CBC, 8-4-4 and IGCSE students, in small live classes online, one-on-one, or at home
            with a qualified tutor.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#classes"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-shuleni-red px-7 py-3.5 font-display text-base font-extrabold uppercase tracking-wide text-white shadow-lg shadow-shuleni-red/25 hover:bg-[#cf3330]"
            >
              Find a class <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-shuleni-navy px-6 py-3 font-bold text-shuleni-navy hover:bg-shuleni-navy hover:text-white"
            >
              Register for tuition
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div className="absolute -bottom-4 -right-4 h-full w-full rounded-[2rem] bg-shuleni-navy" aria-hidden="true" />
          <img
            src={heroStudent}
            alt="A student wearing headphones writing notes during an online lesson"
            className="relative aspect-square w-full rounded-[2rem] object-cover"
          />
        </div>
      </div>
    </section>
  );
}
