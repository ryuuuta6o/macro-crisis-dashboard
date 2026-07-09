import { Sidebar } from "@/components/layout/Sidebar";
import { TopTickerBar } from "@/components/layout/TopTickerBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="terminal-ui min-h-screen bg-[#0A0B0D] text-[#E6E7E9]">
      <Sidebar />
      <div className="relative xl:pl-48">
        <TopTickerBar />
        {children}
      </div>
    </div>
  );
}
