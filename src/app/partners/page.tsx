"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PixelAvatar } from "@/components/pixel-avatar";
import { adjustedCompatibility, buildLoveProfile } from "@/lib/love-quiz";
import { QUEST_DEFINITIONS } from "@/lib/quests";
import { QuestSession, readSession } from "@/lib/session";
import { MatchCandidate } from "@/types/profile";

type SimulationRound = {
  speaker: string;
  text: string;
};

type CandidateSimulation = {
  candidate: MatchCandidate;
  score: number;
  rounds: SimulationRound[];
  recommendedQuestId: string;
  recommendedQuest: string;
  whyItFits: string;
};

function topQuestForVibe(vibe: string) {
  const lower = vibe.toLowerCase();
  const scored = QUEST_DEFINITIONS.map((quest) => ({
    quest,
    score: quest.vibes.some((v) => lower.includes(v)) ? 2 : 0,
  })).sort((a, b) => b.score - a.score);
  return scored[0].quest;
}

function createConversation(
  playerName: string,
  candidateName: string,
  candidateVibe: string,
  communicationStyle: string,
  relationshipFocus: string,
) {
  const opening =
    communicationStyle.includes("direct")
      ? `${playerName}: I like clear communication from the start. What matters to you most?`
      : `${playerName}: I prefer to understand someone slowly. What kind of connection are you hoping for?`;

  const response =
    relationshipFocus.includes("stability")
      ? `${candidateName}: I value consistency and showing up when it matters.`
      : relationshipFocus.includes("chemistry")
        ? `${candidateName}: I am looking for real spark, but with emotional maturity.`
        : `${candidateName}: I want partnership where both people grow over time.`;

  const vibeLine = `${playerName}: Your vibe feels ${candidateVibe}. I think we could work if we keep things honest.`;
  const close = `${candidateName}: Agreed. Let's try a quest and see how we solve things together.`;

  return [
    { speaker: playerName, text: opening },
    { speaker: candidateName, text: response },
    { speaker: playerName, text: vibeLine },
    { speaker: candidateName, text: close },
  ];
}

export default function PartnersPage() {
  const [session] = useState<QuestSession | null>(() => readSession());
  const [ranSimulation, setRanSimulation] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [clockMs, setClockMs] = useState(0);
  const [hubCandidateId, setHubCandidateId] = useState<string | null>(null);
  const [wyrCount, setWyrCount] = useState<3 | 5 | 7>(5);

  const loveProfile = useMemo(() => {
    if (!session?.loveAnswers) return null;
    return buildLoveProfile(session.loveAnswers);
  }, [session]);

  const simulations = useMemo<CandidateSimulation[]>(() => {
    if (!session?.candidates || !session?.loveAnswers || !session?.playerSetup || !session?.personality) return [];
    const loveAnswers = session.loveAnswers;
    const playerSetup = session.playerSetup;
    const personality = session.personality;
    const candidates = session.candidates;

    return candidates
      .map((candidate) => {
        const score = adjustedCompatibility(candidate.compatibility, candidate.vibe, loveAnswers);
        const quest = topQuestForVibe(candidate.vibe);
        const rounds = createConversation(
          playerSetup.name,
          candidate.name,
          candidate.vibe,
          personality.communicationStyle,
          personality.relationshipFocus,
        );

        return {
          candidate,
          score,
          rounds,
          recommendedQuestId: quest.id,
          recommendedQuest: quest.title,
          whyItFits: `${quest.description} Best match for ${candidate.vibe} vibe with your ${personality.communicationStyle} style.`,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [session]);

  useEffect(() => {
    if (!isLive) return;
    const start = Date.now() - clockMs;
    const timer = setInterval(() => {
      setClockMs(Date.now() - start);
    }, 80);
    return () => clearInterval(timer);
  }, [isLive, clockMs]);

  const liveScene = useMemo(() => {
    if (!simulations.length) return null;
    const cycleMs = 7200;
    const idx = Math.floor(clockMs / cycleMs) % simulations.length;
    const active = simulations[idx];
    const phase = (clockMs % cycleMs) / cycleMs;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const playerStart = 9;
    const playerMeet = 41;
    const candidateStart = 83;
    const candidateMeet = 57;

    let playerX = playerStart;
    let candidateX = candidateStart;
    if (phase < 0.35) {
      const t = phase / 0.35;
      playerX = lerp(playerStart, playerMeet, t);
      candidateX = lerp(candidateStart, candidateMeet, t);
    } else if (phase < 0.72) {
      playerX = playerMeet;
      candidateX = candidateMeet;
    } else {
      const t = (phase - 0.72) / 0.28;
      playerX = lerp(playerMeet, playerStart, t);
      candidateX = lerp(candidateMeet, candidateStart, t);
    }

    const roundPhase = phase < 0.35 ? 0 : phase < 0.52 ? 1 : phase < 0.64 ? 2 : 3;
    const roundText = active.rounds[roundPhase]?.text ?? active.rounds[0]?.text ?? "";

    return {
      active,
      playerX,
      candidateX,
      roundText,
    };
  }, [clockMs, simulations]);

  const topThree = simulations.slice(0, 3);
  const hubCandidate = useMemo(() => {
    if (!session?.candidates) return null;
    if (!hubCandidateId) return session.candidates[0] ?? null;
    return session.candidates.find((c) => c.id === hubCandidateId) ?? null;
  }, [session, hubCandidateId]);

  if (!session?.avatar || !session?.personality || !session?.candidates || !session?.loveAnswers || !session?.playerSetup) {
    return (
      <main className="pixel-grid-bg min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="pixel-card rounded-sm p-6">
            <h1 className="text-2xl">No avatar session found</h1>
            <p className="mt-3 text-xl text-[#c8b7f8]">Complete setup, quiz, avatar and preview first.</p>
            <Link href="/" className="pixel-button mt-5 inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
              Back to Step 1
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="pixel-card rounded-sm p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">Step 5 of 5</p>
          <h1 className="mt-3 text-xl leading-tight sm:text-3xl">Agent Simulation Arena</h1>
          <p className="mt-3 text-2xl text-[#c8b7f8]">
            Your avatar agent auto-interacts with candidate agents, then recommends the best quest pairings.
          </p>
        </header>

        <section className="pixel-card rounded-sm p-5">
          <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Your Agent Profile</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <PixelAvatar avatar={session.avatar} size={96} />
            <div className="text-xl">
              <p>
                Agent: <span className="text-[#ffdf84]">{session.playerSetup.name}</span>
              </p>
              <p>Communication: {session.personality.communicationStyle}</p>
              <p>Relationship Focus: {session.personality.relationshipFocus}</p>
              <p>Love Style: {session.personality.loveStyle}</p>
            </div>
          </div>
          {loveProfile && (
            <p className="mt-3 text-xl text-[#c8b7f8]">
              Matching vibe target: {loveProfile.topVibes.join(" + ")} | tags: {loveProfile.tags.join(" | ")}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setRanSimulation(true);
                setIsLive(true);
              }}
              className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23]"
            >
              Run Agent Simulation
            </button>
            <button
              type="button"
              onClick={() => setIsLive((prev) => !prev)}
              className="pixel-button bg-[#7f8da6] px-4 py-3 text-base text-[#120a23]"
            >
              {isLive ? "Pause Animation" : "Resume Animation"}
            </button>
          </div>
        </section>

        {ranSimulation && (
          <>
            <section className="pixel-card rounded-sm p-5">
              <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Live Agent Arena</h2>
              <div className="mt-3 rounded-sm border-2 border-[#120a23] bg-[#1f1238] p-3">
                <div className="relative h-72 overflow-hidden rounded-sm border-2 border-[#120a23] bg-[#27164a]">
                  <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
                    <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] bg-[size:20px_20px]" />
                  </div>

                  {liveScene && (
                    <>
                      <div className="absolute left-3 top-3 rounded-sm border border-[#5f4b92] bg-[#2e1c55] px-2 py-1 text-sm text-[#d9cdf8]">
                        Active Agent: {liveScene.active.candidate.name} ({liveScene.active.candidate.vibe})
                      </div>

                      <div
                        className="absolute top-[58%] -translate-x-1/2 transition-transform duration-75"
                        style={{ left: `${liveScene.playerX}%` }}
                      >
                        <PixelAvatar avatar={session.avatar} size={78} />
                        <p className="mt-1 text-center text-sm text-[#ffdf84]">{session.playerSetup.name}</p>
                      </div>

                      <div
                        className="absolute top-[26%] -translate-x-1/2 transition-transform duration-75"
                        style={{ left: `${liveScene.candidateX}%` }}
                      >
                        <PixelAvatar avatar={liveScene.active.candidate.avatar} size={78} />
                        <p className="mt-1 text-center text-sm text-[#ffdf84]">{liveScene.active.candidate.name}</p>
                      </div>

                      <div className="absolute bottom-3 left-1/2 w-[92%] max-w-3xl -translate-x-1/2 rounded-sm border-2 border-[#120a23] bg-[#172d4d] p-2 text-sm text-[#d7eeff]">
                        {liveScene.roundText}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="pixel-card rounded-sm p-5">
              <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Top Quest Recommendations</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {topThree.map((item) => (
                  <div key={item.candidate.id} className="pixel-card rounded-sm p-3">
                    <div className="flex gap-3">
                      <PixelAvatar avatar={item.candidate.avatar} size={64} />
                      <div>
                        <p className="text-xl text-[#ffdf84]">{item.candidate.name}</p>
                        <p className="text-lg">Fit score: {item.score}%</p>
                        <p className="text-lg">{item.candidate.vibe} vibe</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xl text-[#c8b7f8]">Quest: {item.recommendedQuest}</p>
                    <p className="mt-1 text-lg text-[#d9cdf8]">{item.whyItFits}</p>
                    <Link
                      href={`/quest/${item.candidate.id}?questId=${encodeURIComponent(item.recommendedQuestId)}&name=${encodeURIComponent(item.recommendedQuest)}`}
                      className="pixel-button mt-3 inline-block bg-[#7de48b] px-4 py-2 text-base text-[#120a23]"
                    >
                      Play Quest with {item.candidate.name}
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            <section className="pixel-card rounded-sm p-5">
              <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Game Hub</h2>
              <p className="mt-2 text-xl text-[#c8b7f8]">
                Choose an agent, then launch any game mode directly.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {session.candidates.map((candidate) => (
                  <button
                    key={`hub-${candidate.id}`}
                    type="button"
                    onClick={() => setHubCandidateId(candidate.id)}
                    className={`pixel-button px-3 py-2 text-sm ${
                      (hubCandidate?.id ?? session.candidates?.[0]?.id) === candidate.id
                        ? "bg-[#ffcb47] text-[#120a23]"
                        : "bg-[#3e276f] text-[#f5ecff]"
                    }`}
                  >
                    {candidate.name}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {QUEST_DEFINITIONS.map((quest) => (
                  <div key={`hub-quest-${quest.id}`} className="pixel-card rounded-sm p-3">
                    <p className="text-xl text-[#ffdf84]">{quest.title}</p>
                    <p className="mt-1 text-lg text-[#d9cdf8]">{quest.description}</p>
                    <p className="mt-1 text-sm text-[#c8b7f8]">
                      Best vibes: {quest.vibes.join(" | ")}
                    </p>
                    {hubCandidate && (
                      <Link
                        href={`/quest/${hubCandidate.id}?questId=${encodeURIComponent(quest.id)}&name=${encodeURIComponent(quest.title)}`}
                        className="pixel-button mt-3 inline-block bg-[#7de48b] px-3 py-2 text-sm text-[#120a23]"
                      >
                        Play with {hubCandidate.name}
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pixel-card rounded-sm p-3">
                <p className="text-xl text-[#ffdf84]">Would You Rather</p>
                <p className="mt-1 text-lg text-[#d9cdf8]">
                  Discover preferences through quick choices, then get a summary of selected options.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[3, 5, 7].map((count) => (
                    <button
                      key={`wyr-${count}`}
                      type="button"
                      onClick={() => setWyrCount(count as 3 | 5 | 7)}
                      className={`pixel-button px-3 py-2 text-sm ${
                        wyrCount === count ? "bg-[#ffcb47] text-[#120a23]" : "bg-[#3e276f] text-[#f5ecff]"
                      }`}
                    >
                      {count} questions
                    </button>
                  ))}
                </div>
                {hubCandidate && (
                  <Link
                    href={`/games/would-you-rather/${hubCandidate.id}?count=${wyrCount}`}
                    className="pixel-button mt-3 inline-block bg-[#7de48b] px-3 py-2 text-sm text-[#120a23]"
                  >
                    Play Would You Rather with {hubCandidate.name}
                  </Link>
                )}
              </div>
            </section>

            <section className="pixel-card rounded-sm p-5">
              <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Simulation Logs</h2>
              <div className="mt-3 space-y-3">
                {simulations.map((item) => (
                  <div key={`sim-${item.candidate.id}`} className="rounded-sm border-2 border-[#120a23] bg-[#241544] p-3">
                    <p className="text-xl text-[#ffdf84]">
                      {item.candidate.name} ({item.candidate.vibe}) | Score {item.score}%
                    </p>
                    <div className="mt-2 space-y-2">
                      {item.rounds.map((r, idx) => (
                        <p key={`${item.candidate.id}-${idx}`} className="text-lg text-[#d7eeff]">
                          <span className="text-[#7de48b]">{r.speaker}:</span> {r.text.replace(`${r.speaker}: `, "")}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <Link href="/preview" className="pixel-button inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
          Back to Avatar Preview
        </Link>
      </div>
    </main>
  );
}
