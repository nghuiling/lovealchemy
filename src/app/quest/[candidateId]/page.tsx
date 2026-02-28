"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PixelAvatar } from "@/components/pixel-avatar";
import { getQuestById, getQuestByTitle } from "@/lib/quests";
import { QuestSession, readSession } from "@/lib/session";

export default function QuestPlayPage() {
  const params = useParams<{ candidateId: string }>();
  const searchParams = useSearchParams();
  const questName = searchParams.get("name") ?? "Quest";
  const questId = searchParams.get("questId");
  const [session] = useState<QuestSession | null>(() => readSession());
  const [stepIndex, setStepIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const candidate = useMemo(() => {
    if (!session?.candidates) return null;
    return session.candidates.find((c) => c.id === params.candidateId) ?? null;
  }, [session, params.candidateId]);

  const quest = useMemo(() => {
    return getQuestById(questId) ?? getQuestByTitle(questName);
  }, [questId, questName]);

  if (!session?.avatar || !session?.playerSetup || !candidate || !quest) {
    return (
      <main className="pixel-grid-bg min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="pixel-card rounded-sm p-6">
            <h1 className="text-2xl">Quest data not found</h1>
            <p className="mt-3 text-xl text-[#c8b7f8]">Run simulation and open a quest from recommendations.</p>
            <Link href="/partners" className="pixel-button mt-5 inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
              Back to Arena
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const step = quest.steps[stepIndex];

  const choose = (optionIndex: number) => {
    setScore((prev) => prev + (optionIndex === 0 ? 3 : optionIndex === 2 ? 2 : 1));
    if (stepIndex === quest.steps.length - 1) {
      setDone(true);
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="pixel-card rounded-sm p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">Quest Mode</p>
          <h1 className="mt-3 text-xl sm:text-3xl">{quest.title}</h1>
          <p className="mt-2 text-xl text-[#c8b7f8]">{quest.description}</p>
          <p className="mt-2 text-xl text-[#c8b7f8]">
            Playing with {candidate.name} ({candidate.vibe})
          </p>
        </header>

        <section className="pixel-card rounded-sm p-5">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <PixelAvatar avatar={session.avatar} size={96} />
              <p className="mt-1 text-lg text-[#ffdf84]">{session.playerSetup.name}</p>
            </div>
            <span className="text-3xl">+</span>
            <div className="text-center">
              <PixelAvatar avatar={candidate.avatar} size={96} />
              <p className="mt-1 text-lg text-[#ffdf84]">{candidate.name}</p>
            </div>
          </div>
        </section>

        {!done && (
          <section className="pixel-card rounded-sm p-5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">
              Challenge {stepIndex + 1} / {quest.steps.length}
            </p>
            <h2 className="mt-2 text-2xl">{step.prompt}</h2>
            <div className="mt-4 grid gap-3">
              {step.options.map((option, idx) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => choose(idx)}
                  className="pixel-button bg-[#3e276f] px-4 py-3 text-left text-lg text-[#f5ecff]"
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        )}

        {done && (
          <section className="pixel-card rounded-sm p-5">
            <h2 className="text-2xl text-[#ffdf84]">Quest Complete</h2>
            <p className="mt-2 text-xl text-[#c8b7f8]">Team Synergy Score: {Math.min(100, 60 + score * 5)}%</p>
            <p className="mt-1 text-xl text-[#c8b7f8]">
              {score >= 8
                ? "Great match in communication and decision-making."
                : "Good potential. More quests will improve your rhythm together."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/partners" className="pixel-button inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
                Back to Arena
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStepIndex(0);
                  setScore(0);
                  setDone(false);
                }}
                className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23]"
              >
                Replay Quest
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
