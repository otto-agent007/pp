import "./globals.css";
import { Providers } from "./providers";
import { fontSans } from "./fonts";
import { AdminShell } from "./admin-nav";
import { AdminAuthGate } from "./admin-auth-gate";
import { AdminAuthProvider } from "./admin-auth-context";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Pest Patrol OS",
  description: "Internal Operating System for Pest Patrol Inc.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="font-sans antialiased min-h-screen">
        <Providers>
          <AdminAuthProvider>
            <AdminAuthGate>
              <AdminShell>{children}</AdminShell>
            </AdminAuthGate>
          </AdminAuthProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
