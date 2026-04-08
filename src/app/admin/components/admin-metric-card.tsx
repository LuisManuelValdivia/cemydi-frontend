import type { ReactNode } from "react";

import {
  BadgePercent,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageCheck,
  ShieldAlert,
  Sparkles,
  Star,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Card, CardContent } from "./ui/card";

type AdminMetricContext =
  | "products-active"
  | "products-stock"
  | "products-recipe"
  | "database-online"
  | "database-connections"
  | "database-tables"
  | "database-alerts"
  | "promotions-total"
  | "promotions-active"
  | "promotions-scheduled"
  | "reviews-total"
  | "reviews-pending"
  | "reviews-approved"
  | "reviews-rejected";

type MetricTone = {
  icon: LucideIcon;
  iconWrapperClassName: string;
  iconClassName: string;
  accentClassName: string;
};

const METRIC_TONES: Record<AdminMetricContext, MetricTone> = {
  "products-active": {
    icon: PackageCheck,
    iconWrapperClassName:
      "bg-emerald-500/12 dark:bg-emerald-400/14",
    iconClassName: "text-emerald-700 dark:text-emerald-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(52,168,83,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.10),transparent_56%)]",
  },
  "products-stock": {
    icon: Warehouse,
    iconWrapperClassName:
      "bg-amber-500/12 dark:bg-amber-400/14",
    iconClassName: "text-amber-700 dark:text-amber-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.10),transparent_56%)]",
  },
  "products-recipe": {
    icon: ShieldAlert,
    iconWrapperClassName:
      "bg-red-500/12 dark:bg-red-400/14",
    iconClassName: "text-red-700 dark:text-red-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.09),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.10),transparent_56%)]",
  },
  "database-online": {
    icon: CheckCircle2,
    iconWrapperClassName:
      "bg-emerald-500/12 dark:bg-emerald-400/14",
    iconClassName: "text-emerald-700 dark:text-emerald-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.10),transparent_56%)]",
  },
  "database-connections": {
    icon: Sparkles,
    iconWrapperClassName:
      "bg-sky-500/12 dark:bg-sky-400/14",
    iconClassName: "text-sky-700 dark:text-sky-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_56%)]",
  },
  "database-tables": {
    icon: Boxes,
    iconWrapperClassName:
      "bg-violet-500/12 dark:bg-violet-400/14",
    iconClassName: "text-violet-700 dark:text-violet-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.10),transparent_56%)]",
  },
  "database-alerts": {
    icon: ShieldAlert,
    iconWrapperClassName:
      "bg-amber-500/12 dark:bg-amber-400/14",
    iconClassName: "text-amber-700 dark:text-amber-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.10),transparent_56%)]",
  },
  "promotions-total": {
    icon: Sparkles,
    iconWrapperClassName:
      "bg-sky-500/12 dark:bg-sky-400/14",
    iconClassName: "text-sky-700 dark:text-sky-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_56%)]",
  },
  "promotions-active": {
    icon: BadgePercent,
    iconWrapperClassName:
      "bg-teal-500/12 dark:bg-teal-400/14",
    iconClassName: "text-teal-700 dark:text-teal-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.10),transparent_56%)]",
  },
  "promotions-scheduled": {
    icon: Clock3,
    iconWrapperClassName:
      "bg-orange-500/12 dark:bg-orange-400/14",
    iconClassName: "text-orange-700 dark:text-orange-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.10),transparent_56%)]",
  },
  "reviews-total": {
    icon: Star,
    iconWrapperClassName:
      "bg-violet-500/12 dark:bg-violet-400/14",
    iconClassName: "text-violet-700 dark:text-violet-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.10),transparent_56%)]",
  },
  "reviews-pending": {
    icon: ClipboardList,
    iconWrapperClassName:
      "bg-amber-500/12 dark:bg-amber-400/14",
    iconClassName: "text-amber-700 dark:text-amber-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.10),transparent_56%)]",
  },
  "reviews-approved": {
    icon: CheckCircle2,
    iconWrapperClassName:
      "bg-emerald-500/12 dark:bg-emerald-400/14",
    iconClassName: "text-emerald-700 dark:text-emerald-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.10),transparent_56%)]",
  },
  "reviews-rejected": {
    icon: Boxes,
    iconWrapperClassName:
      "bg-rose-500/12 dark:bg-rose-400/14",
    iconClassName: "text-rose-700 dark:text-rose-300",
    accentClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.10),transparent_56%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.10),transparent_56%)]",
  },
};

interface AdminMetricCardProps {
  context: AdminMetricContext;
  label: string;
  value: ReactNode;
  helper?: string;
  className?: string;
}

export function AdminMetricCard({
  context,
  label,
  value,
  helper,
  className,
}: AdminMetricCardProps) {
  const tone = METRIC_TONES[context];
  const Icon = tone.icon;

  return (
    <Card
      className={cn(
        "relative min-h-[138px] overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--card)] shadow-[0_10px_24px_rgba(15,61,59,0.06)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.34)]",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0",
          tone.accentClassName,
        )}
      />

      <CardContent className="relative flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 max-w-[15rem]">
            <p className="text-[0.98rem] font-medium leading-snug text-[var(--text-muted)] sm:text-[1.02rem]">
              {label}
            </p>
            {helper ? (
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]/90">
                {helper}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-[20px] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:border-white/8",
              tone.iconWrapperClassName,
            )}
          >
            <Icon className={cn("size-6", tone.iconClassName)} aria-hidden />
          </div>
        </div>

        <div className={cn("pt-4", helper ? "mt-auto" : "mt-5")}>
          <p className="text-[2.15rem] font-semibold leading-none tracking-[-0.04em] text-[var(--text-main)] sm:text-[2.4rem]">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
