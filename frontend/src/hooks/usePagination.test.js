import { act, renderHook } from "@testing-library/react";

import usePagination from "./usePagination";

const META = {
  page: 2,
  per_page: 10,
  total: 35,
  pages: 4,
  has_next: true,
  has_previous: true,
};

test("defaults to page 1 with a 20 item page size", () => {
  const { result } = renderHook(() => usePagination());
  expect(result.current.page).toBe(1);
  expect(result.current.perPage).toBe(20);
  expect(result.current.hasNext).toBe(false);
  expect(result.current.hasPrevious).toBe(false);
});

test("exposes navigation flags from the server meta", () => {
  const { result } = renderHook(() =>
    usePagination({ initialPage: 2, meta: META }),
  );
  expect(result.current.page).toBe(2);
  expect(result.current.totalPages).toBe(4);
  expect(result.current.total).toBe(35);
  expect(result.current.hasNext).toBe(true);
  expect(result.current.hasPrevious).toBe(true);
});

test("nextPage and previousPage respect the meta boundaries", () => {
  const { result } = renderHook(() =>
    usePagination({ initialPage: 2, meta: META }),
  );

  act(() => result.current.nextPage());
  expect(result.current.page).toBe(3);

  act(() => result.current.previousPage());
  act(() => result.current.previousPage());
  expect(result.current.page).toBe(1);
  expect(result.current.hasPrevious).toBe(false);

  act(() => result.current.previousPage());
  expect(result.current.page).toBe(1);
});

test("setPage clamps out-of-range values when meta is known", () => {
  const { result } = renderHook(() =>
    usePagination({ initialPage: 2, meta: META }),
  );

  act(() => result.current.setPage(99));
  expect(result.current.page).toBe(4);

  act(() => result.current.setPage(-3));
  expect(result.current.page).toBe(1);
});

test("setPage accepts an updater function", () => {
  const { result } = renderHook(() =>
    usePagination({ initialPage: 2, meta: META }),
  );
  act(() => result.current.setPage((current) => current + 2));
  expect(result.current.page).toBe(4);
});

test("changing perPage resets to the first page", () => {
  const { result } = renderHook(() =>
    usePagination({ initialPage: 2, meta: META }),
  );

  act(() => result.current.setPerPage(50));
  expect(result.current.page).toBe(1);
  expect(result.current.perPage).toBe(50);
});

test("reset restores the initial page and page size", () => {
  const { result } = renderHook(() =>
    usePagination({ initialPage: 3, initialPerPage: 5 }),
  );

  act(() => {
    result.current.setPage(1);
    result.current.setPerPage(100);
  });
  act(() => result.current.reset());

  expect(result.current.page).toBe(3);
  expect(result.current.perPage).toBe(5);
});
