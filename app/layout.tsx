import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizPop — Live quizzes for everyone",
  description: "Host interactive live quizzes for up to 300 players with QR and game-code joining.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
