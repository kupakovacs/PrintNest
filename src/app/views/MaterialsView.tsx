import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import { MATERIAL_DETAIL } from "../data/materials";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera } = Icons;
import { StatusBadge, InfoNav, UserMenu, ModeToggle, SectionHeader, OptionPill, ColorPicker, OrientationPicker, PriceBreakdown, DeliveryTimeline, Slider, IsometricPart } from "../components/common";

export function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors">
        <span className="font-medium text-sm">{q}</span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform flex-shrink-0 ml-4 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Materials                                               */
/* ─────────────────────────────────────────────────────── */


export function StatBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < value ? color : "bg-muted"}`} />
      ))}
    </div>
  );
}


export function MaterialsView({ onBack, auth, onNav, onStartWithMaterial }: {
  onBack: () => void; auth: AuthCallbacks; onNav: (v: AppView) => void;
  onStartWithMaterial: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const navLinks = [
    { label: "How it works", onClick: () => onNav("how-it-works") },
    { label: "Pricing",      onClick: () => onNav("pricing")      },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <InfoNav onBack={onBack} nav={navLinks} auth={auth} />

      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-4">Materials</p>
          <h1 className="text-4xl font-bold mb-4">Six materials, one shop</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            From flexible phone cases to UV-stable outdoor fixtures — pick the right material for the job.
          </p>
        </div>
      </div>

      {/* Comparison quick-select */}
      <div className="border-b border-border bg-white/60 sticky top-[61px] z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">Jump to:</span>
          {MATERIAL_DETAIL.map(m => (
            <button key={m.id} onClick={() => {
              setSelected(m.id === selected ? null : m.id);
              document.getElementById(`mat-${m.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                selected === m.id ? "bg-primary text-white border-primary" : "bg-white border-border text-foreground hover:border-primary/30"}`}>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Material cards */}
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        {MATERIAL_DETAIL.map(mat => (
          <div key={mat.id} id={`mat-${mat.id}`}
            className={`border rounded-2xl bg-white overflow-hidden transition-all ${selected === mat.id ? "border-primary/30 shadow-md shadow-violet-50" : "border-border"}`}>
            <button className="w-full text-left" onClick={() => setSelected(selected === mat.id ? null : mat.id)}>
              <div className="flex items-start gap-4 p-6">
                {/* Colour swatch */}
                <div className="w-12 h-12 rounded-xl flex-shrink-0 border border-border/50"
                  style={{ backgroundColor: mat.dotColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h3 className="text-lg font-bold">{mat.name}</h3>
                    <span className="text-xs text-muted-foreground">{mat.fullName}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                      mat.priceTier === 1 ? "bg-emerald-50 text-emerald-700"
                        : mat.priceTier === 2 ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"}`}>
                      {priceTierDots(mat.priceTier)} · {mat.basePer100g}/100g
                    </span>
                    {mat.foodSafe && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                        Food-safe
                      </span>
                    )}
                    {mat.transparency && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                        Transparent
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">{mat.tagline}</p>
                  {!selected || selected !== mat.id ? (
                    <p className="text-xs text-muted-foreground line-clamp-1">{mat.desc}</p>
                  ) : null}
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Thermometer size={12} />{mat.tempResist}
                  </div>
                  <span className="text-xs text-muted-foreground">{mat.printDifficulty} to print</span>
                  <ChevronDown size={16} className={`text-muted-foreground transition-transform ${selected === mat.id ? "rotate-180" : ""}`} />
                </div>
              </div>
            </button>

            {selected === mat.id && (
              <div className="border-t border-border/50 px-6 pb-6 pt-4">
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{mat.desc}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Stats */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Properties</p>
                    {[
                      { label: "Strength",     val: mat.strength,    color: "bg-blue-400"   },
                      { label: "Flexibility",  val: mat.flexibility, color: "bg-orange-400" },
                      { label: "Weather res.", val: mat.weathering,  color: "bg-emerald-400"},
                    ].map(s => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{s.label}</span>
                          <span className="text-xs font-mono">{s.val}/5</span>
                        </div>
                        <StatBar value={s.val} color={s.color} />
                      </div>
                    ))}
                  </div>
                  {/* Specs */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Specs</p>
                    {mat.specs.map(s => (
                      <div key={s.label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-mono font-medium">{s.val}</span>
                      </div>
                    ))}
                  </div>
                  {/* Use cases */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Best for</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mat.useCases.map(u => (
                        <span key={u} className="text-xs bg-muted px-2.5 py-1 rounded-lg text-foreground/70">{u}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-border/50 flex items-center gap-3">
                  <button onClick={onStartWithMaterial}
                    className="px-4 py-2 bg-primary text-white text-sm rounded-xl font-semibold hover:bg-violet-700 transition-colors">
                    Order in {mat.name} →
                  </button>
                  <p className="text-xs text-muted-foreground">From {mat.basePer100g} per 100 g of material</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Colour section */}
      <div className="border-t border-border bg-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold mb-2">Available colours</h2>
          <p className="text-muted-foreground text-sm mb-8">
            All 7 colours are available in every non-transparent material. Clear PETG is always transparent.
          </p>
          <div className="flex flex-wrap gap-4">
            {COLOR_OPTIONS.map(c => (
              <div key={c.id} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl border border-border/50 shadow-sm"
                  style={{ backgroundColor: c.hex }} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                <Sparkles size={16} className="text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Custom</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Need a specific RAL or Pantone colour? Contact us — we stock additional filaments on request.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Pricing                                                 */
/* ─────────────────────────────────────────────────────── */

