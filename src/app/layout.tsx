import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus | Sàn thương mại điện tử",
  description: "Nền tảng thương mại điện tử Nexus.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={plusJakartaSans.variable}>
      <body><SessionProvider>{children}</SessionProvider></body>
    </html>
  );
}
