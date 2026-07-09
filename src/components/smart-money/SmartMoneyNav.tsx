"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/smart-money", label: "概要", short: "全体" },
  { href: "/smart-money/sector", label: "ジャンル別", short: "分野" },
  { href: "/smart-money/positions", label: "銘柄別", short: "銘柄" },
  { href: "/smart-money/investors", label: "投資家別", short: "投資家" },
];

export function SmartMoneyNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Smart Moneyページ"
      className="grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.08] bg-[#07101f]/85 p-1.5 backdrop-blur-xl"
    >
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-xl px-2 py-2.5 text-center text-[10px] font-bold transition sm:text-xs ${
              active
                ? "border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
            }`}
          >
            <span className="hidden sm:inline">{link.label}</span>
            <span className="sm:hidden">{link.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
