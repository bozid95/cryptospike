import { CryptoSpikeProvider, useCryptoSpike } from "@/context/trading-context";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { PositionsCrud } from "@/components/crud/positions-crud";
import { SettingsCrud } from "@/components/crud/settings-crud";
import { SignalsCrud } from "@/components/crud/signals-crud";
import { StrategyManagerCrud } from "@/components/crud/strategy-manager-crud";
import { DashboardSummary } from "@/components/dashboard-summary";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { LoginView } from "@/components/login-view";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Toaster } from "@/components/ui/sonner";

import { useEffect, useState } from "react";

function DashboardContent() {
  const { activeTab, isAuthenticated } = useCryptoSpike();

  // Jika pengunjung publik (belum login), selalu tampilkan halaman Signals
  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-3.5 sm:p-4 lg:gap-6 lg:p-6 pb-20 sm:pb-6">
        <SignalsCrud />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3.5 sm:p-4 lg:gap-6 lg:p-6 pb-20 sm:pb-6">
      {/* Tampilan Konten Dinamis Berdasarkan Tab bagi Admin Terotentikasi */}
      {activeTab === "overview" && <DashboardSummary />}
      {activeTab === "positions" && <PositionsCrud />}
      {activeTab === "signals" && <SignalsCrud />}
      {activeTab === "strategies" && <StrategyManagerCrud />}
      {activeTab === "config" && <SettingsCrud />}
    </div>
  );
}

function MainLayout() {
  const { isAuthenticated } = useCryptoSpike();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
      setHash(window.location.hash);
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const isLoginRoute =
    pathname.includes("/login") || hash === "#login";

  // Jika route adalah /login dan belum login, tampilkan halaman LoginView
  if (isLoginRoute && !isAuthenticated) {
    return <LoginView />;
  }

  // Jika sudah login dan masih di /login, otomatis bersihkan path/hash kembali ke dashboard
  if (isLoginRoute && isAuthenticated) {
    if (window.location.pathname.includes("/login")) {
      window.history.replaceState(null, "", "/");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <DashboardContent />
          <MobileBottomNav />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export default function App() {
  return (
    <CryptoSpikeProvider>
      <Toaster
        richColors
        closeButton
        position="top-right"
        visibleToasts={4}
        expand={false}
      />
      <MainLayout />
    </CryptoSpikeProvider>
  );
}
