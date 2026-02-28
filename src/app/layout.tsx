import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pixelTitle = Press_Start_2P({
  variable: "--font-pixel-title",
  subsets: ["latin"],
  weight: "400",
});

const pixelBody = VT323({
  variable: "--font-pixel-body",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Quest Dating",
  description: "A pixel game style dating app powered by personality quiz.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelTitle.variable} ${pixelBody.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
