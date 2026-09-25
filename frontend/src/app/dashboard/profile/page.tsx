"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSaveLocation } from "@/hooks/use-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "@/hooks/use-api";
import { apiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const SOILS = ["black", "alluvial", "loamy", "clay", "sandy", "silt", "laterite", "red", "peaty", "unknown"];
const WATER = ["rainfed", "canal", "borewell", "well", "river", "pond", "none"];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  village: z.string().optional(),
  farm_size_acres: z.coerce.number().min(0),
  soil_type: z.string(),
  water_availability: z.string(),
  language: z.string(),
});
type FormData = z.infer<typeof schema>;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "te", label: "తెలుగు (Telugu)" },
  { value: "hi", label: "हिंदी (Hindi)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
  { value: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { value: "mr", label: "मराठी (Marathi)" },
];

// Leaflet touches `window` on import — load browser-side only.
const LocationPicker = dynamic(
  () => import("@/components/location/LocationPicker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-lg border bg-muted" /> }
);

export default function ProfilePage() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const saveLocation = useSaveLocation();
  const { toast } = useToast();
  const [soil, setSoil] = React.useState("unknown");
  const [water, setWater] = React.useState("rainfed");
  const [language, setLanguage] = React.useState("en");

  React.useEffect(() => {
    if (profile) {
      setSoil(profile.soil_type);
      setWater(profile.water_availability);
      setLanguage(profile.language ?? "en");
      reset({
        name: profile.name,
        phone: profile.phone ?? "",
        state: profile.state ?? "",
        district: profile.district ?? "",
        village: profile.village ?? "",
        farm_size_acres: profile.farm_size_acres,
        language: profile.language ?? "en",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await update.mutateAsync({ ...data, soil_type: soil, water_availability: water, language });
      toast({ title: "Profile updated", variant: "success" });
    } catch (e) {
      toast({ title: "Update failed", description: apiErrorMessage(e), variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Keep farm details current — the AI uses them for every recommendation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exact farm location</CardTitle>
          <CardDescription>
            {profile?.latitude != null ? (
              <span>
                Saved pin: {Number(profile.latitude).toFixed(4)}, {Number(profile.longitude).toFixed(4)} — weather,
                mandi prices and vendors use this exact spot.
              </span>
            ) : (
              <span>
                Drop a pin or use GPS. Weather, market prices and nearby vendors become exact for
                your farm.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationPicker
            initial={
              profile?.latitude != null
                ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude) }
                : null
            }
            saving={saveLocation.isPending}
            onSave={async (payload) => {
              await saveLocation.mutateAsync(payload);
              toast({ title: "Location saved", description: "Weather, prices and vendors now use your exact spot.", variant: "success" });
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Farm & contact details</CardTitle>
          <CardDescription>{profile?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...register("state")} />
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Input {...register("district")} />
            </div>
            <div className="space-y-2">
              <Label>Village</Label>
              <Input {...register("village")} />
            </div>
            <div className="space-y-2">
              <Label>Farm size (acres)</Label>
              <Input type="number" step="0.1" {...register("farm_size_acres")} />
            </div>
            <div className="space-y-2">
              <Label>Soil type</Label>
              <Select value={soil} onValueChange={setSoil}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOILS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Water availability</Label>
              <Select value={water} onValueChange={setWater}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WATER.map((w) => (
                    <SelectItem key={w} value={w} className="capitalize">{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preferred language (AI answers)</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSubmitting || update.isPending} className="gap-2">
                {isSubmitting || update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
