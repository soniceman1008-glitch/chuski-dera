import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { deleteFileMenuItem as deleteMenuItem, getFileAdminCatalog as getAdminCatalog, saveFileMenuItem as saveMenuItem } from "@/lib/server/file-catalog";
import { formatRs } from "@/lib/menu";
import { notifyCatalogChanged } from "@/lib/catalog-sync";
import { useCatalog } from "@/lib/catalog-store";
import type { CatalogCategory, CatalogItem } from "@/lib/types";

export const Route = createFileRoute("/admin/menu")({ component: MenuAdmin });

function MenuAdmin() {
  const { reload } = useCatalog();
  const [cats, setCats] = useState<CatalogCategory[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Partial<CatalogItem> | null>(null);

  async function load() {
    const data = await getAdminCatalog();
    setCats(data.categories);
    setItems(data.items);
  }
  function afterChange() {
    notifyCatalogChanged();
    reload();
  }
  useEffect(() => {
    void load().catch((e: Error) => setError(e.message));
  }, []);

  async function onSaveItem(e: FormEvent) {
    e.preventDefault();
    if (!editing?.name || editing.price == null || !editing.category) return;
    setError("");
    try {
      await saveMenuItem({
        data: {
          id: editing.id,
          name: editing.name,
          blurb: editing.blurb ?? "",
          price: Number(editing.price),
          category: editing.category,
          image: editing.image ?? "",
          featured: Boolean(editing.featured),
          promo: Boolean(editing.promo),
          available: editing.available !== false,
        },
      });
      setEditing(null);
      afterChange();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl tracking-wide">Menu</h1>
        <button type="button" className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg" onClick={() => setEditing({ name: "", blurb: "", price: 0, category: cats[0]?.id ?? "", image: "", available: true })}>
          Add item
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
      {editing && (
        <form onSubmit={onSaveItem} className="mt-8 grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-2">
          <input required value={editing.name ?? ""} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} placeholder="Name" className="h-11 rounded-md bg-elevated px-3 text-sm ring-1 ring-border" />
          <input required type="number" min={0} value={editing.price ?? 0} onChange={(e) => setEditing((s) => ({ ...s, price: Number(e.target.value) }))} className="h-11 rounded-md bg-elevated px-3 text-sm ring-1 ring-border" />
          <input value={editing.blurb ?? ""} onChange={(e) => setEditing((s) => ({ ...s, blurb: e.target.value }))} placeholder="Description" className="h-11 rounded-md bg-elevated px-3 text-sm ring-1 ring-border sm:col-span-2" />
          <select required value={editing.category ?? ""} onChange={(e) => setEditing((s) => ({ ...s, category: e.target.value }))} className="h-11 rounded-md bg-elevated px-3 text-sm ring-1 ring-border">
            {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.available !== false} onChange={(e) => setEditing((s) => ({ ...s, available: e.target.checked }))} /> Available</label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg">Save item</button>
            <button type="button" className="h-11 rounded-md px-4 text-sm ring-1 ring-border" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="mt-8 overflow-x-auto rounded-xl bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted uppercase"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Available</th><th className="px-4 py-3"></th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">{item.name}<span className="block text-xs text-muted">{item.category}</span></td>
                <td className="px-4 py-3">{formatRs(item.price)}</td>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={item.available} onChange={(e) => {
                    void saveMenuItem({ data: { ...item, available: e.target.checked } }).then(() => { afterChange(); return load(); }).catch((err: Error) => setError(err.message));
                  }} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-sm text-primary" onClick={() => setEditing(item)}>Edit</button>
                  <button type="button" className="ml-3 text-sm text-muted" onClick={() => {
                    void deleteMenuItem({ data: { id: item.id } }).then(() => { afterChange(); return load(); }).catch((err: Error) => setError(err.message));
                  }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
