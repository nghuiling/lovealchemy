import { NextRequest, NextResponse } from "next/server";
import { createPersonality, createSeed, generateAvatar, generateCandidates } from "@/lib/avatar-profile";
import { initializeUserAgent } from "@/lib/agent-simulation";
import { LoveAnswers } from "@/lib/love-quiz";
import { PlayerSetup } from "@/lib/session";
import { AvatarProfileResponse } from "@/types/profile";

type BuildRequest = {
  playerSetup?: PlayerSetup;
  loveAnswers?: LoveAnswers;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BuildRequest;
  const playerSetup = body.playerSetup;
  const loveAnswers = body.loveAnswers;

  if (!playerSetup || !loveAnswers) {
    return NextResponse.json({ error: "playerSetup and loveAnswers are required." }, { status: 400 });
  }

  const seed = createSeed(
    `${playerSetup.name}-${playerSetup.birthDate}-${playerSetup.location}-${playerSetup.gender}`,
  );
  const personality = createPersonality(playerSetup, loveAnswers);
  const primaryVibe = personality.topVibes[0] ?? "balanced";
  const avatar = generateAvatar(primaryVibe, seed, playerSetup.gender);
  const candidates = generateCandidates(primaryVibe, seed);
  const userAgent = initializeUserAgent({
    setup: playerSetup,
    personality,
    avatar,
  });

  const response: AvatarProfileResponse = {
    avatar,
    personality,
    candidates,
    userAgent,
  };

  return NextResponse.json(response);
}
