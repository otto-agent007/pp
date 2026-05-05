import "./globals.css";
import { Providers } from "./providers";
import { fontSans } from "./fonts";

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
          {children}
        </Providers>
      </body>
    </html>
  );
}