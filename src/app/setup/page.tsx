"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelAvatar } from "@/components/pixel-avatar";
import { PlayerSetup, readSession, writeSession } from "@/lib/session";
import { generateAvatar } from "@/lib/avatar-profile";

const INITIAL_FORM: PlayerSetup = {
  name: "",
  birthDate: "",
  location: "Singapore",
  gender: "female",
  lookingForGender: "any",
  minPartnerAge: 20,
  maxPartnerAge: 35,
};

const OPTION_AVATAR_VIBE = "cozy";
const OPTION_AVATAR_SEED = 9001;
const OPTION_SELECTED_CLASS =
  "!bg-[#dbc3ff] !shadow-[0_0_0_3px_#e6d2ff] text-[#120a23] !scale-[1.03]";

const COUNTRY_OPTIONS = [
  "Singapore",
  "Malaysia",
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
  "Japan",
  "South Korea",
  "Philippines",
];

const GENDER_OPTIONS: Array<{ value: PlayerSetup["gender"]; label: string; vibe: string; seed: number }> = [
  { value: "female", label: "Female", vibe: OPTION_AVATAR_VIBE, seed: OPTION_AVATAR_SEED },
  { value: "male", label: "Male", vibe: OPTION_AVATAR_VIBE, seed: OPTION_AVATAR_SEED },
  { value: "nonbinary", label: "Non-binary", vibe: OPTION_AVATAR_VIBE, seed: OPTION_AVATAR_SEED },
];

type LookingForOption =
  | { value: "any"; label: string; isPair: true }
  | {
      value: Exclude<PlayerSetup["lookingForGender"], "any">;
      label: string;
      isPair: false;
      vibe: string;
      seed: number;
    };

const LOOKING_FOR_OPTIONS: LookingForOption[] = [
  { value: "any", label: "Any", isPair: true },
  { value: "female", label: "Female", isPair: false, vibe: OPTION_AVATAR_VIBE, seed: OPTION_AVATAR_SEED },
  { value: "male", label: "Male", isPair: false, vibe: OPTION_AVATAR_VIBE, seed: OPTION_AVATAR_SEED },
];

export default function PlayerSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState<PlayerSetup>(() => {
    const existing = readSession()?.playerSetup;
    if (!existing) return INITIAL_FORM;
    return { ...INITIAL_FORM, ...existing };
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Please enter your name on the home page first.");
      return;
    }
    if (form.minPartnerAge > form.maxPartnerAge) {
      setFormError("Min partner age must be lower than max partner age.");
      return;
    }
    setFormError(null);
    writeSession({
      playerSetup: form,
    });
    router.push("/quiz");
  };

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="pixel-card rounded-sm p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">Step 1 of 5</p>
          <h1 className="mt-3 text-xl sm:text-3xl">Player Setup</h1>
          <p className="mt-3 text-2xl text-[#c8b7f8]">
            Enter your birth details before starting the love quest profile. <span className="blink">_</span>
          </p>
        </header>

        <form onSubmit={handleSubmit} className="pixel-card rounded-sm p-5">
          <p className="text-lg text-[#ffdf84]">
            Player: <span className="text-[#ffeeb9]">{form.name || "Not set"}</span>
          </p>
          <div className="space-y-3 text-xl">
            <label className="block">
              Birth Date
              <input
                type="date"
                required
                value={form.birthDate}
                onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
              />
            </label>
            <label className="block">
              Country
              <select
                required
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Gender
              <div className="mt-1 grid gap-3 sm:grid-cols-3">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setForm((prev) => ({ ...prev, gender: option.value }))}
                    className={`pixel-card rounded-sm p-3 ${
                      form.gender === option.value
                        ? OPTION_SELECTED_CLASS
                        : "bg-[#1f1237] hover:bg-[#2a1a4b]"
                    }`}
                  >
                    <div className="mx-auto mb-2 w-fit">
                      <PixelAvatar avatar={generateAvatar(option.vibe, option.seed, option.value)} size={64} />
                    </div>
                    <p className="text-sm">{option.label}</p>
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              Looking For
              <div className="mt-1 grid gap-3 sm:grid-cols-3">
                {LOOKING_FOR_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        lookingForGender: option.value,
                      }))
                    }
                    className={`pixel-card rounded-sm p-3 ${
                      form.lookingForGender === option.value
                        ? OPTION_SELECTED_CLASS
                        : "bg-[#1f1237] hover:bg-[#2a1a4b]"
                    }`}
                  >
                    <div className="relative mx-auto mb-2 h-16 w-28">
                      {option.isPair ? (
                        <>
                          <div className="absolute left-0 top-2">
                            <PixelAvatar avatar={generateAvatar(OPTION_AVATAR_VIBE, OPTION_AVATAR_SEED, "female")} size={58} />
                          </div>
                          <div className="absolute right-0 top-2">
                            <PixelAvatar avatar={generateAvatar(OPTION_AVATAR_VIBE, OPTION_AVATAR_SEED, "male")} size={58} />
                          </div>
                        </>
                      ) : (
                        <div className="mx-auto w-fit">
                          <PixelAvatar avatar={generateAvatar(option.vibe, option.seed, option.value)} size={58} />
                        </div>
                      )}
                    </div>
                    <p className="text-sm">{option.label}</p>
                  </button>
                ))}
              </div>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                Min Partner Age
                <input
                  type="number"
                  min={18}
                  max={80}
                  required
                  value={form.minPartnerAge}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      minPartnerAge: Number(event.target.value),
                    }))
                  }
                  className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
                />
              </label>
              <label className="block">
                Max Partner Age
                <input
                  type="number"
                  min={18}
                  max={80}
                  required
                  value={form.maxPartnerAge}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      maxPartnerAge: Number(event.target.value),
                    }))
                  }
                  className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
                />
              </label>
            </div>
          </div>

          <button type="submit" className="pixel-button mt-4 w-full bg-[#ffcb47] px-4 py-3 text-base text-[#120a23]">
            Continue to Love Profile Quiz
          </button>
          {formError && <p className="mt-3 text-lg text-[#ff8f8f]">{formError}</p>}
        </form>
      </div>
    </main>
  );
}
