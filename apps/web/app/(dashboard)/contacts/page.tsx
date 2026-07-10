"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Users, Search, Plus, Filter, Download, Upload, X, Check,
  ChevronDown, MoreHorizontal, Mail, Phone, Tag, Trash2,
  UserPlus, MessageSquare, Calendar, FileText, ArrowUpDown,
  Columns, Save, AlertCircle, Loader2, Eye, Edit3,
  Star, StarOff, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchContacts, fetchContact, createContact, updateContact, deleteContact, assignContact,
  getStatusBadge, type Contact, type ContactsResponse,
} from "@/lib/contacts";

// ─── Status options ───
const STATUS_OPTIONS = ["LEAD", "PROSPECT", "CUSTOMER", "CHURNED"] as const;
const SOURCE_OPTIONS = ["Website", "Referral", "Social Media", "Email", "Phone", "Event", "Other"] as const;

// ─── Column definitions ───
interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  width: number;
  render: (contact: Contact) => ReactNode;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", visible: true, sortable: true, width: 200, render: (c) => (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-nexus-accent-primary/20 flex items-center justify-center text-xs font-medium text-nexus-accent-primary shrink-0">
        {c.firstName[0]}{c.lastName?.[0] || ""}
      </div>
      <div>
        <p className="text-sm font-medium text-nexus-text-primary">{c.firstName} {c.lastName}</p>
        {c.email && <p className="text-xs text-nexus-text-muted">{c.email}</p>}
      </div>
    </div>
  )},
  { key: "status", label: "Status", visible: true, sortable: true, width: 110, render: (c) => (
    <span className={`nexus-badge ${getStatusBadge(c.status)}`}>{c.status}</span>
  )},
  { key: "phone", label: "Phone", visible: true, sortable: false, width: 130, render: (c) => (
    <span className="text-sm text-nexus-text-secondary">{c.phone || "—"}</span>
  )},
  { key: "email", label: "Email", visible: true, sortable: false, width: 200, render: (c) => (
    <span className="text-sm text-nexus-text-secondary truncate block max-w-[180px]">{c.email || "—"}</span>
  )},
  { key: "tags", label: "Tags", visible: true, sortable: false, width: 160, render: (c) => (
    <div className="flex gap-1 flex-wrap">
      {c.tags.slice(0, 3).map((t) => (
        <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-nexus-surface-hover text-nexus-text-muted">{t}</span>
      ))}
      {c.tags.length > 3 && <span className="text-xs text-nexus-text-muted">+{c.tags.length - 3}</span>}
    </div>
  )},
  { key: "score", label: "Score", visible: true, sortable: true, width: 80, render: (c) => (
    <span className={cn("text-sm font-mono", c.score >= 70 ? "text-nexus-success" : c.score >= 40 ? "text-nexus-warning" : "text-nexus-text-muted")}>
      {c.score}
    </span>
  )},
  { key: "source", label: "Source", visible: false, sortable: true, width: 100, render: (c) => (
    <span className="text-sm text-nexus-text-secondary">{c.source || "—"}</span>
  )},
  { key: "assignedTo", label: "Assigned To", visible: false, sortable: false, width: 140, render: (c) => (
    <span className="text-sm text-nexus-text-secondary">{c.assignedTo?.name || "Unassigned"}</span>
  )},
  { key: "createdAt", label: "Created", visible: false, sortable: true, width: 120, render: (c) => (
    <span className="text-sm text-nexus-text-muted font-mono text-xs">
      {new Date(c.createdAt).toLocaleDateString()}
    </span>
  )},
];

// ─── Contacts Page ───
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Columns
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Detail drawer
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{id: string; key: string} | null>(null);
  const [editValue, setEditValue] = useState("");

  // Saved filters
  const [savedFilters, setSavedFilters] = useState<{name: string; params: Record<string, string>}[]>([]);
  const [activeSavedFilter, setActiveSavedFilter] = useState<string | null>(null);

  // Fetch contacts
  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit) };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (tagFilter) params.tags = tagFilter;

      const data = await fetchContacts(params);
      setContacts(data.contacts);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tagFilter]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // Selection
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) { setSelected(new Set()); setSelectAll(false); }
    else { setSelected(new Set(contacts.map((c) => c.id))); setSelectAll(true); }
  };

  // Inline edit save
  const saveInlineEdit = async (contactId: string, key: string, value: string) => {
    try {
      await updateContact(contactId, { [key]: value });
      setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, [key]: value } as Contact : c));
    } catch (err) {
      console.error("Failed to update:", err);
    }
    setEditingCell(null);
  };

  // Open detail drawer
  const openDrawer = async (contact: Contact) => {
    try {
      const data = await fetchContact(contact.id);
      setDrawerContact(data.contact);
    } catch {
      setDrawerContact(contact);
    }
    setDrawerOpen(true);
  };

  // Bulk actions
  const bulkDelete = async () => {
    for (const id of selected) await deleteContact(id).catch(() => {});
    setSelected(new Set());
    loadContacts();
  };

  const bulkTag = async (tag: string) => {
    for (const id of selected) {
      const contact = contacts.find((c) => c.id === id);
      if (contact && !contact.tags.includes(tag)) {
        await updateContact(id, { tags: [...contact.tags, tag] }).catch(() => {});
      }
    }
    setSelected(new Set());
    loadContacts();
  };

  // CSV Import
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0]!.split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));
      setCsvHeaders(headers);
      setCsvData(rows);
      // Auto-map headers
      const mapping: Record<string, string> = {};
      const fieldKeys = ["firstName", "lastName", "email", "phone", "source", "notes", "tags"];
      for (const h of headers) {
        const lower = h.toLowerCase();
        const match = fieldKeys.find((k) => lower.includes(k));
        if (match) mapping[h] = match;
      }
      setFieldMapping(mapping);
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    setImporting(true);
    let imported = 0;
    for (const row of csvData) {
      const data: Record<string, string> = {};
      for (const [header, field] of Object.entries(fieldMapping)) {
        const idx = csvHeaders.indexOf(header);
        if (idx !== -1 && row[idx]) data[field] = row[idx]!;
      }
      if (data.firstName) {
        try {
          await createContact(data as any);
          imported++;
        } catch {}
      }
    }
    setImporting(false);
    setShowImportModal(false);
    loadContacts();
  };

  // CSV Export
  const exportCsv = () => {
    const visibleCols = columns.filter((c) => c.visible && c.key !== "name");
    const headers = ["First Name", "Last Name", "Email", "Phone", "Status", "Score", "Source", "Tags", ...visibleCols.map((c) => c.label)];

    const rows = (selected.size > 0 ? contacts.filter((c) => selected.has(c.id)) : contacts).map((c) => [
      c.firstName, c.lastName || "", c.email || "", c.phone || "", c.status, String(c.score),
      c.source || "", c.tags.join("; "), ...visibleCols.map((col) => String((c as any)[col.key] ?? "")),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contacts-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-nexus-text-primary">Contacts</h1>
          <p className="text-nexus-text-secondary text-sm mt-1">{total} total contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImportModal(true)} className="nexus-btn-secondary"><Upload size={14} /> Import</button>
          <button onClick={exportCsv} className="nexus-btn-secondary"><Download size={14} /> Export</button>
          <button onClick={() => setShowAddModal(true)} className="nexus-btn-primary"><Plus size={14} /> Add Contact</button>
        </div>
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {savedFilters.map((f) => (
            <button
              key={f.name}
              onClick={() => { setActiveSavedFilter(f.name); setSearch(f.params.search || ""); setStatusFilter(f.params.status || ""); }}
              className={cn("text-xs px-3 py-1 rounded-full border transition-colors", activeSavedFilter === f.name ? "border-nexus-accent-primary bg-nexus-accent-primary/10 text-nexus-accent-primary" : "border-nexus-border text-nexus-text-muted hover:border-nexus-accent-primary/30")}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search contacts..."
            className="nexus-input pl-9 text-sm"
          />
        </div>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="nexus-input w-auto text-sm">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
          placeholder="Filter by tag..."
          className="nexus-input w-32 text-sm"
        />

        <button onClick={() => setShowFilterPanel(!showFilterPanel)} className="nexus-btn-ghost text-sm">
          <Filter size={14} /> Saved Filters
        </button>

        {/* Column Picker */}
        <div className="relative">
          <button onClick={() => setShowColumnPicker(!showColumnPicker)} className="nexus-btn-ghost text-sm">
            <Columns size={14} /> Columns
          </button>
          {showColumnPicker && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-nexus-surface border border-nexus-border rounded-lg shadow-lg z-50 p-2 animate-scale-in">
              {columns.map((col) => (
                <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-nexus-surface-hover cursor-pointer text-sm text-nexus-text-secondary">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => setColumns(columns.map((c) => c.key === col.key ? { ...c, visible: !c.visible } : c))}
                    className="rounded border-nexus-border bg-nexus-surface"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel (saved filter creator) */}
      {showFilterPanel && (
        <div className="nexus-card p-4 animate-slide-up">
          <p className="text-sm font-medium text-nexus-text-primary mb-2">Save Current Filter</p>
          <div className="flex gap-2">
            <input
              id="saved-filter-name"
              placeholder="Filter name..."
              className="nexus-input flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value) {
                  const name = (e.target as HTMLInputElement).value;
                  setSavedFilters((prev) => [...prev, { name, params: { search, status: statusFilter } }]);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
            <button className="nexus-btn-primary text-sm"><Save size={14} /> Save</button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="nexus-card p-3 flex items-center gap-3 animate-slide-up border-nexus-accent-primary/30">
          <span className="text-sm text-nexus-text-primary font-medium">{selected.size} selected</span>
          <div className="w-px h-4 bg-nexus-border" />
          <button onClick={bulkDelete} className="nexus-btn-ghost text-sm text-nexus-danger"><Trash2 size={14} /> Delete</button>
          <button onClick={() => { const t = prompt("Enter tag name:"); if (t) bulkTag(t); }} className="nexus-btn-ghost text-sm"><Tag size={14} /> Tag</button>
          <button onClick={() => alert("Assign flow coming")} className="nexus-btn-ghost text-sm"><UserPlus size={14} /> Assign</button>
          <button onClick={exportCsv} className="nexus-btn-ghost text-sm"><Download size={14} /> Export</button>
          <button onClick={() => setSelected(new Set())} className="nexus-btn-ghost text-sm ml-auto"><X size={14} /> Clear</button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="nexus-badge-danger w-full justify-center py-2 rounded-md text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="nexus-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-nexus-border">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={selectAll && selected.size === contacts.length} onChange={handleSelectAll} className="rounded border-nexus-border bg-nexus-surface" />
                </th>
                {columns.filter((c) => c.visible).map((col) => (
                  <th key={col.key} className="text-left text-xs font-semibold text-nexus-text-muted uppercase tracking-wider px-3 py-3" style={{ minWidth: col.width }}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <ArrowUpDown size={12} className="text-nexus-text-muted" />}
                    </div>
                  </th>
                ))}
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.filter((c) => c.visible).length + 2} className="p-12">
                  <div className="flex items-center justify-center gap-2 text-nexus-text-muted"><Loader2 size={16} className="animate-spin" /> Loading contacts...</div>
                </td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={columns.filter((c) => c.visible).length + 2} className="p-12">
                  <div className="text-center text-nexus-text-muted">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No contacts found</p>
                    <button onClick={() => setShowAddModal(true)} className="nexus-btn-primary mt-3 text-sm"><Plus size={14} /> Add your first contact</button>
                  </div>
                </td></tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className={cn(
                      "border-b border-nexus-border hover:bg-nexus-surface-hover/50 transition-colors cursor-pointer",
                      selected.has(contact.id) && "bg-nexus-accent-primary/5"
                    )}
                    onClick={() => openDrawer(contact)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="rounded border-nexus-border bg-nexus-surface"
                      />
                    </td>
                    {columns.filter((c) => c.visible).map((col) => (
                      <td key={col.key} className="px-3 py-2.5" style={{ minWidth: col.width }}
                        onDoubleClick={(e) => { if (col.key !== "name" && col.key !== "status") { e.stopPropagation(); setEditingCell({ id: contact.id, key: col.key }); setEditValue(String((contact as any)[col.key] ?? "")); }}}
                      >
                        {editingCell?.id === contact.id && editingCell?.key === col.key ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(contact.id, col.key, editValue); if (e.key === "Escape") setEditingCell(null); }}
                              className="nexus-input text-sm py-1 px-2 w-full"
                              onBlur={() => setEditingCell(null)}
                            />
                            <button onClick={() => saveInlineEdit(contact.id, col.key, editValue)} className="text-nexus-success"><Check size={14} /></button>
                          </div>
                        ) : col.render(contact)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button className="nexus-btn-ghost p-1 text-nexus-text-muted hover:text-nexus-text-primary">
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-nexus-border">
            <span className="text-sm text-nexus-text-muted">Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="nexus-btn-ghost text-sm px-2 disabled:opacity-30">Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (p > totalPages) return null;
                return <button key={p} onClick={() => setPage(p)} className={cn("nexus-btn-ghost text-sm px-2", p === page && "text-nexus-accent-primary bg-nexus-accent-primary/10")}>{p}</button>;
              })}
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="nexus-btn-ghost text-sm px-2 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── ADD CONTACT MODAL ─── */}
      {showAddModal && <AddContactModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); loadContacts(); }} />}

      {/* ─── IMPORT MODAL ─── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)}>
          <div className="bg-nexus-surface border border-nexus-border rounded-xl p-6 w-full max-w-lg mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-nexus-text-primary">Import Contacts</h2>
              <button onClick={() => setShowImportModal(false)} className="nexus-btn-ghost p-1"><X size={16} /></button>
            </div>

            {csvHeaders.length === 0 ? (
              <div className="border-2 border-dashed border-nexus-border rounded-lg p-8 text-center hover:border-nexus-accent-primary/30 transition-colors">
                <Upload size={32} className="mx-auto mb-2 text-nexus-text-muted" />
                <p className="text-sm text-nexus-text-secondary mb-2">Upload a CSV file</p>
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="text-sm text-nexus-text-muted file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-nexus-accent-primary/10 file:text-nexus-accent-primary file:text-sm" />
              </div>
            ) : (
              <div>
                <p className="text-sm text-nexus-text-secondary mb-3">Map CSV columns to contact fields:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {csvHeaders.map((header) => (
                    <div key={header} className="flex items-center gap-2">
                      <span className="text-sm text-nexus-text-primary w-32 truncate">{header}</span>
                      <ArrowUpDown size={12} className="text-nexus-text-muted shrink-0" />
                      <select value={fieldMapping[header] || ""} onChange={(e) => setFieldMapping({ ...fieldMapping, [header]: e.target.value })} className="nexus-input text-sm flex-1">
                        <option value="">Skip</option>
                        <option value="firstName">First Name</option>
                        <option value="lastName">Last Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="source">Source</option>
                        <option value="notes">Notes</option>
                        <option value="tags">Tags</option>
                        <option value="status">Status</option>
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-nexus-text-muted mt-2">{csvData.length} rows detected</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setCsvHeaders([]); setCsvData([]); }} className="nexus-btn-secondary text-sm flex-1">Back</button>
                  <button onClick={runImport} disabled={importing} className="nexus-btn-primary text-sm flex-1">
                    {importing ? <Loader2 size={14} className="animate-spin" /> : null}
                    {importing ? "Importing..." : `Import ${csvData.length} contacts`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CONTACT DETAIL DRAWER ─── */}
      {drawerOpen && drawerContact && <ContactDetailDrawer contact={drawerContact} onClose={() => { setDrawerOpen(false); setDrawerContact(null); }} onRefresh={loadContacts} />}
    </div>
  );
}

// ─── Add Contact Modal ───
function AddContactModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", status: "LEAD" as string, source: "", notes: "", tags: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) return;
    setSaving(true);
    try {
      await createContact({
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        status: form.status as any,
        source: form.source || undefined,
        notes: form.notes || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
      });
      onSuccess();
    } catch { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-nexus-surface border border-nexus-border rounded-xl p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-nexus-text-primary">Add Contact</h2>
          <button onClick={onClose} className="nexus-btn-ghost p-1"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-nexus-text-secondary mb-1 block">First Name *</label><input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="nexus-input text-sm" /></div>
            <div><label className="text-xs text-nexus-text-secondary mb-1 block">Last Name</label><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="nexus-input text-sm" /></div>
          </div>
          <div><label className="text-xs text-nexus-text-secondary mb-1 block">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="nexus-input text-sm" /></div>
          <div><label className="text-xs text-nexus-text-secondary mb-1 block">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="nexus-input text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-nexus-text-secondary mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="nexus-input text-sm">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-nexus-text-secondary mb-1 block">Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="nexus-input text-sm">
                <option value="">Select</option>
                {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-xs text-nexus-text-secondary mb-1 block">Tags (comma separated)</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vip, warm-lead, referral" className="nexus-input text-sm" /></div>
          <div><label className="text-xs text-nexus-text-secondary mb-1 block">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="nexus-input text-sm resize-none" /></div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="nexus-btn-secondary text-sm flex-1">Cancel</button>
            <button type="submit" disabled={saving || !form.firstName.trim()} className="nexus-btn-primary text-sm flex-1">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Create Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Contact Detail Drawer ───
function ContactDetailDrawer({ contact, onClose, onRefresh }: { contact: Contact; onClose: () => void; onRefresh: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "notes">("overview");

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div className="w-[480px] max-w-[90vw] h-full bg-nexus-surface border-l border-nexus-border overflow-y-auto animate-slide-left" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-nexus-surface border-b border-nexus-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-nexus-accent-primary/20 flex items-center justify-center text-sm font-semibold text-nexus-accent-primary">
              {contact.firstName[0]}{contact.lastName?.[0] || ""}
            </div>
            <div>
              <h2 className="text-base font-semibold text-nexus-text-primary">{contact.firstName} {contact.lastName}</h2>
              <span className={`nexus-badge ${getStatusBadge(contact.status)}`}>{contact.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="nexus-btn-ghost p-1"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* AI Summary Card */}
          <div className="nexus-card p-4 border-nexus-ai/20">
            <div className="flex items-center gap-2 mb-2">
              <Star size={14} className="text-nexus-ai" />
              <span className="text-xs font-semibold text-nexus-ai uppercase tracking-wider">AI Summary</span>
            </div>
            <p className="text-sm text-nexus-text-secondary">
              {contact.status === "LEAD" ? "New lead. No significant engagement yet. Follow up to qualify."
              : contact.status === "PROSPECT" ? "Actively engaged. Opened recent emails and shows interest. Good candidate for a demo call."
              : contact.status === "CUSTOMER" ? "Active customer. Monitor satisfaction and look for upsell opportunities."
              : "Churned. Re-engagement campaign recommended."}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-nexus-text-muted">Lead Score:</span>
              <span className={cn("text-sm font-mono font-semibold", contact.score >= 70 ? "text-nexus-success" : contact.score >= 40 ? "text-nexus-warning" : "text-nexus-text-muted")}>{contact.score}/100</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <button className="nexus-btn-secondary text-xs"><Mail size={12} /> Email</button>
            <button className="nexus-btn-secondary text-xs"><Phone size={12} /> Call</button>
            <button className="nexus-btn-secondary text-xs"><MessageSquare size={12} /> SMS</button>
            <button className="nexus-btn-secondary text-xs"><Calendar size={12} /> Meeting</button>
            <button className="nexus-btn-secondary text-xs"><FileText size={12} /> Task</button>
          </div>

          {/* Contact Info */}
          <div className="nexus-card p-4 space-y-3">
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Email</span><span className="text-sm text-nexus-text-primary">{contact.email || "—"}</span></div>
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Phone</span><span className="text-sm text-nexus-text-primary">{contact.phone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Source</span><span className="text-sm text-nexus-text-primary">{contact.source || "—"}</span></div>
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Assigned To</span><span className="text-sm text-nexus-text-primary">{contact.assignedTo?.name || "Unassigned"}</span></div>
            <div className="flex justify-between"><span className="text-xs text-nexus-text-muted">Created</span><span className="text-sm text-nexus-text-primary">{new Date(contact.createdAt).toLocaleDateString()}</span></div>
            {contact.tags.length > 0 && (
              <div><span className="text-xs text-nexus-text-muted block mb-1">Tags</span>
                <div className="flex gap-1 flex-wrap">
                  {contact.tags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-nexus-surface-hover text-nexus-text-muted border border-nexus-border">{t}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-nexus-border">
            {(["overview", "activity", "notes"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]", activeTab === tab ? "text-nexus-accent-primary border-nexus-accent-primary" : "text-nexus-text-muted border-transparent hover:text-nexus-text-primary")}>
                {tab === "overview" ? "Deals" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-2">
              {(contact as unknown as { deals?: Array<{ id: string; title: string; value: number; stageId: string }> }).deals?.length ? (
                (contact as unknown as { deals: Array<{ id: string; title: string; value: number; stageId: string }> }).deals.map((deal) => (
                  <div key={deal.id} className="nexus-card p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-nexus-text-primary font-medium">{deal.title}</p>
                      <p className="text-xs text-nexus-text-muted">Stage: {deal.stageId}</p>
                    </div>
                    <span className="text-sm font-mono text-nexus-accent-primary">${deal.value.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-nexus-text-muted text-sm">
                  <p>No active deals for this contact.</p>
                </div>
              )}
            </div>
          )}
          {activeTab === "activity" && (
            <div className="space-y-2">
              {(contact as unknown as { conversations?: Array<{ id: string; status: string; updatedAt: string; messages: Array<{ content: string; sender: string; createdAt: string }> }> }).conversations?.length ? (
                (contact as unknown as { conversations: Array<{ id: string; status: string; updatedAt: string; messages: Array<{ content: string; sender: string; createdAt: string }> }> }).conversations.map((conv) => (
                  <div key={conv.id} className="nexus-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-nexus-ai" />
                      <p className="text-sm font-medium text-nexus-text-primary">Conversation</p>
                      <span className="text-xs text-nexus-text-muted ml-auto">{new Date(conv.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {conv.messages?.slice(0, 2).map((msg, i) => (
                      <p key={i} className="text-xs text-nexus-text-secondary ml-4 truncate">{msg.sender === "CONTACT" ? "→" : "←"} {msg.content}</p>
                    ))}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-nexus-text-muted text-sm">
                  <p>No recent activity recorded.</p>
                </div>
              )}
            </div>
          )}
          {activeTab === "notes" && (
            <textarea defaultValue={contact.notes || ""} rows={6} className="nexus-input text-sm resize-none" placeholder="Add notes about this contact..." />
          )}
        </div>
      </div>
    </div>
  );
}
