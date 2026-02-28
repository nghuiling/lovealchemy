"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PixelAvatar } from "@/components/pixel-avatar";
import { buildLoveProfile } from "@/lib/love-quiz";
import { QUEST_DEFINITIONS } from "@/lib/quests";
import { QuestSession, readSession, writeSession } from "@/lib/session";
import { AgentProfile, MatchCandidate } from "@/types/profile";

type AgentTurn = {
  speaker: string;
  text: string;
  score: number;
};

type AgentInteraction = {
  partner: AgentProfile;
  rounds: AgentTurn[];
  endedBy: "in-progress" | "low-score" | "max-turns";
  finalUserScore: number;
  finalPartnerScore: number;
  averageScore: number;
};

type AgentInitializeResponse = {
  partners: AgentProfile[];
};

type AgentSimulationResponse = {
  userAgent: AgentProfile;
  partners: AgentProfile[];
  interactions: AgentInteraction[];
};

type StreamEvent =
  | { type: "init"; userAgent: AgentProfile; partners: AgentProfile[] }
  | {
      type: "interaction_update";
      partner: AgentProfile;
      partnerId: string;
      rounds: AgentTurn[];
      finalUserScore: number;
      finalPartnerScore: number;
      averageScore: number;
      endedBy: "in-progress" | "low-score" | "max-turns";
    }
  | { type: "interaction_done"; interaction: AgentInteraction }
  | { type: "done"; userAgent: AgentProfile; partners: AgentProfile[]; interactions: AgentInteraction[] }
  | { type: "error"; message: string };

function inferVibeFromPartner(partner: AgentProfile) {
  const text = `${partner.personalitySummary} ${partner.preferenceSummary}`.toLowerCase();
  if (text.includes("adventure") || text.includes("extreme") || text.includes("energetic")) return "adventurous";
  if (text.includes("introvert") || text.includes("reflective") || text.includes("calm")) return "calm";
  if (text.includes("dependable") || text.includes("disciplined") || text.includes("practical")) return "organized";
  return "romantic";
}

function topQuestForPartner(partner: AgentProfile) {
  const vibe = inferVibeFromPartner(partner);
  const scored = QUEST_DEFINITIONS.map((quest) => ({
    quest,
    score: quest.vibes.some((v) => vibe.includes(v)) ? 2 : 0,
  })).sort((a, b) => b.score - a.score);
  return scored[0].quest;
}

function toCandidate(interaction: AgentInteraction): MatchCandidate {
  return {
    id: interaction.partner.id,
    name: interaction.partner.name,
    vibe: inferVibeFromPartner(interaction.partner),
    compatibility: interaction.averageScore,
    avatar: interaction.partner.avatar,
  };
}

function placeholderInteraction(partner: AgentProfile): AgentInteraction {
  return {
    partner,
    rounds: [],
    endedBy: "in-progress",
    finalUserScore: 7,
    finalPartnerScore: 7,
    averageScore: 0,
  };
}

function upsertInteraction(list: AgentInteraction[], next: AgentInteraction) {
  const index = list.findIndex((item) => item.partner.id === next.partner.id);
  if (index === -1) return [...list, next];
  const updated = [...list];
  updated[index] = next;
  return updated;
}

export default function PartnersPage() {
  const [session] = useState<QuestSession | null>(() => readSession());
  const [ranSimulation, setRanSimulation] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [clockMs, setClockMs] = useState(0);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const [initializedPartners, setInitializedPartners] = useState<AgentProfile[]>([]);
  const [simulations, setSimulations] = useState<AgentInteraction[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const loveProfile = useMemo(() => {
    if (!session?.loveAnswers) return null;
    return buildLoveProfile(session.loveAnswers);
  }, [session]);

  useEffect(() => {
    const initPartners = async () => {
      try {
        const response = await fetch("/api/agent-initialise");
        if (!response.ok) return;
        const payload = (await response.json()) as AgentInitializeResponse;
        setInitializedPartners(payload.partners ?? []);
      } catch {
        setInitializedPartners([]);
      }
    };
    void initPartners();
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const start = Date.now() - clockMs;
    const timer = setInterval(() => {
      setClockMs(Date.now() - start);
    }, 80);
    return () => clearInterval(timer);
  }, [isLive, clockMs]);

  const sortedSimulations = useMemo(() => {
    return [...simulations].sort((a, b) => b.averageScore - a.averageScore).slice(0, 3);
  }, [simulations]);

  useEffect(() => {
    if (!sortedSimulations.length) return;
    setSelectedPartnerId((prev) => prev ?? sortedSimulations[0].partner.id);
  }, [sortedSimulations]);

  const selectedInteraction = useMemo(() => {
    if (!selectedPartnerId) return sortedSimulations[0] ?? null;
    return sortedSimulations.find((item) => item.partner.id === selectedPartnerId) ?? null;
  }, [selectedPartnerId, sortedSimulations]);

  const isMutualMatch = Boolean(
    selectedInteraction &&
      selectedInteraction.finalUserScore >= 7 &&
      selectedInteraction.finalPartnerScore >= 7,
  );

  const liveScene = useMemo(() => {
    if (!sortedSimulations.length) return null;
    const cycleMs = 7800;
    const idx = Math.floor(clockMs / cycleMs) % sortedSimulations.length;
    const active = sortedSimulations[idx];
    const phase = (clockMs % cycleMs) / cycleMs;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const playerStart = 10;
    const playerMeet = 41;
    const partnerStart = 83;
    const partnerMeet = 58;

    let playerX = playerStart;
    let partnerX = partnerStart;
    if (phase < 0.35) {
      const t = phase / 0.35;
      playerX = lerp(playerStart, playerMeet, t);
      partnerX = lerp(partnerStart, partnerMeet, t);
    } else if (phase < 0.72) {
      playerX = playerMeet;
      partnerX = partnerMeet;
    } else {
      const t = (phase - 0.72) / 0.28;
      playerX = lerp(playerMeet, playerStart, t);
      partnerX = lerp(partnerMeet, partnerStart, t);
    }

    const rounds = active.rounds.length
      ? active.rounds
      : [{ speaker: active.partner.name, text: "No conversation generated.", score: 5 }];
    const roundIndex = Math.min(rounds.length - 1, Math.floor(phase * rounds.length));

    return {
      active,
      playerX,
      partnerX,
      roundText: rounds[roundIndex]?.text ?? rounds[0].text,
      roundSpeaker: rounds[roundIndex]?.speaker ?? rounds[0].speaker,
    };
  }, [clockMs, sortedSimulations]);

  const runSimulation = async () => {
    if (!session?.playerSetup || !session.personality || !session.avatar || !session.loveAnswers) return;

    setSimLoading(true);
    setSimError(null);
    setRanSimulation(true);
    setIsLive(true);
    if (initializedPartners.length) {
      setSimulations(initializedPartners.map(placeholderInteraction));
    }

    try {
      const response = await fetch("/api/agent-simulate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerSetup: session.playerSetup,
          personality: session.personality,
          avatar: session.avatar,
          loveAnswers: session.loveAnswers,
          userAgent: session.userAgent,
        }),
      });

      if (!response.ok || !response.body) {
        let message = "Simulation failed.";
        try {
          const payload = (await response.json()) as { message?: string; error?: string };
          message = payload.error ?? payload.message ?? message;
        } catch {
          // Ignore JSON parse failures for error payloads.
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completedPayload: AgentSimulationResponse | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "error") {
            throw new Error(event.message || "Simulation failed.");
          }

          if (event.type === "init") {
            setInitializedPartners(event.partners ?? []);
            setSimulations((event.partners ?? []).map(placeholderInteraction));
            continue;
          }

          if (event.type === "interaction_update") {
            setSimulations((prev) => {
              return upsertInteraction(prev, {
                partner: event.partner,
                rounds: event.rounds,
                endedBy: event.endedBy,
                finalUserScore: event.finalUserScore,
                finalPartnerScore: event.finalPartnerScore,
                averageScore: event.averageScore,
              });
            });
            continue;
          }

          if (event.type === "interaction_done") {
            setSimulations((prev) => upsertInteraction(prev, event.interaction));
            continue;
          }

          if (event.type === "done") {
            completedPayload = {
              userAgent: event.userAgent,
              partners: event.partners,
              interactions: event.interactions,
            };
            setInitializedPartners(event.partners ?? initializedPartners);
            setSimulations(event.interactions ?? []);
          }
        }
      }

      if (completedPayload) {
        const nextCandidates = completedPayload.interactions.map(toCandidate);
        writeSession({
          ...session,
          userAgent: completedPayload.userAgent,
          candidates: nextCandidates,
        });
      }
    } catch (err) {
      setSimError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSimLoading(false);
    }
  };

  if (!session?.avatar || !session?.personality || !session?.loveAnswers || !session?.playerSetup) {
    return (
      <main className="pixel-grid-bg min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="pixel-card rounded-sm p-6">
            <h1 className="text-2xl">No avatar session found</h1>
            <p className="mt-3 text-xl text-[#c8b7f8]">Complete setup, quiz, avatar and preview first.</p>
            <Link href="/setup" className="pixel-button mt-5 inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
              Back to Setup
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
            Your avatar now interacts with 3 fixed partner agents (Angie, Yiling, Tom) using OpenAI-generated dialogue.
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

          <div className="mt-4">
            <p className="text-xl text-[#c8b7f8]">Potential matches:</p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {initializedPartners.map((partner) => (
                <div key={partner.id} className="rounded-sm border-2 border-[#120a23] bg-[#241544] p-2 text-lg">
                  <p className="text-[#ffdf84]">{partner.name}</p>
                  <p>
                    {partner.age} yrs | {partner.occupation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runSimulation()}
              disabled={simLoading}
              className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#64866a]"
            >
              {simLoading ? "Running OpenAI Simulation..." : "Run Agent Simulation"}
            </button>
            <button
              type="button"
              onClick={() => setIsLive((prev) => !prev)}
              disabled={!sortedSimulations.length}
              className="pixel-button bg-[#7f8da6] px-4 py-3 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#555]"
            >
              {isLive ? "Pause Animation" : "Resume Animation"}
            </button>
          </div>
          {simError && <p className="mt-3 text-lg text-[#ff8f8f]">{simError}</p>}
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
                        Active Agent: {liveScene.active.partner.name} | Compatibility {liveScene.active.averageScore}%
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
                        style={{ left: `${liveScene.partnerX}%` }}
                      >
                        <PixelAvatar avatar={liveScene.active.partner.avatar} size={78} />
                        <p className="mt-1 text-center text-sm text-[#ffdf84]">{liveScene.active.partner.name}</p>
                      </div>

                      <div className="absolute bottom-3 left-1/2 w-[92%] max-w-3xl -translate-x-1/2 rounded-sm border-2 border-[#120a23] bg-[#172d4d] p-2 text-sm text-[#d7eeff]">
                        <span className="text-[#7de48b]">{liveScene.roundSpeaker}: </span>
                        {liveScene.roundText}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="pixel-card rounded-sm p-5">
              <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Recommended Partners & Quest Hub</h2>
              <p className="mt-2 text-xl text-[#c8b7f8]">
                Select one of the top 3 simulated partners, then choose a quest. Quest launch is enabled only for mutual matches.
              </p>

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {sortedSimulations.map((item) => {
                  const selected = selectedInteraction?.partner.id === item.partner.id;
                  return (
                    <div key={item.partner.id} className="pixel-card rounded-sm p-3">
                      <div className="flex gap-3">
                        <PixelAvatar avatar={item.partner.avatar} size={64} />
                        <div>
                          <p className="text-xl text-[#ffdf84]">{item.partner.name}</p>
                          <p className="text-lg">Compatibility: {item.averageScore}%</p>
                          <p className="text-lg">
                            Mutual: {item.finalUserScore >= 7 && item.finalPartnerScore >= 7 ? "Yes" : "No"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-lg text-[#d9cdf8]">{item.partner.bio}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedPartnerId(item.partner.id)}
                        className={`pixel-button mt-3 px-3 py-2 text-sm ${
                          selected ? "bg-[#ffcb47] text-[#120a23]" : "bg-[#3e276f] text-[#f5ecff]"
                        }`}
                      >
                        {selected ? "Selected" : `Select ${item.partner.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedInteraction && (
                <div className="mt-4 rounded-sm border-2 border-[#120a23] bg-[#241544] p-3">
                  <p className="text-xl text-[#ffdf84]">
                    Selected Partner: {selectedInteraction.partner.name} ({selectedInteraction.averageScore}%)
                  </p>
                  <p className="mt-1 text-lg text-[#c8b7f8]">
                    User score: {selectedInteraction.finalUserScore}/10 | Partner score: {selectedInteraction.finalPartnerScore}/10
                  </p>
                  <p className="mt-1 text-lg text-[#c8b7f8]">
                    Status:{" "}
                    {isMutualMatch
                      ? "Mutual match confirmed. Quest buttons are enabled."
                      : "Not mutual yet (both scores must be at least 7/10)."}
                  </p>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {QUEST_DEFINITIONS.map((quest) => (
                  <div key={`hub-quest-${quest.id}`} className="pixel-card rounded-sm p-3">
                    <p className="text-xl text-[#ffdf84]">{quest.title}</p>
                    <p className="mt-1 text-lg text-[#d9cdf8]">{quest.description}</p>
                    <p className="mt-1 text-sm text-[#c8b7f8]">Best vibes: {quest.vibes.join(" | ")}</p>
                    {selectedInteraction && isMutualMatch ? (
                      <Link
                        href={`/quest/${selectedInteraction.partner.id}?questId=${encodeURIComponent(quest.id)}&name=${encodeURIComponent(quest.title)}`}
                        className="pixel-button mt-3 inline-block bg-[#7de48b] px-3 py-2 text-sm text-[#120a23]"
                      >
                        Start Quest with {selectedInteraction.partner.name}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="pixel-button mt-3 px-3 py-2 text-sm text-[#120a23] bg-[#6d6d6d] disabled:cursor-not-allowed"
                      >
                        Mutual Match Required
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="pixel-card rounded-sm p-5">
              <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Simulation Logs</h2>
              <div className="mt-3 space-y-3">
                {sortedSimulations.map((item) => (
                  <div key={`sim-${item.partner.id}`} className="rounded-sm border-2 border-[#120a23] bg-[#241544] p-3">
                    <p className="text-xl text-[#ffdf84]">
                      {item.partner.name} | User score: {item.finalUserScore}/10 | Partner score: {item.finalPartnerScore}/10
                    </p>
                    <p className="mt-1 text-lg text-[#c8b7f8]">
                      End condition:{" "}
                      {item.endedBy === "in-progress"
                        ? "Simulation running..."
                        : item.endedBy === "low-score"
                          ? "A score dropped below 7"
                          : "Reached 10 responses"}
                    </p>
                    <div className="mt-2 space-y-2">
                      {item.rounds.map((r, idx) => (
                        <p key={`${item.partner.id}-${idx}`} className="text-lg text-[#d7eeff]">
                          <span className="text-[#7de48b]">
                            {r.speaker} (score {r.score}/10):
                          </span>{" "}
                          {r.text}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/preview" className="pixel-button inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
            Back to Avatar Preview
          </Link>
          <Link href="/" className="pixel-button inline-block bg-[#7f8da6] px-4 py-3 text-base text-[#120a23]">
            Exit to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
