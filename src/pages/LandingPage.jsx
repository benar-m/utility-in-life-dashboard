import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { resourceAccess } from "../api/client.js";
import Classes from "../components/landing/Classes.jsx";
import CtaBar from "../components/landing/CtaBar.jsx";
import EnrollCta from "../components/landing/EnrollCta.jsx";
import Footer from "../components/landing/Footer.jsx";
import Header from "../components/landing/Header.jsx";
import Hero from "../components/landing/Hero.jsx";
import HowItWorks from "../components/landing/HowItWorks.jsx";
import Offer from "../components/landing/Offer.jsx";
import ProgramBanner from "../components/landing/ProgramBanner.jsx";
import RequestModal from "../components/landing/RequestModal.jsx";
import { ResourceLinkModal, SignInPrompt } from "../components/landing/ResourceModals.jsx";
import Resources from "../components/landing/Resources.jsx";
import WhyUs from "../components/landing/WhyUs.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useCatalog from "../hooks/useCatalog.js";

// Public marketing and sign-up page. Sections only display; every multi-step
// interaction happens in a dialog, and only one dialog is open at a time.
export default function LandingPage() {
  const { currentUser, isCheckingSession } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const catalog = useCatalog();
  const [dialog, setDialog] = useState(null);
  const close = useCallback(() => setDialog(null), []);

  const requestClass = (item) => setDialog({ type: "request", request: { service: "CLASS", item } });
  const askAboutTrips = () => setDialog({ type: "request", request: { service: "EVENT" } });

  const openResource = useCallback(
    async (resource) => {
      if (!currentUser) {
        setDialog({ type: "sign-in", resource });
        return;
      }
      try {
        const access = await resourceAccess(resource.id);
        setDialog({ type: "resource", resource, url: access.download_url });
      } catch (error) {
        setDialog({ type: "request", request: { service: "RESOURCE", item: resource, notice: error.message } });
      }
    },
    [currentUser]
  );

  // Back from sign-in with ?resource=<id>: open the resource they asked for.
  useEffect(() => {
    const resourceId = Number(searchParams.get("resource"));
    if (!resourceId || isCheckingSession || catalog.isLoading) return;
    setSearchParams({}, { replace: true });
    const resource = catalog.resources.find((item) => item.id === resourceId);
    if (resource && currentUser) openResource(resource);
  }, [catalog, currentUser, isCheckingSession, openResource, searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <ProgramBanner />
      <Header />
      <main>
        <Hero />
        <Classes catalog={catalog} onRequestClass={requestClass} />
        <CtaBar />
        <Offer />
        <HowItWorks />
        <WhyUs />
        <Resources catalog={catalog} onOpen={openResource} />
        <EnrollCta onAskAboutTrips={askAboutTrips} />
      </main>
      <Footer />

      {dialog?.type === "request" && <RequestModal request={dialog.request} onClose={close} />}
      {dialog?.type === "sign-in" && (
        <SignInPrompt
          resource={dialog.resource}
          onClose={close}
          onRequestAccess={() => setDialog({ type: "request", request: { service: "RESOURCE", item: dialog.resource } })}
        />
      )}
      {dialog?.type === "resource" && <ResourceLinkModal resource={dialog.resource} url={dialog.url} onClose={close} />}
    </div>
  );
}
