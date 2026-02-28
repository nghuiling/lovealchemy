import { NextResponse } from "next/server";
import { initializePartnerAgents } from "@/lib/agent-simulation";

export async function GET() {
  const partners = initializePartnerAgents();
  return NextResponse.json({ partners });
}
