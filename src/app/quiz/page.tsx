"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export default function QuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState(createInitialLoveAnswers);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session?.playerSetup) {
      router.replace("/");
      return;
    }
    if (session.loveAnswers) {
      setAnswers(session.loveAnswers);
    }
  }, [router]);

  const question = LOVE_QUESTIONS[index];
  const isLast = index === LOVE_QUESTIONS.length - 1;
  const answeredCount = useMemo(
    () => LOVE_QUESTIONS.filter((q) => (answers[q.id] ?? "").trim().length >= 2).length,
    [answers],
  );
  const progress = Math.round((answeredCount / LOVE_QUESTIONS.length) * 100);

  const supportsSpeech = typeof window !== "undefined" && Boolean(window.webkitSpeechRecognition);

  const setCurrentAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: value,
    }));
  };

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
        .join(" ");
      setCurrentAnswer(transcript.trim());
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

  const goNext = () => {
    if ((answers[question.id] ?? "").trim().length < 2) {
      setError("Please answer before moving on.");
      return;
    }
    setError(null);
    setIndex((prev) => Math.min(prev + 1, LOVE_QUESTIONS.length - 1));
  };

  const generateAvatar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = readSession();
    if (!session?.playerSetup) {
      router.replace("/");
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
          <h1 className="mt-3 text-xl sm:text-3xl">Love Profile Quiz Game</h1>
          <p className="mt-3 text-2xl text-[#c8b7f8]">
            5 crucial questions for communication style, relationship focus, love style, and vibes.{" "}
            <span className="blink">_</span>
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

        <form onSubmit={generateAvatar} className="pixel-card rounded-sm p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">
            Question {index + 1} / {LOVE_QUESTIONS.length}
          </p>
          <div className="mt-3 space-y-3">
            <div className="max-w-3xl rounded-sm border-2 border-[#120a23] bg-[#2c1d4f] p-4 text-2xl">
              {question.question}
            </div>
            <div className="rounded-sm border-2 border-[#120a23] bg-[#1b3355] p-4">
              <textarea
                value={answers[question.id] ?? ""}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer naturally..."
                className="min-h-28 w-full bg-transparent text-xl text-[#d7eeff] outline-none"
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {question.suggestions.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => setCurrentAnswer(`${answers[question.id] ?? ""} ${hint}`.trim())}
                className="pixel-button bg-[#3e276f] px-3 py-1 text-sm text-[#f5ecff]"
              >
                + {hint}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
              disabled={index === 0}
              className="pixel-button bg-[#7f8da6] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#555]"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={!supportsSpeech}
              className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#64866a]"
            >
              {isListening ? "Stop Voice" : "Use Voice"}
            </button>

            {!isLast && (
              <button
                type="button"
                onClick={goNext}
                className="pixel-button bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]"
              >
                Next Question
              </button>
            )}

            {isLast && (
              <button
                type="submit"
                disabled={loading}
                className="pixel-button bg-[#ffcb47] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#d3b77c]"
              >
                {loading ? "Generating Avatar..." : "Generate Avatar"}
              </button>
            )}
          </div>

          {error && <p className="mt-3 text-lg text-[#ff8f8f]">{error}</p>}
        </form>
      </div>
    </main>
  );
}
