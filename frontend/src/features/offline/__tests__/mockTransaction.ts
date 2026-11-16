// Request mocks must emit transaction completion/abort separately from request success.
export function mockTransaction(store: {data: Map<string, unknown>; [key: string]: any}) {
  let pending = 0;
  let aborted = false;
  const original = new Map(store.data);
  const tx: any = {
    abort() {
      aborted = true;
      store.data.clear();
      original.forEach((value, key) => store.data.set(key, value));
      Promise.resolve().then(() => tx.onabort?.());
    },
  };
  const wrap = (request: any) => {
    pending++;
    let success: any;
    Object.defineProperty(request, "onsuccess", {
      set(callback) { success = callback; },
      get() { return (event: unknown) => {
        if (aborted) return;
        success?.(event);
        pending--;
        Promise.resolve().then(() => { if (!aborted && pending === 0) tx.oncomplete?.(); });
      }; },
    });
    return request;
  };
  tx.objectStore = () => ({
    get: (key: string) => wrap(store.get(key)),
    put: (value: unknown) => wrap(store.put(value)),
    add: (value: unknown) => wrap(store.put(value)),
    delete: (key: string) => wrap(store.delete(key)),
    index: (name: string) => ({getAll: (key: string) => wrap(store.index(name).getAll(key))}),
  });
  return tx;
}
