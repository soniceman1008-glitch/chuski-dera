export type CatalogSyncMsg = "catalog" | "orders";

const CHANNEL = "chuski-catalog";
const STORAGE_KEY = "chuski-catalog-version";

export function notifyCatalogChanged() {
  notify("catalog");
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function notifyOrdersChanged() {
  notify("orders");
}

function notify(msg: CatalogSyncMsg) {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(msg);
    ch.close();
  } catch {
    /* unsupported */
  }
}

export function subscribeCatalogSync(fn: (msg: CatalogSyncMsg) => void) {
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (event) => {
      if (event.data === "catalog" || event.data === "orders") fn(event.data);
    };
  } catch {
    ch = null;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) fn("catalog");
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    try {
      ch?.close();
    } catch {
      /* */
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
