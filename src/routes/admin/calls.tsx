import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getVoiceDashboard } from "@/lib/server/voice-calls";

export const Route = createFileRoute("/admin/calls")({ component: CallsAdmin });

type Dash = Awaited<ReturnType<typeof getVoiceDashboard>>;

function CallsAdmin() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void getVoiceDashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!data && !error) return <p className="text-sm text-muted">Loading call logs…</p>;

  const st = data?.status;

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">Voice calls</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Customer still dials <span className="text-fg">+923139235654</span>. After Twilio is connected, the AI
        receptionist answers, takes the order, and saves it here.
      </p>
      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
      {st && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-surface p-4 ring-1 ring-border">
            <p className="text-xs text-muted">Agent status</p>
            <p className="mt-1 text-lg font-semibold">{st.configured ? "Ready" : "Waiting for Twilio"}</p>
          </div>
          <div className="rounded-lg bg-surface p-4 ring-1 ring-border">
            <p className="text-xs text-muted">Public call number</p>
            <p className="mt-1 text-lg font-semibold">{st.publicCallNumber}</p>
          </div>
          <div className="rounded-lg bg-surface p-4 ring-1 ring-border">
            <p className="text-xs text-muted">Staff transfer</p>
            <p className="mt-1 text-lg font-semibold">{st.staffForwardNumber}</p>
          </div>
        </div>
      )}
      {!st?.configured && (
        <p className="mt-4 rounded-lg bg-elevated px-4 py-3 text-sm text-muted">
          Add Twilio keys in Vercel env (see VOICE.md). Website Call button stays tel:+923139235654.
        </p>
      )}
      <ul className="mt-8 grid gap-3">
        {(data?.calls ?? []).map((call) => (
          <li key={call.id} className="rounded-lg bg-surface p-4 ring-1 ring-border">
            <button type="button" className="w-full text-left" onClick={() => setOpenId(openId === call.id ? null : call.id)}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{call.name || call.fromNumber || "Unknown caller"}</p>
                <p className="text-xs text-muted">{call.status}</p>
              </div>
              <p className="mt-1 text-sm text-muted">
                {call.phone || call.fromNumber} · {new Date(call.startedAt).toLocaleString("en-PK")}
                {call.orderId ? ` · order #${call.orderId}` : ""}
              </p>
            </button>
            {openId === call.id && (
              <div className="mt-3 border-t border-border pt-3 text-sm">
                <p className="text-muted">{call.address}</p>
                {call.notes ? <p className="mt-1 text-muted">Note: {call.notes}</p> : null}
                <p className="mt-2 text-muted">Cart: {call.cart}</p>
                <ol className="mt-3 space-y-2">
                  {call.turns.map((t, i) => (
                    <li key={`${call.id}-${i}`}>
                      <span className="text-xs uppercase text-subtle">{t.role}</span>
                      <p>{t.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </li>
        ))}
      </ul>
      {data && data.calls.length === 0 && <p className="mt-8 text-sm text-muted">No calls yet.</p>}
    </div>
  );
}
