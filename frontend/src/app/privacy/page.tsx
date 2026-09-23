import Link from "next/link";
import { Sprout } from "lucide-react";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf-600 text-white">
          <Sprout className="h-4 w-4" />
        </span>
        AgriGPT
      </Link>
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: September 23, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong>Account details</strong> — name, email, phone (optional), provided at registration or via Google sign-in.</li>
            <li><strong>Farm profile</strong> — location (village/district/state or map pin), farm size, soil type, and water source, used to personalize advice.</li>
            <li><strong>Field photos</strong> — images you upload for disease detection.</li>
            <li><strong>Usage data</strong> — recommendations requested, chat messages, and general app activity, to improve the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How we use it</h2>
          <p className="mt-2 text-muted-foreground">
            Your data is used only to operate the service: generating crop/disease/profit/market
            insights, sending weather and price alerts you opt into, and improving recommendation
            quality. We <strong>never sell</strong> your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">AI processing</h2>
          <p className="mt-2 text-muted-foreground">
            Questions and relevant farm context are processed by our AI provider (Anthropic) to
            generate advice. Prompts may include your farm profile but are not used to train
            third-party models under our enterprise agreement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Storage &amp; security</h2>
          <p className="mt-2 text-muted-foreground">
            Data is stored in Supabase (PostgreSQL) with row-level security — only you can read your
            rows. Photos are stored in a private bucket with owner-scoped access. All traffic is
            encrypted in transit (HTTPS/TLS).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Your rights</h2>
          <p className="mt-2 text-muted-foreground">
            You can export or delete your data at any time from Profile settings, or by writing to
            us. Deleting your account removes your profile, farms, and history.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Privacy questions: <span className="font-medium">support@agrigpt.app</span>
          </p>
        </section>
      </div>
    </div>
  );
}
