import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SmartMoneyNav } from "@/components/smart-money/SmartMoneyNav";

export default function SmartMoneyLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppShell>
      <main className="relative mx-auto max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 xl:pb-12">
        <SmartMoneyNav />
        <div className="mt-5">{children}</div>
      </main>
    </AppShell>
  );
}
