import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

// ─── Constants ───────────────────────────────────────────────────────────────
const CHAT_NUTRITION_COST = 2;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrizen-chat`;

type Mode = 'support' | 'nutrition';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system-notice';
  mode: Mode;
  content: string;
  isError?: boolean;
}

// ─── SSE streaming helper ────────────────────────────────────────────────────
async function streamChat({
  mode,
  messages,
  onDelta,
  onDone,
  onError,
}: {
  mode: Mode;
  messages: { role: string; content: string }[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Non authentifié');

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ mode, messages }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      if (body.error_code === 'INSUFFICIENT_CREDITS') {
        throw new Error('INSUFFICIENT_CREDITS');
      }
      throw new Error(body.error || `Erreur ${resp.status}`);
    }

    if (!resp.body) throw new Error('No stream body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nlIdx: number;
      while ((nlIdx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          // partial JSON, wait for more
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error('Erreur inconnue'));
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export function NutriZenChatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('support');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  // Fetch credits
  useEffect(() => {
    if (!user?.id) return;
    const fetchCredits = async () => {
      const { data } = await supabase
        .from('user_wallets')
        .select('subscription_credits, lifetime_credits')
        .eq('user_id', user.id)
        .single();
      if (data) setCredits((data.subscription_credits ?? 0) + (data.lifetime_credits ?? 0));
    };
    fetchCredits();

    const channel = supabase
      .channel(`chatbot_credits_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_wallets', filter: `user_id=eq.${user.id}` }, () => fetchCredits())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Welcome message
  useEffect(() => {
    if (isOpen && !initialized.current) {
      initialized.current = true;
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        mode: 'support',
        content: '👋 Bonjour ! Je suis votre assistant NutriZen. Comment puis-je vous aider ?',
      }]);
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const switchMode = useCallback((newMode: Mode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setMessages(prev => [...prev, {
      id: `switch-${Date.now()}`,
      role: 'system-notice',
      mode: newMode,
      content: newMode === 'nutrition'
        ? `🥗 Mode **Assistant Nutrition** activé — ${CHAT_NUTRITION_COST} crédits par message`
        : '🔧 Retour au **Support technique** — gratuit',
    }]);
  }, [mode]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    if (mode === 'nutrition' && credits < CHAT_NUTRITION_COST) {
      setMessages(prev => [...prev, {
        id: `credit-warn-${Date.now()}`,
        role: 'system-notice',
        mode,
        content: `⚡ Crédits insuffisants. [Rechargez vos crédits](/credits) pour utiliser l'Assistant Nutrition.`,
      }]);
      return;
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', mode, content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const conversationHistory = messages
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.mode === mode)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    let assistantContent = '';

    await streamChat({
      mode,
      messages: [...conversationHistory, { role: 'user', content: text }],
      onDelta: (chunk) => {
        assistantContent += chunk;
        const content = assistantContent;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.id.startsWith('stream-')) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { id: `stream-${Date.now()}`, role: 'assistant', mode, content }];
        });
      },
      onDone: () => {
        setIsLoading(false);
        if (mode === 'nutrition') setCredits(c => Math.max(0, c - CHAT_NUTRITION_COST));
      },
      onError: (err) => {
        setIsLoading(false);
        const isCredits = err.message === 'INSUFFICIENT_CREDITS';
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          mode,
          content: isCredits
            ? '❌ Crédits insuffisants pour l\'Assistant Nutrition. Rechargez vos crédits dans votre profil.'
            : 'Une erreur est survenue. Veuillez réessayer.',
          isError: true,
        }]);
      },
    });
  }, [input, isLoading, mode, credits, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105',
          'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ height: 'min(560px, calc(100vh - 8rem))' }}
        >
          {/* Header */}
          <div className="rounded-t-2xl bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20 text-lg">
                  🌿
                </div>
                <div>
                  <p className="font-semibold text-sm">NutriZen Assistant</p>
                  <p className="text-xs opacity-80">Toujours disponible</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-2.5 py-1 text-xs font-semibold">
                <Zap className="h-3.5 w-3.5" />
                {credits}
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 rounded-lg bg-primary-foreground/10 p-1">
              {([
                { key: 'support' as Mode, label: '🔧 Support', sub: 'Gratuit' },
                { key: 'nutrition' as Mode, label: '🥗 Nutrition', sub: `${CHAT_NUTRITION_COST} crédits` },
              ]).map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => switchMode(key)}
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-center transition-all text-xs',
                    mode === key
                      ? 'bg-primary-foreground text-primary font-bold shadow-sm'
                      : 'text-primary-foreground/70 hover:text-primary-foreground',
                  )}
                >
                  <div>{label}</div>
                  <div className="text-[10px] opacity-80">{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {messages.map((msg) => {
                if (msg.role === 'system-notice') {
                  return (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      <span className="inline"><ReactMarkdown>{msg.content}</ReactMarkdown></span>
                    </div>
                  );
                }
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                        {msg.mode === 'nutrition' ? '🥗' : '🔧'}
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm',
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md',
                      msg.isError && 'bg-destructive/10 text-destructive',
                    )}>
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2 items-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                    {mode === 'nutrition' ? '🥗' : '🔧'}
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'support' ? 'Posez votre question technique…' : 'Demandez un conseil nutritionnel…'}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-input bg-muted/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-24 overflow-y-auto"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className={cn(
                'h-10 w-10 rounded-xl shrink-0',
                mode === 'nutrition'
                  ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                  : 'bg-primary hover:bg-primary/90',
              )}
            >
                  : 'bg-primary hover:bg-primary/90',
              )}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Footer */}
          <div className="px-4 pb-2.5 pt-0 text-center text-[11px] text-muted-foreground">
            {mode === 'support'
              ? 'Support technique · Gratuit'
              : `Assistant Nutrition · ${CHAT_NUTRITION_COST} crédits / message`}
          </div>
        </div>
      )}
    </>
  );
}
