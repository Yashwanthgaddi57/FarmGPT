"use client";

import * as React from "react";
import Image from "next/image";
import { Camera, FileScan, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAnalyzeDisease,
  useDiseaseAnalytics,
  useDiseaseReports,
} from "@/hooks/use-api";
import { apiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

const SEVERITY_VARIANT: Record<string, "success" | "warning" | "danger" | "destructive"> = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "destructive",
};

export default function DiseasePage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState("");
  const [page, setPage] = React.useState(1);
  const analyze = useAnalyzeDisease();
  const { data: reports } = useDiseaseReports(page);
  const { data: analytics } = useDiseaseAnalytics();
  const { toast } = useToast();

  const onFile = (f: File | null) => {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !crop) {
      toast({ title: "Missing info", description: "Pick a photo and enter the crop name." });
      return;
    }
    try {
      await analyze.mutateAsync({ image: file, crop });
      toast({ title: "Analysis complete", variant: "success" });
    } catch (err) {
      toast({ title: "Analysis failed", description: apiErrorMessage(err), variant: "destructive" });
    }
  };

  const latest = analyze.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Disease Scan</h1>
        <p className="text-sm text-muted-foreground">
          Upload a leaf photo — Claude Vision identifies disease, severity and treatment.
        </p>
      </div>

      <Tabs defaultValue="scan">
        <TabsList>
          <TabsTrigger value="scan">Scan</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-4 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4 text-leaf-600" /> Upload leaf photo
              </CardTitle>
              <CardDescription>JPEG/PNG/WebP up to 10MB. Clear, well-lit close-ups work best.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-leaf-400 hover:bg-leaf-50/40"
                  onClick={() => document.getElementById("leaf-input")?.click()}
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Leaf preview" className="max-h-48 rounded-lg object-contain" />
                  ) : (
                    <>
                      <FileScan className="h-10 w-10 text-leaf-500" />
                      <p className="text-sm font-medium">Click to select a photo</p>
                      <p className="text-xs text-muted-foreground">or drag & drop</p>
                    </>
                  )}
                </div>
                <input
                  id="leaf-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
                <div className="space-y-2">
                  <Label>Crop name</Label>
                  <Input
                    required
                    placeholder="e.g. cotton, tomato, wheat"
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={analyze.isPending}>
                  {analyze.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing image…</>
                  ) : (
                    <>Scan for disease</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Diagnosis</CardTitle>
              <CardDescription>AI assessment with treatment plan</CardDescription>
            </CardHeader>
            <CardContent>
              {!latest && !analyze.isPending && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Results appear here after your first scan.
                </p>
              )}
              {analyze.isPending && (
                <div className="space-y-3 py-4">
                  <SkeletonLine />
                  <SkeletonLine />
                  <SkeletonLine />
                </div>
              )}
              {latest && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{latest.disease_name}</h3>
                    <Badge variant={latest.is_healthy ? "success" : SEVERITY_VARIANT[latest.severity] ?? "warning"}>
                      {latest.is_healthy ? "Healthy" : `${latest.severity} severity`}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Crop</p>
                      <p className="font-medium capitalize">{latest.crop}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <p className="font-medium">{latest.confidence.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Severity score</span><span>{latest.severity_score.toFixed(0)}/100</span>
                    </div>
                    <Progress value={latest.severity_score} />
                  </div>
                  <Section title="Symptoms" body={latest.symptoms} />
                  <Section title="Cause" body={latest.cause} />
                  <Section title="Treatment" body={latest.treatment} />
                  <Section title="Prevention" body={latest.prevention} />
                  <Section title="Spread risk" body={latest.spread_risk} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          {(reports?.items ?? []).length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No scans yet.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(reports?.items ?? []).map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex gap-4 pt-6">
                    {r.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image_url} alt={r.crop} className="h-20 w-20 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold">{r.disease_name}</p>
                        <Badge variant={r.is_healthy ? "success" : SEVERITY_VARIANT[r.severity] ?? "warning"}>
                          {r.is_healthy ? "healthy" : r.severity}
                        </Badge>
                      </div>
                      <p className="text-sm capitalize text-muted-foreground">{r.crop} · {r.confidence.toFixed(0)}%</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.treatment}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {reports && reports.total > 10 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * 10 >= reports.total} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          {!analytics ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No analytics yet.</CardContent></Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total scans" value={String(analytics.total_reports)} />
                <StatCard label="Diseased" value={String(analytics.diseased_count)} />
                <StatCard label="Healthy" value={String(analytics.healthy_count)} />
                <StatCard label="Avg confidence" value={`${analytics.avg_confidence.toFixed(0)}%`} />
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Top diseases detected</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {analytics.top_diseases.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
                  {analytics.top_diseases.map((d: { name: string; count: number }) => (
                    <div key={d.name} className="flex items-center gap-3">
                      <span className="w-44 truncate text-sm">{d.name}</span>
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-red-400"
                          style={{ width: `${(d.count / Math.max(...analytics.top_diseases.map((x: { count: number }) => x.count))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{d.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm">{body}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="pt-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </CardContent></Card>
  );
}

function SkeletonLine() {
  return <div className="h-4 w-full animate-pulse rounded bg-muted" />;
}
