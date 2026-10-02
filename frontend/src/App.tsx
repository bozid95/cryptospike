import { CryptoSpikeProvider, useCryptoSpike } from "@/mock/mock-context";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SettingsCrud } from "@/components/crud/settings-crud";
import { SignalsCrud } from "@/components/crud/signals-crud";
import { StrategyManagerCrud } from "@/components/crud/strategy-manager-crud";
import { DashboardSummary } from "@/components/dashboard-summary";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function DashboardContent() {
  const { activeTab } = useCryptoSpike();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Tampilan Konten Dinamis Berdasarkan Tab */}
      {activeTab === "overview" && <DashboardSummary />}
      {activeTab === "signals" && <SignalsCrud />}
      {activeTab === "strategies" && <StrategyManagerCrud />}
      {activeTab === "config" && <SettingsCrud />}
    </div>
  );
}

export default function App() {
  return (
    <CryptoSpikeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <DashboardContent />
          </SidebarInset>
        </SidebarProvider>
      </div>
    </CryptoSpikeProvider>
  );
}
