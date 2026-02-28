import { NextRequest, NextResponse } from "next/server";
import { LoveAnswers } from "@/lib/love-quiz";
import { PersonalityProfile } from "@/types/profile";

type AvatarChatRequest = {
  message?: string;
  personality?: PersonalityProfile;
  loveAnswers?: LoveAnswers;
  quizConversation?: Array<{
    question: string;
    answer: string;
  }>;
  history?: Array<{
    role: "user" | "avatar";
    text: string;
  }>;
};

function fallbackReply(message: string, personality: PersonalityProfile) {
  const vibe = personality.coreVibe.toLowerCase();
  const direct = personality.communicationStyle.toLowerCase().includes("direct");
  if (/date|first date|plan/.test(message.toLowerCase())) {
    return direct
      ? `go for a clear, low-pressure plan. your ${vibe} vibe works best when both sides feel comfortable and honest.`
      : `pick a calm date with room to talk. your ${vibe} vibe connects better through emotional ease.`;
  }
  if (/red flag|toxic|avoid/.test(message.toLowerCase())) {
    return "watch for inconsistency between words and actions. your best match should feel emotionally steady, not confusing.";
  }
  return "that makes sense. tell me one real situation and i will help you respond in a way that fits your vibe.";
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
  const quizConversation = body.quizConversation ?? [];

  if (!message || !personality || !loveAnswers) {
    return NextResponse.json(
      { error: "message, personality and loveAnswers are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  if (!apiKey) {
    return NextResponse.json({ reply: fallbackReply(message, personality) });
  }

  const quizContext =
    quizConversation.length > 0
      ? quizConversation
          .map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`)
          .join("\n\n")
      : Object.entries(loveAnswers)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, answer]) => `${id}: ${answer}`)
          .join("\n");

  const historyText = history
    .slice(-10)
    .map((item) => `${item.role === "avatar" ? "Avatar" : "User"}: ${item.text}`)
    .join("\n");

  const prompt = [
    "You are the user's own avatar chatting in first person.",
    "Tone: warm, casual, supportive, concise, no emojis.",
    "Use the player's personality profile to keep voice consistent.",
    "Reply in 1-3 sentences and include one useful next-step suggestion when relevant.",
    "",
    `Personality profile:`,
    `coreVibe: ${personality.coreVibe}`,
    `communicationStyle: ${personality.communicationStyle}`,
    `relationshipFocus: ${personality.relationshipFocus}`,
    `loveStyle: ${personality.loveStyle}`,
    `topVibes: ${personality.topVibes.join(", ")}`,
    `tags: ${personality.tags.join(", ")}`,
    "",
    "Step 2 interview context:",
    quizContext,
    "",
    historyText ? `Recent chat history:\n${historyText}` : "No prior history.",
    `Latest user message: ${message}`,
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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ reply: fallbackReply(message, personality) });
    }

    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    const reply =
      payload.output_text?.trim() ||
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .find((part) => part.type === "output_text" && typeof part.text === "string")
        ?.text?.trim();

    if (!reply) {
      return NextResponse.json({ reply: fallbackReply(message, personality) });
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: fallbackReply(message, personality) });
  }
}
