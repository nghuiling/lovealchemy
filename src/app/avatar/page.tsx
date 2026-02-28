"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelAvatar } from "@/components/pixel-avatar";
import { buildLoveProfile } from "@/lib/love-quiz";
import { AvatarConfig } from "@/types/profile";
import { QuestSession, readSession, writeSession } from "@/lib/session";

const HAIR_COLORS = ["#1d2a4f", "#3d465f", "#59412e", "#2f4f2f", "#5e2323", "#f2f2f2"];
const OUTFIT_COLORS = ["#2f66cc", "#3f9b4b", "#8d6a3a", "#df5f2d", "#7f8da6", "#9b59b6"];
const SKIN_COLORS = ["#f5d8b9", "#efc7a2", "#ebcfbe", "#d9a77b", "#b9835a", "#8f5f3f"];
const FEMALE_HAIR_STYLES: NonNullable<AvatarConfig["hairStyle"]>[] = ["short", "medium", "long"];
const MALE_HAIR_STYLES: NonNullable<AvatarConfig["hairStyle"]>[] = ["short"];

function ColorPicker({
  title,
  colors,
  selected,
  onPick,
}: {
  title: string;
  colors: string[];
  selected: string;
  onPick: (color: string) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase text-[#ffdf84]">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={`${title}-${color}`}
            type="button"
            onClick={() => onPick(color)}
            className={`h-8 w-8 border-2 ${selected === color ? "border-[#ffdf84]" : "border-[#120a23]"}`}
            style={{ backgroundColor: color }}
            aria-label={`Pick ${title} ${color}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function AvatarPage() {
  const router = useRouter();
  const [session, setSession] = useState<QuestSession | null>(() => readSession());

  useEffect(() => {
    if (!session?.personality || !session.avatar || !session.playerSetup || !session.loveAnswers || !session.candidates) {
      router.replace("/quiz");
    }
  }, [router, session]);

  const allowedHairStyles = useMemo(() => {
    if (!session?.playerSetup) return [];
    return session.playerSetup.gender === "female" ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES;
  }, [session]);

  const loveProfile = useMemo(() => {
    if (!session?.loveAnswers) return null;
    return buildLoveProfile(session.loveAnswers);
  }, [session]);

  const updateAvatar = (patch: Partial<AvatarConfig>) => {
    setSession((prev) => {
      if (!prev?.avatar) return prev;
      const next: QuestSession = {
        ...prev,
        avatar: {
          ...prev.avatar,
          ...patch,
          palette: {
            ...prev.avatar.palette,
            ...(patch.palette ?? {}),
          },
        },
      };
      writeSession(next);
      return next;
    });
  };

  if (!session?.personality || !session.avatar) return null;

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="pixel-card rounded-sm p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">Step 3 of 5</p>
          <h1 className="mt-3 text-xl sm:text-3xl">Avatar Customization</h1>
          <p className="mt-3 text-2xl text-[#c8b7f8]">
            Your avatar is generated. Customize it before preview. <span className="blink">_</span>
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="pixel-card rounded-sm p-5">
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="flex flex-col items-center gap-2">
                <PixelAvatar avatar={session.avatar} />
                <p className="text-xl text-[#ffdf84]">{session.personality.coreVibe}</p>
              </div>
              <div>
                <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Personality Snapshot</h2>
                <p className="mt-3 text-xl text-[#c8b7f8]">
                  Communication: {session.personality.communicationStyle}
                </p>
                <p className="mt-1 text-xl text-[#c8b7f8]">
                  Relationship Focus: {session.personality.relationshipFocus}
                </p>
                <p className="mt-1 text-xl text-[#c8b7f8]">
                  Love Style: {session.personality.loveStyle}
                </p>
                <p className="mt-1 text-xl text-[#c8b7f8]">
                  Top Vibes: {session.personality.topVibes.join(" + ")}
                </p>
                {loveProfile && (
                  <div className="mt-3 space-y-1 text-xl text-[#c8b7f8]">
                    <p>Style Tags: {loveProfile.tags.join(" | ")}</p>
                    <p>Preferred Match Vibe: {loveProfile.topVibes.join(" + ")}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="pixel-card rounded-sm p-5">
            <h2 className="font-mono text-xs uppercase text-[#ffdf84]">Customize</h2>
            <div className="mt-3 space-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase text-[#ffdf84]">Hair Style</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allowedHairStyles.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => updateAvatar({ hairStyle: style })}
                      className={`pixel-button px-3 py-2 text-base capitalize ${
                        session.avatar?.hairStyle === style ? "bg-[#ffcb47] text-[#120a23]" : "bg-[#332058]"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <ColorPicker
                title="Hair Color"
                colors={HAIR_COLORS}
                selected={session.avatar.palette.hair}
                onPick={(color) => updateAvatar({ palette: { ...session.avatar!.palette, hair: color } })}
              />
              <ColorPicker
                title="Outfit Color"
                colors={OUTFIT_COLORS}
                selected={session.avatar.palette.outfit}
                onPick={(color) => updateAvatar({ palette: { ...session.avatar!.palette, outfit: color } })}
              />
              <ColorPicker
                title="Skin Tone"
                colors={SKIN_COLORS}
                selected={session.avatar.palette.skin}
                onPick={(color) => updateAvatar({ palette: { ...session.avatar!.palette, skin: color } })}
              />
            </div>

            <button
              type="button"
              onClick={() => router.push("/preview")}
              className="pixel-button mt-5 w-full bg-[#7de48b] px-4 py-3 text-base text-[#120a23]"
            >
              Continue to Avatar Preview
            </button>
          </section>
        </section>
      </div>
    </main>
  );
}
