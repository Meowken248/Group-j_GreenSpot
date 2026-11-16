import { openOfflineDatabase, isQuotaError } from "./offlineDb";

/** Resolve only after IndexedDB commits; a successful request can still abort. */
export async function writeOffline<T>(
  storeName: string,
  run: (store: IDBObjectStore, done: (value: T) => void, fail: (error: Error) => void) => void,
): Promise<T> {
  const db = await openOfflineDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    let value: T;
    let failure: Error | null = null;
    tx.oncomplete = () => resolve(value);
    tx.onabort = tx.onerror = () => reject(failure || (isQuotaError(tx.error)
      ? new Error("Dung lượng bộ nhớ thiết bị đã đầy. Dữ liệu chưa được lưu.")
      : tx.error || new Error("Không thể lưu dữ liệu. Vui lòng thử lại.")));
    const fail = (error: Error) => {
      failure = error;
      tx.abort();
    };
    try { run(tx.objectStore(storeName), result => { value = result; }, fail); }
    catch (error) { fail(error instanceof Error ? error : new Error("Không thể lưu dữ liệu.")); }
  });
}
