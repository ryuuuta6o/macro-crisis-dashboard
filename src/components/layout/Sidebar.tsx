"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/#dashboard", label: "ダッシュボード", short: "ホーム", icon: "HM" },
  { href: "/weather", label: "初心者向け天気予報", short: "入門", icon: "EZ" },
  { href: "/#crisis-risk-range-fold", label: "危機警戒レンジ", short: "総合", icon: "RR" },
  { href: "/#liquidity-core-fold", label: "流動性コア", short: "流動性", icon: "LQ" },
  { href: "/#classification-summary-fold", label: "3分類サマリー", short: "3分類", icon: "3T" },
  { href: "/#crisis-routes-fold", label: "危機ルート", short: "ルート", icon: "RT" },
  { href: "/behavior", label: "危機前行動", short: "行動", icon: "BH" },
  { href: "/sectors", label: "セクター動向", short: "セクター", icon: "SC" },
  { href: "/investors", label: "著名投資家", short: "投資家", icon: "13F" },
  { href: "/global-risk", label: "世界リスク", short: "世界", icon: "GL" },
  { href: "/#signals", label: "シグナル一覧", short: "指標", icon: "MX" },
] as const;

const mobileItems = [
  items[0],
  items[1],
  items[2],
  items[3],
  items[4],
  items[7],
] as const;

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/#dashboard") return pathname === "/";
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <aside className="reference-sidebar fixed inset-y-0 left-0 z-40 hidden w-44 border-r px-3 py-4 xl:flex xl:flex-col">
        <Link href="/#dashboard" className="flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-md border border-white/[0.08] bg-[#16181D]">
            <span className="grid grid-cols-2 gap-1">
              <i className="size-1.5 rounded-full bg-green-400" />
              <i className="size-1.5 rounded-full bg-yellow-400" />
              <i className="size-1.5 rounded-full bg-red-400" />
              <i className="size-1.5 rounded-full bg-slate-500" />
            </span>
          </span>
          <span>
            <strong className="block text-xs tracking-tight text-white">
              MACRO SIGNAL
            </strong>
            <small className="text-[9px] tracking-[0.2em] text-slate-600">
              RISK TERMINAL
            </small>
          </span>
        </Link>

        <nav className="mt-7 space-y-1.5">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-md border px-3 py-2.5 text-xs transition ${
                  active
                    ? "border-blue-400/25 bg-blue-400/[0.09] text-blue-100"
                    : "border-transparent text-slate-500 hover:bg-blue-400/[0.04] hover:text-slate-200"
                }`}
              >
                <span className="grid size-7 place-items-center rounded bg-white/[0.035] font-mono text-[9px] group-hover:text-slate-200">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-blue-400/15 bg-[#071525] p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <i className="size-2 rounded-full bg-[#3FB950] shadow-[0_0_8px_rgba(63,185,80,0.2)]" />
            SYSTEM ONLINE
          </div>
          <p className="mt-3 text-[10px] leading-5 text-slate-600">
            DATA UPDATED<br />FRED / GDELT / SEC
          </p>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 flex justify-around rounded-lg border border-white/[0.08] bg-[#111317]/95 p-2 backdrop-blur-xl xl:hidden">
        {mobileItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-14 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[9px] ${
                active
                  ? "bg-white/[0.06] text-slate-100"
                  : "text-slate-500 active:bg-white/[0.04] active:text-slate-200"
              }`}
            >
              <span className="font-mono text-[10px] font-bold">{item.icon}</span>
              {item.short}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
