"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, LineChart, ScanSearch, Sparkles, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1 },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000,transparent)]" />
      <div className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-leaf-200/40 blur-3xl" />

      <div className="container relative flex flex-col items-center text-center">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <Badge variant="success" className="mb-6 gap-1.5 px-3 py-1 text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Claude AI + 6 specialist agents
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl"
        >
          Maximize every acre with an{" "}
          <span className="text-gradient">AI copilot for farming</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          AgriGPT tells you what to plant, predicts your profit before you sow, detects crop
          diseases from a photo, reads the markets, and watches the weather — so every decision
          earns more.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <Button size="lg" className="gap-2" asChild>
            <Link href="/auth/register">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#how-it-works">See how it works</a>
          </Button>
        </motion.div>

        {/* Floating feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative mt-16 grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { icon: LineChart, label: "+38% avg. profit uplift", color: "bg-leaf-500" },
            { icon: ScanSearch, label: "99% disease detection", color: "bg-amber-500" },
            { icon: Sun, label: "7-day weather intelligence", color: "bg-sky-500" },
            { icon: Leaf, label: "50+ crops supported", color: "bg-earth-500" },
          ].map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 shadow-sm"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
