export type WouldYouRatherQuestion = {
  id: string;
  optionA: string;
  optionB: string;
  tagA: string;
  tagB: string;
};

export const WOULD_YOU_RATHER_QUESTIONS: WouldYouRatherQuestion[] = [
  {
    id: "wyr-1",
    optionA: "Plan every date with details",
    optionB: "Keep dates spontaneous and surprise-based",
    tagA: "organized",
    tagB: "spontaneous",
  },
  {
    id: "wyr-2",
    optionA: "Text all day in small updates",
    optionB: "One deep call at night",
    tagA: "constant-connection",
    tagB: "deep-connection",
  },
  {
    id: "wyr-3",
    optionA: "Stay in and cook together",
    optionB: "Go out and explore the city",
    tagA: "cozy",
    tagB: "adventurous",
  },
  {
    id: "wyr-4",
    optionA: "Set boundaries early and clearly",
    optionB: "Let boundaries evolve naturally",
    tagA: "direct",
    tagB: "flexible",
  },
  {
    id: "wyr-5",
    optionA: "Move slow and build trust first",
    optionB: "Move fast if the chemistry is strong",
    tagA: "slow-burn",
    tagB: "fast-burn",
  },
  {
    id: "wyr-6",
    optionA: "Solve conflict immediately",
    optionB: "Take space before resolving conflict",
    tagA: "immediate-repair",
    tagB: "space-first",
  },
  {
    id: "wyr-7",
    optionA: "Show love through actions",
    optionB: "Show love through words",
    tagA: "acts-of-love",
    tagB: "verbal-love",
  },
  {
    id: "wyr-8",
    optionA: "Prioritize emotional safety",
    optionB: "Prioritize excitement and novelty",
    tagA: "secure",
    tagB: "exciting",
  },
  {
    id: "wyr-9",
    optionA: "Weekly relationship check-ins",
    optionB: "Go with flow and talk when needed",
    tagA: "rituals",
    tagB: "organic-flow",
  },
  {
    id: "wyr-10",
    optionA: "Quiet quality time with 1:1 focus",
    optionB: "Group hangouts with shared energy",
    tagA: "intimate",
    tagB: "social",
  },
];
