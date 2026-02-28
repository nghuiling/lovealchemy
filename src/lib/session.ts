import { AgentProfile, AvatarConfig, Gender, MatchCandidate, PersonalityProfile } from "@/types/profile";
import { LoveAnswers } from "@/lib/love-quiz";

export const SESSION_KEY = "quest-dating-session-v1";

export type PlayerSetup = {
  name: string;
  birthDate: string;
  location: string;
  gender: Gender;
  lookingForGender: "male" | "female" | "any";
  minPartnerAge: number;
  maxPartnerAge: number;
};

export type QuestSession = {
  playerSetup?: PlayerSetup;
  loveAnswers?: LoveAnswers;
  quizConversation?: Array<{
    question: string;
    answer: string;
  }>;
  userAgent?: AgentProfile;
  personality?: PersonalityProfile;
  avatar?: AvatarConfig;
  candidates?: MatchCandidate[];
};

export function readSession(): QuestSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuestSession;
  } catch {
    return null;
  }
}

export function writeSession(next: QuestSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
