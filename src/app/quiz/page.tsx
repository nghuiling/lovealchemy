"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOVE_QUESTIONS, allLoveQuestionsAnswered, createInitialLoveAnswers } from "@/lib/love-quiz";
import { readSession, writeSession } from "@/lib/session";
import { AvatarProfileResponse } from "@/types/profile";

type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
};

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type ChatMessage = {
  role: "bot" | "user";
  text: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

function buildChatFromAnswers(answers: Record<string, string>) {
  const messages: ChatMessage[] = [];
  let nextQuestionIndex = LOVE_QUESTIONS.length;

  for (let index = 0; index < LOVE_QUESTIONS.length; index += 1) {
    const question = LOVE_QUESTIONS[index];
    messages.push({ role: "bot", text: question.question });

    const answer = (answers[question.id] ?? "").trim();
    if (answer.length >= 2) {
      messages.push({ role: "user", text: answer });
      continue;
    }

    nextQuestionIndex = index;
    break;
  }

  return { messages, nextQuestionIndex };
}

export default function QuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState(createInitialLoveAnswers);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: "bot", text: LOVE_QUESTIONS[0].question }]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session?.playerSetup) {
      router.replace("/setup");
      return;
    }

    if (session.loveAnswers) {
      const restored = session.loveAnswers;
      const rebuiltChat = buildChatFromAnswers(restored);
      setAnswers(restored);
      setChatMessages(rebuiltChat.messages.length ? rebuiltChat.messages : [{ role: "bot", text: LOVE_QUESTIONS[0].question }]);
      setCurrentQuestionIndex(rebuiltChat.nextQuestionIndex);
    }
  }, [router]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages, input]);

  const supportsSpeech = typeof window !== "undefined" && Boolean(window.webkitSpeechRecognition);
  const answeredCount = useMemo(
    () => LOVE_QUESTIONS.filter((q) => (answers[q.id] ?? "").trim().length >= 2).length,
    [answers],
  );
  const progress = Math.round((answeredCount / LOVE_QUESTIONS.length) * 100);
  const isComplete = currentQuestionIndex >= LOVE_QUESTIONS.length;
  const activeQuestion = isComplete ? null : LOVE_QUESTIONS[currentQuestionIndex];

  const startListening = () => {
    if (!supportsSpeech || isListening) return;
    const SpeechCtor = window.webkitSpeechRecognition;
    if (!SpeechCtor) return;

    const recognition = new SpeechCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setInput(transcript);
    };
    recognition.onerror = () => {
      setError("Voice input failed. You can continue by typing.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    setError(null);
    setIsListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const sendAnswer = () => {
    if (isComplete || !activeQuestion) return;

    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setError("Please enter a fuller answer before sending.");
      return;
    }

    setError(null);

    const nextAnswers = {
      ...answers,
      [activeQuestion.id]: trimmed,
    };

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", text: trimmed }];
    const nextQuestionIndex = currentQuestionIndex + 1;

    if (nextQuestionIndex < LOVE_QUESTIONS.length) {
      nextMessages.push({ role: "bot", text: LOVE_QUESTIONS[nextQuestionIndex].question });
    }

    setAnswers(nextAnswers);
    setChatMessages(nextMessages);
    setCurrentQuestionIndex(nextQuestionIndex);
    setInput("");

    const existing = readSession() ?? {};
    writeSession({
      ...existing,
      loveAnswers: nextAnswers,
    });
  };

  const generateAvatar = async () => {
    const session = readSession();
    if (!session?.playerSetup) {
      router.replace("/setup");
      return;
    }
    if (!allLoveQuestionsAnswered(answers)) {
      setError("Please answer all 5 questions first.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/avatar-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerSetup: session.playerSetup,
          loveAnswers: answers,
        }),
      });
      const payload = (await response.json()) as AvatarProfileResponse | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Failed to generate avatar.");
      }
      writeSession({
        ...session,
        loveAnswers: answers,
        personality: payload.personality,
        avatar: payload.avatar,
        candidates: payload.candidates,
      });
      router.push("/avatar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate avatar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="pixel-card rounded-sm p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">Step 2 of 5</p>
          <h1 className="mt-3 text-xl sm:text-3xl">Love Profile Chat</h1>
          <p className="mt-3 text-2xl text-[#c8b7f8]">
            Chat through 5 key questions to shape your avatar personality. <span className="blink">_</span>
          </p>
          <div className="mt-4">
            <div className="h-4 w-full border-2 border-[#120a23] bg-[#2f1a55]">
              <div className="h-full bg-[#ffcb47]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-lg text-[#c8b7f8]">
              Progress: {answeredCount}/{LOVE_QUESTIONS.length}
            </p>
          </div>
        </header>

        <section className="pixel-card rounded-sm p-5">
          <div
            ref={chatScrollRef}
            className="h-[28rem] overflow-y-auto rounded-sm border-2 border-[#120a23] bg-[#1f1238] p-3"
          >
            <div className="space-y-3">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[90%] rounded-sm border-2 p-3 text-xl ${
                    message.role === "bot"
                      ? "border-[#ffcb47] bg-[#3a275f] text-[#ffe9a8]"
                      : "ml-auto border-[#7fc0ff] bg-[#1b3355] text-[#d7eeff]"
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#c8b7f8]">
                    {message.role === "bot" ? "Love Bot" : "You"}
                  </p>
                  <p className="mt-1">{message.text}</p>
                </div>
              ))}
            </div>
          </div>

          {!isComplete && activeQuestion && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {activeQuestion.suggestions.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setInput((prev) => `${prev} ${hint}`.trim())}
                    className="pixel-button bg-[#3e276f] px-3 py-1 text-sm text-[#f5ecff]"
                  >
                    + {hint}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendAnswer();
                    }
                  }}
                  placeholder="Type your message..."
                  className="min-w-[260px] flex-1 border-2 border-[#120a23] bg-[#e9ddff] px-3 py-3 text-xl text-[#120a23] outline-none"
                />
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={!supportsSpeech}
                  className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#64866a]"
                >
                  {isListening ? "Stop Voice" : "Use Voice"}
                </button>
                <button
                  type="button"
                  onClick={sendAnswer}
                  className="pixel-button bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {isComplete && (
            <div className="mt-4">
              <p className="text-xl text-[#c8b7f8]">All 5 answers captured. Generate your avatar profile when ready.</p>
              <button
                type="button"
                onClick={() => void generateAvatar()}
                disabled={loading}
                className="pixel-button mt-3 bg-[#ffcb47] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#d3b77c]"
              >
                {loading ? "Generating Avatar..." : "Generate Avatar"}
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-lg text-[#ff8f8f]">{error}</p>}
        </section>
      </div>
    </main>
  );
}
