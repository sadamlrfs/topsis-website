import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/Sidebar";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WEBSITE TOPSIS",
  description: "Hitung ranking alternatif dengan metode TOPSIS hirarkis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={montserrat.className}>
      <body className="bg-white text-gray-900 antialiased">
        <TooltipProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
