import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Modal from "../common/Modal.jsx";

export function SignInPrompt({ resource, onClose, onRequestAccess }) {
  const returnState = { from: { pathname: "/", search: `?resource=${resource.id}` } };
  return (
    <Modal isOpen onClose={onClose} title="Sign in to open this resource" description={resource.title}>
      <div className="space-y-5 px-6 py-5">
        <p className="text-sm text-slate-600">Resources open from your student account. Sign in, or create one in a minute.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/login" state={returnState} className="rounded-full border-2 border-shuleni-navy px-4 py-2.5 text-center text-sm font-bold text-shuleni-navy hover:bg-shuleni-navy hover:text-white">
            Sign in
          </Link>
          <Link to="/signup" state={returnState} className="rounded-full bg-shuleni-red px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-[#cf3330]">
            Create account
          </Link>
        </div>
        <button type="button" onClick={onRequestAccess} className="w-full text-center text-sm font-semibold text-shuleni-teal hover:underline">
          Or request access without an account
        </button>
      </div>
    </Modal>
  );
}

export function ResourceLinkModal({ resource, url, onClose }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={resource.title}
      description={[resource.resource_type_label, resource.subject].filter(Boolean).join(" · ")}
    >
      <div className="px-6 py-5">
        {resource.description && <p className="mb-5 text-sm text-slate-600">{resource.description}</p>}
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-shuleni-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-shuleni-ink">
            Open resource <ArrowRight size={16} aria-hidden="true" />
          </a>
        ) : (
          <p className="text-sm text-slate-600">The link for this resource hasn't been added yet. Please check back soon.</p>
        )}
      </div>
    </Modal>
  );
}
