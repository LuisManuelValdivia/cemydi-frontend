import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AppShell({
  children,
  hidePublicChrome,
}: {
  children: React.ReactNode;
  hidePublicChrome: boolean;
}) {
  if (hidePublicChrome) {
    return <>{children}</>;
  }

  return (
    <div className="appShell">
      <Header />
      <main className="appMain">{children}</main>
      <Footer />
    </div>
  );
}
