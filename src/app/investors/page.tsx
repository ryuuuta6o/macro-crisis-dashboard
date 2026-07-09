import type { Metadata } from "next";
import Link from "next/link";
import { InvestorsPageContent } from "@/app/smart-money/investors/page";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Smart Money Tracker | Macro Signal",
  description:
    "SEC Form 13Fを使い、著名投資家の四半期末保有、新規・買い増し・減少・全売却、セクター傾向を整理する補助シグナルページ。",
};

export default function InvestorsPage() {
  return (
    <AppShell>
      <main className="relative mx-auto max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 xl:pb-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-300/15 bg-indigo-300/[0.05] px-4 py-3">
          <div>
            <p className="text-[9px] font-bold tracking-[0.16em] text-indigo-300">
              SMART MONEY / AUXILIARY SIGNAL
            </p>
            <p className="mt-1 text-xs text-slate-400">
              金融危機の安全弁ではなく、最大45日遅れの補助データです。
            </p>
          </div>
          <Link
            href="/#smart-money"
            className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
        <InvestorsPageContent />
      </main>
    </AppShell>
  );
}
