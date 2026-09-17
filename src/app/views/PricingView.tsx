import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera } = Icons;
import { StatusBadge, InfoNav, UserMenu, ModeToggle, SectionHeader, OptionPill, ColorPicker, OrientationPicker, PriceBreakdown, DeliveryTimeline, Slider, IsometricPart } from "../components/common";
import { MATERIAL_DETAIL } from "../data/materials";

export function PricingView({ onBack, auth, onNav, onStart }: {
  onBack: () => void; auth: AuthCallbacks; onNav: (v: AppView) => void; onStart: () => void;
}) {
  const [calcMass, setCalcMass]   = useState(80);
  const [calcHours, setCalcHours] = useState(4);
  const [calcMat, setCalcMat]     = useState<Material>("pla");
  const [calcDet, setCalcDet]     = useState<Details>("standard");

  const matMult   = { pla: 1, petg: 1.15, "clear-petg": 1.2, tpu: 1.3, "pla-plus": 1.1, asa: 1.25 }[calcMat];
  const detMult   = { fine: 1.4, standard: 1, fast: 0.85 }[calcDet];
  const estMat    = +(calcMass * 0.028 * matMult).toFixed(2);
  const estMach   = +(calcHours * 2.1 * detMult).toFixed(2);
  const estPkg    = 1.0;
  const estTotal  = +(estMat + estMach + estPkg).toFixed(2);

  const navLinks = [
    { label: "How it works", onClick: () => onNav("how-it-works") },
    { label: "Materials",    onClick: () => onNav("materials")    },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <InfoNav onBack={onBack} nav={navLinks} auth={auth} />

      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-4">Transparent pricing</p>
          <h1 className="text-4xl font-bold mb-4">You know exactly what you pay for</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Every quote is broken into material, machine time, and packaging. No hidden setup fees, no minimums.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">

        {/* Formula cards */}
        <div>
          <h2 className="text-xl font-bold mb-6">How your price is calculated</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Material", icon: Weight,
                formula: "mass (g) × €0.028 × material multiplier",
                desc: "The raw filament used, including supports. PLA is the baseline; speciality materials carry a small premium.",
                example: "80 g PLA = €2.24",
              },
              {
                label: "Machine time", icon: Clock,
                formula: "hours × €2.10 × detail × strength",
                desc: "Covers printer depreciation, electricity, and operator time. Finer layers and higher infill take longer and cost more.",
                example: "4 h standard = €8.40",
              },
              {
                label: "Packaging", icon: Package,
                formula: "€1.00 flat per batch",
                desc: "Anti-static bag, void fill, and rigid outer box. Fragile and extremely-fragile options add foam insert and corner guards.",
                example: "1 batch = €1.00",
              },
            ].map(c => (
              <div key={c.label} className="border border-border rounded-2xl bg-white p-5">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <c.icon size={16} className="text-primary" />
                </div>
                <p className="font-semibold mb-1">{c.label}</p>
                <p className="text-xs font-mono text-muted-foreground bg-muted rounded-lg px-2.5 py-1.5 mb-3">{c.formula}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{c.desc}</p>
                <p className="text-xs font-medium text-foreground/70">e.g. {c.example}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Material multipliers */}
        <div>
          <h2 className="text-xl font-bold mb-2">Material multipliers</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Applied to the raw material cost. Machine time is unaffected by material choice.
          </p>
          <div className="border border-border rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Material</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Multiplier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Cost/100 g</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Best for</th>
                </tr>
              </thead>
              <tbody>
                {MATERIAL_DETAIL.map((m, i) => (
                  <tr key={m.id} className={i < MATERIAL_DETAIL.length - 1 ? "border-b border-border/50" : ""}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.dotColor }} />
                        {m.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      ×{({ pla: "1.00", petg: "1.15", "clear-petg": "1.20", tpu: "1.30", "pla-plus": "1.10", asa: "1.25" } as Record<Material, string>)[m.id]}
                    </td>
                    <td className="px-4 py-3 font-mono">{m.basePer100g}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{m.useCases.slice(0, 2).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery options */}
        <div>
          <h2 className="text-xl font-bold mb-2">Delivery options</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Calculated after print completion, not order placement. Print time varies by order size.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DELIVERY_OPTIONS.map(d => (
              <div key={d.id} className="border border-border rounded-2xl bg-white p-4 text-center">
                <p className="font-semibold mb-1">{d.label}</p>
                <p className="text-sm text-muted-foreground mb-2">{d.days}</p>
                <p className={`text-lg font-mono font-bold ${d.priceDelta === 0 ? "text-emerald-600" : "text-foreground"}`}>
                  {d.priceDelta === 0 ? "Free" : `+€${d.priceDelta}`}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Post-processing / policy modifiers */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Post-processing</h2>
            <p className="text-muted-foreground text-sm mb-4">Optional finishing services, charged per batch.</p>
            <div className="border border-border rounded-2xl overflow-hidden bg-white divide-y divide-border/50">
              {[
                { label: "None",             price: "Included", note: "Parts as-printed"            },
                { label: "Support removal",  price: "+€2.00",   note: "Supports clipped and sanded" },
                { label: "Surface smoothing",price: "+€5.00",   note: "Acetone or sanding finish"   },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.note}</p>
                  </div>
                  <span className={`text-sm font-mono font-semibold ${p.price === "Included" ? "text-emerald-600" : ""}`}>{p.price}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Failed print policy</h2>
            <p className="text-muted-foreground text-sm mb-4">Modifies machine time multiplier.</p>
            <div className="border border-border rounded-2xl overflow-hidden bg-white divide-y divide-border/50">
              {[
                { label: "No retries",   mult: "×0.95", note: "5% discount — you accept the risk" },
                { label: "1 retry",      mult: "×1.00", note: "Default — one free reprint"        },
                { label: "2 retries",    mult: "×1.10", note: "+10% — two reprint attempts"       },
                { label: "Unlimited",    mult: "×1.20", note: "+20% — we guarantee delivery"      },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.note}</p>
                  </div>
                  <span className="text-sm font-mono font-semibold text-muted-foreground">{p.mult}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live estimator */}
        <div className="border border-primary/20 rounded-2xl bg-gradient-to-br from-violet-50 to-white overflow-hidden">
          <div className="px-6 py-5 border-b border-primary/10">
            <h2 className="text-lg font-bold mb-0.5">Price estimator</h2>
            <p className="text-sm text-muted-foreground">Rough estimate — exact pricing requires uploading your file.</p>
          </div>
          <div className="px-6 py-6 grid md:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-xs text-muted-foreground">
                  <span>Estimated mass</span><span className="font-mono font-medium text-foreground">{calcMass} g</span>
                </div>
                <input type="range" min={5} max={500} step={5} value={calcMass}
                  onChange={e => setCalcMass(+e.target.value)} className="w-full accent-violet-600" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>5 g</span><span>500 g</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5 text-xs text-muted-foreground">
                  <span>Estimated print time</span><span className="font-mono font-medium text-foreground">{calcHours} h</span>
                </div>
                <input type="range" min={0.5} max={24} step={0.5} value={calcHours}
                  onChange={e => setCalcHours(+e.target.value)} className="w-full accent-violet-600" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>0.5 h</span><span>24 h</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Material</p>
                <div className="flex flex-wrap gap-1.5">
                  {MATERIAL_DETAIL.map(m => (
                    <button key={m.id} onClick={() => setCalcMat(m.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        calcMat === m.id ? "bg-primary text-white border-primary" : "bg-white border-border text-foreground hover:bg-muted"}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Detail level</p>
                <div className="flex gap-1.5">
                  {DETAILS_OPTIONS.map(d => (
                    <button key={d.id} onClick={() => setCalcDet(d.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        calcDet === d.id ? "bg-primary text-white border-primary" : "bg-white border-border text-foreground hover:bg-muted"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Result */}
            <div className="flex flex-col justify-center">
              <div className="bg-white border border-border rounded-2xl p-5 space-y-2">
                {[
                  { label: "Material",     val: estMat  },
                  { label: "Machine time", val: estMach },
                  { label: "Packaging",    val: estPkg  },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono">{fmt(r.val)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Estimated total</span>
                  <span className="font-mono text-primary text-lg">{fmt(estTotal)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">+ delivery · exact price requires file upload</p>
              </div>
              <button onClick={onStart}
                className="mt-4 w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                Upload file for exact quote →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Sign In                                                 */
/* ─────────────────────────────────────────────────────── */

