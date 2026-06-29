import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { chat } from '../lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export default function ChatSidebar() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setLoadingHistory(true);
      chat.messages()
        .then((msgs: ChatMessage[]) => setMessages(msgs))
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMsg: ChatMessage = { id: `temp-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const { userMessage, assistantMessage } = await chat.send(content);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        userMessage,
        assistantMessage,
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'Sorry, I couldn\'t process that. Please check your connection and try again.', createdAt: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-semibold" style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return (
        <span key={i}>
          {parts}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          zIndex: 'var(--z-popover)' as unknown as number,
          background: open ? 'var(--bg-surface)' : 'var(--primary)',
          border: open ? '1px solid var(--border-default)' : '1px solid rgba(255,255,255,0.15)',
          boxShadow: open ? 'var(--shadow-overlay)' : '0 8px 24px -4px var(--primary-glow)',
          color: open ? 'var(--text-secondary)' : 'var(--neutral-700)',
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 400, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.95 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            className="fixed top-4 right-4 bottom-24 w-[400px] rounded-2xl overflow-hidden flex flex-col"
            style={{
              zIndex: 'var(--z-popover)' as unknown as number,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-overlay)',
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center gap-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border-default)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--primary)', color: 'var(--neutral-700)' }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Payroll AI</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Your finance co-pilot</p>
              </div>
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--success)', boxShadow: '0 0 8px rgba(125, 211, 252, 0.55)' }}
              />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'var(--primary-soft)', border: '1px solid var(--border-default)' }}
                  >
                    <Bot className="w-8 h-8" style={{ color: 'var(--sky-700)' }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Welcome to Payroll AI</p>
                  <p className="text-xs mt-1 max-w-[260px] mx-auto" style={{ color: 'var(--text-secondary)' }}>
                    I can help you manage payroll, track expenses, customize workflows, and more.
                  </p>
                  <div className="mt-4 space-y-2">
                    {[
                      'Show me my payroll overview',
                      'What invoices are overdue?',
                      'Help me customize workflows',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="block w-full text-left px-3 py-2 rounded-lg text-xs transition-colors"
                        style={{
                          background: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: msg.role === 'user' ? 'var(--tertiary-soft)' : 'var(--primary-soft)',
                      }}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-3.5 h-3.5" style={{ color: 'var(--lilac-600)' }} />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--sky-700)' }} />
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${msg.role === 'user' ? 'ml-auto' : ''}`}
                      style={{
                        background: msg.role === 'user' ? 'var(--tertiary-soft)' : 'var(--bg-surface-subtle)',
                        border: `1px solid ${msg.role === 'user' ? 'rgba(200, 160, 240, 0.35)' : 'var(--border-default)'}`,
                      }}
                    >
                      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {formatContent(msg.content)}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary-soft)' }}
                  >
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--sky-700)' }} />
                  </div>
                  <div
                    className="rounded-xl px-3.5 py-2.5"
                    style={{ background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-default)' }}
                  >
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--sky-500)', animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--sky-500)', animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--sky-500)', animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 shrink-0">
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{
                  background: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Payroll AI anything..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm outline-none resize-none min-h-[36px] max-h-[120px] py-1"
                  style={{ lineHeight: '1.5', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-lg transition-all shrink-0"
                  style={{
                    background: input.trim() ? 'var(--primary)' : 'var(--bg-surface-raised)',
                    color: input.trim() ? 'var(--neutral-700)' : 'var(--text-muted)',
                    opacity: input.trim() ? 1 : 0.5,
                  }}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] mt-1.5 px-1" style={{ color: 'var(--text-muted)' }}>
                Payroll AI · Context-aware finance assistant
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
