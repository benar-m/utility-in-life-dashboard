import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Code2,
  FileText,
  FlaskConical,
  Layers3,
  Loader2,
  Mail,
  Menu,
  Sprout,
  Telescope,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import heroKidsBooks from "../assets/hero-kids-books.png";
import { apiRequest } from "../api/client.js";
import FormField, { inputClassName } from "../components/common/FormField.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const emptyForm = {
  first_name: "",
  last_name: "",
  grade_level: "",
  contact_email: "",
  contact_phone: "",
  preferred_times: "",
  notes: "",
};

const categories = [
  { label: "English", icon: BookOpen, tone: "bg-rose-100 text-rose-700" },
  { label: "Mathematics", icon: Calculator, tone: "bg-violet-100 text-violet-700" },
  { label: "Kiswahili", icon: Mail, tone: "bg-amber-100 text-amber-700" },
  { label: "Biology", icon: Sprout, tone: "bg-emerald-100 text-emerald-700" },
  { label: "Chemistry", icon: FlaskConical, tone: "bg-cyan-100 text-cyan-700" },
  { label: "Physics", icon: Zap, tone: "bg-sky-100 text-sky-700" },
  { label: "Geography", icon: Telescope, tone: "bg-pink-100 text-pink-700" },
  { label: "History & Government", icon: Layers3, tone: "bg-orange-100 text-orange-700" },
  { label: "Business Studies", icon: Layers3, tone: "bg-yellow-100 text-yellow-700" },
  { label: "Computer Studies", icon: Code2, tone: "bg-purple-100 text-purple-700" },
];

const serviceLabels = {
  CLASS: "Join a class",
  RESOURCE: "Get a resource",
  ONE_ON_ONE: "Book one-to-one help",
  EVENT: "Join an academic trip",
};

const courseAccents = [
  "from-teal-100 via-cyan-50 to-white",
  "from-amber-100 via-orange-50 to-white",
  "from-violet-100 via-purple-50 to-white",
  "from-rose-100 via-pink-50 to-white",
];

export default function StudentHubPageRedesign() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState({ classes: [], resources: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authPromptResource, setAuthPromptResource] = useState(null);
  const [viewingResource, setViewingResource] = useState(null);

  useEffect(() => {
    apiRequest("public/catalog/")
      .then(setCatalog)
      .catch((requestError) => setLoadError(requestError.message || "Could not load the learning options."))
      .finally(() => setIsLoading(false));
  }, []);

  const classes = catalog.classes || [];
  const resources = catalog.resources || [];

  useEffect(() => {
    const resourceId = Number(searchParams.get("resource"));
    const resource = resources.find((item) => item.id === resourceId);
    if (!currentUser || !resource) return;
    setViewingResource(resource);
    setSearchParams({}, { replace: true });
  }, [currentUser, resources, searchParams, setSearchParams]);
  const popularItems = useMemo(
    () => [...classes.map((item) => ({ type: "CLASS", item })), ...resources.map((item) => ({ type: "RESOURCE", item }))].slice(0, 4),
    [classes, resources]
  );

  const openService = (service) => {
    setSelectedService(service);
    setSelectedItem(null);
    setIsSubmitted(false);
    setError("");
    setMenuOpen(false);
  };

  const openItem = (service, item) => {
    setSelectedService(service);
    setSelectedItem(item);
    setIsSubmitted(false);
    setError("");
  };

  const handleViewResource = (resource) => {
    if (!currentUser) {
      setAuthPromptResource(resource);
      return;
    }
    setViewingResource(resource);
  };

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (selectedService === "RESOURCE") {
        await apiRequest("public/resource-interests/", {
          method: "POST",
          body: {
            resource_id: selectedItem.id,
            student_name: `${form.first_name.trim()} ${form.last_name.trim()}`.trim(),
            email: form.contact_email.trim(),
            phone: form.contact_phone.trim(),
            notes: form.notes.trim(),
          },
        });
      } else {
        await apiRequest("public/self-enroll/", {
          method: "POST",
          body: {
            service: selectedService,
            class_id: selectedItem?.id,
            ...form,
            contact_email: form.contact_email.trim(),
            contact_phone: form.contact_phone.trim(),
            preferred_times: form.preferred_times.trim(),
            notes: form.notes.trim(),
          },
        });
      }
      setIsSubmitted(true);
    } catch (requestError) {
      setError(requestError.message || "Could not send your request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfaff] text-slate-900">
      <header className="relative z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm"><Sprout size={19} /></span>
            <span><span className="block text-sm font-bold tracking-tight text-slate-900">Utility in Life</span><span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Learning hub</span></span>
          </Link>
          <nav className={`${menuOpen ? "absolute left-0 right-0 top-full flex border-b border-slate-200 bg-white px-5 py-4" : "hidden"} flex-col gap-3 text-sm font-medium text-slate-600 sm:static sm:flex sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0`}>
            <button type="button" onClick={() => scrollTo("categories")} className="text-left hover:text-brand-700">Categories</button>
            <button type="button" onClick={() => scrollTo("popular")} className="text-left hover:text-brand-700">Popular learning</button>
            <button type="button" onClick={() => scrollTo("resources")} className="text-left hover:text-brand-700">Resources</button>
            <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">Sign in</Link>
          </nav>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg p-2 text-slate-500 sm:hidden" aria-label="Open menu">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#f5f1fb]">
          <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full bg-sky-100/90 blur-3xl" />
          <div className="absolute right-[38%] top-10 h-5 w-5 rotate-12 bg-rose-400" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-5 pb-12 pt-12 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:pb-16 lg:pt-16">
            <div className="relative z-10 max-w-2xl">
              <h1 className="mt-5 max-w-xl text-5xl font-extrabold leading-[0.98] tracking-[-0.05em] text-[#102443] sm:text-6xl lg:text-[4.6rem]">Best place to <span className="text-brand-500">grow</span> curious minds.</h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">Find the next class, resource, mentor, or experience that makes learning feel like it belongs to you.</p>
              <div className="mt-8 flex flex-wrap gap-3"><button type="button" onClick={() => scrollTo("popular")} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-900/10 hover:bg-brand-600">Start learning now <ArrowRight size={16} /></button><button type="button" onClick={() => openService("RESOURCE")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-700 hover:border-brand-200 hover:text-brand-700">Browse resources <FileText size={16} /></button></div>
            </div>
            <div className="relative mx-auto min-h-[23rem] w-full max-w-2xl lg:min-h-[31rem]">
              <div className="absolute right-8 top-6 h-64 w-64 rounded-full border-[18px] border-amber-100/80 sm:h-80 sm:w-80" />
              <div className="absolute right-0 top-8 h-56 w-56 rounded-full bg-white/50 blur-2xl sm:h-80 sm:w-80" />
              <div className="absolute right-2 top-0 text-4xl tracking-[0.2em] text-slate-500/60">〰〰</div>
              <img src={heroKidsBooks} alt="Children learning together with books" className="absolute inset-0 z-10 h-full w-full object-contain object-center drop-shadow-[0_25px_25px_rgba(8,58,51,0.12)]" />
            </div>
          </div>
        </section>

        <section id="categories" className="scroll-mt-20 bg-white"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"><div className="text-center"><h2 className="text-3xl font-extrabold tracking-tight text-[#102443] sm:text-4xl">Top categories</h2><span className="mx-auto mt-2 block h-1 w-16 rounded-full bg-amber-300" /></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10">{categories.map(({ label, icon: Icon, tone }) => <button key={label} type="button" onClick={() => scrollTo("popular")} className="group flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:shadow-md"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={15} /></span><span className="text-[11px] font-bold leading-tight text-slate-700">{label}</span></button>)}</div></div></section>

        <section className="bg-white pb-8"><div className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-2"><FeaturePanel eyebrow="Learn together with" title="Expert mentors" copy="Ask questions, practice new skills, and learn with people who want to see you make progress." button="Meet your next class" accent="bg-[#faf8f4]" icon={UsersRound} onClick={() => openService("CLASS")} /><FeaturePanel eyebrow="Get the skills" title="For every student" copy="Use flexible resources and one-to-one support to shape a learning path that works for you." button="Find your resource" accent="bg-[#eef6ff]" icon={BookOpen} onClick={() => openService("RESOURCE")} /></div></section>

        <section id="popular" className="scroll-mt-20 bg-[#fbfaff]"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-3xl font-extrabold tracking-tight text-[#102443] sm:text-4xl">Popular learning</h2><span className="mt-2 block h-1 w-16 rounded-full bg-amber-300" /><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">Explore live classes and focused resources chosen to help you take a confident next step.</p></div><button type="button" onClick={() => openService("CLASS")} className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">View all learning <ArrowRight size={16} /></button></div>{loadError && <div className="mt-6"><InlineAlert>{loadError}</InlineAlert></div>}{isLoading ? <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Loading learning options…</div> : popularItems.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Learning options will appear here as they are published.</div> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{popularItems.map(({ type, item }, index) => <PopularCard key={`${type}-${item.id}`} type={type} item={item} accent={courseAccents[index % courseAccents.length]} onClick={() => type === "RESOURCE" ? handleViewResource(item) : openItem(type, item)} />)}</div>}</div></section>

        <section id="resources" className="scroll-mt-20 border-y border-brand-100/70 bg-white"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Your resource shelf</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#102443]">Keep learning after class</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Gain access to revision materials, study guides, and focused notes to support your next study session.</p></div><button type="button" onClick={() => openService("RESOURCE")} className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">Browse all resources <ArrowRight size={16} /></button></div>{isLoading ? <div className="mt-8 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Loading the shelf…</div> : resources.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">Resources will appear here as the library is published.</div> : <div className="mt-8 grid gap-4 md:grid-cols-3">{resources.slice(0, 3).map((resource) => <ResourceCard key={resource.id} resource={resource} onClick={() => handleViewResource(resource)} />)}</div>}</div></section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"><div className="grid gap-6 rounded-[2rem] bg-brand-800 px-6 py-8 text-white sm:px-10 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">Not sure where to start?</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight">Tell us what would make learning easier.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-brand-100">A coordinator can help you choose a class, find the right resource, or set up one-to-one support.</p></div><button type="button" onClick={() => openService("ONE_ON_ONE")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-brand-900 hover:bg-amber-300">Start a quick request <ArrowRight size={16} /></button></div></section>
      </main>

      {selectedService && <EnrollmentModal selectedService={selectedService} selectedItem={selectedItem} catalog={{ classes, resources }} isSubmitted={isSubmitted} onClose={() => setSelectedService(null)} onItem={openItem} form={form} update={update} error={error} isSubmitting={isSubmitting} onSubmit={handleSubmit} />}
      {authPromptResource && <ResourceAuthPrompt resource={authPromptResource} onClose={() => setAuthPromptResource(null)} />}
      {viewingResource && <ResourceViewerModal resource={viewingResource} onClose={() => setViewingResource(null)} />}
    </div>
  );
}

function FeaturePanel({ eyebrow, title, copy, button, accent, icon: Icon, onClick }) {
  return <div className={`relative min-h-56 overflow-hidden rounded-sm p-7 ${accent} sm:p-9`}><div className="absolute -right-12 -top-12 h-52 w-52 rounded-full border border-slate-300/40" /><div className="absolute bottom-5 right-8 flex h-20 w-20 rotate-6 items-center justify-center rounded-2xl bg-white/80 text-brand-600 shadow-lg shadow-slate-900/5"><Icon size={34} /></div><p className="relative text-xs font-semibold text-brand-600">{eyebrow}</p><h3 className="relative mt-2 max-w-xs text-2xl font-extrabold tracking-tight text-[#102443]">{title}</h3><p className="relative mt-2 max-w-sm text-xs leading-5 text-slate-500">{copy}</p><button type="button" onClick={onClick} className="relative mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-600">{button} <ArrowRight size={14} /></button></div>;
}

function PopularCard({ type, item, accent, onClick }) {
  const isClass = type === "CLASS";
  const price = isClass ? item.cost_amount : item.price_amount;
  const label = isClass ? item.subject || "Live class" : item.resource_type_label || "Resource";
  const title = isClass ? item.name : item.title;
  const author = isClass ? item.teacher : "Utility in Life library";
  return <button type="button" onClick={onClick} className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl"><div className={`relative flex h-36 items-end overflow-hidden bg-gradient-to-br ${accent} p-4`}><div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[14px] border-white/50" /><span className="relative rounded-full bg-brand-500 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white">{label}</span></div><div className="p-4"><p className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-[#102443]">{title}</p><div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">{author?.slice(0, 1) || "L"}</span>{author}</div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]"><span className="font-bold text-slate-500">{isClass ? `${item.schedule?.length || 0} schedule${item.schedule?.length === 1 ? "" : "s"}` : item.grade_level || "All levels"}</span><span className="font-extrabold text-brand-600">{price === null || price === undefined ? "Free" : `${item.currency || "KES"} ${Number(price).toLocaleString("en-KE")}`}</span></div></div></button>;
}

function ResourceCard({ resource, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><FileText size={19} /></span><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{resource.price_amount === null ? "Free" : `${resource.currency} ${Number(resource.price_amount).toLocaleString("en-KE")}`}</span></div><p className="mt-4 text-sm font-extrabold text-[#102443]">{resource.title}</p><p className="mt-1 text-xs text-slate-500">{resource.subject} {resource.grade_level ? `· ${resource.grade_level}` : ""} · {resource.resource_type_label}</p><p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{resource.description || "A focused resource for your next study session."}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-700">View <ArrowRight size={14} /></span></button>;
}

function ResourceAuthPrompt({ resource, onClose }) {
  const returnState = { from: { pathname: "/", search: `?resource=${resource.id}` } };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Resource access</p><h2 className="mt-2 text-xl font-extrabold text-[#102443]">Sign in to view this resource</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" aria-label="Close"><X size={19} /></button></div><div className="mt-5 rounded-xl bg-brand-50 p-4"><p className="text-sm font-bold text-brand-800">{resource.title}</p><p className="mt-1 text-xs text-brand-700">{resource.subject} {resource.grade_level ? `· ${resource.grade_level}` : ""}</p></div><p className="mt-5 text-sm leading-6 text-slate-600">Create a student account or sign in to view your learning resources and keep your place in the learning hub.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Link to="/login" state={returnState} onClick={onClose} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Sign in</Link><Link to="/register" state={returnState} onClick={onClose} className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white hover:bg-brand-600">Create account</Link></div></div></div>;
}

function ResourceViewerModal({ resource, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Resource</p><h2 className="mt-2 text-xl font-extrabold text-[#102443]">{resource.title}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" aria-label="Close"><X size={19} /></button></div><p className="mt-4 text-sm leading-6 text-slate-600">{resource.description || "A focused resource for your next study session."}</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1">{resource.subject || "General"}</span><span className="rounded-full bg-slate-100 px-3 py-1">{resource.grade_level || "All levels"}</span><span className="rounded-full bg-slate-100 px-3 py-1">{resource.resource_type_label}</span></div>{resource.download_url ? <a href={resource.download_url} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white hover:bg-brand-600">Open resource <ArrowRight size={16} /></a> : <p className="mt-7 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">Your account is ready for this resource. The learning link will appear here once it is published.</p>}</div></div>;
}

function EnrollmentModal({ selectedService, selectedItem, catalog, isSubmitted, onClose, onItem, form, update, error, isSubmitting, onSubmit }) {
  const needsChoice = (selectedService === "CLASS" || selectedService === "RESOURCE") && !selectedItem;
  const title = isSubmitted ? "You are on the list" : needsChoice ? (selectedService === "CLASS" ? "Choose a class" : "Choose a resource") : "A few details, then we will take it from there";
  const choices = selectedService === "CLASS" ? catalog.classes : catalog.resources;
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-8"><div className="mx-auto max-w-3xl rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">{serviceLabels[selectedService]}</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Close"><X size={20} /></button></div><div className="px-5 py-5 sm:px-7">{isSubmitted ? <div className="py-10 text-center"><CheckCircle2 size={48} className="mx-auto text-brand-500" /><h3 className="mt-4 text-lg font-semibold text-slate-900">Thanks—your request is in.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">We saved your choices. A coordinator will follow up using the contact details you shared.</p><button type="button" onClick={onClose} className="mt-6 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Back to learning</button></div> : needsChoice ? <div className="grid gap-3 sm:grid-cols-2">{choices.map((item) => selectedService === "CLASS" ? <ClassChoice key={item.id} classItem={item} onClick={() => onItem("CLASS", item)} /> : <ResourceCard key={item.id} resource={item} onClick={() => onItem("RESOURCE", item)} />)}{choices.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Nothing is published here yet. Try a quick request and we will help you find a fit.</p>}</div> : <EnrollmentForm form={form} update={update} error={error} isSubmitting={isSubmitting} service={selectedService} selectedItem={selectedItem} onSubmit={onSubmit} />}</div></div></div>;
}

function ClassChoice({ classItem, onClick }) {
  const schedule = classItem.schedule?.[0];
  return <button type="button" onClick={onClick} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><BookOpenCheck size={19} /></span><span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">{classItem.remaining_seats === null ? "Open" : `${classItem.remaining_seats} places`}</span></div><p className="mt-4 text-sm font-semibold text-slate-900">{classItem.name}</p><p className="mt-1 text-xs text-slate-500">{classItem.subject} · {classItem.grade_level} · {classItem.teacher}</p><p className="mt-3 text-xs font-medium text-slate-700">{schedule ? `${schedule.day} · ${schedule.start_time}–${schedule.end_time}` : "Schedule to be confirmed"}</p></button>;
}

function EnrollmentForm({ form, update, error, isSubmitting, service, selectedItem, onSubmit }) {
  return <form onSubmit={onSubmit} className="space-y-4">{selectedItem && <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3"><p className="text-sm font-semibold text-brand-800">{selectedItem.title || selectedItem.name}</p><p className="mt-1 text-xs text-brand-700">{selectedItem.subject || "Student-led request"}{selectedItem.grade_level ? ` · ${selectedItem.grade_level}` : ""}</p></div>}{error && <InlineAlert>{error}</InlineAlert>}<div className="grid gap-4 sm:grid-cols-2"><FormField label="First name" htmlFor="hub-first" required><input id="hub-first" required value={form.first_name} onChange={update("first_name")} className={inputClassName} /></FormField><FormField label="Last name" htmlFor="hub-last" required><input id="hub-last" required value={form.last_name} onChange={update("last_name")} className={inputClassName} /></FormField><FormField label="Grade or level" htmlFor="hub-grade" required><input id="hub-grade" required value={form.grade_level} onChange={update("grade_level")} placeholder="Form 3" className={inputClassName} /></FormField><FormField label="Email or guardian email" htmlFor="hub-email" required><input id="hub-email" type="email" required value={form.contact_email} onChange={update("contact_email")} className={inputClassName} /></FormField><FormField label="Phone" htmlFor="hub-phone"><input id="hub-phone" type="tel" value={form.contact_phone} onChange={update("contact_phone")} className={inputClassName} /></FormField>{service !== "RESOURCE" && <FormField label="Preferred times" htmlFor="hub-times" hint="Optional"><input id="hub-times" value={form.preferred_times} onChange={update("preferred_times")} placeholder="Weekdays after 4pm" className={inputClassName} /></FormField>}</div><FormField label={service === "RESOURCE" ? "Anything else?" : "What would you like us to know?"} htmlFor="hub-notes"><textarea id="hub-notes" rows={3} value={form.notes} onChange={update("notes")} className={inputClassName} /></FormField><button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{isSubmitting && <Loader2 size={16} className="animate-spin" />} {isSubmitting ? "Sending…" : "Send my request"}</button><p className="text-center text-xs text-slate-400">No account is created until you choose to continue with the team.</p></form>;
}
