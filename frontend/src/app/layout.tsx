import type { Metadata } from "next";

import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "London Vacancy Explorer",
  description: "Explore aggregated vacant-home statistics across London neighbourhoods.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
