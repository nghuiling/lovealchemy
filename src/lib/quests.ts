export type QuestStep = {
  prompt: string;
  options: string[];
};

export type QuestDefinition = {
  id: string;
  title: string;
  description: string;
  vibes: string[];
  steps: QuestStep[];
};

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: "quest-heartline",
    title: "Truth Signal",
    description:
      "Each player submits 3 statements (2 true, 1 false). Both guess the lie, then reveal and discuss what was believable.",
    vibes: ["intellectual", "playful", "calm"],
    steps: [
      {
        prompt: "Round 1: Submit your 3 statements (2 truths, 1 lie). What style do you use?",
        options: ["Mix one subtle lie between normal truths", "Make one statement unusually bold", "Keep all three highly believable"],
      },
      {
        prompt: "Round 2: Guess your partner's lie. What is your strategy?",
        options: ["Analyze wording and emotional cues", "Trust intuition and pick quickly", "Ask follow-up questions before locking guess"],
      },
      {
        prompt: "Reveal + conversation prompt: If both caught the lie: \"You both saw through each other. What made the lie obvious — or was it just a lucky guess?\" If one or both missed: \"[Name] fooled you. What made you believe it? Tell each other which truth surprised you the most.\" Win condition: At least one player correctly identifies the other's lie.",
        options: ["Both guessed correctly: discuss why the lie failed", "One missed: unpack what felt believable", "Both missed: compare assumptions and surprises"],
      },
    ],
  },
  {
    id: "quest-cityglow",
    title: "Hot Take Exchange",
    description:
      "Each player submits 3 unpopular opinions, reveals them together, and rates the other's list from 1-5 agreement.",
    vibes: ["intellectual", "playful", "romantic"],
    steps: [
      {
        prompt: "Round 1: Privately submit 3 opinions you think most people would disagree with.",
        options: [
          "Pick values-based opinions",
          "Pick lifestyle and relationship opinions",
          "Mix one playful and two serious opinions",
        ],
      },
      {
        prompt: "Round 2: Both lists are revealed at the same time. Rate each of your partner's opinions from 1-5 based on your personal agreement.",
        options: [
          "Rate based on emotional reaction",
          "Rate based on practical real-life alignment",
          "Rate based on long-term compatibility",
        ],
      },
      {
        prompt: "Conversation prompt: You rated \"[opinion]\" a 1. [Name] clearly feels strongly about it. Ask them to make their case — and actually try to hear it. Win condition: Each player must rate at least one of the other's opinions a 4 or 5.",
        options: [
          "Discuss the biggest disagreement first",
          "Start with one surprising agreement, then challenge one 1/5 opinion",
          "Defend your strongest opinion, then listen and revise if needed",
        ],
      },
    ],
  },
  {
    id: "quest-homehaven",
    title: "Fill in my blank",
    description:
      "Each player writes 5 incomplete self-sentences. The other completes them, then both compare guesses vs real answers.",
    vibes: ["cozy", "intellectual", "calm"],
    steps: [
      {
        prompt:
          "Round 1: Write and submit 5 incomplete sentences. Suggested starters: \"When I'm stressed, I tend to ___\" | \"Most people don't realise I'm actually ___\" | \"I'm happiest when ___\" | \"The thing I want most right now is ___\" | \"I used to think ___, but now I think ___\".",
        options: [
          "Be specific and emotionally honest",
          "Keep answers short and instinctive",
          "Include one answer you think they might misread",
        ],
      },
      {
        prompt: "Round 2: Complete each of your partner's 5 sentences with your best guess.",
        options: [
          "Guess based on prior chat clues",
          "Guess based on personality impressions",
          "Mix intuition and observed behavior",
        ],
      },
      {
        prompt:
          "Conversation prompt: [Name] thought you'd say \"[guess]\" but you said \"[real answer].\" Where did that picture of you come from — and how far off were they? Win condition: At least 2 out of 5 guesses match in meaning (exact wording not required).",
        options: [
          "Discuss the biggest mismatch first",
          "Celebrate top matches, then unpack one miss",
          "Explain how your self-view has changed over time",
        ],
      },
    ],
  },
];

export function getQuestById(questId: string | null | undefined) {
  if (!questId) return null;
  return QUEST_DEFINITIONS.find((q) => q.id === questId) ?? null;
}

export function getQuestByTitle(title: string | null | undefined) {
  if (!title) return null;
  return QUEST_DEFINITIONS.find((q) => q.title.toLowerCase() === title.toLowerCase()) ?? null;
}
