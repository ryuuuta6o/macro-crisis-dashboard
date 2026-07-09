import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { SectorMomentumExplorer } from "@/components/sectors/SectorMomentumExplorer";
import { getSectorMomentumData } from "@/lib/sector-momentum";

export const metadata: Metadata = {
  title: "Sector Momentum | セクター動向",
  description:
    "主要セクターとAI関連テーマのモメンタム、相対的な強さ、期待度の高まりを可視化するセクター動向ページです。",
};

export const revalidate = 900;

export default async function SectorsPage() {
  const data = await getSectorMomentumData();

  return (
    <AppShell>
      <main className="mx-auto max-w-[1680px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 xl:pb-12">
        <SectorMomentumExplorer data={data} />
      </main>
    </AppShell>
  );
}
