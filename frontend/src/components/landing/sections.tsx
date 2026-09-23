"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  Check,
  CloudSun,
  LineChart,
  MessageSquareHeart,
  ScanSearch,
  Sprout,
  TrendingUp,
  Wallet,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto mb-14 max-w-3xl text-center"
    >
      <Badge variant="secondary" className="mb-4">
        {eyebrow}
      </Badge>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );
}

// ---------------- Benefits ----------------
const benefits = [
  { icon: TrendingUp, title: "Earn more per acre", text: "Farmers using data-driven crop choice report 25-40% higher net income than regional averages." },
  { icon: Wallet, title: "Cut input waste", text: "AI-tuned fertilizer, water and pesticide plans reduce input costs by up to 20%." },
  { icon: ScanSearch, title: "Stop disease early", text: "Photo-based detection catches infections days before visible spread, saving entire harvests." },
  { icon: LineChart, title: "Sell at the right time", text: "Market forecasts tell you whether to sell now or wait — with confidence scores." },
];

export function Benefits() {
  return (
    <section className="border-b bg-leaf-50/50 py-24 dark:bg-leaf-950/10">
      <div className="container">
        <SectionHeading
          eyebrow="Why AgriGPT"
          title={<>Built to raise <span className="text-gradient">farmer income</span></>}
          subtitle="Every feature maps to one metric: net profit at harvest."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="h-full">
                <CardContent className="pt-6">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-leaf-600/10 text-leaf-700">
                    <b.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mb-2 font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- Features ----------------
const features = [
  { icon: Sprout, title: "Crop Recommendation Engine", text: "Five best crops for your soil, water, budget and season — ranked by expected profit with risk and confidence scores." },
  { icon: ScanSearch, title: "AI Disease Detection", text: "Upload a leaf photo; Claude Vision identifies the disease, severity, treatment and prevention plan." },
  { icon: Wallet, title: "Profit Predictor", text: "Best, average and worst-case scenarios for yield, revenue and ROI before you spend a rupee." },
  { icon: TrendingUp, title: "Market Intelligence", text: "Weekly, monthly and quarterly price trends with demand/supply forecasts and sell/wait guidance." },
  { icon: CloudSun, title: "Weather Intelligence", text: "Seven-day agro-meteorology: plant, irrigate, harvest or delay — with alerts for heat, frost and storms." },
  { icon: MessageSquareHeart, title: "AI Farm Copilot", text: "Chat in your language with an advisor that knows your farm, history and latest reports." },
];

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="container">
        <SectionHeading
          eyebrow="Features"
          title={<>Six AI agents, <span className="text-gradient">one platform</span></>}
          subtitle="Specialist agents coordinated by an orchestrator that routes every question to the right expert."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="group h-full transition-all hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="pt-6">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-leaf-600 to-leaf-400 text-white shadow">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mb-2 font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- How It Works ----------------
const steps = [
  { n: "01", title: "Tell us about your farm", text: "District, soil, water source, size and budget. Takes two minutes." },
  { n: "02", title: "Get your AI crop plan", text: "Five ranked crop options with profit, risk and duration projections." },
  { n: "03", title: "Grow with guardrails", text: "Photo-based disease scans, weather alerts and irrigation advice all season." },
  { n: "04", title: "Sell at the perfect time", text: "Market forecasts tell you when to hold and when to sell for maximum price." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b bg-secondary/30 py-24">
      <div className="container">
        <SectionHeading
          eyebrow="How it works"
          title={<>From data to <span className="text-gradient">harvest income</span></>}
        />
        <div className="relative grid gap-8 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-leaf-400 to-transparent md:block" />
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative text-center md:text-left"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-leaf-500 bg-background font-bold text-leaf-600 md:mx-0">
                {s.n}
              </div>
              <h3 className="mb-2 font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- Pricing ----------------
const plans = [
  {
    name: "Kisan Free",
    price: "₹0",
    period: "forever",
    description: "Core AI tools for smallholders.",
    features: ["5 crop recommendations / month", "10 disease scans / month", "Weather intelligence", "AI Copilot (20 messages/day)"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro Farmer",
    price: "₹299",
    period: "per month",
    description: "For serious growers who want every edge.",
    features: ["Unlimited crop recommendations", "Unlimited disease scans", "Market intelligence + forecasts", "Profit predictor with scenarios", "Priority AI Copilot", "Email alerts"],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Cooperative",
    price: "₹4,999",
    period: "per month",
    description: "For FPOs, NGOs and agri-program teams.",
    features: ["Up to 100 farmer seats", "Admin dashboard & agent logs", "Bulk disease scanning", "Custom crop playbooks", "API access", "Dedicated support"],
    cta: "Contact sales",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="container">
        <SectionHeading
          eyebrow="Pricing"
          title={<>Priced like a <span className="text-gradient">bag of seed</span>, not an enterprise SaaS</>}
          subtitle="One good sell decision pays for a year of Pro."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card
                className={cn(
                  "relative h-full",
                  p.highlight && "border-leaf-500 shadow-xl shadow-leaf-600/10"
                )}
              >
                {p.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
                )}
                <CardContent className="flex h-full flex-col p-6">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold">{p.price}</span>
                    <span className="text-sm text-muted-foreground">/ {p.period}</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={p.highlight ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/auth/register">{p.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- Testimonials ----------------
const testimonials = [
  {
    quote: "The crop recommendation switched me from soybean to gram that season. My profit per acre nearly doubled — ₹58,000 more.",
    name: "Ramesh Patil",
    role: "5-acre farm, Nashik, Maharashtra",
  },
  {
    quote: "I caught leaf rust two weeks early from one photo. The treatment plan saved my entire wheat field.",
    name: "Sukhwinder Singh",
    role: "12-acre farm, Ludhiana, Punjab",
  },
  {
    quote: "Our FPO uses the market forecast for 80 families' sell decisions. The wait-two-weeks advice added ₹4 lakh last onion season.",
    name: "Lakshmi Reddy",
    role: "Secretary, Kurnool FPO, Andhra Pradesh",
  },
];

export function Testimonials() {
  return (
    <section className="border-y bg-leaf-50/50 py-24 dark:bg-leaf-950/10">
      <div className="container">
        <SectionHeading eyebrow="Testimonials" title={<>Farmers <span className="text-gradient">grow with us</span></>} />
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="h-full">
                <CardContent className="flex h-full flex-col pt-6">
                  <p className="flex-1 text-sm leading-relaxed">“{t.quote}”</p>
                  <div className="mt-6 border-t pt-4">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- FAQ ----------------
const faqs = [
  { q: "Is AgriGPT free to use?", a: "Yes — the Kisan Free plan includes monthly crop recommendations, disease scans, weather intelligence and limited AI copilot chats, forever. Pro unlocks unlimited usage and market forecasts." },
  { q: "Which crops are supported?", a: "50+ major Indian crops across cereals, pulses, oilseeds, vegetables, fruits and spices — from wheat, rice and cotton to tomato, onion, turmeric and mango." },
  { q: "How accurate is disease detection?", a: "Claude Vision identifies common crop diseases with 90-99% confidence on clear photos. Every report includes confidence scores, and treatment advice recommends verification with your local agriculture officer." },
  { q: "Do you sell my farm data?", a: "Never. Your data is stored in your own isolated workspace, protected by row-level security, and used only to improve your own recommendations." },
  { q: "Does it work in my language?", a: "The AI copilot replies in English, Hindi, Hinglish and major Indian languages. The interface is English today, with more languages coming." },
  { q: "What do I need to get started?", a: "Just a phone. Register, describe your farm, and the AI starts working. No sensors, no hardware, no setup cost." },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = React.useState<number | null>(0);
  return (
    <section id="faq" className="py-24">
      <div className="container max-w-3xl">
        <SectionHeading eyebrow="FAQ" title={<>Questions, <span className="text-gradient">answered</span></>} />
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <motion.div key={f.q} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card>
                <button
                  className="flex w-full items-center justify-between p-5 text-left font-medium"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                >
                  {f.q}
                  <span className={cn("ml-4 transition-transform", openIdx === i && "rotate-45")}>+</span>
                </button>
                {openIdx === i && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- Footer ----------------
export function Footer() {
  return (
    <footer className="border-t bg-leaf-950 py-14 text-leaf-50 dark:bg-black">
      <div className="container grid gap-10 md:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-600 text-white">
              <Sprout className="h-5 w-5" />
            </span>
            AgriGPT
          </div>
          <p className="text-sm text-leaf-200/80">
            AI-powered income optimization for every farmer.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Product</h4>
          <ul className="space-y-2 text-sm text-leaf-200/80">
            <li><a href="#features" className="hover:text-white">Features</a></li>
            <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
            <li><Link href="/auth/register" className="hover:text-white">Get started</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Resources</h4>
          <ul className="space-y-2 text-sm text-leaf-200/80">
            <li><a href="#how-it-works" className="hover:text-white">How it works</a></li>
            <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            <li><a href="/docs" className="hover:text-white">API docs</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Legal</h4>
          <ul className="space-y-2 text-sm text-leaf-200/80">
            <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms of service</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mt-10 border-t border-leaf-900 pt-6 text-center text-xs text-leaf-300/60">
        © {new Date().getFullYear()} AgriGPT. Built with Claude, LangGraph and ❤ for farmers.
      </div>
    </footer>
  );
}
