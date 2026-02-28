import { NextRequest, NextResponse } from "next/server";
import {
  initializePartnerAgents,
  initializeUserAgent,
  InitializedAgent,
  runAgentInteraction,
} from "@/lib/agent-simulation";
import { LoveAnswers } from "@/lib/love-quiz";
import { PlayerSetup } from "@/lib/session";
import { AvatarConfig, PersonalityProfile } from "@/types/profile";

type SimulateRequest = {
  playerSetup?: PlayerSetup;
  personality?: PersonalityProfile;
  avatar?: AvatarConfig;
  loveAnswers?: LoveAnswers;
  userAgent?: InitializedAgent;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SimulateRequest;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
  }

  if (!body.playerSetup || !body.personality || !body.avatar || !body.loveAnswers) {
    return NextResponse.json(
      { error: "playerSetup, personality, avatar and loveAnswers are required." },
      { status: 400 },
    );
  }

  const userAgent =
    body.userAgent ??
    initializeUserAgent({
      setup: body.playerSetup,
      personality: body.personality,
      avatar: body.avatar,
    });

  const partners = initializePartnerAgents();

  const interactions = [];
  for (const partner of partners) {
    const interaction = await runAgentInteraction({
      userAgent,
      partner,
      model,
      apiKey,
    });
    interactions.push(interaction);
  }

  return NextResponse.json({
    userAgent,
    partners,
    interactions,
  });
}
