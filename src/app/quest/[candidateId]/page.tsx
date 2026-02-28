"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PixelAvatar } from "@/components/pixel-avatar";
import { getQuestById, getQuestByTitle } from "@/lib/quests";
import { QuestSession, readSession } from "@/lib/session";

type CandidateLite = {
  id: string;
  name: string;
  vibe: string;
};

type ChatMessage = {
  role: "user" | "partner";
  text: string;
};

type ContactInfo = {
  email: string;
  phone: string;
};

const FILL_STARTERS = [
  "When I'm stressed, I tend to ___",
  "Most people don't realise I'm actually ___",
  "I'm happiest when ___",
  "The thing I want most right now is ___",
  "I used to think ___, but now I think ___",
];

function normalizeMeaning(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameMeaning(a: string, b: string) {
  const left = normalizeMeaning(a);
  const right = normalizeMeaning(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftWords = new Set(left.split(" "));
  const rightWords = new Set(right.split(" "));
  const overlap = [...leftWords].filter((w) => rightWords.has(w)).length;
  const minSize = Math.max(1, Math.min(leftWords.size, rightWords.size));
  return overlap / minSize >= 0.5;
}

const MAX_CHAT_TURNS_PER_SIDE = 5;

export default function QuestPlayPage() {
  const params = useParams<{ candidateId: string }>();
  const searchParams = useSearchParams();
  const questName = searchParams.get("name") ?? "Quest";
  const questId = searchParams.get("questId");
  const [session] = useState<QuestSession | null>(() => readSession());

  const [truthStatements, setTruthStatements] = useState(["", "", ""]);
  const [truthLieIndex, setTruthLieIndex] = useState(0);
  const [partnerTruthStatements, setPartnerTruthStatements] = useState<string[]>([]);
  const [partnerTruthLieIndex, setPartnerTruthLieIndex] = useState<number | null>(null);
  const [partnerTruthGuess, setPartnerTruthGuess] = useState<number | null>(null);
  const [userTruthGuess, setUserTruthGuess] = useState<number | null>(null);

  const [hotTakeList, setHotTakeList] = useState(["", "", ""]);
  const [partnerHotTakes, setPartnerHotTakes] = useState<string[]>([]);
  const [partnerHotRatings, setPartnerHotRatings] = useState<number[]>([]);
  const [userHotRatings, setUserHotRatings] = useState([3, 3, 3]);

  const [fillUserAnswers, setFillUserAnswers] = useState(["", "", "", "", ""]);
  const [fillPartnerAnswers, setFillPartnerAnswers] = useState<string[]>([]);
  const [fillPartnerGuessesForUser, setFillPartnerGuessesForUser] = useState<string[]>([]);
  const [fillUserGuessesForPartner, setFillUserGuessesForPartner] = useState(["", "", "", "", ""]);

  const [stage, setStage] = useState<
    | "intro"
    | "truth-user-submit"
    | "truth-guess"
    | "hot-user-submit"
    | "hot-rate"
    | "fill-user-submit"
    | "fill-guess"
    | "reveal-chat"
  >("intro");
  const [conversationPrompt, setConversationPrompt] = useState("");
  const [contextSummary, setContextSummary] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [userInterest, setUserInterest] = useState<boolean | null>(null);
  const [partnerInterest, setPartnerInterest] = useState<boolean | null>(null);
  const [partnerDecisionReason, setPartnerDecisionReason] = useState("");
  const [partnerContact, setPartnerContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const candidate = useMemo(() => {
    if (!session?.candidates) return null;
    return session.candidates.find((c) => c.id === params.candidateId) ?? null;
  }, [session, params.candidateId]);

  const quest = useMemo(() => {
    return getQuestById(questId) ?? getQuestByTitle(questName);
  }, [questId, questName]);

  const isTruth = quest?.id === "quest-heartline";
  const isHotTake = quest?.id === "quest-cityglow";
  const isFillBlank = quest?.id === "quest-homehaven";

  const candidateLite: CandidateLite | null = candidate
    ? {
        id: candidate.id,
        name: candidate.name,
        vibe: candidate.vibe,
      }
    : null;

  const userTurnCount = chatMessages.filter((m) => m.role === "user").length;
  const partnerTurnCount = chatMessages.filter((m) => m.role === "partner").length;
  const userRemainingTurns = Math.max(0, MAX_CHAT_TURNS_PER_SIDE - userTurnCount);
  const partnerRemainingTurns = Math.max(0, MAX_CHAT_TURNS_PER_SIDE - partnerTurnCount);
  const chatEnded =
    stage === "reveal-chat" &&
    userTurnCount >= MAX_CHAT_TURNS_PER_SIDE &&
    partnerTurnCount >= MAX_CHAT_TURNS_PER_SIDE;

  useEffect(() => {
    if (stage !== "reveal-chat") return;
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages, stage]);

  const startQuest = () => {
    if (isTruth) setStage("truth-user-submit");
    else if (isHotTake) setStage("hot-user-submit");
    else if (isFillBlank) setStage("fill-user-submit");
  };

  const submitTruthRound = async () => {
    if (!candidateLite) return;
    if (truthStatements.some((s) => s.trim().length < 3)) {
      setError("Please enter 3 meaningful statements.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/quest-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "truth_setup",
          candidate: candidateLite,
          userStatements: truthStatements,
          userLieIndex: truthLieIndex,
        }),
      });
      const payload = (await response.json()) as {
        partnerStatements: string[];
        partnerLieIndex: number;
        partnerGuess: number;
      };
      setPartnerTruthStatements(payload.partnerStatements ?? []);
      setPartnerTruthLieIndex(payload.partnerLieIndex ?? 1);
      setPartnerTruthGuess(payload.partnerGuess ?? 1);
      setStage("truth-guess");
    } catch {
      setError("Could not prepare this round.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeTruthRound = () => {
    if (userTruthGuess === null || partnerTruthLieIndex === null || partnerTruthGuess === null || !candidate) {
      setError("Please choose which partner statement is the lie.");
      return;
    }

    const userCaughtPartner = userTruthGuess === partnerTruthLieIndex;
    const partnerCaughtUser = partnerTruthGuess === truthLieIndex;
    const prompt =
      userCaughtPartner && partnerCaughtUser
        ? "You both saw through each other. What made the lie obvious - or was it just a lucky guess?"
        : `${candidate.name} fooled you. What made you believe it? Tell each other which truth surprised you the most.`;

    setConversationPrompt(prompt);
    setContextSummary(
      `User lie index: ${truthLieIndex + 1}, Partner guessed: ${partnerTruthGuess + 1}, User guessed partner: ${userTruthGuess + 1}, Partner lie index: ${partnerTruthLieIndex + 1}.`,
    );
    setChatMessages([
      {
        role: "partner",
        text: `${prompt} We each have ${MAX_CHAT_TURNS_PER_SIDE} chat exchanges only. I will start: I thought your statement ${truthLieIndex + 1} sounded very believable.`,
      },
    ]);
    setUserInterest(null);
    setPartnerInterest(null);
    setPartnerDecisionReason("");
    setPartnerContact(null);
    setStage("reveal-chat");
  };

  const submitHotTakeRound = async () => {
    if (!candidateLite) return;
    if (hotTakeList.some((s) => s.trim().length < 5)) {
      setError("Please enter 3 opinions with enough detail.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/quest-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "hot_take_setup",
          candidate: candidateLite,
          userOpinions: hotTakeList,
        }),
      });
      const payload = (await response.json()) as {
        partnerOpinions: string[];
        partnerRatingsForUser: number[];
      };
      setPartnerHotTakes(payload.partnerOpinions ?? []);
      setPartnerHotRatings(payload.partnerRatingsForUser ?? [3, 3, 3]);
      setStage("hot-rate");
    } catch {
      setError("Could not prepare hot takes exchange.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeHotTakeRound = () => {
    if (!candidate) return;
    const minRating = Math.min(...userHotRatings);
    const minIdx = userHotRatings.findIndex((r) => r === minRating);
    const opinion = partnerHotTakes[minIdx] ?? "one opinion";
    const prompt = `You rated "${opinion}" a ${minRating}. ${candidate.name} clearly feels strongly about it. Ask them to make their case - and actually try to hear it.`;
    setConversationPrompt(prompt);
    setContextSummary(
      `User ratings for partner opinions: ${userHotRatings.join(", ")}. Partner ratings for user opinions: ${partnerHotRatings.join(", ")}.`,
    );
    setChatMessages([
      {
        role: "partner",
        text: `${prompt} We each have ${MAX_CHAT_TURNS_PER_SIDE} chat exchanges only. I know it sounds strong, but I care about this because of past experience.`,
      },
    ]);
    setUserInterest(null);
    setPartnerInterest(null);
    setPartnerDecisionReason("");
    setPartnerContact(null);
    setStage("reveal-chat");
  };

  const submitFillSetup = async () => {
    if (!candidateLite) return;
    if (fillUserAnswers.some((s) => s.trim().length < 3)) {
      setError("Please complete all 5 answers before submitting.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/quest-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fill_blank_setup",
          candidate: candidateLite,
          userAnswers: fillUserAnswers,
          starters: FILL_STARTERS,
        }),
      });
      const payload = (await response.json()) as {
        partnerAnswers: string[];
        partnerGuessesForUser: string[];
      };
      setFillPartnerAnswers(payload.partnerAnswers ?? []);
      setFillPartnerGuessesForUser(payload.partnerGuessesForUser ?? []);
      setStage("fill-guess");
    } catch {
      setError("Could not set up Fill in my blank.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeFillRound = () => {
    if (!candidate) return;
    if (fillUserGuessesForPartner.some((s) => s.trim().length < 2)) {
      setError("Please complete all 5 guesses for your partner.");
      return;
    }

    const mismatchIdx = fillPartnerGuessesForUser.findIndex(
      (guess, idx) => !sameMeaning(guess ?? "", fillUserAnswers[idx] ?? ""),
    );
    const index = mismatchIdx >= 0 ? mismatchIdx : 0;
    const guess = fillPartnerGuessesForUser[index] ?? "[guess]";
    const real = fillUserAnswers[index] ?? "[real answer]";

    const prompt = `${candidate.name} thought you'd say "${guess}" but you said "${real}." Where did that picture of you come from - and how far off were they?`;
    setConversationPrompt(prompt);
    setContextSummary(`Mismatch focus: sentence ${index + 1}.`);
    setChatMessages([
      {
        role: "partner",
        text: `${prompt} We each have ${MAX_CHAT_TURNS_PER_SIDE} chat exchanges only. I realize I projected a version of you too quickly.`,
      },
    ]);
    setUserInterest(null);
    setPartnerInterest(null);
    setPartnerDecisionReason("");
    setPartnerContact(null);
    setStage("reveal-chat");
  };

  const sendChat = async () => {
    if (!candidateLite || !quest || !chatInput.trim() || chatEnded) return;
    if (userTurnCount >= MAX_CHAT_TURNS_PER_SIDE) return;
    const userText = chatInput.trim();
    setChatInput("");
    const nextHistory = [...chatMessages, { role: "user" as const, text: userText }];
    setChatMessages(nextHistory);

    try {
      const response = await fetch("/api/quest-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          candidate: candidateLite,
          questTitle: quest.title,
          prompt: conversationPrompt,
          context: contextSummary,
          history: nextHistory,
          message: userText,
        }),
      });
      const payload = (await response.json()) as { reply?: string };
      setChatMessages((prev) => {
        if (prev.filter((m) => m.role === "partner").length >= MAX_CHAT_TURNS_PER_SIDE) return prev;
        return [...prev, { role: "partner", text: payload.reply ?? "I need a second to think about that." }];
      });
    } catch {
      setChatMessages((prev) => {
        if (prev.filter((m) => m.role === "partner").length >= MAX_CHAT_TURNS_PER_SIDE) return prev;
        return [...prev, { role: "partner", text: "I get your point. Tell me more." }];
      });
    }
  };

  const submitInterestDecision = async (interest: boolean) => {
    if (!candidateLite || !quest) return;
    setUserInterest(interest);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/quest-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "decision",
          candidate: candidateLite,
          questTitle: quest.title,
          context: contextSummary,
          history: chatMessages,
          userInterested: interest,
        }),
      });
      const payload = (await response.json()) as {
        partnerInterested: boolean;
        reason: string;
        partnerContact: ContactInfo;
      };
      setPartnerInterest(Boolean(payload.partnerInterested));
      setPartnerDecisionReason(payload.reason ?? "");
      setPartnerContact(payload.partnerContact ?? null);
    } catch {
      setPartnerInterest(interest);
      setPartnerDecisionReason(
        interest
          ? `${candidateLite.name} is open to continuing the engagement.`
          : `${candidateLite.name} is not continuing this engagement right now.`,
      );
      setPartnerContact({
        email: `${candidateLite.name.toLowerCase()}@lovealchemy-match.com`,
        phone: "+65 0000 0000",
      });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
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

        {stage === "intro" && (
          <section className="pixel-card rounded-sm p-5">
            <h2 className="text-2xl text-[#ffdf84]">Game Setup</h2>
            <p className="mt-2 text-xl text-[#c8b7f8]">This quest is input-driven. You and your match submit responses, then discuss with a guided prompt.</p>
            <button type="button" onClick={startQuest} className="pixel-button mt-4 bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
              Start Game
            </button>
          </section>
        )}

        {stage === "truth-user-submit" && (
          <section className="pixel-card rounded-sm p-5 space-y-3">
            <h2 className="text-2xl text-[#ffdf84]">Truth Signal: Your 2 truths and 1 lie</h2>
            {truthStatements.map((value, idx) => (
              <div key={`truth-${idx}`}>
                <label className="block text-xl">Statement {idx + 1}</label>
                <input
                  value={value}
                  onChange={(e) => setTruthStatements((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))}
                  className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
                />
              </div>
            ))}
            <div>
              <p className="text-xl">Which statement is your lie?</p>
              <div className="mt-2 flex gap-3">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={`lie-${idx}`}
                    type="button"
                    onClick={() => setTruthLieIndex(idx)}
                    className={`pixel-button px-3 py-2 text-sm ${truthLieIndex === idx ? "bg-[#ffcb47] text-[#120a23]" : "bg-[#3e276f] text-[#f5ecff]"}`}
                  >
                    Statement {idx + 1}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => void submitTruthRound()} disabled={loading} className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23]">
              {loading ? "Preparing..." : "Submit and Receive Partner Statements"}
            </button>
          </section>
        )}

        {stage === "truth-guess" && (
          <section className="pixel-card rounded-sm p-5 space-y-3">
            <h2 className="text-2xl text-[#ffdf84]">Guess {candidate.name}'s lie</h2>
            {partnerTruthStatements.map((statement, idx) => (
              <button
                key={`partner-statement-${idx}`}
                type="button"
                onClick={() => setUserTruthGuess(idx)}
                className={`block w-full rounded-sm border-2 p-3 text-left text-lg ${
                  userTruthGuess === idx ? "border-[#ffcb47] bg-[#3a275f]" : "border-[#120a23] bg-[#241544]"
                }`}
              >
                {idx + 1}. {statement}
              </button>
            ))}
            <button type="button" onClick={finalizeTruthRound} className="pixel-button bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
              Reveal and Continue to Chat
            </button>
          </section>
        )}

        {stage === "hot-user-submit" && (
          <section className="pixel-card rounded-sm p-5 space-y-3">
            <h2 className="text-2xl text-[#ffdf84]">Hot Take Exchange: Submit 3 opinions</h2>
            {hotTakeList.map((value, idx) => (
              <div key={`hot-${idx}`}>
                <label className="block text-xl">Opinion {idx + 1}</label>
                <textarea
                  value={value}
                  onChange={(e) => setHotTakeList((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))}
                  className="mt-1 min-h-20 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
                />
              </div>
            ))}
            <button type="button" onClick={() => void submitHotTakeRound()} disabled={loading} className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23]">
              {loading ? "Preparing..." : "Submit and Exchange Lists"}
            </button>
          </section>
        )}

        {stage === "hot-rate" && (
          <section className="pixel-card rounded-sm p-5 space-y-4">
            <h2 className="text-2xl text-[#ffdf84]">Rate each partner opinion (1-5)</h2>
            {partnerHotTakes.map((opinion, idx) => (
              <div key={`partner-opinion-${idx}`} className="rounded-sm border-2 border-[#120a23] bg-[#241544] p-3">
                <p className="text-lg">{opinion}</p>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={`rate-${idx}-${rating}`}
                      type="button"
                      onClick={() => setUserHotRatings((prev) => prev.map((n, i) => (i === idx ? rating : n)))}
                      className={`pixel-button px-2 py-1 text-sm ${userHotRatings[idx] === rating ? "bg-[#ffcb47] text-[#120a23]" : "bg-[#3e276f] text-[#f5ecff]"}`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-lg text-[#c8b7f8]">{candidate.name}'s ratings for your opinions: {partnerHotRatings.join(" / ")}</p>
            <button type="button" onClick={finalizeHotTakeRound} className="pixel-button bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
              Reveal Prompt and Continue to Chat
            </button>
          </section>
        )}

        {stage === "fill-user-submit" && (
          <section className="pixel-card rounded-sm p-5 space-y-4">
            <h2 className="text-2xl text-[#ffdf84]">Fill in my blank: Your real answers</h2>
            {FILL_STARTERS.map((starter, idx) => (
              <div key={`starter-${idx}`}>
                <label className="block text-xl">{starter}</label>
                <input
                  value={fillUserAnswers[idx]}
                  onChange={(e) => setFillUserAnswers((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))}
                  className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
                />
              </div>
            ))}
            <button type="button" onClick={() => void submitFillSetup()} disabled={loading} className="pixel-button bg-[#7de48b] px-4 py-3 text-base text-[#120a23]">
              {loading ? "Preparing..." : "Submit and Receive Partner Answers"}
            </button>
          </section>
        )}

        {stage === "fill-guess" && (
          <section className="pixel-card rounded-sm p-5 space-y-4">
            <h2 className="text-2xl text-[#ffdf84]">Guess {candidate.name}'s answers</h2>
            {FILL_STARTERS.map((starter, idx) => (
              <div key={`guess-${idx}`} className="rounded-sm border-2 border-[#120a23] bg-[#241544] p-3">
                <p className="text-lg">{starter}</p>
                <input
                  value={fillUserGuessesForPartner[idx]}
                  onChange={(e) => setFillUserGuessesForPartner((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))}
                  placeholder="Your best guess"
                  className="mt-2 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
                />
              </div>
            ))}
            <button type="button" onClick={finalizeFillRound} className="pixel-button bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
              Reveal and Continue to Chat
            </button>
          </section>
        )}

        {stage === "reveal-chat" && (
          <section className="pixel-card rounded-sm p-5 space-y-4">
            <h2 className="text-2xl text-[#ffdf84]">Conversation Prompt</h2>
            <p className="rounded-sm border-2 border-[#120a23] bg-[#241544] p-3 text-lg text-[#d7eeff]">{conversationPrompt}</p>

            {isFillBlank && fillPartnerAnswers.length > 0 && (
              <div className="space-y-2 rounded-sm border-2 border-[#120a23] bg-[#241544] p-3">
                <p className="text-lg text-[#ffdf84]">Reveal: guesses vs real answers</p>
                {FILL_STARTERS.map((starter, idx) => (
                  <div key={`reveal-${idx}`} className="text-sm text-[#d7eeff]">
                    <p>{starter}</p>
                    <p>User guessed for {candidate.name}: {fillUserGuessesForPartner[idx] || "-"}</p>
                    <p>{candidate.name} real answer: {fillPartnerAnswers[idx] || "-"}</p>
                    <p>{candidate.name} guessed for you: {fillPartnerGuessesForUser[idx] || "-"}</p>
                    <p>Your real answer: {fillUserAnswers[idx] || "-"}</p>
                  </div>
                ))}
              </div>
            )}

            <div ref={chatScrollRef} className="h-72 overflow-y-auto rounded-sm border-2 border-[#120a23] bg-[#1f1238] p-3">
              <div className="space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={`${msg.role}-${idx}`}
                    className={`max-w-[90%] rounded-sm border-2 p-3 text-lg ${
                      msg.role === "partner" ? "border-[#ffcb47] bg-[#3a275f] text-[#ffe9a8]" : "ml-auto border-[#7fc0ff] bg-[#1b3355] text-[#d7eeff]"
                    }`}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wide text-[#c8b7f8]">{msg.role === "partner" ? candidate.name : "You"}</p>
                    <p className="mt-1">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
                className="w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
                placeholder="Reply to continue the conversation..."
                disabled={chatEnded || userTurnCount >= MAX_CHAT_TURNS_PER_SIDE}
              />
              <button
                type="button"
                onClick={() => void sendChat()}
                disabled={chatEnded || userTurnCount >= MAX_CHAT_TURNS_PER_SIDE}
                className="pixel-button bg-[#7de48b] px-4 py-2 text-base text-[#120a23] disabled:cursor-not-allowed disabled:bg-[#64866a]"
              >
                Send
              </button>
            </div>

            <div className="rounded-sm border-2 border-[#120a23] bg-[#241544] p-2 text-sm text-[#c8b7f8]">
              Exchange limit: {MAX_CHAT_TURNS_PER_SIDE} each.
              <br />
              You have <span className="text-[#ffdf84]">{userRemainingTurns}</span> exchanges left.
              {"  "}
              {candidate.name} has <span className="text-[#ffdf84]">{partnerRemainingTurns}</span> exchanges left.
            </div>

            {chatEnded && (
              <div className="space-y-3 rounded-sm border-2 border-[#120a23] bg-[#241544] p-3">
                <p className="text-xl text-[#ffdf84]">Conversation ended. Continue engagement?</p>
                <p className="text-lg text-[#c8b7f8]">
                  The chat reached the maximum of {MAX_CHAT_TURNS_PER_SIDE} exchanges per side.
                </p>
                {userInterest === null ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void submitInterestDecision(true)}
                      disabled={loading}
                      className="pixel-button bg-[#7de48b] px-4 py-2 text-base text-[#120a23]"
                    >
                      I am interested
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitInterestDecision(false)}
                      disabled={loading}
                      className="pixel-button bg-[#7f8da6] px-4 py-2 text-base text-[#120a23]"
                    >
                      Not interested
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-lg text-[#d7eeff]">
                    <p>Your decision: {userInterest ? "Interested" : "Not interested"}</p>
                    {partnerInterest !== null && <p>{candidate.name}'s decision: {partnerInterest ? "Interested" : "Not interested"}</p>}
                    {partnerDecisionReason && <p>Partner note: {partnerDecisionReason}</p>}
                    {userInterest && partnerInterest && partnerContact && (
                      <div className="rounded-sm border-2 border-[#120a23] bg-[#1b3355] p-3">
                        <p className="text-[#ffdf84]">Mutual match confirmed. Contact info exchanged.</p>
                        <p>{candidate.name}'s email: {partnerContact.email}</p>
                        <p>{candidate.name}'s phone: {partnerContact.phone}</p>
                        <p>Your contact has been shared with {candidate.name} by the system.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {error && <p className="text-lg text-[#ff8f8f]">{error}</p>}

        <Link href="/partners" className="pixel-button inline-block bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
          Back to Arena
        </Link>
      </div>
    </main>
  );
}
