"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  Calculator,
  Camera,
  CloudRain,
  Coins,
  MessageSquareHeart,
  ScanSearch,
  Sprout,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardTicker } from "@/components/dashboard/price-ticker";
import { useProfile, useTodayPlan } from "@/hooks/use-api";
import { formatCompactINR, formatINR } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  health: ScanSearch,
  weather: CloudRain,
  crop: Sprout,
  market: TrendingUp,
  economics: Wallet,
};

const LEVEL_VARIANT: Record<string, "danger" | "warning" | "secondary"> = {
  high: "danger",
  medium: "warning",
  low: "secondary",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function FarmHomePage() {
  const { data: profile } = useProfile();
  const { data: plan, isLoading, error } = useTodayPlan();

  const name = profile?.name?.split(" ")[0] ?? "Farmer";
  const farm = plan?.farm;

  const quickActions = [
    { href: "/dashboard/plan", label: "Plan My Farm", icon: Sprout },
    { href: "/dashboard/disease", label: "Analyze Crop", icon: Camera },
    { href: "/dashboard/market", label: "Check Market", icon: TrendingUp },
    { href: "/dashboard/profit-calculator", label: "Calculate Profit", icon: Calculator },
    { href: "/dashboard/copilot", label: "Ask AgriGPT", icon: MessageSquareHeart },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting + farm identity */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {name} 👋
        </h1>
        {farm && (farm.size_acres > 0 || farm.crop) ? (
          <p className="text-sm text-muted-foreground">
            Your farm: {farm.size_acres} acres
            {farm.crop && (
              <>
                {" "}• <span className="capitalize">{farm.crop}</span>
                {farm.crop_age_days != null && <> • Day {farm.crop_age_days}</>}
              </>
            )}
            {farm.district && <> • {farm.district}</>}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Set up your farm to personalize this page —{" "}
            <Link href="/dashboard/plan" className="text-leaf-600 underline">
              Plan My Farm
            </Link>
          </p>
        )}
      </div>

      {/* Today's Farm Briefing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Today&apos;s Farm Briefing</CardTitle>
          <CardDescription>Generated from your farm data, live weather, market and health scans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 text-sm">
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          )}
          {error && (
            <p className="text-muted-foreground">
              The briefing is temporarily unavailable — the backend may be waking up. Try refreshing shortly.
            </p>
          )}
          {plan && (
            <>
              <p className="flex items-start gap-2">
                <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <span>
                  <strong>Weather:</strong>{" "}
                  {plan.weather
                    ? `${plan.weather.summary}${plan.weather.rain_probability != null ? ` · ${plan.weather.rain_probability}% rain` : ""}`
                    : "Forecast unavailable right now."}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                <span>
                  <strong>Crop:</strong>{" "}
                  {farm?.crop
                    ? `${farm.crop} — ${farm.crop_stage ?? "growth stage unknown"}${farm.crop_age_days != null ? ` (day ${farm.crop_age_days})` : ""}`
                    : "No crop recorded yet."}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Bug className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  <strong>Crop health:</strong>{" "}
                  {plan.crop_health.has_open_issue
                    ? `${plan.crop_health.possible_issue} (${plan.crop_health.confidence?.toFixed(0)}% confidence, ${plan.crop_health.followup_status})`
                    : "No open issues in the last 30 days."}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                <span>
                  <strong>Market:</strong>{" "}
                  {plan.market
                    ? `${plan.market.crop} at ₹${plan.market.price.toLocaleString("en-IN")}/q (${plan.market.trend_weekly_pct >= 0 ? "+" : ""}${plan.market.trend_weekly_pct.toFixed(1)}% wk · ${plan.market.is_live ? "live" : "estimate"})`
                    : "Market data currently unavailable."}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" />
                <span>
                  <strong>Economics:</strong>{" "}
                  {plan.economics.estimated_cost > 0
                    ? `est. cost ${formatCompactINR(plan.economics.estimated_cost)} · est. revenue ${formatCompactINR(plan.economics.estimated_revenue)} · est. profit ${formatCompactINR(plan.economics.estimated_profit)}`
                    : "Run a profit estimate to see economics here."}
                </span>
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* What should I do today? */}
      <Card className="border-leaf-300">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>What should I do today?</span>
            <Badge variant="secondary" className="text-[10px]">AI decision engine</Badge>
          </CardTitle>
          <CardDescription>Top priorities, each with its stated basis — not guarantees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <Skeleton className="h-24 w-full" />}
          {plan && plan.priorities.map((p) => {
            const Icon = ICONS[p.icon] ?? Sprout;
            return (
              <div key={p.rank} className="rounded-xl border p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-leaf-600/10 text-leaf-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">{p.rank}.</span>
                      <p className="font-medium">{p.title}</p>
                      <Badge variant={LEVEL_VARIANT[p.level] ?? "secondary"} className="text-[10px]">
                        {p.level}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.detail}</p>
                    <p className="mt-1 text-[11px] italic text-muted-foreground/80">Basis: {p.basis}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {plan && (
            <p className="text-[11px] leading-relaxed text-muted-foreground/80">{plan.disclaimer}</p>
          )}
          <Button asChild className="w-full gap-2 sm:w-auto">
            <Link href="/dashboard/copilot">
              Discuss today&apos;s plan with AgriGPT <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Realtime mandi price ticker */}
      <DashboardTicker />

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-leaf-300 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-leaf-600/10 text-leaf-700">
              <a.icon className="h-5 w-5" />
            </span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* Crop health snapshot */}
      {plan?.crop_health.has_open_issue && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-leaf-600" /> Crop Health
              </span>
              <Link href="/dashboard/disease" className="text-xs font-normal text-leaf-600 underline">
                View scans
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Recent scan flagged <strong>{plan.crop_health.possible_issue}</strong> on{" "}
                <span className="capitalize">{plan.crop_health.crop}</span> — status:{" "}
                {plan.crop_health.followup_status}. Re-check the affected plants.
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
