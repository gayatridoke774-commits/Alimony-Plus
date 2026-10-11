import type { Metadata } from "next";
import { WorkspaceProvider } from "@/components/workspace-provider";
import "./globals.css";
export const metadata: Metadata = {
  title: "Alimony Plus · Your next step, clearer",
  description:
    "A thoughtful workspace for your case, court orders and maintenance payments.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
