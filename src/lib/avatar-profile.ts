import { buildLoveProfile, LoveAnswers } from "@/lib/love-quiz";
import { PlayerSetup } from "@/lib/session";
import { AvatarConfig, MatchCandidate, PersonalityProfile } from "@/types/profile";

const PALETTES: AvatarConfig["palette"][] = [
  { skin: "#f5d8b9", outfit: "#3f9b4b", hair: "#2f4f2f", aura: "#7de48b", accent: "#d9ffd6" },
  { skin: "#f4c9a7", outfit: "#df5f2d", hair: "#5e2323", aura: "#ff8f6b", accent: "#ffe1aa" },
  { skin: "#efc7a2", outfit: "#8d6a3a", hair: "#59412e", aura: "#9dc978", accent: "#b7eb8f" },
  { skin: "#efd5c0", outfit: "#7f8da6", hair: "#3d465f", aura: "#c4d9ff", accent: "#eaf2ff" },
  { skin: "#ebcfbe", outfit: "#2f66cc", hair: "#1d2a4f", aura: "#7fc0ff", accent: "#b1e5ff" },
];

const MOTIFS = [
  ["leaf-crown", "vines"],
  ["ember-glow", "sun-flare"],
  ["green-leaves", "stone-badge"],
  ["gear-halo", "silver-pin"],
  ["wave-ribbon", "droplet-orb"],
];

const CANDIDATE_NAMES = ["Astra", "Nova", "Milo", "Kai", "Luna", "Rin", "Jade", "Leo", "Nia", "Sora"];
const CANDIDATE_VIBES = ["playful", "cozy", "adventurous", "intellectual", "romantic", "organized", "calm", "elegant"];

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

export function createSeed(input: string) {
  return Array.from(input).reduce((acc, ch) => acc + ch.charCodeAt(0) * 13, 0);
}

function paletteIndexByVibe(vibe: string) {
  return mod(vibe.split("").reduce((a, c) => a + c.charCodeAt(0), 0), PALETTES.length);
}

export function createPersonality(setup: PlayerSetup, answers: LoveAnswers): PersonalityProfile {
  const love = buildLoveProfile(answers);
  const topVibe = love.topVibes[0] ?? "cozy";
  const vibe =
    topVibe === "playful"
      ? "bold and expressive"
      : topVibe === "calm"
        ? "deep and intuitive"
        : topVibe === "organized"
          ? "clear and intentional"
          : "grounded and steady";

  return {
    coreVibe: vibe,
    communicationStyle: love.communicationStyle,
    relationshipFocus: love.relationshipFocus,
    loveStyle: love.loveStyle,
    topVibes: love.topVibes,
    tags: love.tags,
  };
}

export function generateAvatar(primaryVibe: string, seed: number, gender: PlayerSetup["gender"]): AvatarConfig {
  const idx = paletteIndexByVibe(primaryVibe);
  return {
    palette: PALETTES[idx],
    motifs: MOTIFS[idx],
    seed,
    hairStyle: gender === "female" ? "long" : "short",
  };
}

export function generateCandidates(primaryVibe: string, seed: number): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];
  for (let i = 0; i < 8; i += 1) {
    const vibe = CANDIDATE_VIBES[mod(seed + i * 5, CANDIDATE_VIBES.length)];
    const name = CANDIDATE_NAMES[mod(seed + i * 3, CANDIDATE_NAMES.length)];
    const matchBoost = primaryVibe === vibe ? 18 : 0;
    const compatibility = Math.min(95, 58 + mod(seed + i * 11, 28) + matchBoost);
    candidates.push({
      id: `cand-${i}-${seed}`,
      name,
      vibe,
      compatibility,
      avatar: generateAvatar(vibe, seed + i * 97, i % 2 === 0 ? "female" : "male"),
    });
  }
  return candidates.sort((a, b) => b.compatibility - a.compatibility);
}
