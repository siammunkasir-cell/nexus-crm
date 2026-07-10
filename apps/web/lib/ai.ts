const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error: ${res.status}`);
  }
  return res.json();
}

export interface ChatResponse {
  message: { role: string; content: string; timestamp: string };
  conversationId: string;
  toolCalls?: Array<{ toolName: string; args: Record<string, unknown>; result: unknown }>;
}

export async function sendChatMessage(
  message: string,
  conversationId?: string,
  context?: { page?: string; contactId?: string; dealId?: string },
): Promise<ChatResponse> {
  return apiFetch("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversationId, context }),
  });
}

export async function fetchConversations() {
  return apiFetch("/api/ai/conversations");
}

export async function fetchConversation(id: string) {
  return apiFetch(`/api/ai/conversations/${id}`);
}

export async function deleteConversation(id: string) {
  return apiFetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
}

export async function scoreContact(contactId: string) {
  return apiFetch(`/api/ai/score-contact/${contactId}`, { method: "POST" });
}

export async function batchScore() {
  return apiFetch("/api/ai/batch-score", { method: "POST" });
}

// Use streamChat() below instead of this superseded implementation

// Better SSE parser
export function streamChat(
  message: string,
  conversationId?: string,
  contactId?: string,
): {
  controller: AbortController;
  onToken: (cb: (token: string) => void) => void;
  onToolResult: (cb: (toolName: string, args: Record<string, unknown>, result: unknown) => void) => void;
  onDone: (cb: (content: string) => void) => void;
  onError: (cb: (error: Error) => void) => void;
  start: () => void;
} {
  const controller = new AbortController();
  let tokenCb: ((token: string) => void) | null = null;
  let toolCb: ((toolName: string, args: Record<string, unknown>, result: unknown) => void) | null = null;
  let doneCb: ((content: string) => void) | null = null;
  let errorCb: ((error: Error) => void) | null = null;

  return {
    controller,
    onToken: (cb) => { tokenCb = cb; },
    onToolResult: (cb) => { toolCb = cb; },
    onDone: (cb) => { doneCb = cb; },
    onError: (cb) => { errorCb = cb; },
    start: () => {
      const token = getToken();
      const params = new URLSearchParams({ message });
      if (conversationId) params.set("conversationId", conversationId);
      if (contactId) params.set("contactId", contactId);

      const url = `${API_BASE}/api/ai/chat/stream?${params}`;

      fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok) {
          errorCb?.(new Error(`Stream error: ${response.status}`));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          errorCb?.(new Error("No response body"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE format: event: xxx\ndata: {...}\n\n
          const parts = buffer.split("\n");
          buffer = parts.pop() || ""; // Keep incomplete part

          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.startsWith("event:")) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith("data:")) {
              const dataStr = trimmed.slice(5).trim();
              try {
                const data = JSON.parse(dataStr);
                if (currentEvent === "token") {
                  tokenCb?.(data.token);
                  fullContent += data.token;
                } else if (currentEvent === "tool_result") {
                  toolCb?.(data.toolName, data.args, data.result);
                } else if (currentEvent === "done") {
                  doneCb?.(data.content || fullContent);
                }
              } catch { /* skip parse errors */ }
              currentEvent = "";
            }
          }
        }

        // If connection closed without done event, fire done
        if (fullContent) {
          doneCb?.(fullContent);
        }
      }).catch((err) => {
        if (err.name !== "AbortError") errorCb?.(err);
      });
    },
  };
}
