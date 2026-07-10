const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  tags: string[];
  source: string | null;
  status: "LEAD" | "PROSPECT" | "CUSTOMER" | "CHURNED";
  customFields: Record<string, unknown>;
  notes: string | null;
  score: number;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string | null; avatar: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchContacts(params: Record<string, string>): Promise<ContactsResponse> {
  const qs = new URLSearchParams(params).toString();
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/contacts?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch contacts");
  return res.json();
}

export async function fetchContact(id: string): Promise<{ contact: Contact }> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/contacts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch contact");
  return res.json();
}

export async function createContact(data: Partial<Contact>): Promise<{ contact: Contact }> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  return res.json();
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<{ contact: Contact }> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update contact");
  return res.json();
}

export async function deleteContact(id: string): Promise<void> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE}/api/contacts/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete contact");
}

export async function assignContact(contactId: string, userId: string): Promise<void> {
  const token = localStorage.getItem("accessToken");
  await fetch(`${API_BASE}/api/contacts/${contactId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId }),
  });
}

const STATUS_COLORS: Record<string, string> = {
  LEAD: "text-nexus-warning bg-nexus-warning/10",
  PROSPECT: "text-nexus-accent-primary bg-nexus-accent-primary/10",
  CUSTOMER: "text-nexus-success bg-nexus-success/10",
  CHURNED: "text-nexus-danger bg-nexus-danger/10",
};

export function getStatusBadge(status: string) {
  return STATUS_COLORS[status] || "text-nexus-text-muted bg-nexus-surface-hover";
}
