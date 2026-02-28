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
    title: "Heartline Heist",
    description: "Co-op puzzle mission where both agents must reveal values to unlock the vault.",
    vibes: ["intellectual", "organized", "calm"],
    steps: [
      {
        prompt: "Vault Gate 01 asks for your shared core value. What do you offer first?",
        options: ["Trust and honesty", "Adventure and passion", "Growth and ambition"],
      },
      {
        prompt: "A logic lock appears. How do you solve it together?",
        options: ["Discuss clues and align reasoning", "Try quick combinations", "Split tasks and reconvene"],
      },
      {
        prompt: "Final vault prompt: choose your team principle.",
        options: ["Clear communication under pressure", "Bold action with high risk", "Balanced risk with backup plan"],
      },
    ],
  },
  {
    id: "quest-cityglow",
    title: "City Glow Run",
    description: "Fast urban quest with mini challenges, humor prompts, and spontaneous choices.",
    vibes: ["playful", "adventurous", "romantic"],
    steps: [
      {
        prompt: "Checkpoint 1: street challenge starts now. Your move?",
        options: ["Take the daring shortcut", "Play a fun challenge game", "Scout first, then sprint"],
      },
      {
        prompt: "A surprise social challenge pops up. How do you react?",
        options: ["Own the moment with confidence", "Turn it into a joke together", "Keep it low-key and strategic"],
      },
      {
        prompt: "Final sprint: crowd route or hidden alley route?",
        options: ["Crowd route for excitement", "Hidden alley for focus", "Split and regroup at final marker"],
      },
    ],
  },
  {
    id: "quest-homehaven",
    title: "Home Haven Build",
    description: "Comfort-based simulation to co-design an ideal weekend and conflict strategy.",
    vibes: ["cozy", "calm", "organized"],
    steps: [
      {
        prompt: "You are designing your ideal shared weekend. What comes first?",
        options: ["Slow breakfast and real conversation", "Structured plan with shared tasks", "Flexible day with mood-based choices"],
      },
      {
        prompt: "A disagreement appears while planning. What is your approach?",
        options: ["Pause and hear each other fully", "State needs directly and compromise", "Take space, then revisit calmly"],
      },
      {
        prompt: "Final design choice: relationship maintenance system?",
        options: ["Weekly check-in ritual", "Spontaneous quality moments", "Goal board plus reflection session"],
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
