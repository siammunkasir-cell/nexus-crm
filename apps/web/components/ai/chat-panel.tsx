"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BrainCircuit, Send, X, Minus, MessageSquare, Bot, Sparkles, Loader2, ChevronDown, Trash2 } from "lucide-react";
import { useAIStore, type ChatMessage } from "@/store/ai";
import { sendChatMessage, fetchConversations, fetchConversation, deleteConversation, streamChat } from "@/lib/ai";
import { cn } from "@/lib/utils";

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) return null;

  return (
    <div className={cn("flex gap-3 w-full", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nexus-accent-primary to-nexus-accent-secondary flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-nexus-accent-primary text-white rounded-tr-md"
            : "bg-nexus-surface border border-nexus-border rounded-tl-md text-nexus-text-primary",
        )}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-nexus-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
          <MessageSquare size={16} className="text-nexus-accent-primary" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 w-full justify-start">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nexus-accent-primary to-nexus-accent-secondary flex items-center justify-center flex-shrink-0 mt-1">
        <Bot size={16} className="text-white" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md px-5 py-4 bg-nexus-surface border border-nexus-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-nexus-accent-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-nexus-accent-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-nexus-accent-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-nexus-text-muted">Thinking...</span>
        </div>
      </div>
    </div>
  );
}

export function AIChatPanel() {
  const {
    isOpen, isMinimized, messages, conversationId, conversations, isLoading, isStreaming, streamContent,
    currentPage, currentContactId, currentDealId,
    toggleOpen, setMinimized, setMessages, setConversationId, setConversations, setLoading, setIsStreaming,
    appendStreamToken, clearStream, setToolCalls, appendMessage, clearMessages, setOpen,
  } = useAIStore();

  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, scrollToBottom]);

  // Load conversations
  useEffect(() => {
    if (isOpen && conversations.length === 0) {
      fetchConversations()
        .then((data) => setConversations(data.conversations || []))
        .catch(() => {});
    }
  }, [isOpen, conversations.length, setConversations]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    const userMessage: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    appendMessage(userMessage);
    setLoading(true);

    try {
      const response = await sendChatMessage(text, conversationId || undefined, {
        page: currentPage || undefined,
        contactId: currentContactId || undefined,
        dealId: currentDealId || undefined,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.message.content,
        timestamp: response.message.timestamp,
      };

      appendMessage(assistantMessage);
      setConversationId(response.conversationId);
      setToolCalls(response.toolCalls || []);

      // Refresh conversation list
      fetchConversations()
        .then((data) => setConversations(data.conversations || []))
        .catch(() => {});
    } catch (err: any) {
      appendMessage({
        role: "assistant",
        content: `Sorry, I encountered an error: ${err.message || "Please try again."}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, appendMessage, setLoading, conversationId, currentPage, currentContactId, currentDealId, setConversationId, setToolCalls, setConversations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    clearMessages();
    setInput("");
    setShowHistory(false);
  };

  const handleSelectConversation = async (id: string) => {
    try {
      setLoading(true);
      const data = await fetchConversation(id);
      const msgs = (data.conversation.messages as any[]) || [];
      setMessages(msgs.filter((m: any) => m.role !== "system").map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })));
      setConversationId(id);
      setShowHistory(false);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations(conversations.filter((c) => c.id !== id));
      if (conversationId === id) {
        clearMessages();
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-nexus-accent-primary to-nexus-accent-secondary
                   flex items-center justify-center shadow-glow-lg hover:shadow-glow-cyan hover:scale-105
                   active:scale-95 transition-all duration-200 group"
        aria-label="Open AI Brain"
      >
        <BrainCircuit size={24} className="text-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-nexus-accent-ai animate-pulse shadow-lg shadow-nexus-accent-ai/50" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col">
      {/* Panel */}
      <div
        className={cn(
          "bg-nexus-bg border border-nexus-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
          isMinimized ? "w-96 h-14" : "w-[420px] h-[640px]",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-nexus-border bg-nexus-surface/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nexus-accent-primary to-nexus-accent-secondary flex items-center justify-center">
              <BrainCircuit size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-nexus-text-primary flex items-center gap-2">
                AI Brain
                <Sparkles size={12} className="text-nexus-accent-ai" />
              </h3>
              <p className="text-[10px] text-nexus-text-muted leading-tight">DeepSeek V4 · Function Calling</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                showHistory ? "bg-nexus-accent-primary/10 text-nexus-accent-primary" : "text-nexus-text-muted hover:text-nexus-text-primary hover:bg-nexus-surface-hover",
              )}
              title="Conversation history"
            >
              <ChevronDown size={16} className={cn("transition-transform", showHistory && "rotate-180")} />
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="p-1.5 rounded-lg text-nexus-text-muted hover:text-nexus-text-primary hover:bg-nexus-surface-hover transition-colors"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => { setOpen(false); setMinimized(false); }}
              className="p-1.5 rounded-lg text-nexus-text-muted hover:text-nexus-text-primary hover:bg-nexus-surface-hover transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="border-b border-nexus-border bg-nexus-surface/30 max-h-48 overflow-y-auto">
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-nexus-text-muted uppercase tracking-wider">Conversations</span>
              <button
                onClick={handleNewChat}
                className="text-xs text-nexus-accent-primary hover:text-nexus-accent-primary/80 transition-colors"
              >
                + New chat
              </button>
            </div>
            {conversations.length === 0 ? (
              <div className="px-4 py-3 text-xs text-nexus-text-muted">No conversations yet</div>
            ) : (
              conversations.slice(0, 10).map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    "w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-nexus-surface-hover transition-colors group border-l-2",
                    conv.id === conversationId ? "border-l-nexus-accent-primary bg-nexus-accent-primary/5" : "border-l-transparent",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-nexus-text-primary truncate">{conv.title}</p>
                    <p className="text-[10px] text-nexus-text-muted">
                      {conv.messageCount} messages · {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 rounded text-nexus-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              ))
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nexus-accent-primary/20 to-nexus-accent-secondary/20 flex items-center justify-center mb-4">
                <BrainCircuit size={32} className="text-nexus-accent-primary" />
              </div>
              <h4 className="text-lg font-semibold text-nexus-text-primary mb-2">AI Brain</h4>
              <p className="text-sm text-nexus-text-muted max-w-xs mb-6">
                Your intelligent CRM assistant. Ask me anything about your contacts, deals, or business.
              </p>
              <div className="space-y-2 w-full max-w-sm">
                {[
                  "Show me my top contacts",
                  "What's my pipeline value?",
                  "Create a new contact for John",
                  "Give me business insights",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-nexus-surface border border-nexus-border
                               text-sm text-nexus-text-muted hover:text-nexus-text-primary hover:border-nexus-accent-primary/30
                               hover:bg-nexus-surface-hover transition-all duration-150"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isLoading && !isStreaming && <TypingIndicator />}
              {isStreaming && streamContent && (
                <div className="flex gap-3 w-full justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nexus-accent-primary to-nexus-accent-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md px-4 py-3 bg-nexus-surface border border-nexus-border text-sm text-nexus-text-primary whitespace-pre-wrap">
                    {streamContent}
                    <span className="inline-block w-1.5 h-4 bg-nexus-accent-primary animate-pulse ml-0.5" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-nexus-border p-3 bg-nexus-surface/30 flex-shrink-0">
          <div className="flex items-center gap-2 bg-nexus-surface border border-nexus-border rounded-xl px-4 py-2 focus-within:border-nexus-accent-primary/50 focus-within:shadow-glow transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI Brain anything..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-nexus-text-primary placeholder:text-nexus-text-muted outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-2 rounded-lg transition-all",
                input.trim() && !isLoading
                  ? "bg-nexus-accent-primary text-white hover:bg-nexus-accent-primary/90 shadow-glow"
                  : "text-nexus-text-muted",
              )}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] text-nexus-text-muted">
              {currentPage && `Context: ${currentPage.replace("/dashboard/", "")}`}
            </span>
            {messages.length > 0 && (
              <button
                onClick={handleNewChat}
                className="text-[10px] text-nexus-text-muted hover:text-nexus-accent-primary transition-colors"
              >
                New conversation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
