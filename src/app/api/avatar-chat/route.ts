import { NextRequest, NextResponse } from "next/server";
import { buildLoveProfile, LoveAnswers } from "@/lib/love-quiz";
import { PersonalityProfile } from "@/types/profile";

type AvatarChatRequest = {
  message?: string;
  personality?: PersonalityProfile;
  loveAnswers?: LoveAnswers;
  history?: Array<{
    role: "user" | "avatar";
    text: string;
  }>;
};

const STYLE_VOICES: Record<string, string[]> = {
  "calm-romantic": [
    "I like slow, meaningful bonding and thoughtful moments.",
    "I choose emotional safety and authenticity first.",
  ],
  playful: [
    "I keep romance fun and energetic with surprise moments.",
    "I feel attraction through laughter and spontaneity.",
  ],
  secure: [
    "I value consistency and actions that match words.",
    "I trust slow and steady effort over grand speeches.",
  ],
  adventurous: [
    "I connect best through shared adventures and new experiences.",
    "I like momentum and mutual curiosity in relationships.",
  ],
};

function pickBySeed(items: string[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

function keywordAdvice(message: string, personality: PersonalityProfile, tags: string[]) {
  const m = message.toLowerCase();
  if (/date|first date|plan/.test(m)) {
    if (/bold|expressive/.test(personality.coreVibe)) return "go for something active and a little playful so chemistry can show up naturally.";
    if (/deep|intuitive/.test(personality.coreVibe)) return "pick a calm place where both of you can actually talk and feel heard.";
    if (/steady|grounded/.test(personality.coreVibe)) return "keep it cozy and low-pressure so trust builds naturally.";
    return "something simple with room to talk usually works best.";
  }
  if (/red flag|toxic|avoid/.test(m)) {
    if (tags.includes("secure")) return "watch for people who are inconsistent with effort. you need reliability.";
    if (tags.includes("free-spirit")) return "watch out for controlling behavior. you need room to breathe.";
    return "watch for mixed signals, poor listening, and repeated broken promises.";
  }
  if (/love|relationship|match/.test(m)) {
    return "your best match is someone whose pace and communication feel easy with you, not forced.";
  }
  return "tell me a bit more and i can give you something more specific.";
}

function conversationalDetail(
  message: string,
  personality: PersonalityProfile,
  tags: string[],
  history: Array<{ role: "user" | "avatar"; text: string }>,
) {
  const lowered = message.toLowerCase();
  const lastUser = [...history].reverse().find((h) => h.role === "user");
  if (/first date|date/.test(lowered)) {
    return personality.relationshipFocus.includes("stability")
      ? "somewhere comfortable, easy to talk, and low pressure is probably your best move."
      : "something with movement and fun usually lets your personality land better.";
  }
  if (/text|message|reply/.test(lowered)) {
    return tags.includes("direct")
      ? "be clear and warm. one sincere message is better than overthinking."
      : "be honest about what you feel and ask one thoughtful question back.";
  }
  if (/red flag|toxic|avoid/.test(lowered)) {
    return "also trust your gut when someone feels emotionally unavailable, even if the words sound nice.";
  }
  if (lastUser && lastUser.text !== message) {
    return "based on what you said earlier, i’d prioritize someone whose rhythm feels steady with yours.";
  }
  return "if you want, give me one real situation and i’ll help you draft what to say.";
}

function followUpQuestion(message: string) {
  const m = message.toLowerCase();
  if (/date|first date|plan/.test(m)) return "do you want more cute, calm, or adventurous vibes?";
  if (/text|message|reply/.test(m)) return "want me to draft a message in your tone?";
  if (/red flag|toxic|avoid/.test(m)) return "has anything specific happened that made you feel unsure?";
  return "what part feels hardest for you right now?";
}

export async function POST(req: NextRequest) {
  let body: AvatarChatRequest;
  try {
    body = (await req.json()) as AvatarChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = body.message?.trim();
  const personality = body.personality;
  const loveAnswers = body.loveAnswers;
  const history = body.history ?? [];

  if (!message || !personality || !loveAnswers) {
    return NextResponse.json(
      { error: "message, personality and loveAnswers are required." },
      { status: 400 },
    );
  }

  const loveProfile = buildLoveProfile(loveAnswers);
  const style = loveProfile.tags[0] ?? "secure";
  const basePool = STYLE_VOICES[style] ?? STYLE_VOICES.secure;
  const base = pickBySeed(basePool, message.length + style.length);
  const advice = keywordAdvice(message, personality, loveProfile.tags);
  const detail = conversationalDetail(message, personality, loveProfile.tags, history);
  const followUp = followUpQuestion(message);
  const introOptions = [
    `hmm, ${message.length < 20 ? "i get what you mean." : "that makes sense."}`,
    "okay, i hear you.",
    "honestly, i get where you're coming from.",
  ];
  const intro = pickBySeed(introOptions, message.length + history.length).replace(/\s+/g, " ");

  const reply = `${intro} ${base.toLowerCase()} ${advice} ${detail} ${followUp}`;

  return NextResponse.json({ reply });
}
