import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { PAPER } from "@/lib/research/catalog";
import "./research.css";

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-research-serif",
  display: "swap",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-research-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-research-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SYNAPSE — Evidence-Driven Autonomous Web Development",
  description: PAPER.description,
  openGraph: {
    title: "SYNAPSE — Evidence-Driven Autonomous Web Development",
    description: PAPER.description,
  },
};

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`research-root ${serif.variable} ${sans.variable} ${mono.variable}`}>
      {children}
    </div>
  );
}
