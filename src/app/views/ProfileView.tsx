import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera, LayoutDashboard } = Icons;
import { StatusBadge, AppNav, InfoNav, UserMenu, ModeToggle, SectionHeader, OptionPill, ColorPicker, OrientationPicker, PriceBreakdown, DeliveryTimeline, Slider, IsometricPart } from "../components/common";

export function ProfileView({ auth, onMyOrders }: { auth: AuthCallbacks; onMyOrders: () => void }) {
  const user  = auth.user ?? { name: "Guest", email: "" };
  const ini   = initials(user.name);
  const [name, setName]       = useState(user.name);
  const [email, setEmail]     = useState(user.email);
  const [address, setAddress] = useState("Rua das Flores 42, 1200-001 Lisboa, Portugal");
  const [saved, setSaved]     = useState(false);
  const [notifs, setNotifs]   = useState({
    orderReceived: true, reviewRequired: true, printingStarted: true,
    printingCompleted: false, issueDetected: true, shipped: true, delivered: true,
  });
  const toggleNotif = (k: keyof typeof notifs) => setNotifs(n => ({ ...n, [k]: !n[k] }));
  const save = async () => {
    try { await auth.onUpdateProfile?.({ name, email }); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch { setSaved(false); }
  };

  const totalOrders = MOCK_PAST_ORDERS.length + 1;
  const totalParts  = MOCK_PAST_ORDERS.reduce((s, o) => s + o.parts, 0) + 3;
  const totalSpent  = MOCK_PAST_ORDERS.reduce((s, o) => s + o.total, 0) + 32.5;

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <AppNav
        auth={auth}
        onLogoClick={auth.onHome}
        showQuote={false}
        containerClassName="max-w-4xl mx-auto"
        leftContent={<><button onClick={auth.onDashboard}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <LayoutDashboard size={14} />Dashboard
        </button><ChevronRight size={12} className="text-border" /><span className="text-sm font-semibold">Profile & Settings</span></>}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-8 items-start">
          <div className="space-y-4">
            <div className="border border-border rounded-2xl bg-white p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary text-white text-xl font-bold flex items-center justify-center mx-auto mb-3">
                {ini}
              </div>
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{email}</p>
              <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">Member since Jul 2026</p>
            </div>
            <div className="border border-border rounded-2xl bg-white p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Your stats</p>
              {[
                { label: "Total orders",  val: String(totalOrders)                     },
                { label: "Parts printed", val: String(totalParts)                      },
                { label: "Total spent",   val: fmt(totalSpent)                         },
                { label: "Material used", val: `~${((totalParts * 35) / 1000).toFixed(1)}kg` },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-mono font-medium">{s.val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="border border-border rounded-2xl bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Personal information</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Update your name and email</p>
                </div>
                <button onClick={save}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    saved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-primary text-white hover:bg-violet-700"}`}>
                  {saved ? "Saved ✓" : "Save changes"}
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground/70 block mb-1.5">Full name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground/70 block mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
            <div className="border border-border rounded-2xl bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <p className="font-semibold text-sm">Default delivery address</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pre-filled at checkout to save time</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex gap-3 p-3 bg-muted/40 rounded-xl mb-3">
                  <MapPin size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                    className="w-full bg-transparent resize-none focus:outline-none text-sm" />
                </div>
                <button className="text-xs text-primary hover:underline">+ Add another address</button>
              </div>
            </div>
            <div className="border border-border rounded-2xl bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <p className="font-semibold text-sm">Email notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">Choose which events trigger an email</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  { key: "orderReceived"     as const, label: "Order received",     sub: "Confirmation when your order is placed"  },
                  { key: "reviewRequired"    as const, label: "Review required",    sub: "When a file needs your attention"         },
                  { key: "printingStarted"   as const, label: "Printing started",   sub: "When your batch begins printing"          },
                  { key: "printingCompleted" as const, label: "Batch completed",    sub: "Notification per completed batch"         },
                  { key: "issueDetected"     as const, label: "Issue detected",     sub: "Print failures or quality problems"       },
                  { key: "shipped"           as const, label: "Shipped",            sub: "When your order is on the way"            },
                  { key: "delivered"         as const, label: "Delivered",          sub: "Delivery confirmation"                    },
                ].map(n => (
                  <label key={n.key} className="flex items-center gap-3 cursor-pointer">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.sub}</p>
                    </div>
                    <button onClick={() => toggleNotif(n.key)}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${notifs[n.key] ? "bg-primary" : "bg-muted-foreground/25"}`}>
                      <span className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all"
                        style={{ left: notifs[n.key] ? "22px" : "4px" }} />
                    </button>
                  </label>
                ))}
              </div>
            </div>
            <div className="border border-red-100 rounded-2xl bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-red-100">
                <p className="font-semibold text-sm text-red-600">Danger zone</p>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete account</p>
                  <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
                </div>
                <button className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  App Root                                                */
/* ─────────────────────────────────────────────────────── */

