import "@testing-library/jest-dom";

/** jsdom has no ResizeObserver; ReactFlow needs one to measure node dimensions. */
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
}
