"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BrainCircuit, Send, Loader2, Bot, MessageSquare, Sparkles, Zap,
  Star, Activity, Users, DollarSign, Target, Trash2, Clock,
} from "lucide-react";
import { sendChatMessage, fetchConversations, fetchConversation, deleteConversation } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: string;
  content: string;
  timestamp?: string;
}

export default function AiBrainPage() {
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<ChatMsg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [conversation, scrollToBottom]);

  useEffect(() => {
    fetchConversations()
      .then((data) => setConversations(data.conversations || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    setMessage("");
    setConversation((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setToolCalls([]);

    try {
      const data = await sendChatMessage(text, conversationId || undefined, { page: "ai-brain" });
      setConversation((prev) => [...prev, { role: "assistant", content: data.message.content, timestamp: data.message.timestamp }]);
      setConversationId(data.conversationId);
      if (data.toolCalls) setToolCalls(data.toolCalls);

      fetchConversations()
        .then((d) => setConversations(d.conversations || []))
        .catch(() => {});
    } catch (err: any) {
      setConversation((prev) => [...prev, {
        role: "assistant",
        content: `Error: ${err.message || "Something went wrong. Please try again."}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setConversation([]);
    setConversationId(null);
    setToolCalls([]);
    setMessage("");
  };

  const loadConversation = async (id: string) => {
    setLoading(true);
    try {
      const data = await fetchConversation(id);
      const msgs: ChatMsg[] = (data.conversation.messages as any[]) || [];
      setConversation(msgs.filter((m) => m.role !== "system"));
      setConversationId(id);
      setShowHistory(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) handleNewChat();
    } catch (err) { console.error(err); }
  };

  const suggestions = [
    { icon: Users, text: "Show my top contacts by score" },
    { icon: DollarSign, text: "What's my total pipeline value?" },
    { icon: Target, text: "Create a new lead contact" },
    { icon: Activity, text: "Give me business insights" },
    { icon: Star, text: "Summarize my deals" },
    { icon: Zap, text: "What needs my attention today?" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-nexus-accent-primary to-nexus-accent-secondary flex items-center justify-center shadow-glow-lg">
            <BrainCircuit size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-nexus-text-primary flex items-center gap-2">
              AI Brain
              <Sparkles size={16} className="text-nexus-accent-ai" />
            </h1>
            <p className="text-sm text-nexus-text-secondary">
              DeepSeek V4 · Function calling · CRM-aware
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "nexus-btn-secondary text-sm",
              showHistory && "bg-nexus-accent-primary/10 border-nexus-accent-primary/30",
            )}
          >
            <Clock size={14} />
            History
          </button>
          <button onClick={handleNewChat} className="nexus-btn-primary text-sm">
            <BrainCircuit size={14} />
            New Chat
          </button>
          <span className="nexus-ai-badge text-xs">DeepSeek V4</span>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="nexus-card p-4">
          <h3 className="text-sm font-medium text-nexus-text-primary mb-3">Recent Conversations</h3>
          {conversations.length === 0 ? (
            <p className="text-sm text-nexus-text-muted">No conversations yet</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors",
                    conv.id === conversationId
                      ? "bg-nexus-accent-primary/10 border border-nexus-accent-primary/20"
                      : "hover:bg-nexus-surface-hover border border-transparent",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-nexus-text-primary truncate">{conv.title}</p>
                    <p className="text-xs text-nexus-text-muted">
                      {conv.messageCount} msgs · {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={(e) => handleDelete(conv.id, e)} className="p-1 text-nexus-text-muted hover:text-red-400 ml-2">
                    <Trash2 size={12} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tool calls summary */}
      {toolCalls.length > 0 && (
        <div className="nexus-card p-3 border-nexus-accent-ai/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-nexus-accent-ai" />
            <span className="text-xs font-medium text-nexus-accent-ai">AI Actions Taken</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {toolCalls.map((tc, i) => (
              <span key={i} className="text-xs bg-nexus-accent-ai/10 text-nexus-accent-ai px-2 py-1 rounded-full border border-nexus-accent-ai/20">
                {tc.toolName}: {JSON.stringify(tc.args).slice(0, 60)}
                {JSON.stringify(tc.args).length > 60 ? "..." : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="nexus-card p-0 overflow-hidden border-0" style={{ minHeight: "500px" }}>
        <div className="h-[500px] flex flex-col bg-nexus-bg rounded-2xl border border-nexus-border">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {conversation.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-nexus-accent-primary/10 to-nexus-accent-secondary/10 flex items-center justify-center mb-4">
                  <BrainCircuit size={40} className="text-nexus-accent-primary/60" />
                </div>
                <h3 className="text-xl font-semibold text-nexus-text-primary mb-2">What can I help you with?</h3>
                <p className="text-sm text-nexus-text-muted max-w-md mb-8">
                  I have full access to your CRM data. Ask me about contacts, deals, create records, or get business insights.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => {
                        setMessage(s.text);
                        setTimeout(() => inputRef.current?.focus(), 100);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-nexus-surface border border-nexus-border
                                 text-sm text-nexus-text-muted hover:text-nexus-text-primary hover:border-nexus-accent-primary/30
                                 hover:bg-nexus-surface-hover transition-all duration-150 text-left group"
                    >
                      <s.icon size={16} className="text-nexus-accent-primary/50 group-hover:text-nexus-accent-primary transition-colors" />
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {conversation.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role !== "user" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nexus-accent-primary to-nexus-accent-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-nexus-accent-primary text-white rounded-tr-md"
                    : "bg-nexus-surface border border-nexus-border rounded-tl-md text-nexus-text-primary",
                )}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-nexus-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageSquare size={16} className="text-nexus-accent-primary" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nexus-accent-primary to-nexus-accent-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-md px-5 py-4 bg-nexus-surface border border-nexus-border">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-nexus-accent-primary" />
                    <span className="text-xs text-nexus-text-muted">Thinking with AI...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-nexus-border p-4 bg-nexus-surface/30">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-nexus-surface border border-nexus-border rounded-xl px-4 py-2.5 focus-within:border-nexus-accent-primary/50 focus-within:shadow-glow transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask AI Brain anything..."
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm text-nexus-text-primary placeholder:text-nexus-text-muted outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || loading}
                  className={cn(
                    "p-2 rounded-lg transition-all flex-shrink-0",
                    message.trim() && !loading
                      ? "bg-nexus-accent-primary text-white hover:bg-nexus-accent-primary/90 shadow-glow"
                      : "text-nexus-text-muted",
                  )}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-nexus-text-muted mt-2 text-center">
              AI Brain has access to read and write your CRM data. Responses are AI-generated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
