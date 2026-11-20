import { useState } from "react";
import { ExternalLink, FileText, Loader2, Lock } from "lucide-react";
import { resourceAccess } from "../../api/client.js";
import EmptyState from "../../components/common/EmptyState.jsx";
import InlineAlert from "../../components/common/InlineAlert.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import useApiCollection from "../../hooks/useApiCollection.js";

export default function StudentResourcesPage() {
  const { items: resources, isLoading, error } = useApiCollection("portal/student/resources/");
  const [openingId, setOpeningId] = useState(null);
  const [openError, setOpenError] = useState("");
  const [filter, setFilter] = useState("mine");

  const shown = filter === "mine" ? resources.filter((resource) => resource.for_my_subjects || resource.can_open) : resources;

  // Open the tab first so popup blockers allow it.
  const open = async (resource) => {
    setOpenError("");
    setOpeningId(resource.id);
    const tab = window.open("", "_blank");
    try {
      const { download_url: url } = await resourceAccess(resource.id);
      if (!url) throw new Error("The link for this resource hasn't been added yet.");
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else window.location.href = url;
    } catch (requestError) {
      tab?.close();
      setOpenError(requestError.message);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Resources" description="Notes and past papers from your tutors. Locked ones come with a class in that subject." />
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label="Show">
        {[["mine", "For my subjects"], ["all", "Everything"]].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${filter === value ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>
      {(error || openError) && <InlineAlert>{error || openError}</InlineAlert>}
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading…</p>
      ) : shown.length === 0 ? (
        <EmptyState icon={FileText} title="Nothing here yet" description="Your tutors haven't shared resources for your subjects yet." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((resource) => (
            <li key={resource.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{resource.resource_type_label}</p>
              <h3 className="mt-2 font-display text-lg font-bold text-shuleni-navy">{resource.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{[resource.subject, resource.grade_level].filter(Boolean).join(" · ")}</p>
              <div className="mt-auto pt-5">
                {resource.can_open ? (
                  <button type="button" onClick={() => open(resource)} disabled={openingId === resource.id} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-shuleni-navy py-2.5 text-sm font-bold text-white hover:bg-shuleni-ink disabled:opacity-60">
                    {openingId === resource.id ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />} Read
                  </button>
                ) : (
                  <p className="flex items-center justify-center gap-2 rounded-full bg-slate-100 py-2.5 text-sm font-medium text-slate-500">
                    <Lock size={14} /> Included with a {resource.subject} class
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
