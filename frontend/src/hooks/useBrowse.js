import { useEffect, useState } from "react";
import { PAGE_SIZE } from "../constants";

/**
 * Debounced, paginated, abortable listing. `fetchPage({ page, pageSize,
 * ...filters }, { signal })` must return an axios promise of a page
 * ({ items, total, total_pages }).
 *
 * `input` mirrors the filter controls as the user types/selects; `filters`
 * is the debounced value actually sent to the API.
 */
export default function useBrowse(fetchPage, emptyFilters) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Same reference when nothing changed: React bails out, no extra fetch.
      setFilters(input);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchPage({ page, pageSize: PAGE_SIZE, ...filters }, { signal: controller.signal })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.code === "ERR_CANCELED") return; // superseded by a newer request
        setError("Impossible de charger les resultats pour le moment.");
        setLoading(false);
      });
    return () => controller.abort();
    // fetchPage is a module-level API function: stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const setField = (field) => (e) => setInput((i) => ({ ...i, [field]: e.target.value }));
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const clearFilters = () => setInput(emptyFilters);

  return { data, page, setPage, loading, error, input, setField, hasActiveFilters, clearFilters };
}
