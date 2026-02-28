"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PixelAvatar } from "@/components/pixel-avatar";
import { QuestSession, readSession } from "@/lib/session";
import { WOULD_YOU_RATHER_QUESTIONS } from "@/lib/would-you-rather";

type AnswerRecord = {
  questionId: string;
  question: string;
  choice: "A" | "B";
  selectedOption: string;
  tag: string;
};

function normalizeCount(raw: string | null) {
  if (raw === "3" || raw === "5" || raw === "7") return Number(raw);
  return 5;
}

export default function WouldYouRatherPage() {
  const params = useParams<{ candidateId: string }>();
  const searchParams = useSearchParams();
  const questionCount = normalizeCount(searchParams.get("count"));
  const [session] = useState<QuestSession | null>(() => readSession());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [done, setDone] = useState(false);

  const candidate = useMemo(() => {
    if (!session?.candidates) return null;
    return session.candidates.find((c) => c.id === params.candidateId) ?? null;
  }, [session, params.candidateId]);

  const selectedQuestions = useMemo(() => {
    const base = WOULD_YOU_RATHER_QUESTIONS;
    if (!candidate) return base.slice(0, questionCount);
    const shift = Math.abs(candidate.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % base.length;
    const reordered = [...base.slice(shift), ...base.slice(0, shift)];
    return reordered.slice(0, questionCount);
  }, [candidate, questionCount]);

  const current = selectedQuestions[index];

  if (!session?.avatar || !session?.playerSetup || !candidate) {
    return (
      <main className="pixel-grid-bg min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="pixel-card rounded-sm p-6">
            <h1 className="text-2xl">Game data not found</h1>
            <p className="mt-3 text-xl text-[#c8b7f8]">Select this game from the Game Hub in Agent Simulation Arena.</p>
            <Link href="/partners" className="pixel-button mt-5 inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
              Back to Arena
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const choose = (choice: "A" | "B") => {
    if (!current) return;
    const selectedOption = choice === "A" ? current.optionA : current.optionB;
    const tag = choice === "A" ? current.tagA : current.tagB;
    setAnswers((prev) => [
      ...prev,
      {
        questionId: current.id,
        question: `${current.optionA} OR ${current.optionB}`,
        choice,
        selectedOption,
        tag,
      },
    ]);
    if (index === selectedQuestions.length - 1) {
      setDone(true);
      return;
    }
    setIndex((prev) => prev + 1);
  };

  const tagCounts = answers.reduce<Record<string, number>>((acc, a) => {
    acc[a.tag] = (acc[a.tag] ?? 0) + 1;
    return acc;
  }, {});
  const topTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 3);

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="pixel-card rounded-sm p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">Game Hub Mode</p>
          <h1 className="mt-3 text-xl sm:text-3xl">Would You Rather</h1>
          <p className="mt-2 text-xl text-[#c8b7f8]">
            Playing with {candidate.name} | {questionCount} questions
          </p>
        </header>

        <section className="pixel-card rounded-sm p-5">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <PixelAvatar avatar={session.avatar} size={88} />
              <p className="mt-1 text-lg text-[#ffdf84]">{session.playerSetup.name}</p>
            </div>
            <span className="text-3xl">vs</span>
            <div className="text-center">
              <PixelAvatar avatar={candidate.avatar} size={88} />
              <p className="mt-1 text-lg text-[#ffdf84]">{candidate.name}</p>
            </div>
          </div>
        </section>

        {!done && current && (
          <section className="pixel-card rounded-sm p-5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">
              Question {index + 1} / {selectedQuestions.length}
            </p>
            <h2 className="mt-3 text-2xl">Would you rather...</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => choose("A")}
                className="pixel-button bg-[#3e276f] px-4 py-4 text-left text-lg text-[#f5ecff]"
              >
                A. {current.optionA}
              </button>
              <button
                type="button"
                onClick={() => choose("B")}
                className="pixel-button bg-[#3e276f] px-4 py-4 text-left text-lg text-[#f5ecff]"
              >
                B. {current.optionB}
              </button>
            </div>
          </section>
        )}

        {done && (
          <section className="pixel-card rounded-sm p-5">
            <h2 className="text-2xl text-[#ffdf84]">Preference Summary</h2>
            <p className="mt-2 text-xl text-[#c8b7f8]">
              You completed {selectedQuestions.length} choices with {candidate.name}.
            </p>
            <p className="mt-1 text-xl text-[#c8b7f8]">Top preference tags: {topTags.join(" | ") || "balanced"}</p>

            <div className="mt-4 space-y-2">
              {answers.map((answer, idx) => (
                <div key={`${answer.questionId}-${idx}`} className="rounded-sm border-2 border-[#120a23] bg-[#241544] p-3">
                  <p className="text-sm text-[#c8b7f8]">Q{idx + 1}</p>
                  <p className="text-lg text-[#f5ecff]">{answer.question}</p>
                  <p className="mt-1 text-lg text-[#7de48b]">
                    Chosen: {answer.choice}. {answer.selectedOption}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/partners" className="pixel-button inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
                Back to Game Hub
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setAnswers([]);
                  setDone(false);
                }}
                className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23]"
              >
                Replay
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
