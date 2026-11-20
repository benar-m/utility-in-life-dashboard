import { Atom, BookOpen, Calculator, Dna, FlaskConical, Globe, Landmark, Languages, Laptop, Briefcase } from "lucide-react";

export const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";

// Wider frame for card grids that need four across.
export const wideContainer = "mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-10";

export const formatMoney = (amount, currency = "KES") =>
  `${currency} ${Number(amount).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

export const isFree = (resource) => resource.price_amount === null || Number(resource.price_amount) === 0;

export const sameText = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

const SUBJECT_ICONS = [
  [/math/i, Calculator],
  [/bio/i, Dna],
  [/chem/i, FlaskConical],
  [/phys/i, Atom],
  [/kiswahili|swahili|french|german/i, Languages],
  [/geo/i, Globe],
  [/history|government|cre|ire/i, Landmark],
  [/business|account|econ/i, Briefcase],
  [/computer|ict/i, Laptop],
];

export const subjectIcon = (name) => SUBJECT_ICONS.find(([pattern]) => pattern.test(name || ""))?.[1] || BookOpen;

// Subject icon tints from the poster palette; one per subject, stable across renders.
const SUBJECT_TONES = [
  "bg-shuleni-aqua text-shuleni-teal",
  "bg-[#FDEBD3] text-[#B45309]",
  "bg-[#FDE2E1] text-[#B3261E]",
  "bg-[#E3E8FA] text-shuleni-navy",
  "bg-[#FBF6C9] text-[#7A6A00]",
];

export function subjectTone(name = "") {
  let hash = 0;
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SUBJECT_TONES[hash % SUBJECT_TONES.length];
}

export const CURRICULA = [
  ["CBC", "CBC / CBE", /grade/i],
  ["844", "8-4-4", /form/i],
  ["IGCSE", "IGCSE", /igcse|year/i],
];

export const curriculumOf = (gradeLevel) => CURRICULA.find(([, , pattern]) => pattern.test(gradeLevel || ""))?.[0] || null;

// "Tue, Thu · 16:00–17:00" — one line per distinct time slot.
export function formatSchedule(schedule = []) {
  const daysByTime = new Map();
  for (const slot of schedule) {
    const time = `${slot.start_time}–${slot.end_time}`;
    daysByTime.set(time, [...(daysByTime.get(time) || []), slot.day.slice(0, 3)]);
  }
  return [...daysByTime].map(([time, days]) => `${days.join(", ")} · ${time}`);
}
