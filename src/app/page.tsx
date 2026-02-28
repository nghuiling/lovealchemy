"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PixelAvatar } from "@/components/pixel-avatar";
import { PlayerSetup, clearSession, writeSession } from "@/lib/session";
import { AvatarConfig } from "@/types/profile";

type SimAvatar = {
  id: number;
  avatar: AvatarConfig;
  x: number;
  y: number;
  vx: number;
  vy: number;
  matchBias: number;
  state: "idle" | "paired" | "repel";
  stateUntil: number;
  pairedWith: number | null;
};

const AVATAR_COUNT = 30;

const PALETTES: AvatarConfig["palette"][] = [
  {
    skin: "#f5d8b9",
    outfit: "#3f9b4b",
    hair: "#2f4f2f",
    aura: "#7de48b",
    accent: "#d9ffd6",
  },
  {
    skin: "#f4c9a7",
    outfit: "#df5f2d",
    hair: "#5e2323",
    aura: "#ff8f6b",
    accent: "#ffe1aa",
  },
  {
    skin: "#efc7a2",
    outfit: "#8d6a3a",
    hair: "#59412e",
    aura: "#9dc978",
    accent: "#b7eb8f",
  },
  {
    skin: "#efd5c0",
    outfit: "#7f8da6",
    hair: "#3d465f",
    aura: "#c4d9ff",
    accent: "#eaf2ff",
  },
  {
    skin: "#ebcfbe",
    outfit: "#2f66cc",
    hair: "#1d2a4f",
    aura: "#7fc0ff",
    accent: "#b1e5ff",
  },
  {
    skin: "#f5d8b9",
    outfit: "#9b59b6",
    hair: "#2a1f3a",
    aura: "#d7a6ff",
    accent: "#f2dfff",
  },
];

const MOTIFS = [
  "leaf-crown",
  "ember-glow",
  "gear-halo",
  "wave-ribbon",
  "green-leaves",
  "stone-badge",
];

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampSpeed(v: number, minAbs: number, maxAbs: number) {
  const abs = Math.abs(v);
  if (abs < minAbs) return v >= 0 ? minAbs : -minAbs;
  if (abs > maxAbs) return v >= 0 ? maxAbs : -maxAbs;
  return v;
}

function createInitialAvatars(): SimAvatar[] {
  const rand = mulberry32(20260301);
  return Array.from({ length: AVATAR_COUNT }).map((_, i) => {
    const palette = PALETTES[i % PALETTES.length];
    const avatar: AvatarConfig = {
      palette,
      motifs: [MOTIFS[i % MOTIFS.length]],
      seed: 100 + i * 13,
      hairStyle: i % 3 === 0 ? "short" : i % 3 === 1 ? "medium" : "long",
    };
    return {
      id: i,
      avatar,
      x: 8 + rand() * 84,
      y: 10 + rand() * 80,
      vx: (rand() - 0.5) * 0.9,
      vy: (rand() - 0.5) * 0.9,
      matchBias: rand() * 2 - 1,
      state: "idle",
      stateUntil: 0,
      pairedWith: null,
    };
  });
}

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [agents, setAgents] = useState<SimAvatar[]>(createInitialAvatars);

  const handleEnterApp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = playerName.trim();
    if (!trimmed) {
      setNameError("Please enter your name to start.");
      return;
    }
    const initialSetup: PlayerSetup = {
      name: trimmed,
      birthDate: "",
      location: "",
      gender: "female",
      lookingForGender: "any",
      minPartnerAge: 20,
      maxPartnerAge: 35,
    };
    clearSession();
    writeSession({ playerSetup: initialSetup });
    router.push("/setup");
  };
  const pairHearts = useMemo(() => {
    const byId = new Map(agents.map((a) => [a.id, a]));
    return agents
      .filter((a) => a.pairedWith !== null && a.id < a.pairedWith)
      .map((a) => {
        const b = byId.get(a.pairedWith!);
        if (!b) return null;
        return {
          id: `${a.id}-${b.id}`,
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        };
      })
      .filter(Boolean) as Array<{ id: string; x: number; y: number }>;
  }, [agents]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setAgents((prev) => {
        const next = prev.map((a) => ({ ...a }));

        for (const a of next) {
          a.x += a.vx;
          a.y += a.vy;

          if (a.x < 3 || a.x > 97) a.vx *= -1;
          if (a.y < 6 || a.y > 94) a.vy *= -1;

          a.x = Math.min(97, Math.max(3, a.x));
          a.y = Math.min(94, Math.max(6, a.y));

          a.vx = clampSpeed(a.vx * 0.997, 0.08, 0.6);
          a.vy = clampSpeed(a.vy * 0.997, 0.08, 0.6);

          if (a.state === "repel" && now > a.stateUntil) {
            a.state = "idle";
          }
        }

        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            const a = next[i];
            const b = next[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 6.2) continue;

            const nx = dist === 0 ? 1 : dx / dist;
            const ny = dist === 0 ? 0 : dy / dist;
            const alreadyPairMates =
              a.pairedWith === b.id && b.pairedWith === a.id;
            if (alreadyPairMates) continue;

            const matchChance = 0.5 + (a.matchBias + b.matchBias) * 0.16;
            const matched =
              Math.random() < Math.min(0.85, Math.max(0.15, matchChance));

            if (matched) {
              const previousA = a.pairedWith;
              const previousB = b.pairedWith;

              if (previousA !== null) {
                const exA = next[previousA];
                if (exA && exA.pairedWith === a.id) {
                  exA.pairedWith = null;
                  exA.state = "repel";
                  exA.stateUntil = now + 650;
                  exA.vx = clampSpeed(exA.vx - nx * 0.24, 0.08, 0.7);
                  exA.vy = clampSpeed(exA.vy - ny * 0.24, 0.08, 0.7);
                }
              }
              if (previousB !== null) {
                const exB = next[previousB];
                if (exB && exB.pairedWith === b.id) {
                  exB.pairedWith = null;
                  exB.state = "repel";
                  exB.stateUntil = now + 650;
                  exB.vx = clampSpeed(exB.vx + nx * 0.24, 0.08, 0.7);
                  exB.vy = clampSpeed(exB.vy + ny * 0.24, 0.08, 0.7);
                }
              }

              const avgVx = clampSpeed((a.vx + b.vx) / 2, 0.08, 0.55);
              const avgVy = clampSpeed((a.vy + b.vy) / 2, 0.08, 0.55);
              a.vx = avgVx;
              a.vy = avgVy;
              b.vx = avgVx;
              b.vy = avgVy;
              a.state = "paired";
              b.state = "paired";
              a.pairedWith = b.id;
              b.pairedWith = a.id;
              a.stateUntil = 0;
              b.stateUntil = 0;
            } else {
              a.vx = clampSpeed(a.vx - nx * 0.28, 0.08, 0.7);
              a.vy = clampSpeed(a.vy - ny * 0.28, 0.08, 0.7);
              b.vx = clampSpeed(b.vx + nx * 0.28, 0.08, 0.7);
              b.vy = clampSpeed(b.vy + ny * 0.28, 0.08, 0.7);
              a.state = "repel";
              b.state = "repel";
              a.stateUntil = now + 700;
              b.stateUntil = now + 700;
            }
          }
        }

        for (let i = 0; i < next.length; i += 1) {
          const a = next[i];
          if (a.pairedWith === null || a.id > a.pairedWith) continue;
          const b = next[a.pairedWith];
          if (!b || b.pairedWith !== a.id) continue;

          const avgVx = clampSpeed((a.vx + b.vx) / 2, 0.08, 0.55);
          const avgVy = clampSpeed((a.vy + b.vy) / 2, 0.08, 0.55);
          a.vx = avgVx;
          a.vy = avgVy;
          b.vx = avgVx;
          b.vy = avgVy;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const target = 4;
          const nx = dx / dist;
          const ny = dy / dist;
          const correction = (dist - target) * 0.5;
          a.x += nx * correction;
          a.y += ny * correction;
          b.x -= nx * correction;
          b.y -= ny * correction;

          a.x = Math.min(97, Math.max(3, a.x));
          a.y = Math.min(94, Math.max(6, a.y));
          b.x = Math.min(97, Math.max(3, b.x));
          b.y = Math.min(94, Math.max(6, b.y));

          a.state = "paired";
          b.state = "paired";
        }

        return next;
      });
    }, 60);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="pixel-grid-bg relative min-h-[100svh] overflow-hidden bg-background px-4 py-4 text-foreground sm:px-8 sm:py-6">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        {pairHearts.map((heart) => (
          <div
            key={`heart-${heart.id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-sm text-[#ff7aa8]"
            style={{ left: `${heart.x}%`, top: `${heart.y}%` }}
          >
            {"\u2665"}
          </div>
        ))}
        {agents.map((agent) => (
          <div
            key={`bg-agent-${agent.id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
            style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
          >
            <div className="relative">
              <PixelAvatar avatar={agent.avatar} size={34} />
              {agent.state === "repel" && (
                <span className="absolute -right-2 -top-2 text-xs text-[#ff5a7a]">
                  x
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2rem)] max-w-4xl items-center justify-center sm:min-h-[calc(100svh-3rem)]">
        <section className="pixel-card w-full max-w-2xl rounded-sm p-5 text-center sm:p-7">
          <div className="mx-auto w-full max-w-[clamp(260px,32vw,380px)] p-1">
            <Image
              src="/lovealchemy-logo.svg"
              alt="Love Alchemy logo"
              width={1024}
              height={1024}
              priority
              className="h-auto w-full"
            />
          </div>

          <p className="mt-3 text-[clamp(1rem,1.8vw,1.35rem)] leading-tight text-[#c8b7f8]">
            Simulate chemistry and verify compatibility
          </p>

          <form onSubmit={handleEnterApp}>
            <label className="mt-4 block text-left text-lg sm:text-xl">
              Enter Your Name
              <input
                type="text"
                required
                placeholder="e.g. Amy"
                value={playerName}
                onChange={(event) => {
                  setPlayerName(event.target.value);
                  if (nameError) setNameError(null);
                }}
                className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
              />
            </label>

            <button
              type="submit"
              className="pixel-button mt-4 inline-block bg-[#ffcb47] px-6 py-3 text-base text-[#120a23]"
            >
              Find My Match
            </button>
          </form>
          {nameError && (
            <p className="mt-3 text-lg text-[#ff8f8f]">{nameError}</p>
          )}
        </section>
      </div>
    </main>
  );
}
