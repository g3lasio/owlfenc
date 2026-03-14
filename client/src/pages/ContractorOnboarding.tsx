import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2, User, Phone, MapPin, Globe, Briefcase,
  Shield, Award, Calendar, Camera, Upload, CheckCircle,
  ChevronRight, ChevronLeft, Info, Zap, Star, Lock
} from "lucide-react";
import { auth, saveUserProfile } from "@/lib/firebase";

// ─────────────────────────────────────────────
// COMPLETE CONSTRUCTION SPECIALTY TAXONOMY
// ─────────────────────────────────────────────
const SPECIALTY_CATEGORIES = [
  {
    category: "General & Residential",
    icon: "🏗️",
    specialties: [
      "General Contractor",
      "Residential Builder",
      "Custom Home Builder",
      "Home Remodeling",
      "Home Renovation",
      "Room Additions",
      "Garage Conversion / ADU",
      "Accessory Dwelling Unit (ADU)",
      "Historic Restoration",
    ],
  },
  {
    category: "Commercial & Industrial",
    icon: "🏢",
    specialties: [
      "Commercial Contractor",
      "Industrial Contractor",
      "Tenant Improvement (TI)",
      "Office Build-Out",
      "Retail Build-Out",
      "Warehouse Construction",
      "Restaurant Build-Out",
      "Medical / Healthcare Facility",
      "Data Center Construction",
    ],
  },
  {
    category: "Roofing",
    icon: "🏠",
    specialties: [
      "Roofing Contractor",
      "Asphalt Shingle Roofing",
      "Metal Roofing",
      "Tile Roofing",
      "Flat / Low-Slope Roofing",
      "TPO / EPDM Roofing",
      "Roof Repair & Maintenance",
      "Roof Inspection",
      "Gutters & Downspouts",
      "Skylights & Roof Windows",
    ],
  },
  {
    category: "Fencing & Gates",
    icon: "🚪",
    specialties: [
      "Fence Contractor",
      "Wood Fence",
      "Chain Link Fence",
      "Vinyl / PVC Fence",
      "Wrought Iron / Ornamental Fence",
      "Aluminum Fence",
      "Composite Fence",
      "Automatic Gate Systems",
      "Driveway Gates",
      "Security Fencing",
      "Agricultural Fencing",
      "Pool Fencing",
    ],
  },
  {
    category: "Concrete & Masonry",
    icon: "🧱",
    specialties: [
      "Concrete Contractor",
      "Masonry Contractor",
      "Foundations & Footings",
      "Concrete Flatwork (Driveways, Patios)",
      "Decorative Concrete",
      "Stamped Concrete",
      "Concrete Repair & Resurfacing",
      "Block Wall Construction",
      "Retaining Walls",
      "Brick & Stone Masonry",
      "Stucco",
      "Precast Concrete",
    ],
  },
  {
    category: "Electrical",
    icon: "⚡",
    specialties: [
      "Electrical Contractor",
      "Residential Electrical",
      "Commercial Electrical",
      "Industrial Electrical",
      "Panel Upgrades & Service",
      "EV Charger Installation",
      "Solar Panel Installation",
      "Low Voltage / Data / AV",
      "Generator Installation",
      "Lighting Design & Installation",
      "Smart Home / Automation",
      "Fire Alarm Systems",
    ],
  },
  {
    category: "Plumbing",
    icon: "🪠",
    specialties: [
      "Plumbing Contractor",
      "Residential Plumbing",
      "Commercial Plumbing",
      "Drain Cleaning & Repair",
      "Sewer Line Repair / Replacement",
      "Water Heater Installation",
      "Tankless Water Heater",
      "Pipe Lining / Trenchless",
      "Gas Line Installation",
      "Bathroom / Kitchen Remodel Plumbing",
      "Backflow Prevention",
      "Irrigation & Sprinkler Systems",
    ],
  },
  {
    category: "HVAC",
    icon: "❄️",
    specialties: [
      "HVAC Contractor",
      "Air Conditioning Installation",
      "Heating Installation",
      "Ductwork Installation & Repair",
      "Mini-Split / Ductless Systems",
      "Commercial HVAC",
      "Refrigeration",
      "Boiler Installation & Repair",
      "Indoor Air Quality",
      "HVAC Maintenance & Service",
    ],
  },
  {
    category: "Framing & Structural",
    icon: "🔩",
    specialties: [
      "Framing Contractor",
      "Wood Framing",
      "Steel Framing",
      "Structural Steel",
      "Seismic Retrofitting",
      "Foundation Repair",
      "Shear Wall Installation",
      "Post & Beam Construction",
    ],
  },
  {
    category: "Insulation & Drywall",
    icon: "🏚️",
    specialties: [
      "Insulation Contractor",
      "Spray Foam Insulation",
      "Blown-In Insulation",
      "Batt Insulation",
      "Drywall Contractor",
      "Drywall Hanging & Finishing",
      "Drywall Repair",
      "Acoustic / Soundproofing",
      "Fire-Rated Assemblies",
    ],
  },
  {
    category: "Flooring",
    icon: "🪵",
    specialties: [
      "Flooring Contractor",
      "Hardwood Flooring",
      "Laminate Flooring",
      "LVP / LVT Flooring",
      "Tile & Stone Flooring",
      "Carpet Installation",
      "Epoxy Flooring",
      "Polished Concrete Flooring",
      "Floor Refinishing",
    ],
  },
  {
    category: "Painting & Coatings",
    icon: "🎨",
    specialties: [
      "Painting Contractor",
      "Interior Painting",
      "Exterior Painting",
      "Commercial Painting",
      "Industrial Coatings",
      "Epoxy Coatings",
      "Pressure Washing",
      "Wallpaper Installation",
      "Decorative Finishes / Faux",
    ],
  },
  {
    category: "Windows, Doors & Glazing",
    icon: "🪟",
    specialties: [
      "Window & Door Contractor",
      "Window Installation & Replacement",
      "Door Installation & Replacement",
      "Storefront Glazing",
      "Curtain Wall Systems",
      "Shower Enclosures",
      "Mirror Installation",
      "Skylights",
    ],
  },
  {
    category: "Cabinetry & Millwork",
    icon: "🪚",
    specialties: [
      "Cabinet Contractor",
      "Custom Cabinetry",
      "Cabinet Installation",
      "Kitchen Remodeling",
      "Bathroom Remodeling",
      "Countertop Installation",
      "Trim & Millwork",
      "Stairs & Railings",
      "Built-Ins & Shelving",
    ],
  },
  {
    category: "Landscaping & Outdoor",
    icon: "🌿",
    specialties: [
      "Landscaping Contractor",
      "Landscape Design & Installation",
      "Hardscaping (Patios, Walkways)",
      "Irrigation & Sprinkler Systems",
      "Artificial Turf",
      "Lawn Care & Maintenance",
      "Tree Service & Arborist",
      "Grading & Excavation",
      "Drainage Solutions",
      "Outdoor Lighting",
      "Pergolas & Shade Structures",
      "Outdoor Kitchens & BBQ",
    ],
  },
  {
    category: "Pool & Spa",
    icon: "🏊",
    specialties: [
      "Pool Contractor",
      "Pool Construction",
      "Pool Remodeling & Renovation",
      "Pool Repair & Maintenance",
      "Spa / Hot Tub Installation",
      "Pool Deck Construction",
      "Pool Plastering & Resurfacing",
    ],
  },
  {
    category: "Demolition & Earthwork",
    icon: "💥",
    specialties: [
      "Demolition Contractor",
      "Selective Demolition",
      "Excavation Contractor",
      "Grading & Site Prep",
      "Underground Utilities",
      "Environmental Remediation",
      "Asbestos Abatement",
      "Mold Remediation",
    ],
  },
  {
    category: "Specialty & Other",
    icon: "🔧",
    specialties: [
      "Waterproofing",
      "Fireproofing",
      "Elevator / Lift Installation",
      "Fire Suppression Systems",
      "Security Systems",
      "Signage Installation",
      "Solar & Renewable Energy",
      "EV Infrastructure",
      "Modular / Prefab Construction",
      "Disaster Restoration",
      "Handyman Services",
      "Other Specialty",
    ],
  },
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","Washington D.C.",
];

const YEARS_IN_BUSINESS = [
  "Less than 1 year",
  "1–2 years",
  "3–5 years",
  "6–10 years",
  "11–20 years",
  "20+ years",
];

// ─────────────────────────────────────────────
// HELPER MESSAGE COMPONENT
// ─────────────────────────────────────────────
const HelperMessage = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 mt-1.5 mb-0.5">
    <Info className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
    <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
  </div>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
interface OnboardingData {
  // Step 1 — Business Info
  company: string;
  ownerName: string;
  phone: string;
  state: string;
  city: string;
  zipCode: string;
  website: string;
  // Step 2 — Specialty & License
  specialties: string[];
  hasLicense: boolean | null;
  license: string;
  hasInsurance: boolean | null;
  insurancePolicy: string;
  yearsInBusiness: string;
  businessType: string;
  // Step 3 — Logo & Photo
  logo: string;
  profilePhoto: string;
}

const ContractorOnboarding = () => {
  const [, navigate] = useLocation();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showWelcome, setShowWelcome] = useState(true); // Show warm welcome screen first
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<OnboardingData>({
    company: "",
    ownerName: currentUser?.displayName || "",
    phone: "",
    state: "",
    city: "",
    zipCode: "",
    website: "",
    specialties: [],
    hasLicense: null,
    license: "",
    hasInsurance: null,
    insurancePolicy: "",
    yearsInBusiness: "",
    businessType: "",
    logo: "",
    profilePhoto: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingData, string>>>({});

  const update = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const toggleSpecialty = (specialty: string) => {
    setData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  // ── Validation ──
  const validateStep1 = () => {
    const errs: Partial<Record<keyof OnboardingData, string>> = {};
    if (!data.company.trim()) errs.company = "Required";
    if (!data.ownerName.trim()) errs.ownerName = "Required";
    if (!data.phone.trim()) errs.phone = "Required";
    if (!data.state) errs.state = "Required";
    if (!data.city.trim()) errs.city = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Partial<Record<keyof OnboardingData, string>> = {};
    if (data.specialties.length === 0) errs.specialties = "Select at least one specialty";
    if (data.hasLicense === null) errs.hasLicense = "Required";
    if (data.hasInsurance === null) errs.hasInsurance = "Required";
    if (!data.yearsInBusiness) errs.yearsInBusiness = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Image Upload ──
  const handleImageUpload = (field: "logo" | "profilePhoto", file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      update(field, e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ── Save to backend ──
  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const firebaseUid = auth.currentUser?.uid;

      const payload: any = {
        company: data.company,
        ownerName: data.ownerName,
        phone: data.phone,
        state: data.state,
        city: data.city,
        zipCode: data.zipCode,
        website: data.website,
        specialties: data.specialties,
        license: data.hasLicense ? data.license : "",
        insurancePolicy: data.hasInsurance ? data.insurancePolicy : "",
        yearEstablished: data.yearsInBusiness,
        businessType: data.businessType,
      };
      if (data.logo) payload.logo = data.logo;
      if (data.profilePhoto) payload.profilePhoto = data.profilePhoto;

      // STEP 1: Save to PostgreSQL (used by estimates, contracts, invoices)
      const pgResponse = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!pgResponse.ok) {
        console.error("[ONBOARDING] PostgreSQL save failed:", pgResponse.status);
      } else {
        console.log("✅ [ONBOARDING] Profile saved to PostgreSQL");
      }

      // STEP 2: Sync to Firestore (used by Profile/Settings page to display data)
      // Profile page reads from Firestore via useProfile hook — must write here too.
      if (firebaseUid) {
        try {
          // Build the complete Firestore payload with ALL fields the Profile page expects
          const firestorePayload = {
            company: data.company,           // Profile page reads as 'company'
            companyName: data.company,       // Firestore canonical field
            ownerName: data.ownerName,
            phone: data.phone,
            mobilePhone: "",
            address: "",
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            website: data.website,
            specialties: data.specialties,
            license: data.hasLicense ? data.license : "",
            insurancePolicy: data.hasInsurance ? data.insurancePolicy : "",
            yearEstablished: data.yearsInBusiness,
            businessType: data.businessType,
            ein: "",
            description: "",
            socialMedia: {},
            documents: {},
            logo: data.logo || "",
            profilePhoto: data.profilePhoto || "",
            role: "Owner",
            email: auth.currentUser?.email || "",
          };
          await saveUserProfile(firebaseUid, firestorePayload);
          console.log("✅ [ONBOARDING] Profile synced to Firestore with all fields");
          // Invalidate React Query cache so Profile page loads fresh data immediately
          queryClient.invalidateQueries({ queryKey: ["userProfile", firebaseUid] });
          console.log("✅ [ONBOARDING] React Query profile cache invalidated");
        } catch (firestoreErr) {
          console.error("⚠️ [ONBOARDING] Firestore sync failed (non-blocking):", firestoreErr);
          // Non-blocking: PostgreSQL save already succeeded
        }
      }

      // STEP 3: Mark onboarding complete
      await fetch("/api/settings/onboarding/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Set localStorage flag
      if (currentUser) {
        localStorage.setItem(`onboarding_completed_${currentUser.uid}`, "true");
      }

      navigate("/subscription");
    } catch (err) {
      console.error("Error saving onboarding:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3) {
      saveProfile();
      return;
    }
    setStep(s => s + 1);
  };

  const handleSkip = () => {
    if (currentUser) {
      localStorage.setItem(`onboarding_completed_${currentUser.uid}`, "true");
    }
    navigate("/subscription");
  };

  // ── Filter specialties by search ──
  const filteredCategories = specialtySearch
    ? SPECIALTY_CATEGORIES.map(cat => ({
        ...cat,
        specialties: cat.specialties.filter(s =>
          s.toLowerCase().includes(specialtySearch.toLowerCase())
        ),
      })).filter(cat => cat.specialties.length > 0)
    : SPECIALTY_CATEGORIES;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  // ── Welcome Screen ──
  if (showWelcome) {
    const firstName = currentUser?.displayName?.split(' ')[0] || 'Contractor';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 py-8">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-4">
              <Zap className="h-8 w-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Owl Fenc
              </span>
            </h1>
            <p className="text-slate-400 text-base">
              Hey <span className="text-cyan-400 font-semibold">{firstName}</span> — your AI-powered construction command center is ready.
            </p>
          </div>

          {/* Credits Banner */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Star className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">120 Welcome Credits Added to Your Wallet</p>
              <p className="text-slate-400 text-xs">Use them to generate estimates, contracts, permits, and more — no credit card needed.</p>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {[
              { icon: '📋', title: 'AI Estimates', desc: 'Generate professional project estimates in minutes with Mervin AI — materials, labor, and total cost included.' },
              { icon: '📜', title: 'Legal Contracts', desc: 'Create legally-sound contracts customized for your trade. Protect yourself on every job.' },
              { icon: '🏠', title: 'Permit Advisor', desc: 'Know exactly what permits you need for any project in any city. Powered by real building codes.' },
              { icon: '🔍', title: 'Property Verifier', desc: 'Instantly verify property ownership and details before starting any job.' },
              { icon: '💰', title: 'Invoices & Payments', desc: 'Send professional invoices and get paid faster. Track every dollar in one place.' },
              { icon: '🎯', title: 'Lead Hunter', desc: 'Find high-value construction leads in your area. Target the projects that pay best.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              onClick={() => setShowWelcome(false)}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold text-base rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-200"
            >
              Set Up My Profile <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-slate-500 text-xs mt-3">
              Takes less than 2 minutes •{' '}
              <button onClick={handleSkip} className="text-slate-400 hover:text-slate-300 underline transition-colors">
                Skip for now
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-start py-6 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Zap className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Set Up Your Profile</h1>
              <p className="text-slate-400 text-xs">Step {step} of 3 — Takes less than 2 minutes</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            Skip for now →
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? "bg-cyan-500" : "bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ─── STEP 1: Business Info ─── */}
      {step === 1 && (
        <div className="w-full max-w-2xl space-y-5">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="h-5 w-5 text-cyan-400" />
              <h2 className="text-white font-semibold text-base">Your Business</h2>
            </div>

            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <Label className="text-slate-300 text-sm font-medium">
                  Company Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={data.company}
                  onChange={e => update("company", e.target.value)}
                  placeholder="e.g. Rodriguez Fencing & Construction"
                  className={`mt-1.5 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 ${errors.company ? "border-red-500" : ""}`}
                />
                <HelperMessage message="This name appears on every estimate, contract, invoice, and permit report you generate. Make it professional." />
                {errors.company && <p className="text-red-400 text-xs mt-1">{errors.company}</p>}
              </div>

              {/* Owner Name */}
              <div>
                <Label className="text-slate-300 text-sm font-medium">
                  Your Full Name (Owner) <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={data.ownerName}
                  onChange={e => update("ownerName", e.target.value)}
                  placeholder="e.g. Carlos Rodriguez"
                  className={`mt-1.5 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 ${errors.ownerName ? "border-red-500" : ""}`}
                />
                <HelperMessage message="Used as the signing party in contracts and legal documents. Must match your legal name." />
                {errors.ownerName && <p className="text-red-400 text-xs mt-1">{errors.ownerName}</p>}
              </div>

              {/* Phone */}
              <div>
                <Label className="text-slate-300 text-sm font-medium">
                  Business Phone <span className="text-red-400">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={data.phone}
                    onChange={e => update("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className={`pl-9 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 ${errors.phone ? "border-red-500" : ""}`}
                  />
                </div>
                <HelperMessage message="Printed on all client-facing documents. Clients use this to reach you directly." />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>

              {/* State */}
              <div>
                <Label className="text-slate-300 text-sm font-medium">
                  State Where You Operate <span className="text-red-400">*</span>
                </Label>
                <select
                  value={data.state}
                  onChange={e => update("state", e.target.value)}
                  className={`mt-1.5 w-full bg-slate-900/60 border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 ${errors.state ? "border-red-500" : "border-slate-600"}`}
                >
                  <option value="" className="bg-slate-800">Select your state...</option>
                  {US_STATES.map(s => (
                    <option key={s} value={s} className="bg-slate-800">{s}</option>
                  ))}
                </select>
                <HelperMessage message="Critical for Permit Advisor — each state has different building codes, permit requirements, and contractor laws." />
                {errors.state && <p className="text-red-400 text-xs mt-1">{errors.state}</p>}
              </div>

              {/* City + Zip */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300 text-sm font-medium">
                    City <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={data.city}
                    onChange={e => update("city", e.target.value)}
                    placeholder="e.g. Los Angeles"
                    className={`mt-1.5 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 ${errors.city ? "border-red-500" : ""}`}
                  />
                  {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
                </div>
                <div>
                  <Label className="text-slate-300 text-sm font-medium">ZIP Code</Label>
                  <Input
                    value={data.zipCode}
                    onChange={e => update("zipCode", e.target.value)}
                    placeholder="e.g. 90210"
                    className="mt-1.5 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
              <HelperMessage message="Your city and ZIP help the AI generate hyper-local permit research and accurate material cost estimates for your area." />

              {/* Website */}
              <div>
                <Label className="text-slate-300 text-sm font-medium">Website (optional)</Label>
                <div className="relative mt-1.5">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={data.website}
                    onChange={e => update("website", e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="pl-9 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <HelperMessage message="Adds credibility to your documents and gives clients a way to learn more about your business." />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Specialty & License ─── */}
      {step === 2 && (
        <div className="w-full max-w-2xl space-y-5">
          {/* Specialties */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-5 w-5 text-cyan-400" />
              <h2 className="text-white font-semibold text-base">
                Your Specialties <span className="text-red-400">*</span>
              </h2>
            </div>
            <HelperMessage message="The AI uses your specialties to generate accurate estimates, select the right contract templates, and provide relevant permit guidance. Select all that apply." />
            {errors.specialties && <p className="text-red-400 text-xs mt-1 mb-2">{errors.specialties}</p>}

            {/* Selected badges */}
            {data.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 mb-3 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                {data.specialties.map(s => (
                  <Badge
                    key={s}
                    onClick={() => toggleSpecialty(s)}
                    className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-colors text-xs"
                  >
                    {s} ×
                  </Badge>
                ))}
              </div>
            )}

            {/* Search */}
            <Input
              value={specialtySearch}
              onChange={e => setSpecialtySearch(e.target.value)}
              placeholder="Search specialties..."
              className="mt-3 mb-3 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 text-sm"
            />

            {/* Categories */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {filteredCategories.map(cat => (
                <div key={cat.category}>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">
                    {cat.icon} {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.specialties.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSpecialty(s)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          data.specialties.includes(s)
                            ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/50"
                            : "bg-slate-700/40 text-slate-300 border-slate-600/50 hover:border-cyan-500/40 hover:text-cyan-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* License */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5 text-cyan-400" />
              <h2 className="text-white font-semibold text-base">License & Insurance</h2>
            </div>

            {/* Has License */}
            <div>
              <Label className="text-slate-300 text-sm font-medium">
                Do you have a contractor's license? <span className="text-red-400">*</span>
              </Label>
              <HelperMessage message="Your license number appears on contracts and adds legal protection. Unlicensed contractors may face restrictions in some states." />
              <div className="flex gap-3 mt-2">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => update("hasLicense", val)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      data.hasLicense === val
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                        : "bg-slate-700/40 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {val ? "✅ Yes, I'm licensed" : "❌ Not yet"}
                  </button>
                ))}
              </div>
              {errors.hasLicense && <p className="text-red-400 text-xs mt-1">{errors.hasLicense}</p>}

              {data.hasLicense && (
                <div className="mt-3">
                  <Label className="text-slate-300 text-sm">License Number</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={data.license}
                      onChange={e => update("license", e.target.value)}
                      placeholder="e.g. CSLB #1234567"
                      className="pl-9 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <HelperMessage message="Automatically printed on all contracts and legal documents. Clients and inspectors may verify this number." />
                </div>
              )}
            </div>

            {/* Has Insurance */}
            <div>
              <Label className="text-slate-300 text-sm font-medium">
                Do you carry liability insurance? <span className="text-red-400">*</span>
              </Label>
              <HelperMessage message="Insurance status is disclosed in contracts. Many clients and commercial projects require proof of insurance before signing." />
              <div className="flex gap-3 mt-2">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => update("hasInsurance", val)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      data.hasInsurance === val
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                        : "bg-slate-700/40 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {val ? "✅ Yes, I'm insured" : "❌ Not currently"}
                  </button>
                ))}
              </div>
              {errors.hasInsurance && <p className="text-red-400 text-xs mt-1">{errors.hasInsurance}</p>}

              {data.hasInsurance && (
                <div className="mt-3">
                  <Label className="text-slate-300 text-sm">Policy Number (optional)</Label>
                  <Input
                    value={data.insurancePolicy}
                    onChange={e => update("insurancePolicy", e.target.value)}
                    placeholder="e.g. GL-987654321"
                    className="mt-1.5 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>

            {/* Years in Business */}
            <div>
              <Label className="text-slate-300 text-sm font-medium">
                Years in Business <span className="text-red-400">*</span>
              </Label>
              <HelperMessage message="Helps us tailor the AI's tone and recommendations — a 20-year veteran has different needs than someone just starting out." />
              <div className="grid grid-cols-3 gap-2 mt-2">
                {YEARS_IN_BUSINESS.map(y => (
                  <button
                    key={y}
                    onClick={() => update("yearsInBusiness", y)}
                    className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                      data.yearsInBusiness === y
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                        : "bg-slate-700/40 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              {errors.yearsInBusiness && <p className="text-red-400 text-xs mt-1">{errors.yearsInBusiness}</p>}
            </div>

            {/* Business Type */}
            <div>
              <Label className="text-slate-300 text-sm font-medium">Business Structure (optional)</Label>
              <HelperMessage message="Used in contracts and legal documents. Affects how your business is identified in agreements." />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["Sole Proprietor", "LLC", "S-Corp / C-Corp", "Partnership"].map(bt => (
                  <button
                    key={bt}
                    onClick={() => update("businessType", bt)}
                    className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                      data.businessType === bt
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                        : "bg-slate-700/40 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Logo & Photo ─── */}
      {step === 3 && (
        <div className="w-full max-w-2xl space-y-5">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-5 w-5 text-cyan-400" />
              <h2 className="text-white font-semibold text-base">Brand & Identity</h2>
            </div>
            <HelperMessage message="Your logo and photo appear on every document you send to clients. Contractors with a professional logo close 40% more deals." />

            <div className="mt-5 space-y-6">
              {/* Logo Upload */}
              <div>
                <Label className="text-slate-300 text-sm font-medium">Company Logo</Label>
                <HelperMessage message="Printed on estimates, contracts, invoices, and permit reports. Recommended: square format, transparent background (PNG)." />
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="mt-3 border-2 border-dashed border-slate-600 hover:border-cyan-500/50 rounded-xl p-6 cursor-pointer transition-all text-center group"
                >
                  {data.logo ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={data.logo}
                        alt="Logo preview"
                        className="h-24 w-24 object-contain rounded-lg bg-white/5 p-2"
                      />
                      <p className="text-cyan-400 text-sm">Click to change logo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-slate-700/50 flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                        <Upload className="h-7 w-7 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <div>
                        <p className="text-slate-300 text-sm font-medium">Upload your logo</p>
                        <p className="text-slate-500 text-xs mt-0.5">PNG, JPG, SVG — max 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload("logo", e.target.files[0])}
                />
              </div>

              {/* Profile Photo */}
              <div>
                <Label className="text-slate-300 text-sm font-medium">Your Profile Photo (optional)</Label>
                <HelperMessage message="A professional headshot builds trust with clients. Used in your profile and some document templates." />
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="mt-3 border-2 border-dashed border-slate-600 hover:border-cyan-500/50 rounded-xl p-6 cursor-pointer transition-all text-center group"
                >
                  {data.profilePhoto ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={data.profilePhoto}
                        alt="Profile preview"
                        className="h-20 w-20 object-cover rounded-full border-2 border-cyan-500/40"
                      />
                      <p className="text-cyan-400 text-sm">Click to change photo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                        <User className="h-7 w-7 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <div>
                        <p className="text-slate-300 text-sm font-medium">Upload a photo</p>
                        <p className="text-slate-500 text-xs mt-0.5">PNG or JPG — max 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload("profilePhoto", e.target.files[0])}
                />
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-cyan-300 text-sm font-semibold mb-1">You're almost ready!</p>
                <div className="text-slate-400 text-xs space-y-0.5">
                  <p>✅ <strong className="text-slate-300">{data.company}</strong> — {data.city}, {data.state}</p>
                  <p>✅ <strong className="text-slate-300">{data.specialties.length} specialties</strong> selected</p>
                  <p>✅ License: <strong className="text-slate-300">{data.hasLicense ? "Yes" : "No"}</strong> · Insurance: <strong className="text-slate-300">{data.hasInsurance ? "Yes" : "No"}</strong></p>
                  <p>✅ <strong className="text-slate-300">{data.yearsInBusiness}</strong> in business</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Navigation ─── */}
      <div className="w-full max-w-2xl mt-6 flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}

        <Button
          onClick={handleNext}
          disabled={isSaving}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-8 flex-1 sm:flex-none"
        >
          {isSaving ? (
            "Saving..."
          ) : step === 3 ? (
            <>
              <Star className="h-4 w-4 mr-2" />
              Complete Setup
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>

      {/* Footer note */}
      <p className="text-slate-600 text-xs mt-4 text-center max-w-md">
        You can update all this information anytime in Settings → Profile.
      </p>
    </div>
  );
};

export default ContractorOnboarding;
