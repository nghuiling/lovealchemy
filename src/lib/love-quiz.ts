export type LoveQuestion = {
  id: string;
  dimension: "communication" | "focus" | "love-style" | "vibe" | "pace";
  question: string;
  suggestions: string[];
};

export type LoveAnswers = Record<string, string>;

export const LOVE_QUESTIONS: LoveQuestion[] = [
  {
    id: "q1",
    dimension: "communication",
    question: "When there is conflict, how do you want your partner to talk with you?",
    suggestions: ["be direct and clear", "be gentle and reassuring", "give me space first"],
  },
  {
    id: "q2",
    dimension: "focus",
    question: "What relationship goal matters most for you now?",
    suggestions: ["long-term stability", "strong chemistry", "growth together"],
  },
  {
    id: "q3",
    dimension: "love-style",
    question: "How do you naturally show love?",
    suggestions: ["quality time and listening", "acts of care", "words and affection"],
  },
  {
    id: "q4",
    dimension: "vibe",
    question: "Which date vibe feels most like you?",
    suggestions: ["cozy and calm", "fun and playful", "deep and thoughtful"],
  },
  {
    id: "q5",
    dimension: "pace",
    question: "How fast do you want a connection to progress emotionally?",
    suggestions: ["slow and steady", "balanced pace", "fast when it feels right"],
  },
];

export function createInitialLoveAnswers(): LoveAnswers {
  return LOVE_QUESTIONS.reduce<LoveAnswers>((acc, q) => {
    acc[q.id] = "";
    return acc;
  }, {});
}

export function allLoveQuestionsAnswered(answers: LoveAnswers) {
  return LOVE_QUESTIONS.every((q) => (answers[q.id] ?? "").trim().length >= 2);
}

function hasAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

function parseCommunication(answer: string) {
  const t = answer.toLowerCase();
  if (hasAny(t, ["direct", "clear", "honest", "straight"])) return "direct and clear";
  if (hasAny(t, ["gentle", "soft", "reassure", "kind", "patient"])) return "gentle and emotionally safe";
  if (hasAny(t, ["space", "time", "pause"])) return "space-first then calm discussion";
  return "balanced and respectful";
}

function parseFocus(answer: string) {
  const t = answer.toLowerCase();
  if (hasAny(t, ["long-term", "stable", "stability", "commitment", "peace"])) return "long-term stability";
  if (hasAny(t, ["chemistry", "passion", "spark", "excite"])) return "chemistry and attraction";
  if (hasAny(t, ["growth", "build", "partner", "future"])) return "growth and partnership";
  return "balanced connection";
}

function parseLoveStyle(answer: string) {
  const t = answer.toLowerCase();
  if (hasAny(t, ["quality time", "listen", "conversation", "present"])) return "present and attentive";
  if (hasAny(t, ["care", "help", "support", "service", "actions"])) return "practical and caring";
  if (hasAny(t, ["words", "affection", "text", "compliment", "express"])) return "expressive and verbal";
  return "warm and balanced";
}

function parseVibes(vibeAnswer: string, paceAnswer: string) {
  const v = vibeAnswer.toLowerCase();
  const p = paceAnswer.toLowerCase();

  const vibes: string[] = [];
  if (hasAny(v, ["cozy", "calm", "peace", "home"])) vibes.push("cozy", "calm");
  if (hasAny(v, ["fun", "playful", "adventure", "active"])) vibes.push("playful", "adventurous");
  if (hasAny(v, ["deep", "thoughtful", "intellectual", "talk"])) vibes.push("intellectual", "romantic");

  if (hasAny(p, ["slow", "steady"])) vibes.push("calm", "organized");
  if (hasAny(p, ["fast", "chemistry", "right"])) vibes.push("playful", "romantic");
  if (hasAny(p, ["balanced"])) vibes.push("cozy", "organized");

  const counts = vibes.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});

  const topVibes = Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 2);

  return topVibes.length ? topVibes : ["cozy", "calm"];
}

export function buildLoveProfile(answers: LoveAnswers) {
  const q1 = (answers.q1 ?? "").trim();
  const q2 = (answers.q2 ?? "").trim();
  const q3 = (answers.q3 ?? "").trim();
  const q4 = (answers.q4 ?? "").trim();
  const q5 = (answers.q5 ?? "").trim();

  const communicationStyle = parseCommunication(q1);
  const relationshipFocus = parseFocus(q2);
  const loveStyle = parseLoveStyle(q3);
  const topVibes = parseVibes(q4, q5);

  const tags = [
    communicationStyle.includes("direct") ? "direct" : "empathetic",
    relationshipFocus.includes("stability")
      ? "secure"
      : relationshipFocus.includes("chemistry")
        ? "passionate"
        : "growth",
    loveStyle.includes("practical")
      ? "practical-love"
      : loveStyle.includes("verbal")
        ? "verbal-affection"
        : "quality-time",
    q5.toLowerCase().includes("slow")
      ? "slow-burn"
      : q5.toLowerCase().includes("fast")
        ? "fast-burn"
        : "balanced-pace",
  ];

  const completeness = [q1, q2, q3, q4, q5].filter((a) => a.length > 5).length;
  const compatibilityBonus = 5 + completeness * 2;

  return {
    communicationStyle,
    relationshipFocus,
    loveStyle,
    compatibilityBonus,
    topVibes,
    tags,
  };
}

export function adjustedCompatibility(base: number, candidateVibe: string, answers: LoveAnswers) {
  const profile = buildLoveProfile(answers);
  const lower = candidateVibe.toLowerCase();
  const vibeMatchBonus = profile.topVibes.some((v) => lower.includes(v)) ? 7 : 0;
  return Math.min(99, base + vibeMatchBonus + profile.compatibilityBonus);
}
