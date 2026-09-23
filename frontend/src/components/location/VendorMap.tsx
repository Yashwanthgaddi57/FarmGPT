"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as React from "react";

import type { FarmerLocation, VendorItem } from "@/hooks/use-api";

interface Props {
  center: { lat: number; lng: number };
  you: FarmerLocation;
  points: VendorItem[];
}

const COLORS: Record<string, string> = {
  seeds: "#16a34a",
  fertilizer: "#d97706",
  pesticide: "#dc2626",
  equipment: "#0284c7",
  produce_buyer: "#7c3aed",
};

export default function VendorMap({ you, points }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<L.Map | null>(null);
  const layer = React.useRef<L.LayerGroup | null>(null);

  React.useEffect(() => {
    if (!ref.current || map.current) return;
    const m = L.map(ref.current, { scrollWheelZoom: false }).setView(
      [you.latitude, you.longitude],
      9
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const m = map.current;
    const lg = layer.current;
    if (!m || !lg) return;
    lg.clearLayers();

    L.marker([you.latitude, you.longitude], {
      icon: L.divIcon({
        className: "",
        html: `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">📍</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      }),
    })
      .bindTooltip(`You: ${you.label}`, { direction: "top" })
      .addTo(lg);

    const bounds: L.LatLngExpression[] = [[you.latitude, you.longitude]];
    for (const v of points) {
      const color = COLORS[v.category] ?? "#16a34a";
      L.circleMarker([v.latitude, v.longitude], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2,
      })
        .bindTooltip(`${v.name} · ${v.raw_distance_km} km`, { direction: "top" })
        .bindPopup(
          `<b>${v.name}</b><br/>${v.category.replace("_", " ")}${
            v.phone ? `<br/>${v.phone}` : ""
          }`
        )
        .addTo(lg);
      bounds.push([v.latitude, v.longitude]);
    }
    if (points.length) {
      m.fitBounds(L.latLngBounds(bounds).pad(0.15));
    }
  }, [you, points]);

  return <div ref={ref} className="h-80 w-full rounded-lg border" style={{ zIndex: 0 }} />;
}
