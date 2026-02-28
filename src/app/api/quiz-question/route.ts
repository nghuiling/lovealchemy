import { NextRequest, NextResponse } from "next/server";
import { PlayerSetup } from "@/lib/session";

type QuizExchange = {
  question: string;
  answer: string;
};

type QuizQuestionRequest = {
  playerSetup?: PlayerSetup;
  exchanges?: QuizExchange[];
};

const FALLBACK_QUESTIONS = [
  "What usually makes you feel emotionally safe with someone new?",
  "When you like someone, what is your natural communication style?",
  "How do you prefer to resolve misunderstandings in relationships?",
  "What kind of lifestyle rhythm do you want with a partner?",
  "What values matter most when choosing a long-term partner?",
  "How do you show care when someone you love is stressed?",
  "What pace feels right when building emotional intimacy?",
  "What does a healthy boundary look like for you in dating?",
  "What type of dates make you feel most connected?",
  "What would make a relationship feel truly fulfilling to you?",
];

function fallbackQuestion(index: number) {
  return FALLBACK_QUESTIONS[index % FALLBACK_QUESTIONS.length];
}

function parseGeneratedQuestion(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof root.output_text === "string" && root.output_text.trim()) {
    return root.output_text.trim();
  }

  const firstText = root.output
    ?.flatMap((item) => item.content ?? [])
    .find((part) => part.type === "output_text" && typeof part.text === "string")?.text;
  return firstText?.trim() ?? null;
}

function sanitizeQuestion(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.endsWith("?") ? cleaned : `${cleaned}?`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as QuizQuestionRequest;
  const exchanges = body.exchanges ?? [];
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    return NextResponse.json({ question: fallbackQuestion(exchanges.length) });
  }

  const profileLine = body.playerSetup
    ? `Name: ${body.playerSetup.name}. Gender: ${body.playerSetup.gender}. Looking for: ${body.playerSetup.lookingForGender}.`
    : "Player setup unavailable.";

  const conversation = exchanges
    .map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`)
    .join("\n\n");

  const prompt = [
    "You are a dating personality interviewer chatbot.",
    "Ask exactly one concise next question to learn personality and relationship style.",
    "Rules:",
    "- Ask one question only.",
    "- Avoid repeating prior topics.",
    "- Keep it under 20 words.",
    "- Return plain text question only, no labels.",
    "",
    profileLine,
    conversation ? `Previous Q&A:\n${conversation}` : "No previous Q&A yet.",
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
      return NextResponse.json({ question: fallbackQuestion(exchanges.length) });
    }

    const payload = (await response.json()) as unknown;
    const generated = parseGeneratedQuestion(payload);
    const question = sanitizeQuestion(generated ?? "");
    return NextResponse.json({ question: question ?? fallbackQuestion(exchanges.length) });
  } catch {
    return NextResponse.json({ question: fallbackQuestion(exchanges.length) });
  }
}
