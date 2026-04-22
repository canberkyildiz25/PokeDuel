import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokéDuel — Pokémon Kart Savaşı",
  description: "Antrenörünü seç, desteni oluştur, arena belirle ve rakibinle savaş!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
