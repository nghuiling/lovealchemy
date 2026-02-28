import { NextRequest } from "next/server";
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

function line(data: unknown) {
  return `${JSON.stringify(data)}\n`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SimulateRequest;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    return new Response(line({ type: "error", message: "OPENAI_API_KEY is missing." }), {
      status: 500,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  if (!body.playerSetup || !body.personality || !body.avatar || !body.loveAnswers) {
    return new Response(
      line({ type: "error", message: "playerSetup, personality, avatar and loveAnswers are required." }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      },
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
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (payload: unknown) => controller.enqueue(encoder.encode(line(payload)));

      enqueue({
        type: "init",
        userAgent,
        partners,
      });

      const interactions: Awaited<ReturnType<typeof runAgentInteraction>>[] = [];

      const run = async () => {
        try {
          await Promise.all(
            partners.map(async (partner) => {
              const interaction = await runAgentInteraction({
                userAgent,
                partner,
                model,
                apiKey,
                onProgress: (progress) => {
                  enqueue({
                    type: "interaction_update",
                    partner,
                    ...progress,
                  });
                },
              });
              interactions.push(interaction);
              enqueue({
                type: "interaction_done",
                interaction,
              });
            }),
          );

          enqueue({
            type: "done",
            userAgent,
            partners,
            interactions,
          });
          controller.close();
        } catch (error) {
          enqueue({
            type: "error",
            message: error instanceof Error ? error.message : "Simulation failed.",
          });
          controller.close();
        }
      };

      void run();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
