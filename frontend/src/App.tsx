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
import { Toaster } from "@/components/ui/sonner";

function DashboardContent() {
  const { activeTab } = useCryptoSpike();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Tampilan Konten Dinamis Berdasarkan Tab */}
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

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <DashboardContent />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export default function App() {
  return (
    <CryptoSpikeProvider>
      <Toaster richColors position="top-right" />
      <MainLayout />
    </CryptoSpikeProvider>
  );
}
