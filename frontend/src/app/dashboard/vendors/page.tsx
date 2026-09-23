"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation, Phone, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNearbyVendors, useSaveLocation } from "@/hooks/use-api";
import type { FarmerLocation, VendorItem } from "@/hooks/use-api";
import { cn } from "@/lib/utils";

const LeafletMap = dynamic(() => import("@/components/location/VendorMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />,
});

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "seeds", label: "Seeds" },
  { key: "fertilizer", label: "Fertilizer" },
  { key: "pesticide", label: "Crop Protection" },
  { key: "equipment", label: "Equipment" },
  { key: "produce_buyer", label: "Crop Buyers" },
];

const CATEGORY_VARIANT: Record<
  string,
  "success" | "warning" | "danger" | "secondary" | "default"
> = {
  seeds: "success",
  fertilizer: "warning",
  pesticide: "danger",
  equipment: "secondary",
  produce_buyer: "default",
};

const RADII = [10, 25, 50, 100, 200];

export default function VendorsPage() {
  const [category, setCategory] = React.useState("");
  const [crop, setCrop] = React.useState("");
  const [radius, setRadius] = React.useState(50); // spec D4: default 50 km
  const { data, isLoading } = useNearbyVendors({
    category: category || undefined,
    crop: crop || undefined,
    radius_km: radius,
  });

  const you: FarmerLocation | null = data?.location ?? null;
  const items: VendorItem[] = data?.items ?? [];
  const effectiveRadius = data?.radius_km ?? radius;
  const widened = effectiveRadius > radius;

  // No saved pin yet -> ask for GPS once, on page open. Result is saved to the
  // profile so weather, market and vendors all switch to exact coordinates.
  const askedGps = React.useRef(false);
  const saveLocation = useSaveLocation();
  React.useEffect(() => {
    if (askedGps.current || isLoading || !data) return;
    askedGps.current = true;
    if (data.location.precision !== "district") return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        saveLocation.mutate({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          source: "gps",
        });
      },
      () => {
        /* denied/unavailable — stay on district-level results */
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vendors &amp; Buyers Near You</h1>
        <p className="text-sm text-muted-foreground">
          {you ? (
            <>
              Around <span className="font-medium">{you.label}</span> ·{" "}
              {you.precision === "gps"
                ? "GPS precision"
                : you.precision === "map_pin"
                  ? "map-pin precision"
                  : "district-level"}{" "}
              · sorted by distance
            </>
          ) : (
            "Agri-input shops and produce buyers sorted by distance from your farm"
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.key} value={c.key}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <input
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          placeholder="your crop (e.g. cotton)"
          className="h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex items-center gap-1.5">
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                radius === r
                  ? "border-leaf-600 bg-leaf-600 text-white"
                  : "border-input text-muted-foreground hover:border-leaf-400 hover:text-foreground"
              )}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      {you && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Showing vendors within <span className="font-medium">{effectiveRadius} km</span> of{" "}
          {you.label} — found {items.length}
          {widened && " (widened — nothing within your radius)"}.
        </p>
      )}

      {isLoading && <Skeleton className="h-80 w-full" />}

      {data && items.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No vendors found for this filter yet. Try clearing the filters.
          </CardContent>
        </Card>
      )}

      {data && items.length > 0 && (
        <>
          {you && (
            <LeafletMap
              center={{ lat: you.latitude, lng: you.longitude }}
              you={you}
              points={items}
            />
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((v) => (
              <Card key={v.id} className={v.matches_crop ? "border-leaf-500" : ""}>
                <CardContent className="pt-6">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-100 text-leaf-700">
                        <Store className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.city ?? v.district} · {v.raw_distance_km} km away
                        </p>
                      </div>
                    </div>
                    <Badge variant={CATEGORY_VARIANT[v.category] ?? "secondary"}>
                      {v.category.replace("_", " ")}
                    </Badge>
                  </div>
                  {v.source === "osm" && (
                    <Badge variant="secondary" className="mb-2 text-[10px]">
                      LIVE nearby listing
                    </Badge>
                  )}
                  {v.description && (
                    <p className="text-sm text-muted-foreground">{v.description}</p>
                  )}
                  {v.matches_crop && (
                    <Badge variant="success" className="mt-2 text-[10px]">
                      works with your crop
                    </Badge>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {v.phone && (
                      <Button size="sm" variant="outline" className="gap-1.5" asChild>
                        <a href={`tel:${v.phone.replace(/\s/g, "")}`}>
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1.5" asChild>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Directions
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {data && data.location.precision === "district" && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="py-4 text-sm">
            Currently using district-level location. Save your exact pin (GPS or map) on the{" "}
            <a href="/dashboard/profile" className="font-medium text-leaf-700 underline">
              profile page
            </a>{" "}
            for accurate distances. <MapPin className="ml-1 inline h-4 w-4" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
