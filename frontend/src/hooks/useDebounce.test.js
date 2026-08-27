import { act, renderHook } from "@testing-library/react";

import useDebounce from "./useDebounce";

test("returns the initial value immediately", () => {
  const { result } = renderHook(() => useDebounce("hello", 300));
  expect(result.current).toBe("hello");
});

test("keeps the old value until the delay elapses", () => {
  jest.useFakeTimers();
  try {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "first" } },
    );

    rerender({ value: "second" });
    expect(result.current).toBe("first");

    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe("first");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("second");
  } finally {
    jest.useRealTimers();
  }
});

test("only applies the latest value after rapid changes", () => {
  jest.useFakeTimers();
  try {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "" },
    });

    rerender({ value: "a" });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    rerender({ value: "ab" });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    rerender({ value: "abc" });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe("abc");
  } finally {
    jest.useRealTimers();
  }
});
