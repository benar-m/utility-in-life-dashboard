import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { apiRequest } from "../api/client.js";
import { shortDate } from "../components/charts/DateRangeFilter.jsx";
import FormField, { inputClassName } from "../components/common/FormField.jsx";
import InlineAlert from "../components/common/InlineAlert.jsx";
import Modal from "../components/common/Modal.jsx";
import PageHeader from "../components/common/PageHeader.jsx";

function Section({ title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-bold text-shuleni-navy">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const button = "inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60";
const ghost = "rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

function OrganizationSection({ run }) {
  const [form, setForm] = useState(null);
  useEffect(() => {
    apiRequest("settings/organization/").then(setForm).catch(() => {});
  }, []);
  if (!form) return null;
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  return (
    <Section title="Organization" description="Shown on the public website and to parents.">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(() => apiRequest("settings/organization/", { method: "PATCH", body: form }), "Organization details saved.");
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <FormField label="Name" htmlFor="org-name" required><input id="org-name" required value={form.name} onChange={update("name")} className={inputClassName} /></FormField>
        <FormField label="Public phone" htmlFor="org-phone" hint="Shown on the website's call buttons."><input id="org-phone" value={form.contact_phone} onChange={update("contact_phone")} className={inputClassName} /></FormField>
        <FormField label="Email" htmlFor="org-email"><input id="org-email" type="email" value={form.contact_email} onChange={update("contact_email")} className={inputClassName} /></FormField>
        <FormField label="Address" htmlFor="org-address"><input id="org-address" value={form.address} onChange={update("address")} className={inputClassName} /></FormField>
        <div className="sm:col-span-2">
          <FormField label="How parents pay" htmlFor="org-paybill" hint="e.g. “Paybill 123456, account = invoice number”. M-Pesa credentials stay on the server.">
            <input id="org-paybill" value={form.paybill_display} onChange={update("paybill_display")} className={inputClassName} />
          </FormField>
        </div>
        <div className="sm:col-span-2"><button type="submit" className={button}>Save</button></div>
      </form>
    </Section>
  );
}

function ProgramModal({ program, onClose, onSave }) {
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (program) setForm({ title: "", audience: "", starts_on: "", ends_on: "", is_published: true, ...program });
  }, [program]);
  return (
    <Modal isOpen={Boolean(program)} onClose={onClose} title={program?.id ? "Edit program" : "New program"} description="The current published program shows as the banner on the public website.">
      {form && (
        <form onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><FormField label="Title" htmlFor="program-title" required><input id="program-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Long holiday program" className={inputClassName} /></FormField></div>
            <div className="sm:col-span-2"><FormField label="Who it's for" htmlFor="program-audience"><input id="program-audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="CBE Grade 6–10 · KCSE Form 3 & 4" className={inputClassName} /></FormField></div>
            <FormField label="Starts" htmlFor="program-start" required><input id="program-start" type="date" required value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} className={inputClassName} /></FormField>
            <FormField label="Ends" htmlFor="program-end" required><input id="program-end" type="date" required min={form.starts_on} value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} className={inputClassName} /></FormField>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="h-4 w-4 rounded border-slate-300" /> Published on the website
            </label>
          </div>
          <footer className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className={button}>Save program</button>
          </footer>
        </form>
      )}
    </Modal>
  );
}

function ProgramsSection({ run, version }) {
  const [programs, setPrograms] = useState([]);
  const [editing, setEditing] = useState(null);
  useEffect(() => {
    apiRequest("programs/").then(setPrograms).catch(() => {});
  }, [version]);
  const today = new Date().toISOString().slice(0, 10);
  const save = (form) =>
    run(
      () => apiRequest(form.id ? `programs/${form.id}/` : "programs/", { method: form.id ? "PATCH" : "POST", body: form }),
      "Program saved."
    ).then((ok) => ok && setEditing(null));
  return (
    <Section title="Programs" description="Holiday and term intakes advertised on the website." action={<button type="button" onClick={() => setEditing({})} className={ghost}><Plus size={13} className="inline" /> New program</button>}>
      {programs.length === 0 ? <p className="text-sm text-slate-500">No programs yet.</p> : (
        <ul className="divide-y divide-slate-100">
          {programs.map((program) => {
            const state = !program.is_published ? "Hidden" : program.ends_on < today ? "Ended" : program.starts_on <= today ? "Running" : "Upcoming";
            return (
              <li key={program.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-slate-900">{program.title}</p>
                  <p className="text-xs text-slate-500">{shortDate(program.starts_on, true)} – {shortDate(program.ends_on, true)} · {state}</p>
                </div>
                <button type="button" onClick={() => setEditing(program)} className={ghost}>Edit</button>
              </li>
            );
          })}
        </ul>
      )}
      <ProgramModal program={editing} onClose={() => setEditing(null)} onSave={save} />
    </Section>
  );
}

function SubjectsSection({ run, version }) {
  const [subjects, setSubjects] = useState([]);
  const [names, setNames] = useState({});
  const [mergeInto, setMergeInto] = useState({});
  useEffect(() => {
    apiRequest("subjects/?include_retired=1").then((list) => {
      setSubjects(list);
      setNames(Object.fromEntries(list.map((subject) => [subject.id, subject.name])));
    }).catch(() => {});
  }, [version]);
  return (
    <Section title="Subjects" description="Rename a subject, retire one you no longer teach, or merge a duplicate into the right one.">
      <ul className="divide-y divide-slate-100">
        {subjects.map((subject) => (
          <li key={subject.id} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center">
            <input aria-label={`Name of ${subject.name}`} value={names[subject.id] ?? ""} onChange={(e) => setNames({ ...names, [subject.id]: e.target.value })} className={`${inputClassName} lg:w-56 ${subject.is_active ? "" : "text-slate-400 line-through"}`} />
            <div className="flex flex-wrap gap-2">
              {names[subject.id] !== subject.name && (
                <button type="button" className={ghost} onClick={() => run(() => apiRequest(`subjects/${subject.id}/`, { method: "PATCH", body: { name: names[subject.id] } }), "Subject renamed.")}>Save name</button>
              )}
              <button type="button" className={ghost} onClick={() => run(() => apiRequest(`subjects/${subject.id}/`, { method: "PATCH", body: { is_active: !subject.is_active } }), subject.is_active ? `${subject.name} retired.` : `${subject.name} restored.`)}>
                {subject.is_active ? "Retire" : "Restore"}
              </button>
              <select aria-label={`Merge ${subject.name} into`} value={mergeInto[subject.id] || ""} onChange={(e) => setMergeInto({ ...mergeInto, [subject.id]: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                <option value="">Merge into…</option>
                {subjects.filter((other) => other.id !== subject.id).map((other) => <option key={other.id} value={other.id}>{other.name}</option>)}
              </select>
              {mergeInto[subject.id] && (
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  onClick={() => {
                    const target = subjects.find((other) => String(other.id) === mergeInto[subject.id]);
                    if (window.confirm(`Move every teacher, class and resource from “${subject.name}” to “${target.name}”, then delete “${subject.name}”?`)) {
                      run(() => apiRequest(`subjects/${subject.id}/merge/`, { method: "POST", body: { into_id: target.id } }), `${subject.name} merged into ${target.name}.`);
                    }
                  }}
                >
                  Merge
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function TermsSection({ run, version }) {
  const [terms, setTerms] = useState([]);
  const [drafts, setDrafts] = useState({});
  useEffect(() => {
    apiRequest("terms/").then((list) => {
      setTerms(list);
      setDrafts(Object.fromEntries(list.map((term) => [term.id, term])));
    }).catch(() => {});
  }, [version]);
  const changed = (term) => JSON.stringify(drafts[term.id]) !== JSON.stringify(term);
  return (
    <Section title="Terms" description="Term dates used when creating classes.">
      <ul className="divide-y divide-slate-100">
        {terms.map((term) => (
          <li key={term.id} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center">
            <input aria-label="Term name" value={drafts[term.id]?.name || ""} onChange={(e) => setDrafts({ ...drafts, [term.id]: { ...drafts[term.id], name: e.target.value } })} className={`${inputClassName} lg:w-48`} />
            <input aria-label="Starts" type="date" value={drafts[term.id]?.starts_on || ""} onChange={(e) => setDrafts({ ...drafts, [term.id]: { ...drafts[term.id], starts_on: e.target.value } })} className={`${inputClassName} lg:w-44`} />
            <input aria-label="Ends" type="date" value={drafts[term.id]?.ends_on || ""} onChange={(e) => setDrafts({ ...drafts, [term.id]: { ...drafts[term.id], ends_on: e.target.value } })} className={`${inputClassName} lg:w-44`} />
            {changed(term) && (
              <button type="button" className={ghost} onClick={() => run(() => apiRequest(`terms/${term.id}/`, { method: "PATCH", body: drafts[term.id] }), "Term saved.")}>Save</button>
            )}
          </li>
        ))}
        {terms.length === 0 && <p className="text-sm text-slate-500">Terms are created from the class wizard.</p>}
      </ul>
    </Section>
  );
}

export default function SettingsPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [version, setVersion] = useState(0);

  // Shared runner: shows the outcome and refreshes every section.
  const run = useCallback(async (request, message) => {
    setError("");
    setNotice("");
    setIsBusy(true);
    try {
      await request();
      setNotice(message);
      setVersion((value) => value + 1);
      return true;
    } catch (requestError) {
      setError(requestError.message || "That didn't save.");
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Settings" description="School details, programs, subjects and terms." actionSlot={isBusy ? <Loader2 size={18} className="animate-spin text-slate-400" /> : null} />
      <div className="sticky top-16 z-20 empty:hidden">
        {error && <InlineAlert>{error}</InlineAlert>}
        {notice && <InlineAlert tone="success">{notice}</InlineAlert>}
      </div>
      <div className="space-y-6">
        <OrganizationSection run={run} />
        <ProgramsSection run={run} version={version} />
        <SubjectsSection run={run} version={version} />
        <TermsSection run={run} version={version} />
      </div>
    </div>
  );
}
