"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hasMinimumAnswers, LoveAnswers } from "@/lib/love-quiz";
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

type QuizExchange = {
  question: string;
  answer: string;
};

type QuizQuestionResponse = {
  question?: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 10;

function answersFromConversation(conversation: QuizExchange[]) {
  return conversation.reduce<LoveAnswers>((acc, item, index) => {
    acc[`q${index + 1}`] = item.answer;
    return acc;
  }, {});
}

function buildMessages(conversation: QuizExchange[], pendingQuestion: string | null) {
  const messages: ChatMessage[] = [];
  for (const pair of conversation) {
    messages.push({ role: "bot", text: pair.question });
    messages.push({ role: "user", text: pair.answer });
  }
  if (pendingQuestion) {
    messages.push({ role: "bot", text: pendingQuestion });
  }
  return messages;
}

export default function QuizPage() {
  const router = useRouter();
  const [conversation, setConversation] = useState<QuizExchange[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isGettingQuestion, setIsGettingQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const answers = useMemo(() => answersFromConversation(conversation), [conversation]);
  const answeredCount = conversation.length;
  const progress = Math.round((Math.min(answeredCount, MAX_QUESTIONS) / MAX_QUESTIONS) * 100);
  const reachedMinimum = answeredCount >= MIN_QUESTIONS;
  const reachedMaximum = answeredCount >= MAX_QUESTIONS;

  const chatMessages = useMemo(
    () => buildMessages(conversation, reachedMaximum || isGettingQuestion ? null : currentQuestion),
    [conversation, currentQuestion, reachedMaximum, isGettingQuestion],
  );

  const supportsSpeech = typeof window !== "undefined" && Boolean(window.webkitSpeechRecognition);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages, input, isGettingQuestion]);

  useEffect(() => {
    const session = readSession();
    if (!session?.playerSetup) {
      router.replace("/setup");
      return;
    }

    const restoredConversation = session.quizConversation ?? [];
    setConversation(restoredConversation);

    if (restoredConversation.length >= MAX_QUESTIONS) {
      setCurrentQuestion(null);
      return;
    }

    const askNext = async () => {
      setIsGettingQuestion(true);
      try {
        const response = await fetch("/api/quiz-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerSetup: session.playerSetup,
            exchanges: restoredConversation,
          }),
        });
        const payload = (await response.json()) as QuizQuestionResponse;
        const question = payload.question?.trim();
        setCurrentQuestion(question && question.length > 3 ? question : "What matters most to you in a relationship?");
      } catch {
        setCurrentQuestion("What matters most to you in a relationship?");
      } finally {
        setIsGettingQuestion(false);
      }
    };

    void askNext();
  }, [router]);

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

  const askNextQuestion = async (nextConversation: QuizExchange[]) => {
    if (nextConversation.length >= MAX_QUESTIONS) {
      setCurrentQuestion(null);
      return;
    }

    const session = readSession();
    if (!session?.playerSetup) {
      router.replace("/setup");
      return;
    }

    setIsGettingQuestion(true);
    try {
      const response = await fetch("/api/quiz-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerSetup: session.playerSetup,
          exchanges: nextConversation,
        }),
      });
      const payload = (await response.json()) as QuizQuestionResponse;
      const question = payload.question?.trim();
      setCurrentQuestion(question && question.length > 3 ? question : "What is one trait you value most in a partner?");
    } catch {
      setCurrentQuestion("What is one trait you value most in a partner?");
    } finally {
      setIsGettingQuestion(false);
    }
  };

  const persistConversation = (nextConversation: QuizExchange[]) => {
    const session = readSession() ?? {};
    writeSession({
      ...session,
      loveAnswers: answersFromConversation(nextConversation),
      quizConversation: nextConversation,
    });
  };

  const sendAnswer = async () => {
    if (!currentQuestion || reachedMaximum || isGettingQuestion) return;
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setError("Please enter a fuller answer before sending.");
      return;
    }

    setError(null);
    const nextConversation = [...conversation, { question: currentQuestion, answer: trimmed }];
    setConversation(nextConversation);
    setInput("");
    setCurrentQuestion(null);
    persistConversation(nextConversation);
    await askNextQuestion(nextConversation);
  };

  const generateAvatar = async () => {
    const session = readSession();
    if (!session?.playerSetup) {
      router.replace("/setup");
      return;
    }
    if (!hasMinimumAnswers(answers, MIN_QUESTIONS)) {
      setError(`Please answer at least ${MIN_QUESTIONS} questions first.`);
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
        quizConversation: conversation,
        personality: payload.personality,
        avatar: payload.avatar,
        candidates: payload.candidates,
        userAgent: payload.userAgent,
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
          <h1 className="mt-3 text-xl sm:text-3xl">Personality Interview Chat</h1>
          <p className="mt-3 text-2xl text-[#c8b7f8]">
            AI keeps learning your vibe through questions. Minimum 3 answers, maximum 10 answers.{" "}
            <span className="blink">_</span>
          </p>
          <div className="mt-4">
            <div className="h-4 w-full border-2 border-[#120a23] bg-[#2f1a55]">
              <div className="h-full bg-[#ffcb47]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-lg text-[#c8b7f8]">
              Progress: {answeredCount}/{MAX_QUESTIONS}
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
              {isGettingQuestion && !reachedMaximum && (
                <div className="max-w-[90%] rounded-sm border-2 border-[#ffcb47] bg-[#3a275f] p-3 text-xl text-[#ffe9a8]">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#c8b7f8]">Love Bot</p>
                  <p className="mt-1">Thinking of the next question...</p>
                </div>
              )}
            </div>
          </div>

          {!reachedMaximum && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendAnswer();
                    }
                  }}
                  placeholder="Type your message..."
                  className="min-w-[260px] flex-1 border-2 border-[#120a23] bg-[#e9ddff] px-3 py-3 text-xl text-[#120a23] outline-none"
                />
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={!supportsSpeech || isGettingQuestion}
                  className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#64866a]"
                >
                  {isListening ? "Stop Voice" : "Use Voice"}
                </button>
                <button
                  type="button"
                  onClick={() => void sendAnswer()}
                  disabled={isGettingQuestion}
                  className="pixel-button bg-[#ffcb47] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#d3b77c]"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {reachedMinimum && (
              <button
                type="button"
                onClick={() => void generateAvatar()}
                disabled={loading}
                className="pixel-button bg-[#ffcb47] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#d3b77c]"
              >
                {loading ? "Generating Avatar..." : "Move to Next Step"}
              </button>
            )}
            {reachedMaximum && (
              <p className="text-xl text-[#c8b7f8]">Maximum reached (10/10). Continue to the next step.</p>
            )}
            {!reachedMinimum && (
              <p className="text-xl text-[#c8b7f8]">
                Answer at least {MIN_QUESTIONS} questions to unlock the next step.
              </p>
            )}
          </div>

          {error && <p className="mt-3 text-lg text-[#ff8f8f]">{error}</p>}
        </section>
      </div>
    </main>
  );
}
