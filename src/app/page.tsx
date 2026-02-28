"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <section className="pixel-card rounded-sm p-6">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#ffdf84]">Love Quest Begins</p>
          <h1 className="mt-4 text-3xl leading-tight sm:text-5xl">Love Alchemy</h1>
          <p className="mt-4 text-2xl text-[#c8b7f8]">
            Build your pixel avatar, answer the love profile quiz, and run AI-powered partner simulations to discover your
            best romantic quest match.
          </p>
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.push("/setup");
            }}
            className="pixel-button mt-6 inline-block bg-[#ffcb47] px-6 py-3 text-base text-[#120a23]"
          >
            Enter the App
          </button>
        </section>

        <section className="pixel-card rounded-sm p-6">
          <div className="mx-auto max-w-md rounded-sm border-2 border-[#120a23] bg-[#120a23] p-3">
            <Image
              src="/lovealchemy-logo.png"
              alt="Love Alchemy logo"
              width={1024}
              height={1024}
              priority
              className="h-auto w-full"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
