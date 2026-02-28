import { generateAvatar, createSeed } from "@/lib/avatar-profile";
import { PlayerSetup } from "@/lib/session";
import { AgentProfile, AvatarConfig, PersonalityProfile } from "@/types/profile";

export type InitializedAgent = AgentProfile;

export type AgentTurn = {
  speaker: string;
  text: string;
  score: number;
};

export type AgentInteraction = {
  partner: InitializedAgent;
  rounds: AgentTurn[];
  endedBy: "low-score" | "max-turns";
  finalUserScore: number;
  finalPartnerScore: number;
  averageScore: number;
};

export const MAX_CONVERSATION_EXCHANGES = 10;

type TurnResult = {
  response: string;
  score: number;
};

type PartnerSeedData = {
  id: string;
  name: string;
  age: number;
  bio: string;
  occupation: string;
  heightM: number;
  personalitySummary: string;
  preferenceSummary: string;
  gender: PlayerSetup["gender"];
  vibe: string;
};

const PARTNER_DATA: PartnerSeedData[] = [
  {
    id: "partner-angie",
    name: "Angie",
    age: 28,
    bio: "Out-going, loves extreme sports, loves pets, extrovert, does not want kids.",
    occupation: "Ski instructor",
    heightM: 1.65,
    personalitySummary: "Energetic, adventurous, social, thrives in high-energy environments.",
    preferenceSummary: "Prefers men with a similar adventurous and extroverted personality profile.",
    gender: "female",
    vibe: "adventurous",
  },
  {
    id: "partner-yiling",
    name: "Yiling",
    age: 32,
    bio: "Introvert, meaningful interactions, prefers cafe dates, cares for two younger siblings.",
    occupation: "Sales assistant in a clothing store",
    heightM: 1.7,
    personalitySummary: "Quiet, reflective, dependable, relationship-oriented and practical.",
    preferenceSummary: "Wants a down-to-earth, dependable partner and plans to start a family in 3 years.",
    gender: "female",
    vibe: "calm",
  },
  {
    id: "partner-tom",
    name: "Tom",
    age: 20,
    bio: "Currently serving national service as a soldier, open to both male and female relationships.",
    occupation: "National service soldier",
    heightM: 1.75,
    personalitySummary: "Disciplined, open-minded, adaptable, still exploring relationship preferences.",
    preferenceSummary: "Open to dating both men and women.",
    gender: "male",
    vibe: "organized",
  },
  {
    id: "partner-maya",
    name: "Maya",
    age: 26,
    bio: "Creative and social, spends weekends at art markets and beach walks.",
    occupation: "UX designer",
    heightM: 1.62,
    personalitySummary: "Warm, expressive, curious, enjoys playful banter.",
    preferenceSummary: "Looking for someone open-minded, kind, and emotionally present.",
    gender: "female",
    vibe: "playful",
  },
  {
    id: "partner-evelyn",
    name: "Evelyn",
    age: 31,
    bio: "Quiet but witty, loves bookstores, journaling, and deep conversations.",
    occupation: "Editor",
    heightM: 1.66,
    personalitySummary: "Thoughtful, calm, observant, and loyal once committed.",
    preferenceSummary: "Prefers steady communication and intentional long-term dating.",
    gender: "female",
    vibe: "intellectual",
  },
  {
    id: "partner-sophia",
    name: "Sophia",
    age: 29,
    bio: "Fitness regular who balances discipline with spontaneous weekend trips.",
    occupation: "Physiotherapist",
    heightM: 1.68,
    personalitySummary: "Grounded, supportive, energetic, and practical.",
    preferenceSummary: "Wants a reliable partner who values health and growth.",
    gender: "female",
    vibe: "organized",
  },
  {
    id: "partner-nadia",
    name: "Nadia",
    age: 24,
    bio: "Loves karaoke, board games, and hosting fun gatherings with friends.",
    occupation: "Marketing coordinator",
    heightM: 1.6,
    personalitySummary: "Playful, outgoing, emotionally open, and optimistic.",
    preferenceSummary: "Seeks someone who communicates clearly and enjoys social life.",
    gender: "female",
    vibe: "playful",
  },
  {
    id: "partner-claire",
    name: "Claire",
    age: 34,
    bio: "Enjoys slow mornings, hiking trails, and cooking comfort food.",
    occupation: "Project manager",
    heightM: 1.64,
    personalitySummary: "Composed, intentional, nurturing, and dependable.",
    preferenceSummary: "Looking for mature commitment and balanced partnership.",
    gender: "female",
    vibe: "cozy",
  },
  {
    id: "partner-jason",
    name: "Jason",
    age: 27,
    bio: "Big on football nights, coffee runs, and trying new food places.",
    occupation: "Business analyst",
    heightM: 1.8,
    personalitySummary: "Confident, humorous, direct communicator, team-oriented.",
    preferenceSummary: "Prefers someone who is affectionate, honest, and adventurous.",
    gender: "male",
    vibe: "adventurous",
  },
  {
    id: "partner-liam",
    name: "Liam",
    age: 30,
    bio: "A home chef who enjoys piano evenings and low-key dates.",
    occupation: "Software engineer",
    heightM: 1.78,
    personalitySummary: "Gentle, reflective, stable, and emotionally aware.",
    preferenceSummary: "Looking for meaningful conversation and long-term compatibility.",
    gender: "male",
    vibe: "cozy",
  },
  {
    id: "partner-noah",
    name: "Noah",
    age: 25,
    bio: "Travel enthusiast who documents city walks and hidden cafes.",
    occupation: "Photographer",
    heightM: 1.82,
    personalitySummary: "Curious, spontaneous, expressive, and upbeat.",
    preferenceSummary: "Wants a partner who is creative and open to new experiences.",
    gender: "male",
    vibe: "romantic",
  },
  {
    id: "partner-aaron",
    name: "Aaron",
    age: 33,
    bio: "Early riser, marathon runner, and fan of structured routines.",
    occupation: "Operations lead",
    heightM: 1.76,
    personalitySummary: "Disciplined, grounded, reliable, and future-focused.",
    preferenceSummary: "Prefers a partner who values planning, respect, and consistency.",
    gender: "male",
    vibe: "organized",
  },
  {
    id: "partner-daniel",
    name: "Daniel",
    age: 28,
    bio: "Museum dates, podcasts, and thoughtful chats over late-night tea.",
    occupation: "Architect",
    heightM: 1.79,
    personalitySummary: "Analytical, patient, considerate, and quietly romantic.",
    preferenceSummary: "Looking for emotional depth and shared long-term goals.",
    gender: "male",
    vibe: "intellectual",
  },
];

function toVibeFromPersonality(personality: PersonalityProfile) {
  const text = `${personality.coreVibe} ${personality.topVibes.join(" ")}`.toLowerCase();
  if (text.includes("playful") || text.includes("expressive")) return "playful";
  if (text.includes("organized") || text.includes("intentional")) return "organized";
  if (text.includes("adventurous")) return "adventurous";
  if (text.includes("intellectual")) return "intellectual";
  if (text.includes("romantic")) return "romantic";
  return "cozy";
}

export function initializeAgent(input: {
  id: string;
  name: string;
  age: number;
  bio: string;
  occupation: string;
  heightM: number;
  personalitySummary: string;
  preferenceSummary: string;
  vibe: string;
  gender: PlayerSetup["gender"];
  avatar?: AvatarConfig;
}) {
  const seed = createSeed(`${input.id}-${input.name}-${input.occupation}-${input.vibe}`);
  return {
    id: input.id,
    name: input.name,
    age: input.age,
    bio: input.bio,
    occupation: input.occupation,
    heightM: input.heightM,
    personalitySummary: input.personalitySummary,
    preferenceSummary: input.preferenceSummary,
    avatar: input.avatar ?? generateAvatar(input.vibe, seed, input.gender),
  } satisfies InitializedAgent;
}

export function initializePartnerAgents() {
  return PARTNER_DATA.map((item) => initializeAgent(item));
}

export function initializeUserAgent(input: {
  setup: PlayerSetup;
  personality: PersonalityProfile;
  avatar: AvatarConfig;
}) {
  return initializeAgent({
    id: `user-${createSeed(`${input.setup.name}-${input.setup.birthDate}`)}`,
    name: input.setup.name,
    age: 25,
    bio: `From ${input.setup.location}, prefers ${input.setup.lookingForGender}.`,
    occupation: "Player",
    heightM: 1.7,
    personalitySummary: `${input.personality.coreVibe}. Communication: ${input.personality.communicationStyle}. Relationship focus: ${input.personality.relationshipFocus}.`,
    preferenceSummary: `Love style: ${input.personality.loveStyle}. Top vibes: ${input.personality.topVibes.join(", ")}.`,
    vibe: toVibeFromPersonality(input.personality),
    gender: input.setup.gender,
    avatar: input.avatar,
  });
}

async function generateTurnViaOpenAI(input: {
  speaker: InitializedAgent;
  counterpart: InitializedAgent;
  incomingMessage: string;
  history: AgentTurn[];
  model: string;
  apiKey: string;
}) {
  const conversation = input.history
    .map((item, index) => `${index + 1}. ${item.speaker}: ${item.text} [score:${item.score}]`)
    .join("\n");

  const prompt = [
    `You are ${input.speaker.name}.`,
    "Stay fully in this persona.",
    `Profile: ${input.speaker.age} years old, ${input.speaker.occupation}, ${input.speaker.heightM}m tall.`,
    `Personality: ${input.speaker.personalitySummary}`,
    `Preferences: ${input.speaker.preferenceSummary}`,
    `The other avatar is ${input.counterpart.name}. Their profile: ${input.counterpart.personalitySummary}. Preferences: ${input.counterpart.preferenceSummary}`,
    `Incoming message from ${input.counterpart.name}: ${input.incomingMessage}`,
    conversation ? `Conversation log:\n${conversation}` : "Conversation log: none.",
    "Respond naturally in 1-2 sentences.",
    "Also evaluate compatibility from your viewpoint as integer score 1-10.",
    'Return strict JSON: {"response":"...","score":7}',
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: prompt,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI turn generation failed.");
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const outputText =
    payload.output_text?.trim() ||
    payload.output
      ?.flatMap((part) => part.content ?? [])
      .find((part) => part.type === "output_text" && typeof part.text === "string")
      ?.text?.trim();

  if (!outputText) {
    throw new Error("Model returned empty content.");
  }

  try {
    const parsed = JSON.parse(outputText) as TurnResult;
    return {
      response: parsed.response?.trim() || "I want to know you better before deciding.",
      score: Math.max(1, Math.min(10, Number(parsed.score) || 5)),
    };
  } catch {
    return {
      response: outputText,
      score: 5,
    };
  }
}

export async function runAgentInteraction(input: {
  userAgent: InitializedAgent;
  partner: InitializedAgent;
  model: string;
  apiKey: string;
  onProgress?: (progress: {
    partnerId: string;
    rounds: AgentTurn[];
    finalUserScore: number;
    finalPartnerScore: number;
    averageScore: number;
    endedBy: "in-progress" | "low-score" | "max-turns";
  }) => void;
}) {
  const rounds: AgentTurn[] = [];

  let userScore = 7;
  let partnerScore = 7;

  let currentSpeaker: "user" | "partner" = "user";
  let incomingMessage = "Hi, I want to understand your personality better. What matters most to you in a relationship?";

  while (rounds.length < MAX_CONVERSATION_EXCHANGES) {
    const speaker = currentSpeaker === "user" ? input.userAgent : input.partner;
    const counterpart = currentSpeaker === "user" ? input.partner : input.userAgent;

    const turn = await generateTurnViaOpenAI({
      speaker,
      counterpart,
      incomingMessage,
      history: rounds,
      model: input.model,
      apiKey: input.apiKey,
    });

    rounds.push({
      speaker: speaker.name,
      text: turn.response,
      score: turn.score,
    });

    if (currentSpeaker === "user") {
      userScore = turn.score;
      input.onProgress?.({
        partnerId: input.partner.id,
        rounds: [...rounds],
        finalUserScore: userScore,
        finalPartnerScore: partnerScore,
        averageScore: Math.round(((userScore + partnerScore) / 2) * 10),
        endedBy: "in-progress",
      });
      incomingMessage = turn.response;
      if (userScore < 7) {
        const result = {
          partner: input.partner,
          rounds,
          endedBy: "low-score",
          finalUserScore: userScore,
          finalPartnerScore: partnerScore,
          averageScore: Math.round(((userScore + partnerScore) / 2) * 10),
        } satisfies AgentInteraction;
        input.onProgress?.({
          partnerId: input.partner.id,
          rounds: [...rounds],
          finalUserScore: result.finalUserScore,
          finalPartnerScore: result.finalPartnerScore,
          averageScore: result.averageScore,
          endedBy: result.endedBy,
        });
        return result;
      }
      currentSpeaker = "partner";
      continue;
    }

    partnerScore = turn.score;
    input.onProgress?.({
      partnerId: input.partner.id,
      rounds: [...rounds],
      finalUserScore: userScore,
      finalPartnerScore: partnerScore,
      averageScore: Math.round(((userScore + partnerScore) / 2) * 10),
      endedBy: "in-progress",
    });
    incomingMessage = turn.response;
    if (partnerScore < 7) {
      const result = {
        partner: input.partner,
        rounds,
        endedBy: "low-score",
        finalUserScore: userScore,
        finalPartnerScore: partnerScore,
        averageScore: Math.round(((userScore + partnerScore) / 2) * 10),
      } satisfies AgentInteraction;
      input.onProgress?.({
        partnerId: input.partner.id,
        rounds: [...rounds],
        finalUserScore: result.finalUserScore,
        finalPartnerScore: result.finalPartnerScore,
        averageScore: result.averageScore,
        endedBy: result.endedBy,
      });
      return result;
    }
    currentSpeaker = "user";
  }

  const result = {
    partner: input.partner,
    rounds,
    endedBy: "max-turns",
    finalUserScore: userScore,
    finalPartnerScore: partnerScore,
    averageScore: Math.round(((userScore + partnerScore) / 2) * 10),
  } satisfies AgentInteraction;
  input.onProgress?.({
    partnerId: input.partner.id,
    rounds: [...rounds],
    finalUserScore: result.finalUserScore,
    finalPartnerScore: result.finalPartnerScore,
    averageScore: result.averageScore,
    endedBy: result.endedBy,
  });
  return result;
}
