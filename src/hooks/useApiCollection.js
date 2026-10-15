import { useCallback, useEffect, useState } from "react";
import { apiRequest, resultList } from "../api/client.js";

export default function useApiCollection(path) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const payload = await apiRequest(path);
      setItems(resultList(payload));
    } catch (requestError) {
      setError(requestError.message || "Could not load data.");
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, isLoading, error, reload };
}
