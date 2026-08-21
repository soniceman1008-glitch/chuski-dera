export type CatalogSyncMsg = "catalog" | "orders";

const CHANNEL = "chuski-catalog";

export function notifyCatalogChanged() {
  notify("catalog");
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
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (event) => {
      if (event.data === "catalog" || event.data === "orders") fn(event.data);
    };
    return () => ch.close();
  } catch {
    return () => {};
  }
}
