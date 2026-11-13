"use client";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import "./chat.css";
type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  error?: boolean;
};
const STORAGE = "fc-capital-chat";
const suggestions = [
  "How do I open an account?",
  "What documents do I need?",
  "What is leverage?",
  "Standard vs Raw account?",
];
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
// Light Markdown: paragraphs, bullet and numbered lists, and bold.
function Rich({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const number = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || number) {
      const ordered = !!number;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet || number)![1]);
    } else {
      flush();
      if (line)
        blocks.push(
          <p key={blocks.length}>{inline(line.replace(/^#+\s*/, ""))}</p>,
        );
    }
  }
  flush();
  return <>{blocks}</>;
}
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(messages.slice(-30)));
    } catch {}
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, restored, open]);
  useEffect(() => {
    if (!open) return;
    field.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);
  if (pathname.startsWith("/admin") || pathname.startsWith("/capture"))
    return null;
  async function send(text: string) {
    const question = text.trim().slice(0, 2000);
    if (!question || busy) return;
    const history = [
      ...messages.filter((m) => !m.error),
      { role: "user" as const, content: question },
    ];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const update = (m: Partial<Message>) =>
      setMessages((all) => [...all.slice(0, -1), { ...all.at(-1)!, ...m }]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .slice(-10)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }
      let sources: string[] = [];
      try {
        sources = JSON.parse(
          decodeURIComponent(response.headers.get("X-Chat-Sources") || "[]"),
        );
      } catch {}
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let answer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += value;
        update({ content: answer });
      }
      update({ content: answer.trim() || "Sorry, I couldn't answer that.", sources });
    } catch (e) {
      update({ content: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={"chat-launcher" + (open ? " hidden" : "")}
        onClick={() => setOpen(true)}
        aria-label="Open the FC Capital assistant"
      >
        <span className="chat-launcher-icon" aria-hidden="true">
          ✳
        </span>
        <span>Ask FC</span>
      </button>
      {open && (
        <section
          className="chat-panel"
          data-lenis-prevent
          role="dialog"
          aria-label="FC Capital assistant"
        >
          <header>
            <span className="chat-avatar" aria-hidden="true">
              FC
            </span>
            <div>
              <strong>FC Capital Assistant</strong>
              <small>
                <span className="status-dot" /> AI · answers may contain
                mistakes
              </small>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                className="chat-icon"
                onClick={() => setMessages([])}
                disabled={busy}
                aria-label="Start a new chat"
                title="New chat"
              >
                ↺
              </button>
            )}
            <button
              type="button"
              className="chat-icon"
              onClick={() => setOpen(false)}
              aria-label="Close the assistant"
            >
              ✕
            </button>
          </header>
          <div className="chat-log" ref={log} aria-live="polite">
            {!messages.length && (
              <div className="chat-welcome">
                <h3>Hi, how can I help?</h3>
                <p>
                  Ask me about FC Capital, opening an account, or how trading
                  works: forex, CFDs, leverage, orders and risk.
                </p>
                <div className="chat-suggestions">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  "chat-message " + m.role + (m.error ? " error" : "")
                }
              >
                {m.role === "assistant" && !m.content ? (
                  <span className="chat-typing" aria-label="Thinking">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : m.role === "assistant" ? (
                  <Rich text={m.content} />
                ) : (
                  <p>{m.content}</p>
                )}
                {!!m.sources?.length && (
                  <small className="chat-sources">
                    Based on: {m.sources.join(" · ")}
                  </small>
                )}
              </div>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={field}
              rows={1}
              value={input}
              maxLength={2000}
              placeholder="Ask a question…"
              aria-label="Your question"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
            >
              ↑
            </button>
          </form>
          <p className="chat-disclaimer">
            General information only, not investment advice. CFDs carry a high
            risk of losing money rapidly due to leverage.
          </p>
        </section>
      )}
    </>
  );
}
