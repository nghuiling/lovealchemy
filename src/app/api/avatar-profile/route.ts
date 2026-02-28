import { NextRequest, NextResponse } from "next/server";
import { createPersonality, createSeed, generateAvatar, generateCandidates } from "@/lib/avatar-profile";
import { initializeUserAgent } from "@/lib/agent-simulation";
import { LoveAnswers } from "@/lib/love-quiz";
import { PlayerSetup } from "@/lib/session";
import { AvatarProfileResponse, PersonalityProfile } from "@/types/profile";

type BuildRequest = {
  playerSetup?: PlayerSetup;
  loveAnswers?: LoveAnswers;
  quizConversation?: Array<{
    question: string;
    answer: string;
  }>;
};

function sanitizeVibes(input: unknown, fallback: string[]) {
  if (!Array.isArray(input)) return fallback;
  const cleaned = input
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter((item) => item.length >= 2);
  const unique = [...new Set(cleaned)];
  return unique.length ? unique.slice(0, 3) : fallback;
}

function sanitizeTags(input: unknown, fallback: string[]) {
  if (!Array.isArray(input)) return fallback;
  const cleaned = input
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase().replace(/\s+/g, "-") : ""))
    .filter((item) => item.length >= 2);
  const unique = [...new Set(cleaned)];
  return unique.length ? unique.slice(0, 5) : fallback;
}

function parsePersonalityJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Partial<PersonalityProfile>;
  } catch {
    return null;
  }
}

async function generateDynamicPersonality(input: {
  playerSetup: PlayerSetup;
  loveAnswers: LoveAnswers;
  quizConversation: Array<{ question: string; answer: string }>;
  fallback: PersonalityProfile;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  if (!apiKey) return input.fallback;

  const transcript =
    input.quizConversation.length > 0
      ? input.quizConversation.map((item, index) => `${index + 1}. Q: ${item.question}\nA: ${item.answer}`).join("\n\n")
      : Object.entries(input.loveAnswers)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, answer]) => `${id}: ${answer}`)
          .join("\n");

  const prompt = [
    "You are generating a dating-game personality profile from a player's interview conversation.",
    "Infer personality only from the provided data.",
    "Return strict JSON only with keys:",
    "coreVibe (string), communicationStyle (string), relationshipFocus (string), loveStyle (string), topVibes (array of 2-3 strings), tags (array of 3-5 short tags).",
    "",
    `Player setup: name=${input.playerSetup.name}, gender=${input.playerSetup.gender}, lookingFor=${input.playerSetup.lookingForGender}.`,
    "Conversation transcript:",
    transcript,
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return input.fallback;
    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    const outputText =
      payload.output_text?.trim() ||
      payload.output?.flatMap((p) => p.content ?? []).find((p) => p.type === "output_text" && typeof p.text === "string")
        ?.text;
    if (!outputText) return input.fallback;

    const parsed = parsePersonalityJson(outputText);
    if (!parsed) return input.fallback;

    return {
      coreVibe:
        typeof parsed.coreVibe === "string" && parsed.coreVibe.trim()
          ? parsed.coreVibe.trim()
          : input.fallback.coreVibe,
      communicationStyle:
        typeof parsed.communicationStyle === "string" && parsed.communicationStyle.trim()
          ? parsed.communicationStyle.trim()
          : input.fallback.communicationStyle,
      relationshipFocus:
        typeof parsed.relationshipFocus === "string" && parsed.relationshipFocus.trim()
          ? parsed.relationshipFocus.trim()
          : input.fallback.relationshipFocus,
      loveStyle:
        typeof parsed.loveStyle === "string" && parsed.loveStyle.trim()
          ? parsed.loveStyle.trim()
          : input.fallback.loveStyle,
      topVibes: sanitizeVibes(parsed.topVibes, input.fallback.topVibes),
      tags: sanitizeTags(parsed.tags, input.fallback.tags),
    } satisfies PersonalityProfile;
  } catch {
    return input.fallback;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BuildRequest;
  const playerSetup = body.playerSetup;
  const loveAnswers = body.loveAnswers;
  const quizConversation = body.quizConversation ?? [];

  if (!playerSetup || !loveAnswers) {
    return NextResponse.json({ error: "playerSetup and loveAnswers are required." }, { status: 400 });
  }

  const fallbackPersonality = createPersonality(playerSetup, loveAnswers);
  const personality = await generateDynamicPersonality({
    playerSetup,
    loveAnswers,
    quizConversation,
    fallback: fallbackPersonality,
  });
  const conversationSeedBase =
    quizConversation.length > 0
      ? quizConversation.map((item) => `${item.question}:${item.answer}`).join("|")
      : Object.values(loveAnswers).join("|");
  const seed = createSeed(
    `${playerSetup.name}-${playerSetup.birthDate}-${playerSetup.location}-${playerSetup.gender}-${conversationSeedBase}-${personality.coreVibe}`,
  );
  const primaryVibe = personality.topVibes[0] ?? "balanced";
  const avatar = generateAvatar(primaryVibe, seed, playerSetup.gender);
  const candidates = generateCandidates(primaryVibe, seed);
  const userAgent = initializeUserAgent({
    setup: playerSetup,
    personality,
    avatar,
  });

  const response: AvatarProfileResponse = {
    avatar,
    personality,
    candidates,
    userAgent,
  };

  return NextResponse.json(response);
}
