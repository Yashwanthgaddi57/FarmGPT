"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  Calculator,
  Camera,
  CloudRain,
  Droplets,
  LineChart as LineChartIcon,
  MapPin,
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
import { useDashboard } from "@/hooks/use-api";
import { formatCompactINR, formatINR, riskLabel } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Dashboard unavailable. The backend may be starting up — try refreshing.
        </CardContent>
      </Card>
    );
  }

  const { widgets, charts } = data;
  const risk = riskLabel(widgets.risk_score);

  const kpis = [
    {
      label: "Expected Revenue",
      value: formatCompactINR(widgets.expected_revenue),
      icon: TrendingUp,
      sub: `${widgets.current_season} season`,
    },
    {
      label: "Expected Profit",
      value: formatCompactINR(widgets.expected_profit),
      icon: Wallet,
      sub: "from latest prediction",
    },
    {
      label: "Risk Score",
      value: `${widgets.risk_score.toFixed(0)}/100`,
      icon: AlertTriangle,
      sub: risk.label,
    },
    {
      label: "Disease Alerts",
      value: String(widgets.disease_alerts),
      icon: Bug,
      sub: "last 14 days",
    },
  ];

  const farm = data.farm;

  const quickActions = [
    { href: "/dashboard/plan", label: "Plan My Farm", icon: Sprout },
    { href: "/dashboard/disease", label: "Analyze Crop", icon: Camera },
    { href: "/dashboard/market", label: "Check Market", icon: TrendingUp },
    { href: "/dashboard/profit-calculator", label: "Calculate Profit", icon: Calculator },
    { href: "/dashboard/copilot", label: "Ask AgriGPT", icon: MessageSquareHeart },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Farm Overview</h1>
          <p className="text-sm text-muted-foreground">
            Current crop: <span className="font-medium capitalize text-foreground">{widgets.current_crop}</span>
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/plan">
            Plan My Farm <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

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

      {/* My Farm + Today */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-leaf-600" /> My Farm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Farm size" v={`${farm?.farm_size_acres ?? 0} acres`} />
            <Row k="Location" v={[farm?.village, farm?.district].filter(Boolean).join(", ") || "—"} />
            <Row k="Current crop" v={<span className="capitalize">{farm?.current_crop ?? "—"}</span>} />
            <Row k="Season" v={<span className="capitalize">{farm?.current_season ?? "—"}</span>} />
            <Row k="Water source" v={<span className="capitalize">{farm?.water_source ?? "—"}</span>} />
            <Row k="Soil" v={<span className="capitalize">{farm?.soil_type ?? "—"}</span>} />
            <Link href="/dashboard/profile" className="mt-2 inline-block text-xs text-leaf-600 underline">
              Update farm profile
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudRain className="h-4 w-4 text-sky-600" /> Today&apos;s farm actions
            </CardTitle>
            <CardDescription>Decision-support suggestions — verify before acting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {widgets.ai_recommendation ? (
              <p className="flex items-start gap-2">
                <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <span>
                  <strong>Weather:</strong> {widgets.ai_recommendation}
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <span>
                  <strong>Weather:</strong> forecast loading — check the{" "}
                  <Link className="text-leaf-600 underline" href="/dashboard/weather">weather page</Link>.
                </span>
              </p>
            )}
            <p className="flex items-start gap-2">
              <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
              <span>
                <strong>Crop:</strong> {farm?.current_crop ?? "Set your crop"} —{" "}
                <span className="capitalize">{farm?.current_season}</span> season.
              </span>
            </p>
            {widgets.weather_alerts.length > 0 ? (
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  <strong>Risk:</strong> {widgets.weather_alerts[0]}
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  <strong>Risk:</strong> No hazardous weather flagged for the next 7 days.
                </span>
              </p>
            )}
            {widgets.market_recommendations.length > 0 && (
              <p className="flex items-start gap-2">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                <span>
                  <strong>Market:</strong> {widgets.market_recommendations[0].crop} —{" "}
                  {widgets.market_recommendations[0].recommendation.replace(/_/g, " ")} ({Math.abs(widgets.market_recommendations[0].trend_weekly).toFixed(1)}% this week).
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Crop health */}
      {data.crop_health && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-leaf-600" /> Crop Health
              </span>
              <Link href="/dashboard/disease" className="text-xs font-normal text-leaf-600 underline">
                {data.crop_health.open_issues > 0
                  ? `${data.crop_health.open_issues} open issue${data.crop_health.open_issues > 1 ? "s" : ""} — view all`
                  : "View scans"}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.crop_health.recent_scans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scans in the last 30 days. <Link className="text-leaf-600 underline" href="/dashboard/disease">Scan a crop photo</Link>.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {data.crop_health.recent_scans.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {s.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image_url} alt={s.crop} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        <ScanSearch className="h-5 w-5 text-muted-foreground" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium capitalize">{s.crop}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.disease_name}</p>
                      <Badge
                        variant={s.is_healthy ? "success" : s.followup_status === "resolved" || s.followup_status === "treated" ? "secondary" : "warning"}
                        className="mt-1 text-[10px]"
                      >
                        {s.is_healthy ? "healthy" : (s.followup_status ?? s.severity)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Realtime mandi price ticker */}
      <DashboardTicker />

      {/* Weather action banner — served from the dashboard payload (no extra request) */}
      {widgets.ai_recommendation && (
        <Card className="border-sky-200 bg-sky-50/60 dark:bg-sky-950/20">
          <CardContent className="flex items-start gap-3 py-4">
            <CloudRain className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
            <div>
              <p className="text-sm font-semibold">
                Weather action: {widgets.weather_action?.replace(/_/g, " ")}
              </p>
              <p className="text-sm text-muted-foreground">{widgets.ai_recommendation}</p>
            </div>
            {widgets.weather_stale && (
              <span className="ml-auto mt-0.5 shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                updating…
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{k.label}</span>
                <k.icon className="h-4 w-4 text-leaf-600" />
              </div>
              <p className="mt-2 text-2xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weather + market cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Weather alerts</CardDescription>
            <CardTitle className="text-base">Next 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            {widgets.weather_alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hazardous weather expected.</p>
            ) : (
              <ul className="space-y-2">
                {widgets.weather_alerts.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Market recommendations</CardDescription>
            <CardTitle className="text-base">Sell/wait guidance by crop</CardTitle>
          </CardHeader>
          <CardContent>
            {widgets.market_recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Run a market analysis to see sell/wait guidance here.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {widgets.market_recommendations.map((m) => (
                  <div key={m.crop} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{m.crop}</span>
                      <Badge variant={m.recommendation === "sell_now" ? "success" : "warning"}>
                        {m.recommendation.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm">{formatINR(m.price)} <span className="text-xs text-muted-foreground">/q</span></p>
                    <p className={`text-xs ${m.trend_weekly >= 0 ? "text-leaf-600" : "text-red-600"}`}>
                      {m.trend_weekly >= 0 ? "▲" : "▼"} {Math.abs(m.trend_weekly).toFixed(1)}% this week
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue Projection" description={`Projected across the ${widgets.current_season} season`}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={charts.revenue_projection}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactINR(v)} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Area type="monotone" dataKey="value" stroke="#16a34a" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Profit Projection" description="Cumulative expected profit">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={charts.profit_projection}>
              <defs>
                <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactINR(v)} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="url(#prof)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Yield Estimation" description="Expected quintals over time">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.yield_estimation}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => `${v} q`} />
              <Bar dataKey="value" fill="#a37e5b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demand / Price Forecast" description="Market outlook for your crop">
          {charts.demand_forecast.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <RechartsLineChart data={charts.demand_forecast}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompactINR(v)} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot />
              </RechartsLineChart>
            </ResponsiveContainer>
          ) : (
            <p className="pb-6 text-sm text-muted-foreground">No market forecast yet.</p>
          )}
        </ChartCard>
      </div>

      {/* Weather forecast strip */}
      {charts.weather_forecast.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weather Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {charts.weather_forecast.map((d) => (
                <div key={d.date} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}
                  </p>
                  <p className="mt-1 font-semibold">{d.temp_c ?? "—"}°C</p>
                  <p className="text-xs text-muted-foreground">{d.condition}</p>
                  <p className="mt-1 text-xs text-sky-600">💧 {d.precip_probability ?? 0}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
