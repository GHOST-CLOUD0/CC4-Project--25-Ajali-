// frontend/src/hooks/useDebounce.js
import { useEffect, useState } from "react";

/**
 * useDebounce
 * -----------
 * Returns a copy of `value` that only updates after `delay` ms of
 * inactivity. Use it to throttle search inputs before they hit the
 * paginated incidents endpoint.
 *
 * Usage:
 *   const [search, setSearch] = useState("");
 *   const debouncedSearch = useDebounce(search, 400);
 *   useEffect(() => fetchIncidents({ search: debouncedSearch }), [debouncedSearch]);
 */
const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
