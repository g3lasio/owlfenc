/**
 * OnboardingRedirect
 * 
 * Replaces the old ContractorOnboarding wizard.
 * Shows a compelling welcome screen that explains WHY completing the profile matters,
 * then redirects to /profile — the single source of truth for all contractor data.
 * 
 * Why this approach:
 *  - Profile page already has ALL fields + autosave + Firestore sync
 *  - No duplicate forms, no sync bugs, no data loss
 *  - Owl Fenc uses profile data for estimates, contracts, invoices, permits — it must be complete
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Shield,
  Zap,
  Building2,
  ChevronRight,
  CheckCircle2,
  Star,
} from "lucide-react";

const BENEFITS = [
  {
    icon: FileText,
    title: "Estimates & Contracts",
    description:
      "Your company name, logo, license, and address appear automatically on every estimate and contract you generate — no re-typing ever.",
  },
  {
    icon: Shield,
    title: "Legal Protection",
    description:
      "Your license number and insurance policy are embedded in every contract, giving you full legal coverage on every job.",
  },
  {
    icon: Zap,
    title: "AI That Knows You",
    description:
      "Mervin AI uses your specialties, location, and business type to generate hyper-accurate estimates tailored to your market.",
  },
  {
    icon: Building2,
    title: "Permit Advisor",
    description:
      "Your state and city are used to pull the exact permit requirements for your area — no generic answers.",
  },
];

const REQUIRED_FIELDS = [
  "Company name",
  "Owner name",
  "Phone number",
  "City & State",
  "Specialties",
  "License number (if applicable)",
  "Company logo (optional but recommended)",
];

export default function OnboardingRedirect() {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const [countdown, setCountdown] = useState<number | null>(null);

  // Mark onboarding as "seen" so we don't redirect here again
  useEffect(() => {
    if (currentUser?.uid) {
      localStorage.setItem(`onboarding_completed_${currentUser.uid}`, "true");
    }
  }, [currentUser]);

  const handleGoToProfile = () => {
    navigate("/profile");
  };

  // Auto-redirect after 15 seconds if user doesn't click
  useEffect(() => {
    const timer = setTimeout(() => {
      setCountdown(15);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      navigate("/profile");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-1.5 text-cyan-400 text-sm mb-6">
          <Star className="w-4 h-4" />
          Welcome to Owl Fenc — Let's set you up
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
          Your profile is the{" "}
          <span className="text-cyan-400">engine</span> behind everything
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Every estimate, contract, invoice, and permit report Owl Fenc generates
          pulls data directly from your profile. A complete profile means{" "}
          <strong className="text-white">professional documents in seconds</strong> —
          an incomplete one means manual work every time.
        </p>
      </div>

      {/* Benefits grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl mb-10">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="border border-cyan-900/40 rounded-lg bg-gray-900/60 p-5 flex gap-4"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* What you'll fill in */}
      <div className="w-full max-w-3xl border border-gray-700 rounded-lg bg-gray-900/50 p-6 mb-10">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          What you'll complete in your profile
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {REQUIRED_FIELDS.map((field) => (
            <li key={field} className="flex items-center gap-2 text-gray-300 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
              {field}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={handleGoToProfile}
          size="lg"
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-10 py-6 text-lg rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          Complete My Profile
          <ChevronRight className="w-5 h-5" />
        </Button>
        {countdown !== null && (
          <p className="text-gray-500 text-sm">
            Redirecting automatically in{" "}
            <span className="text-cyan-400 font-bold">{countdown}s</span>…
          </p>
        )}
      </div>
    </div>
  );
}
