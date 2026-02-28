"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerSetup, readSession, writeSession } from "@/lib/session";

const INITIAL_FORM: PlayerSetup = {
  name: "",
  birthDate: "",
  location: "",
  gender: "female",
  lookingForGender: "any",
  minPartnerAge: 20,
  maxPartnerAge: 35,
};

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
              <input
                type="text"
                required
                placeholder="Singapore"
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
              />
            </label>
            <label className="block">
              Gender
              <select
                value={form.gender}
                onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value as PlayerSetup["gender"] }))}
                className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label className="block">
              Looking For
              <select
                value={form.lookingForGender}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    lookingForGender: event.target.value as PlayerSetup["lookingForGender"],
                  }))
                }
                className="mt-1 w-full border-2 border-[#120a23] bg-[#e9ddff] px-3 py-2 text-[#120a23] outline-none"
              >
                <option value="any">Any</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
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
