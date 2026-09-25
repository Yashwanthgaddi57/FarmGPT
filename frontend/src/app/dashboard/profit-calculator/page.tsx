"use client";

import * as React from "react";
import Link from "next/link";
import { Calculator, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/use-api";
import { formatINR } from "@/lib/utils";

interface CostRow {
  key: string;
  label: string;
  default: string;
}

const COSTS: CostRow[] = [
  { key: "seed", label: "Seed cost (₹)", default: "5000" },
  { key: "fertilizer", label: "Fertilizer cost (₹)", default: "8000" },
  { key: "pesticide", label: "Pesticide / input cost (₹)", default: "3000" },
  { key: "labor", label: "Labor cost (₹)", default: "15000" },
  { key: "irrigation", label: "Irrigation cost (₹)", default: "4000" },
  { key: "machinery", label: "Machinery cost (₹)", default: "2500" },
  { key: "other", label: "Other expenses (₹)", default: "0" },
];

export default function ProfitCalculatorPage() {
  const { data: profile } = useProfile();
  const [farmSize, setFarmSize] = React.useState("2.5");
  const [costs, setCosts] = React.useState<Record<string, string>>(
    Object.fromEntries(COSTS.map((c) => [c.key, c.default]))
  );
  const [yieldQPerAcre, setYieldQPerAcre] = React.useState("8");
  const [pricePerQ, setPricePerQ] = React.useState("6000");

  React.useEffect(() => {
    if (profile?.farm_size_acres) setFarmSize(String(profile.farm_size_acres));
  }, [profile]);

  const n = (s: string) => {
    const v = parseFloat(s);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };

  const acres = n(farmSize);
  const totalCost = COSTS.reduce((sum, c) => sum + n(costs[c.key]), 0);
  const production = acres * n(yieldQPerAcre); // quintals
  const revenue = production * n(pricePerQ);
  const profit = revenue - totalCost;
  const profitPerAcre = acres > 0 ? profit / acres : 0;
  const breakEven = production > 0 ? totalCost / production : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profit Calculator</h1>
        <p className="text-sm text-muted-foreground">
          Transparent math — no AI, no black box. Enter your numbers and see the
          result update instantly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-leaf-600" /> Your inputs
            </CardTitle>
            <CardDescription>Costs for the whole farm, for one season.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Farm size (acres)</Label>
              <Input type="number" step="0.1" min="0.1" value={farmSize} onChange={(e) => setFarmSize(e.target.value)} />
            </div>

            <div className="space-y-3 border-t pt-4">
              {COSTS.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3">
                  <Label className="min-w-0 flex-1 text-sm">{c.label}</Label>
                  <Input
                    type="number"
                    min="0"
                    className="w-32 shrink-0"
                    value={costs[c.key]}
                    onChange={(e) => setCosts({ ...costs, [c.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <Label className="min-w-0 flex-1 text-sm">Expected yield (quintals / acre)</Label>
                <Input type="number" step="0.1" min="0" className="w-32 shrink-0" value={yieldQPerAcre} onChange={(e) => setYieldQPerAcre(e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="min-w-0 flex-1 text-sm">Expected selling price (₹ / quintal)</Label>
                <Input type="number" min="0" className="w-32 shrink-0" value={pricePerQ} onChange={(e) => setPricePerQ(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <Card className={profit >= 0 ? "border-leaf-300" : "border-red-300"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estimated result</CardTitle>
              <CardDescription>Based on the inputs above — not a guarantee</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row k="Total cost" v={formatINR(totalCost)} />
              <Row k={`Expected production (${acres || 0} acres × ${n(yieldQPerAcre)} q)`} v={`${production.toFixed(1)} q`} />
              <Row k="Expected revenue" v={formatINR(revenue)} />
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Estimated gross profit</span>
                <span className={`text-lg font-bold ${profit >= 0 ? "text-leaf-700" : "text-red-600"}`}>
                  {formatINR(profit)}
                </span>
              </div>
              <Row k="Estimated profit per acre" v={formatINR(profitPerAcre)} />
              <Row k="Break-even selling price" v={`${formatINR(breakEven)} / q`} />
              <div className="flex items-center gap-2 pt-1">
                <Badge variant={profit >= 0 ? "success" : "danger"}>
                  {profit >= 0 ? "Estimated profit" : "Estimated loss"}
                </Badge>
                {breakEven > 0 && n(pricePerQ) > 0 && (
                  <Badge variant={n(pricePerQ) >= breakEven ? "success" : "warning"}>
                    {n(pricePerQ) >= breakEven ? "Above break-even" : "Below break-even"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 py-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-xs leading-relaxed text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">How this is calculated</p>
                Total cost = seed + fertilizer + pesticide + labor + irrigation +
                machinery + other. Revenue = yield × price. Profit = revenue −
                total cost. Break-even price = total cost ÷ production. These
                are your own assumptions — actual results depend on weather,
                pests and market prices.
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/profit">AI profit prediction</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/plan">Plan my farm</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
