import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FAQItem } from "./MaterialsView";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera } = Icons;
import { StatusBadge, InfoNav, UserMenu, ModeToggle, SectionHeader, OptionPill, ColorPicker, OrientationPicker, PriceBreakdown, DeliveryTimeline, Slider, IsometricPart } from "../components/common";

export function HowItWorksView({ onBack, auth, onNav }: {
  onBack: () => void; auth: AuthCallbacks; onNav: (v: AppView) => void;
}) {
  const navLinks = [
    { label: "Materials", onClick: () => onNav("materials") },
    { label: "Pricing",   onClick: () => onNav("pricing")   },
  ];

  const steps = [
    {
      n: "01", icon: Upload, label: "Upload your file",
      sub: "Accepted formats",
      desc: "Drop your model file anywhere on the upload zone — no account required. We accept STL, OBJ, and 3MF files up to 500 MB. Got multiple parts for one order? Upload them all at once and organise them into batches.",
      details: ["STL, OBJ, 3MF supported", "Up to 500 MB per file", "Multiple files per order", "No login needed"],
    },
    {
      n: "02", icon: Layers, label: "Configure your order",
      sub: "Settings",
      desc: "Choose from beginner-friendly simple mode — pick your material and we handle the rest — or unlock advanced mode with full control over layer height, infill density, pattern, wall count, support placement, and more.",
      details: ["Simple or Advanced mode", "6 materials available", "7 filament colours", "Per-batch settings"],
    },
    {
      n: "03", icon: BarChart3, label: "Review the quote",
      sub: "Transparent pricing",
      desc: "Every quote is broken down into material cost, machine time, packaging, and post-processing — no hidden fees. Adjust your settings and the price updates instantly. Pay only when you're ready.",
      details: ["Itemised price breakdown", "Live price updates", "No surprise fees", "Pay later"],
    },
    {
      n: "04", icon: Printer, label: "We print it",
      sub: "Production",
      desc: "Your files go to our Bambu Lab X1C fleet — multi-colour capable, 0.05 mm precision. You get a live progress tracker with layer counter and estimated completion time. Failed prints are reprinted automatically.",
      details: ["Bambu Lab X1C printers", "0.05 mm precision", "Live progress tracker", "Guaranteed reprints"],
    },
    {
      n: "05", icon: Eye, label: "Quality inspection",
      sub: "QC",
      desc: "Every print passes automated visual and dimensional checks before packaging. Dimensional accuracy is verified to ± 0.2 mm. If something's not right, it gets reprinted — not shipped.",
      details: ["Visual inspection", "Dimensional check ± 0.2 mm", "No compromised prints shipped", "Issue notification"],
    },
    {
      n: "06", icon: Package, label: "Packed & shipped",
      sub: "Delivery",
      desc: "Parts are wrapped to your chosen protection level — minimal, standard, fragile, or extremely fragile — then boxed and handed to the carrier. You get a tracking link the moment it leaves our facility.",
      details: ["4 protection levels", "DHL Express carrier", "Tracking link emailed", "Economy to Rush options"],
    },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <InfoNav onBack={onBack} nav={navLinks} auth={auth} />

      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-4">The process</p>
          <h1 className="text-4xl font-bold mb-4">From file to your hands</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Six steps. Completely transparent. No engineering degree required.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-0">
        {steps.map((step, i) => (
          <div key={step.n} className="flex gap-8 pb-12 relative">
            {i < steps.length - 1 && (
              <div className="absolute left-6 top-14 bottom-0 w-px bg-border" />
            )}
            <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center z-10">
                <step.icon size={20} className="text-primary" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <span className="text-[10px] font-mono text-primary/50 font-medium">{step.n}</span>
              <h3 className="text-xl font-bold mt-0.5 mb-2">{step.label}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">{step.desc}</p>
              <div className="flex flex-wrap gap-2">
                {step.details.map(d => (
                  <span key={d} className="inline-flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1 rounded-lg text-foreground/70">
                    <Check size={10} className="text-emerald-500" />{d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="border-t border-border bg-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: "Do I need an account to order?", a: "No. You can upload, configure, and pay without ever creating an account. Create one if you want order history and saved preferences." },
              { q: "What file formats do you accept?", a: "STL, OBJ, and 3MF. 3MF is preferred as it carries colour and orientation data. Maximum 500 MB per file." },
              { q: "How accurate are your prints?", a: "Our Bambu Lab X1C printers achieve ± 0.05–0.2 mm dimensional accuracy depending on part geometry and material. Tight tolerances (< 0.1 mm) should be requested via the Advanced mode notes field." },
              { q: "What if my print fails?", a: "Your chosen failed-print policy kicks in. With 1 Retry (default), we reprint once at no extra cost. With Unlimited, we keep going until it's right." },
              { q: "Can I order multiple colours in one batch?", a: "Yes — enable Multi-colour in the batch settings. The X1C has a 4-colour AMS, so parts can have up to 4 colours per batch." },
              { q: "How do I track my order?", a: "After placing your order, you get a live tracking page with a per-layer progress counter, quality inspection results, and carrier tracking once shipped." },
            ].map(faq => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-border bg-gradient-to-br from-violet-50 to-background py-20 text-center px-6">
        <h2 className="text-3xl font-bold mb-3">Ready to print something?</h2>
        <p className="text-muted-foreground mb-8">Drop your file and get a quote in seconds.</p>
        <button onClick={onBack}
          className="px-8 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors shadow-sm text-sm">
          Upload your model →
        </button>
      </div>
    </div>
  );
}

