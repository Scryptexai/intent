"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, X, Send, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

interface Msg {
  role: "user" | "support";
  text: string;
  at: string;
}

const QUICK = ["Pembayaranku pending", "Gimana cara pakai Brief?", "Perlu KYC nggak?", "Aku mau escalate"];

/**
 * Customer support — human-feel, full platform knowledge.
 * Typing delay + dua bubble kadang dipecah = ritme manusia, bukan bot.
 */
export function SupportWidget() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (open && !loaded.current) {
      loaded.current = true;
      fetch("/api/support")
        .then((r) => r.json())
        .then((d) => {
          setMsgs(d.messages ?? []);
          if ((d.messages ?? []).length === 0) {
            setMsgs([{ role: "support", text: "halo! aku Rara dari INTENT support 🙂 kalau ada yang aneh — billing, upgrade, fitur, atau data — ceritain aja, aku cek langsung ke akun kamu.", at: new Date().toISOString() }]);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || typing) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: message, at: new Date().toISOString() }]);
    setTyping(true);
    // ritme manusia: baca + mikir 0.8–1.8s
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1000));
    try {
      const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const isStream = (res.headers.get("content-type") ?? "").includes("text/plain");
      if (isStream && res.body) {
        setTyping(false);
        setMsgs((m) => [...m, { role: "support", text: "", at: new Date().toISOString() }]);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setMsgs((m) => {
            const c = [...m];
            c[c.length - 1] = { ...c[c.length - 1], text: acc };
            return c;
          });
        }
        return;
      }
      const d = await res.json();
      const reply: string = d.reply ?? "";
      setTyping(false);
      // kadang pecah jadi dua bubble (ritme manusia)
      if (reply.length > 220 && Math.random() < 0.4) {
        const cut = reply.indexOf(". ", Math.floor(reply.length / 2));
        const a = reply.slice(0, cut + 1);
        const b = reply.slice(cut + 2);
        setMsgs((m) => [...m, { role: "support", text: a, at: new Date().toISOString() }]);
        await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
        setMsgs((m) => [...m, { role: "support", text: b, at: new Date().toISOString() }]);
      } else {
        setMsgs((m) => [...m, { role: "support", text: reply, at: new Date().toISOString() }]);
      }
    } catch {
      setTyping(false);
      setMsgs((m) => [...m, { role: "support", text: "waduh, koneksiku ke server lagi putus. coba sekali lagi ya?", at: new Date().toISOString() }]);
    }
  }

  return (
    <>
      <button
        aria-label="Customer support"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-intent-teal text-white shadow-[0_8px_30px_-6px_rgba(37,99,235,0.6)] transition-transform hover:scale-105 lg:bottom-6"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircleQuestion className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-50 flex h-[min(64vh,560px)] w-[min(92vw,380px)] flex-col panel shadow-2xl lg:bottom-24">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LifeBuoy className="h-4 w-4 text-intent-teal" /> Rara · INTENT Support
              </div>
              <div className="text-[10px] text-muted-foreground">online · AI-assisted, backed by full platform knowledge</div>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-intent-lime opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-intent-lime" />
            </span>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user" ? "bg-intent-teal text-white rounded-br-sm" : "bg-white/[0.07] text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white/[0.07] px-4 py-2.5">
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-3 py-2">
            {QUICK.map((qk) => (
              <button key={qk} className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-muted-foreground hover:border-intent-teal/40 hover:text-foreground" onClick={() => send(qk)}>
                {qk}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2 border-t border-white/10 p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={session.data?.user ? "ceritain masalahmu…" : "ceritain masalahmu (login biar aku lihat akunmu)…"}
              className="h-9 flex-1 rounded-md bg-white/5 px-3 text-[13px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-intent-teal/50"
            />
            <Button size="icon" type="submit" disabled={!input.trim() || typing} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
