import { useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";

// Public classes and resources for the landing page.
export default function useCatalog() {
  const [catalog, setCatalog] = useState({ classes: [], resources: [], isLoading: true, error: "" });

  useEffect(() => {
    let isMounted = true;
    apiRequest("public/catalog/")
      .then((data) => {
        if (isMounted) {
          setCatalog({ classes: data.classes || [], resources: data.resources || [], isLoading: false, error: "" });
        }
      })
      .catch(() => {
        if (isMounted) {
          setCatalog({ classes: [], resources: [], isLoading: false, error: "Classes could not be loaded right now." });
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return catalog;
}
