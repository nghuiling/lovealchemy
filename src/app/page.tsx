"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="pixel-grid-bg min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex max-w-4xl items-center justify-center">
        <section className="pixel-card w-full max-w-2xl rounded-sm p-6 text-center">
          <div className="mx-auto max-w-md p-3">
            <Image
              src="/lovealchemy-logo.svg"
              alt="Love Alchemy logo"
              width={1024}
              height={1024}
              priority
              className="h-auto w-full"
            />
          </div>

          <p className="mt-4 text-2xl text-[#c8b7f8]">
            Build your pixel avatar, answer the love profile quiz, and run
            AI-powered partner simulations to discover your best romantic quest
            match.
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
      </div>
    </main>
  );
}
