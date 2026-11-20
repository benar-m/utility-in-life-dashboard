import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Eye, EyeOff, FileText, KeyRound, Library, Pencil, Plus, Search, Trash2, UsersRound } from "lucide-react";
import ActionMenu from "../components/common/ActionMenu.jsx";
import { apiRequest } from "../api/client.js";
import ResourceFormModal from "../components/resources/ResourceFormModal.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import TableSkeleton from "../components/common/TableSkeleton.jsx";
import useApiCollection from "../hooks/useApiCollection.js";

const resourceColumns = ["Resource", "Audience", "Format", "Price", "Marketplace", "Link", ""];

export default function ResourcesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState(null);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const { items: resources, isLoading, error, reload } = useApiCollection("resources/?page_size=100");
  const { items: subjects } = useApiCollection("subjects/?page_size=100");
  const { items: interests, reload: reloadInterests } = useApiCollection("resource-interests/?status=PENDING&page_size=100");

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return resources;
    return resources.filter((resource) => [resource.title, resource.description, resource.grade_level, resource.subject?.name].join(" ").toLowerCase().includes(query));
  }, [resources, search]);

  const run = async (request, successMessage) => {
    setActionError("");
    setNotice("");
    try {
      await request();
      setNotice(successMessage);
      await Promise.all([reload(), reloadInterests()]);
    } catch (requestError) {
      setActionError(requestError.message || "That didn't work. Please try again.");
    }
  };

  const updateInterest = (interest, status) =>
    run(() => apiRequest(`resource-interests/${interest.id}/`, { method: "PATCH", body: { status } }), `${interest.student_name}'s request marked ${status.toLowerCase()}.`);

  const publishedCount = resources.filter((resource) => resource.is_published).length;
  const paidCount = resources.filter((resource) => resource.price_amount !== null).length;

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Build a student-first library of papers, notes, books, and study guides."
        actionSlot={<button type="button" onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"><Plus size={16} /> Add resource</button>}
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={Library} label="All resources" value={resources.length} />
        <SummaryCard icon={CheckCircle2} label="Published" value={publishedCount} />
        <SummaryCard icon={BookOpen} label="Paid resources" value={paidCount} />
      </section>

      {interests.length > 0 && (
        <section className="mb-6 rounded-xl border border-brand-100 bg-brand-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600"><UsersRound size={18} /></span>
            <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-slate-900">Student requests</h2><p className="mt-1 text-xs text-slate-600">Follow up with learners who asked for access to a resource.</p></div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-700">{interests.length} pending</span>
          </div>
          <div className="mt-4 space-y-2">
            {interests.map((interest) => <div key={interest.id} className="flex flex-col gap-3 rounded-lg border border-brand-100 bg-white p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{interest.student_name}</p><p className="text-xs text-slate-500">{interest.resource?.title} · {interest.email}{interest.phone ? ` · ${interest.phone}` : ""}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => updateInterest(interest, "CONTACTED")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">Mark contacted</button><button type="button" onClick={() => run(() => apiRequest(`resource-interests/${interest.id}/grant/`, { method: "POST", body: {} }), `${interest.student_name} can now open ${interest.resource?.title}.`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"><KeyRound size={13} /> Grant access</button></div></div>)}
          </div>
        </section>
      )}

      {(error || actionError) && <InlineAlert>{error || actionError}</InlineAlert>}
      {notice && <InlineAlert tone="success">{notice}</InlineAlert>}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:w-80">
        <Search size={16} className="text-slate-400" aria-hidden="true" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources" aria-label="Search resources" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
      </div>
      {isLoading ? <TableSkeleton columnLabels={resourceColumns} /> : filteredResources.length === 0 ? (
        <EmptyState icon={FileText} title={search ? "No matching resources" : "Your library is empty"} description={search ? "Try a different title, subject, or grade." : "Add the first resource so students can discover it from the public learning hub."} primaryActionLabel="Add resource" onPrimaryAction={() => setIsModalOpen(true)} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{resourceColumns.map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
            {filteredResources.map((resource) => <tr key={resource.id} className="hover:bg-slate-50/70"><td className="px-4 py-3"><p className="font-medium text-slate-900">{resource.title}</p><p className="mt-1 max-w-sm truncate text-xs text-slate-500">{resource.description || "No description"}</p></td><td className="px-4 py-3 text-slate-600">{resource.subject?.name || "General"}{resource.grade_level ? ` · ${resource.grade_level}` : ""}</td><td className="px-4 py-3 text-slate-600">{resource.resource_type_label}</td><td className="px-4 py-3 font-medium text-slate-700">{resource.price_amount === null ? "Free" : `${resource.currency} ${Number(resource.price_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}</td><td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${resource.is_published ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"}`}>{resource.is_published ? "Published" : "Draft"}</span></td><td className="px-4 py-3 text-right">{resource.download_url ? <a href={resource.download_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-700 hover:text-brand-800">Open link</a> : <span className="text-xs text-slate-400">Link pending</span>}</td><td className="px-4 py-3 text-right"><ActionMenu label={`Actions for ${resource.title}`} items={[
              { label: "Edit", icon: Pencil, onSelect: () => setResourceToEdit(resource) },
              resource.is_published
                ? { label: "Unpublish", icon: EyeOff, onSelect: () => run(() => apiRequest(`resources/${resource.id}/`, { method: "PATCH", body: { is_published: false } }), `${resource.title} is hidden from the public site.`) }
                : { label: "Publish", icon: Eye, onSelect: () => run(() => apiRequest(`resources/${resource.id}/`, { method: "PATCH", body: { is_published: true } }), `${resource.title} is published.`) },
              { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => window.confirm(`Delete “${resource.title}”? This can't be undone.`) && run(() => apiRequest(`resources/${resource.id}/`, { method: "DELETE" }), `${resource.title} deleted.`) },
            ]} /></td></tr>)}
          </tbody></table>
        </div>
      )}
      <ResourceFormModal isOpen={isModalOpen || Boolean(resourceToEdit)} resource={resourceToEdit} subjects={subjects} onClose={() => { setIsModalOpen(false); setResourceToEdit(null); }} onCreated={reload} />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon size={18} /></span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-xl font-semibold text-slate-900">{value}</p></div></div>;
}
