import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera } = Icons;
import { StatusBadge, AppNav, InfoNav, UserMenu, ModeToggle, SectionHeader, OptionPill, ColorPicker, OrientationPicker, PriceBreakdown, DeliveryTimeline, Slider, IsometricPart } from "../components/common";
import { WorkspaceView, BatchCard, OrderSummary, ModelViewer, QueuePanel, FileRow, SimpleSettings, AdvancedSettings } from "../components/workspace";

export function CheckoutView({ batches, onBack, onPlaceOrder, loading, error, auth }: {
  batches: Batch[]; onBack: () => void; onPlaceOrder: () => void; loading?: boolean; error?: string | null; auth: AuthCallbacks;
}) {
  const { subtotal, deliveryDelta, totalMass, totalTime, totalParts, grandTotal } = calcOrderSummary(batches);
  const [email, setEmail]   = useState(auth.user?.email ?? "");
  const [agreed, setAgreed] = useState(false);
  const delivery             = DELIVERY_OPTIONS.find(d => d.id === batches[0]?.deliverySpeed) ?? DELIVERY_OPTIONS[1];
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <AppNav auth={auth} onLogoClick={auth.onHome} showQuote={false} rightContent={<div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold">1</span>
          <span className="hidden sm:block">Configure</span>
          <ChevronRight size={11} />
          <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">2</span>
          <span className="text-foreground font-medium">Review</span>
          <ChevronRight size={11} />
          <span className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold">3</span>
          <span className="hidden sm:block">Confirm</span>
        </div>} />
      <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Review your order</h1>
            <p className="text-muted-foreground text-sm">Confirm the details below before placing your order.</p>
          </div>
          {batches.map(batch => {
            const t          = calcTotals(batch);
            const matLabel   = MATERIAL_OPTIONS.find(m => m.id === batch.material)?.sub ?? "PLA";
            const colorHex   = COLOR_OPTIONS.find(c => c.id === batch.color)?.hex ?? "#1C1C1E";
            const colorLabel = COLOR_OPTIONS.find(c => c.id === batch.color)?.label ?? "Black";
            return (
              <div key={batch.id} className="border border-border rounded-2xl bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                  <span className="w-4 h-4 rounded-full flex-shrink-0 border border-border/50" style={{ backgroundColor: colorHex }} />
                  <span className="font-semibold text-sm">{batch.name}</span>
                  <span className="text-xs text-muted-foreground">{colorLabel} {matLabel}</span>
                  <span className="ml-auto text-sm font-mono font-semibold">{fmt(t.total)}</span>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {batch.files.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      <FileText size={12} className="text-muted-foreground" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">×{f.quantity}</span>
                      <span className="text-xs font-mono text-muted-foreground">{f.mass}g</span>
                      <span className="text-xs font-mono">{fmt(f.price * f.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 bg-muted/30 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{DETAILS_OPTIONS.find(d => d.id === batch.details)?.label ?? "Standard"}</span>
                  <span>{STRENGTH_OPTIONS.find(s => s.id === batch.strength)?.label ?? "Standard"}</span>
                  {batch.postProcessing !== "none" && <span className="capitalize">{batch.postProcessing.replace("-", " ")}</span>}
                </div>
              </div>
            );
          })}
          <div className="border border-border rounded-2xl bg-white p-5">
            <h2 className="text-sm font-semibold mb-3">Delivery notification</h2>
            <label className="block text-xs text-muted-foreground mb-1.5">Email address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-violet-600" />
            <span className="text-sm text-muted-foreground">
              I agree to the <a href="#" className="text-primary underline underline-offset-2">Terms of Service</a> and understand that orders are non-refundable once printing begins.
            </span>
          </label>
        </div>
        <div className="sticky top-24">
          <div className="border border-border rounded-2xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Order Total</p>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Batches", val: String(batches.length) },
                  { label: "Parts",   val: String(totalParts)     },
                  { label: "Mass",    val: `${totalMass}g`        },
                  { label: "Time",    val: `${totalTime.toFixed(1)}h` },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-2 text-center">
                    <div className="text-sm font-semibold font-mono">{s.val}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 border-t border-border/50 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-mono">{deliveryDelta === 0 ? "Free" : fmt(deliveryDelta)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border/50 pt-2">
                  <span>Total</span><span className="font-mono text-primary">{fmt(grandTotal)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 pt-1">
                <div className="flex items-center gap-2"><Truck size={11} /><span>{delivery.label} · {delivery.days}</span></div>
                <div className="flex items-center gap-2"><Clock size={11} /><span>Est. completion: Jul 24, 2026</span></div>
              </div>
              {error && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3">{error}</p>}
              <button onClick={onPlaceOrder} disabled={loading}
                className="w-full py-3.5 mt-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Uploading files and placing order...</span> : `Place Order · ${fmt(grandTotal)}`}
              </button>
              <div className="flex items-center gap-1.5 justify-center text-xs text-muted-foreground">
                <Shield size={11} /><span>Secure · No charge until printing starts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Order Tracking                                          */
/* ─────────────────────────────────────────────────────── */

type StageStatus = "done" | "active" | "pending";

