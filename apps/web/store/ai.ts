"use client";

import { create } from "zustand";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  tokensUsed: number;
  contactId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ToolCallInfo {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

interface AIState {
  // Chat state
  isOpen: boolean;
  isMinimized: boolean;
  messages: ChatMessage[];
  conversationId: string | null;
  conversations: ConversationSummary[];
  isLoading: boolean;
  isStreaming: boolean;
  streamContent: string;
  toolCalls: ToolCallInfo[];

  // Context
  currentPage: string;
  currentContactId: string | null;
  currentDealId: string | null;

  // Actions
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setConversationId: (id: string | null) => void;
  setConversations: (conversations: ConversationSummary[]) => void;
  setLoading: (loading: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  appendStreamToken: (token: string) => void;
  clearStream: () => void;
  setToolCalls: (calls: ToolCallInfo[]) => void;
  setContext: (page: string, contactId?: string, dealId?: string) => void;
  appendMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  isOpen: false,
  isMinimized: false,
  messages: [],
  conversationId: null,
  conversations: [],
  isLoading: false,
  isStreaming: false,
  streamContent: "",
  toolCalls: [],
  currentPage: "",
  currentContactId: null,
  currentDealId: null,

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen, isMinimized: false })),
  setOpen: (open) => set({ isOpen: open, isMinimized: false }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  setMessages: (messages) => set({ messages }),
  setConversationId: (id) => set({ conversationId: id }),
  setConversations: (conversations) => set({ conversations }),
  setLoading: (loading) => set({ isLoading: loading }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  appendStreamToken: (token) => set((s) => ({ streamContent: s.streamContent + token })),
  clearStream: () => set({ streamContent: "" }),
  setToolCalls: (calls) => set({ toolCalls: calls }),
  setContext: (page, contactId, dealId) => set({ currentPage: page, currentContactId: contactId || null, currentDealId: dealId || null }),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  clearMessages: () => set({ messages: [], conversationId: null, toolCalls: [] }),
}));
