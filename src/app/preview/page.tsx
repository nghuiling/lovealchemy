"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelAvatar } from "@/components/pixel-avatar";
import { buildLoveProfile } from "@/lib/love-quiz";
import { QuestSession, readSession } from "@/lib/session";

type ChatMessage = {
  role: "user" | "avatar";
  text: string;
};

export default function PreviewPage() {
  const router = useRouter();
  const [session] = useState<QuestSession | null>(() => readSession());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.personality || !session.avatar || !session.loveAnswers) {
      router.replace("/avatar");
    }
  }, [router, session]);

  const loveProfile = useMemo(() => {
    if (!session?.loveAnswers) return null;
    return buildLoveProfile(session.loveAnswers);
  }, [session]);

  const avatarName = session?.playerSetup?.name?.trim() || "Avatar";

  useEffect(() => {
    if (!session?.personality || !loveProfile || !session.playerSetup?.name) return;
    setMessages([
      {
        role: "avatar",
        text: `hey it's ${session.playerSetup.name}. what's on your mind?`,
      },
    ]);
  }, [session, loveProfile]);

  const sendMessage = async () => {
    if (!input.trim() || !session?.personality || !session?.loveAnswers) return;
    const userMessage: ChatMessage = { role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setChatError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/avatar-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          personality: session.personality,
          loveAnswers: session.loveAnswers,
          history: messages.slice(-6),
        }),
      });
      const data = (await response.json()) as {
        reply?: string;
        error?: string;
      };
      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? "Avatar could not reply.");
      }
      setMessages((prev) => [...prev, { role: "avatar", text: data.reply! }]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : "Avatar could not reply.",
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!session?.personality || !session.avatar || !loveProfile || !session.playerSetup) return null;

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="pixel-card rounded-sm p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">
            Step 4 of 5
          </p>
          <h1 className="mt-3 text-xl sm:text-3xl">Avatar Preview</h1>
          <p className="mt-3 text-2xl text-[#c8b7f8]">
            Final check before entering quest partner selection.{" "}
            <span className="blink">_</span>
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="pixel-card rounded-sm p-5">
            <div className="flex flex-col items-center gap-3">
              <PixelAvatar avatar={session.avatar} size={220} />
              <p className="text-2xl text-[#ffdf84]">{avatarName}</p>
              <p className="text-xl text-[#c8b7f8]">
                Top match vibes: {loveProfile.topVibes.join(" + ")}
              </p>
              <p className="text-xl text-[#c8b7f8]">
                Love style: {loveProfile.tags.join(" | ")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/partners")}
              className="pixel-button mt-5 w-full bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]"
            >
              Release your avatar!
            </button>
          </div>

          <div className="pixel-card rounded-sm p-5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">
              Avatar Chat
            </p>
            <h2 className="mt-2 text-2xl">Chat with your destiny avatar</h2>
            <p className="mt-1 text-xl text-[#c8b7f8]">
              Responses mimic your personality + 5-question profile.
            </p>

            <div className="mt-4 h-72 overflow-y-auto border-2 border-[#120a23] bg-[#241544] p-3">
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={`${msg.role}-${idx}`}
                    className={`rounded-sm border-2 p-2 text-lg ${
                      msg.role === "avatar"
                        ? "border-[#7de48b] bg-[#1e3a2b] text-[#d8ffe0]"
                        : "border-[#7fc0ff] bg-[#1b3355] text-[#d7eeff]"
                    }`}
                  >
                    <p className="font-mono text-[10px] uppercase">
                      {msg.role === "avatar" ? avatarName : "You"}
                    </p>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask about your ideal match, date idea, or red flags..."
                className="w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-xl text-[#120a23] outline-none"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={isSending || !input.trim()}
                className="pixel-button bg-[#7de48b] px-4 py-2 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#7e9d83]"
              >
                {isSending ? "..." : "Send"}
              </button>
            </div>
            {chatError && (
              <p className="mt-2 text-lg text-[#ff8f8f]">{chatError}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "Give me a first date idea",
                "What red flags should I avoid?",
                "What match suits my style?",
              ].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setInput(quick)}
                  className="pixel-button bg-[#3e276f] px-3 py-1 text-sm text-[#f5ecff]"
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
