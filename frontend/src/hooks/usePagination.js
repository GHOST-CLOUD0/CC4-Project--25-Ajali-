// frontend/src/hooks/usePagination.js
import { useCallback, useState } from "react";

const DEFAULT_META = {
  page: 1,
  per_page: 20,
  total: 0,
  pages: 1,
  has_next: false,
  has_previous: false,
};

/**
 * usePagination
 * -------------
 * Page/per_page state for the paginated incident list. Consumes the
 * `meta` object returned by the backend
 * ({ page, per_page, total, pages, has_next, has_previous }) so callers
 * can drive `useIncidents({ page, perPage })` from it.
 *
 * Usage:
 *   const { page, perPage, meta, hasNext, previousPage, nextPage } =
 *     usePagination({ meta: pagination });
 */
const usePagination = ({ initialPage = 1, initialPerPage = 20, meta = null } = {}) => {
  const [page, setPageState] = useState(initialPage);
  const [perPage, setPerPageState] = useState(initialPerPage);

  // Without server metadata we still expose sensible defaults.
  const effectiveMeta = meta ?? { ...DEFAULT_META, page, per_page: perPage };
  const totalPages =
    effectiveMeta.pages != null ? Math.max(effectiveMeta.pages, 1) : null;
  // Flags are derived from the hook's own page so state stays coherent —
  // with server metadata present they double as navigation guards.
  const hasNext =
    totalPages != null ? page < totalPages : Boolean(effectiveMeta.has_next);
  const hasPrevious =
    totalPages != null ? page > 1 : Boolean(effectiveMeta.has_previous);

  /**
   * Sets the page. Accepts a number or an updater function. When server
   * metadata is available the value is clamped to the valid range.
   */
  const setPage = useCallback(
    (next) => {
      setPageState((current) => {
        const target = typeof next === "function" ? next(current) : next;
        const value = Math.max(Math.trunc(Number(target) || 1), 1);
        return totalPages != null ? Math.min(value, totalPages) : value;
      });
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    if (hasNext) setPage(page + 1);
  }, [hasNext, page, setPage]);

  const previousPage = useCallback(() => {
    if (hasPrevious) setPage(page - 1);
  }, [hasPrevious, page, setPage]);

  /** Changes the page size and jumps back to the first page. */
  const setPerPage = useCallback((next) => {
    setPageState(1);
    setPerPageState(Math.max(Math.trunc(Number(next) || 1), 1));
  }, []);

  const reset = useCallback(() => {
    setPageState(initialPage);
    setPerPageState(initialPerPage);
  }, [initialPage, initialPerPage]);

  return {
    page,
    perPage,
    meta: effectiveMeta,
    totalPages,
    total: effectiveMeta.total ?? 0,
    hasNext,
    hasPrevious,
    setPage,
    nextPage,
    previousPage,
    setPerPage,
    reset,
  };
};

export default usePagination;
