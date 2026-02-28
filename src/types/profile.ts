export type Gender = "male" | "female";

export type AvatarConfig = {
  palette: {
    skin: string;
    outfit: string;
    hair: string;
    aura: string;
    accent: string;
  };
  motifs: string[];
  seed: number;
  hairStyle?: "short" | "medium" | "long";
};

export type PersonalityProfile = {
  coreVibe: string;
  communicationStyle: string;
  relationshipFocus: string;
  loveStyle: string;
  topVibes: string[];
  tags: string[];
};

export type MatchCandidate = {
  id: string;
  name: string;
  vibe: string;
  compatibility: number;
  avatar: AvatarConfig;
};

export type AvatarProfileResponse = {
  avatar: AvatarConfig;
  personality: PersonalityProfile;
  candidates: MatchCandidate[];
};
