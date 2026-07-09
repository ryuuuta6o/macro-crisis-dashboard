import type { ReactNode } from "react";
import type { Signal } from "@/types/indicator";

const labels: Record<Signal | "neutral", string> = {
  green: "正常",
  yellow: "注意",
  orange: "警戒",
  red: "危険",
  unavailable: "未取得",
  neutral: "参照",
};

export function PublicSectionFold({
  id,
  eyebrow,
  title,
  description,
  signal,
  status,
  defaultOpen = false,
  className = "",
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  signal: Signal | "neutral";
  status?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      className={`public-section-fold public-section-fold--${signal} ${className}`.trim()}
      open={defaultOpen}
    >
      <summary>
        <span className="public-section-fold__identity">
          <small>{eyebrow}</small>
          <strong>{title}</strong>
          {description && <span>{description}</span>}
        </span>
        <span className="public-section-fold__state">
          <b><i />{status ?? labels[signal]}</b>
          <em aria-hidden="true">⌄</em>
        </span>
      </summary>
      <div className="public-section-fold__content">{children}</div>
    </details>
  );
}
