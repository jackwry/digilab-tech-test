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

/** This jsdom setup doesn't expose `localStorage` (opaque `about:blank`
 * origin); the persist-workflow feature needs it, so back it with a plain
 * in-memory map for tests. */
class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

if (!("localStorage" in globalThis) || !globalThis.localStorage) {
  globalThis.localStorage = new LocalStorageMock();
}
