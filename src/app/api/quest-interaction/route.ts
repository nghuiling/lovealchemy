import { NextRequest, NextResponse } from "next/server";

type CandidateLite = {
  id: string;
  name: string;
  vibe: string;
};

type QuestInteractionRequest =
  | {
      mode: "truth_setup";
      candidate: CandidateLite;
      userStatements: string[];
      userLieIndex: number;
    }
  | {
      mode: "hot_take_setup";
      candidate: CandidateLite;
      userOpinions: string[];
    }
  | {
      mode: "fill_blank_setup";
      candidate: CandidateLite;
      userAnswers: string[];
      starters: string[];
    }
  | {
      mode: "chat";
      candidate: CandidateLite;
      questTitle: string;
      prompt: string;
      context: string;
      history: Array<{ role: "user" | "partner"; text: string }>;
      message: string;
    }
  | {
      mode: "decision";
      candidate: CandidateLite;
      questTitle: string;
      context: string;
      history: Array<{ role: "user" | "partner"; text: string }>;
      userInterested: boolean;
    };

function pick<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

function safeJsonParse<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

async function callModel(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.8,
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text =
    payload.output_text?.trim() ||
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((part) => part.type === "output_text" && typeof part.text === "string")
      ?.text?.trim();
  return text ?? null;
}

function fallbackTruth(candidate: CandidateLite, userLieIndex: number, seed: number) {
  const packs: Record<string, string[][]> = {
    adventurous: [
      ["I did a sunrise hike before work last month.", "I dislike all outdoor activities.", "I once learned to surf in one day."],
      ["I enjoy trying new adrenaline activities.", "I have never taken a spontaneous trip.", "I can spend all day outdoors."],
    ],
    calm: [
      ["I can spend hours reading in a cafe.", "I hate meaningful conversations.", "I prefer quieter date plans."],
      ["I keep a small journal for reflections.", "I only like loud and crowded dates.", "I value emotional steadiness."],
    ],
  };

  const pool = packs[candidate.vibe] ?? packs.calm;
  const statements = pick(pool, seed);
  const partnerLieIndex = statements.findIndex((s) => /dislike|never|hate|only like loud/.test(s.toLowerCase()));
  const partnerGuess = seed % 3;
  return {
    partnerStatements: statements,
    partnerLieIndex: partnerLieIndex >= 0 ? partnerLieIndex : 1,
    partnerGuess,
    partnerReason: `${candidate.name} guessed from wording style and confidence level.`,
  };
}

function fallbackHotTake(candidate: CandidateLite, seed: number) {
  const opinionsPool = [
    "First dates should be short, not dinner-length.",
    "Texting chemistry matters less than in-person energy.",
    "Couples should schedule difficult conversations.",
    "Shared routines are more romantic than surprises.",
    "Not every red flag is a dealbreaker.",
  ];
  const partnerOpinions = [opinionsPool[seed % 5], opinionsPool[(seed + 2) % 5], opinionsPool[(seed + 4) % 5]];
  const partnerRatingsForUser = [3, 4, 2].map((x, i) => ((x + seed + i) % 5) + 1);
  return {
    partnerOpinions,
    partnerRatingsForUser,
  };
}

function fallbackFillBlank(candidate: CandidateLite, starters: string[], userAnswers: string[]) {
  const partnerAnswers = starters.map((starter, idx) => {
    if (starter.includes("stressed")) return idx % 2 === 0 ? "go quiet and need time alone" : "go for a walk to reset";
    if (starter.includes("don't realise")) return "more sensitive than I look";
    if (starter.includes("happiest")) return "conversation feels honest and easy";
    if (starter.includes("want most")) return "a dependable and emotionally mature relationship";
    return "being right was most important, but now I value understanding";
  });

  const partnerGuessesForUser = userAnswers.map((a, idx) => (idx % 2 === 0 ? a.split(" ").slice(0, 4).join(" ") : "staying productive and focused"));
  return {
    partnerAnswers,
    partnerGuessesForUser,
  };
}

function buildContact(candidate: CandidateLite) {
  const name = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const phoneSeed = Math.abs(
    Array.from(candidate.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
  )
    .toString()
    .padStart(8, "0")
    .slice(0, 8);
  return {
    email: `${name}@lovealchemy-match.com`,
    phone: `+65 ${phoneSeed.slice(0, 4)} ${phoneSeed.slice(4, 8)}`,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as QuestInteractionRequest;

  if (body.mode === "truth_setup") {
    const seed = body.userStatements.join("|").length + body.candidate.name.length;
    const fallback = fallbackTruth(body.candidate, body.userLieIndex, seed);
    const prompt = [
      "Create a 2-truths-1-lie set for a dating game partner.",
      `Partner profile: ${body.candidate.name}, vibe ${body.candidate.vibe}.`,
      `User submitted: ${body.userStatements.join(" | ")}. User lie index: ${body.userLieIndex}.`,
      "Return strict JSON with keys: partnerStatements(string[3]), partnerLieIndex(number 0-2), partnerGuess(number 0-2), partnerReason(string).",
    ].join("\n");

    const text = await callModel(prompt);
    const parsed = text ? safeJsonParse<{ partnerStatements?: string[]; partnerLieIndex?: number; partnerGuess?: number; partnerReason?: string }>(text) : null;
    const statements = parsed?.partnerStatements?.filter((s) => typeof s === "string" && s.trim().length > 0) ?? fallback.partnerStatements;
    return NextResponse.json({
      partnerStatements: statements.slice(0, 3),
      partnerLieIndex:
        typeof parsed?.partnerLieIndex === "number" && parsed.partnerLieIndex >= 0 && parsed.partnerLieIndex <= 2
          ? parsed.partnerLieIndex
          : fallback.partnerLieIndex,
      partnerGuess:
        typeof parsed?.partnerGuess === "number" && parsed.partnerGuess >= 0 && parsed.partnerGuess <= 2
          ? parsed.partnerGuess
          : fallback.partnerGuess,
      partnerReason: parsed?.partnerReason?.trim() || fallback.partnerReason,
    });
  }

  if (body.mode === "hot_take_setup") {
    const seed = body.userOpinions.join("|").length + body.candidate.name.length;
    const fallback = fallbackHotTake(body.candidate, seed);
    const prompt = [
      "Generate partner hot takes and ratings for a dating game.",
      `Partner profile: ${body.candidate.name}, vibe ${body.candidate.vibe}.`,
      `User hot takes: ${body.userOpinions.join(" | ")}.`,
      "Return strict JSON with keys: partnerOpinions(string[3]), partnerRatingsForUser(number[3], each 1-5).",
    ].join("\n");

    const text = await callModel(prompt);
    const parsed = text ? safeJsonParse<{ partnerOpinions?: string[]; partnerRatingsForUser?: number[] }>(text) : null;
    const partnerOpinions = parsed?.partnerOpinions?.filter((s) => typeof s === "string" && s.trim().length > 0) ?? fallback.partnerOpinions;
    const partnerRatingsForUser =
      parsed?.partnerRatingsForUser?.map((n) => Math.max(1, Math.min(5, Number(n) || 3))).slice(0, 3) ?? fallback.partnerRatingsForUser;
    return NextResponse.json({
      partnerOpinions: partnerOpinions.slice(0, 3),
      partnerRatingsForUser,
    });
  }

  if (body.mode === "fill_blank_setup") {
    const fallback = fallbackFillBlank(body.candidate, body.starters, body.userAnswers);
    const prompt = [
      "Generate partner fill-in-the-blank answers and guesses for a dating game.",
      `Partner profile: ${body.candidate.name}, vibe ${body.candidate.vibe}.`,
      `Sentence starters: ${body.starters.join(" | ")}.`,
      `User real answers: ${body.userAnswers.join(" | ")}.`,
      "Return strict JSON with keys: partnerAnswers(string[5]), partnerGuessesForUser(string[5]).",
    ].join("\n");

    const text = await callModel(prompt);
    const parsed = text ? safeJsonParse<{ partnerAnswers?: string[]; partnerGuessesForUser?: string[] }>(text) : null;
    const partnerAnswers = parsed?.partnerAnswers?.filter((s) => typeof s === "string" && s.trim().length > 0) ?? fallback.partnerAnswers;
    const partnerGuessesForUser =
      parsed?.partnerGuessesForUser?.filter((s) => typeof s === "string" && s.trim().length > 0) ?? fallback.partnerGuessesForUser;
    return NextResponse.json({
      partnerAnswers: partnerAnswers.slice(0, 5),
      partnerGuessesForUser: partnerGuessesForUser.slice(0, 5),
    });
  }

  if (body.mode === "chat") {
    const fallback = `I see what you mean. ${body.candidate.name} would probably say: let's unpack it and be honest about what surprised us.`;
    const prompt = [
      `You are ${body.candidate.name}, the partner avatar in a dating mini-game.`,
      `Quest: ${body.questTitle}`,
      `Conversation starter prompt: ${body.prompt}`,
      `Game context: ${body.context}`,
      "Reply naturally in 1-3 short sentences.",
      "Be curious, warm, and specific to the game context.",
      body.history.length
        ? `Recent history:\n${body.history.map((m) => `${m.role === "user" ? "User" : body.candidate.name}: ${m.text}`).join("\n")}`
        : "No prior messages.",
      `User message: ${body.message}`,
    ].join("\n");

    const text = await callModel(prompt);
    return NextResponse.json({ reply: text?.trim() || fallback });
  }

  if (body.mode === "decision") {
    const fallbackInterested = body.userInterested;
    const fallbackReason = fallbackInterested
      ? `${body.candidate.name} feels the conversation had enough alignment to continue.`
      : `${body.candidate.name} prefers to stop here for now.`;

    const prompt = [
      `You are ${body.candidate.name}, deciding if you want to continue engagement after a dating game conversation.`,
      `Quest: ${body.questTitle}`,
      `Context: ${body.context}`,
      `User interest: ${body.userInterested ? "yes" : "no"}`,
      body.history.length
        ? `Conversation history:\n${body.history.map((m) => `${m.role === "user" ? "User" : body.candidate.name}: ${m.text}`).join("\n")}`
        : "No history.",
      'Return strict JSON: {"partnerInterested":true|false,"reason":"short reason"}',
    ].join("\n");

    const text = await callModel(prompt);
    const parsed = text
      ? safeJsonParse<{ partnerInterested?: boolean; reason?: string }>(text)
      : null;

    const partnerInterested =
      typeof parsed?.partnerInterested === "boolean"
        ? parsed.partnerInterested
        : fallbackInterested;
    const reason = parsed?.reason?.trim() || fallbackReason;

    return NextResponse.json({
      partnerInterested,
      reason,
      partnerContact: buildContact(body.candidate),
    });
  }

  return NextResponse.json({ error: "Unsupported mode." }, { status: 400 });
}
