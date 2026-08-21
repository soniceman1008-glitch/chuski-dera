import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getAdminCatalog, saveSettings } from "@/lib/server/catalog";
import { notifyCatalogChanged } from "@/lib/catalog-sync";
import { useCatalog } from "@/lib/catalog-store";
import type { RestaurantSettings } from "@/lib/types";

export const Route = createFileRoute("/admin/settings")({ component: SettingsAdmin });

function SettingsAdmin() {
  const { reload } = useCatalog();
  const [form, setForm] = useState<RestaurantSettings | null>(null);
  const [error, setFormError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getAdminCatalog()
      .then((data) => setForm(data.settings))
      .catch((e: Error) => setFormError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setFormError("");
    try {
      await saveSettings({ data: form });
      notifyCatalogChanged();
      reload();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (!form) return <p className="text-sm text-muted">Loading settings…</p>;

  function field(key: keyof RestaurantSettings, label: string) {
    return (
      <label className="block">
        <span className="text-xs text-muted">{label}</span>
        <input
          value={String(form?.[key] ?? "")}
          onChange={(e) => setForm((s) => (s ? { ...s, [key]: e.target.value } : s))}
          className="mt-1 h-11 w-full rounded-md bg-surface px-3 text-sm ring-1 ring-border"
        />
      </label>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">Settings</h1>
      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
      <form onSubmit={onSubmit} className="mt-6 grid max-w-xl gap-3">
        {field("name", "Restaurant name")}
        {field("tagline", "Tagline")}
        {field("address", "Address")}
        {field("city", "City")}
        {field("hours", "Hours")}
        {field("callDisplay", "Call display")}
        {field("callTel", "Call tel (e.g. +923139235654)")}
        {field("waDisplay", "WhatsApp display")}
        {field("waTel", "WhatsApp tel")}
        {field("mapsQuery", "Maps query")}
        <button type="submit" className="mt-2 h-11 rounded-md bg-primary text-sm font-semibold text-primary-fg">
          {saved ? "Saved" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
