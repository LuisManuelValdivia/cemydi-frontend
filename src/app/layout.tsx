import "./globals.css";
import { headers } from "next/headers";
import { AuthProvider } from "@/context/AuthContext";
import ToasterClient from "@/components/ToasterClient";
import AppShell from "@/components/AppShell";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const hidePublicChrome = pathname.startsWith("/admin");

  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <ToasterClient />
          <AppShell hidePublicChrome={hidePublicChrome}>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
