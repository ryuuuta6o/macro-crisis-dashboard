"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Signal } from "@/types/indicator";

const signalLabel: Record<Signal | "neutral", string> = {
  green: "正常",
  yellow: "注意",
  orange: "警戒",
  red: "危険",
  unavailable: "未取得",
  neutral: "参照",
};

export function DashboardAccordion({
  id,
  eyebrow,
  title,
  description,
  signal,
  status,
  defaultOpen = false,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  signal: Signal | "neutral";
  status?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const initial = useRef(true);
  const region = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = region.current;
    if (!element) return;

    if (initial.current) {
      element.style.height = open ? "auto" : "0px";
      element.style.opacity = open ? "1" : "0";
      initial.current = false;
      return;
    }

    gsap.killTweensOf(element);
    if (open) {
      const targetHeight = element.scrollHeight;
      gsap.fromTo(
        element,
        { height: 0, opacity: 0 },
        {
          height: targetHeight,
          opacity: 1,
          duration: 0.26,
          ease: "power2.out",
          onComplete: () => {
            element.style.height = "auto";
          },
        },
      );
    } else {
      gsap.to(element, {
        height: 0,
        opacity: 0,
        duration: 0.22,
        ease: "power2.inOut",
      });
    }

    return () => {
      gsap.killTweensOf(element);
    };
  }, [open]);

  const contentId = `${id}-content`;

  return (
    <section id={id} className={`dashboard-accordion dashboard-accordion--${signal}`}>
      <button
        type="button"
        className="dashboard-accordion__trigger"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="dashboard-accordion__identity">
          <span className="dashboard-accordion__eyebrow">{eyebrow}</span>
          <span className="dashboard-accordion__title">{title}</span>
          {description && <span className="dashboard-accordion__description">{description}</span>}
        </span>
        <span className="dashboard-accordion__state">
          <span className="dashboard-accordion__status">
            <i aria-hidden="true" />
            {status ?? signalLabel[signal]}
          </span>
          <span className="dashboard-accordion__chevron" aria-hidden="true">⌄</span>
        </span>
      </button>
      <div
        ref={region}
        id={contentId}
        className="dashboard-accordion__region"
        aria-hidden={!open}
      >
        <div className="dashboard-accordion__content">{children}</div>
      </div>
    </section>
  );
}
