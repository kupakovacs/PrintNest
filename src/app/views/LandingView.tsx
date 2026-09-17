import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, QueueItem, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera } = Icons;
import { StatusBadge, AppNav, InfoNav, UserMenu, ModeToggle, SectionHeader, OptionPill, ColorPicker, OrientationPicker, PriceBreakdown, DeliveryTimeline, Slider, IsometricPart } from "../components/common";

export function LandingView({ onFilesSelected, queue, onQueueOrder, auth, onNav }: {
  onFilesSelected: (files: File[]) => void;
  queue: QueueItem[];
  onQueueOrder: (orderNumber: string) => void;
  auth: AuthCallbacks;
  onNav: (view: AppView) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered]       = useState(false);
  const fileInputRef                 = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      [".stl", ".obj", ".3mf"].some(ext => f.name.toLowerCase().endsWith(ext)));
    if (files.length) onFilesSelected(files);
  }, [onFilesSelected]);

  const features = [
    { icon: Zap,      label: "Instant quote",        sub: "See price before you commit"  },
    { icon: Box,      label: "Bambu Lab X1C",         sub: "Professional quality prints"  },
    { icon: Truck,    label: "Fast delivery",         sub: "As fast as next day"          },
    { icon: Shield,   label: "Print guarantee",       sub: "Reprints on failed parts"     },
  ];

  const testimonials = [
    { name: "Lukas M.", role: "Mechanical engineer", text: "Got my prototype in 2 days. The print quality was spot-on and the pricing was completely transparent." },
    { name: "Sara T.", role: "Product designer", text: "I've used 5 different services — PrintNest is the only one with a configurator that doesn't make me want to close the tab." },
    { name: "João R.", role: "Hobbyist", text: "First time ordering a 3D print ever. The simple mode held my hand through everything. Arrived perfectly packed." },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <AppNav
        auth={auth}
        onLogoClick={() => onNav("landing")}
        showQuote={false}
        navLinks={[
          { label: "How it works", onClick: () => onNav("how-it-works") },
          { label: "Materials", onClick: () => onNav("materials") },
          { label: "Pricing", onClick: () => onNav("pricing") },
          ...(auth.isLoggedIn ? [
            { label: "Dashboard", onClick: auth.onDashboard },
            { label: "My Orders", onClick: auth.onMyOrders },
          ] : []),
        ]}
      />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-20 pt-16 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-xs text-primary font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Powered by Bambu Lab X1C — professional grade prints
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}
          className="text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.15] max-w-3xl mb-5">
          Upload your model.<br /><span className="text-primary">Get an instant quote.</span><br />Receive your part.
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="text-lg text-muted-foreground max-w-lg mb-12">
          Professional 3D printing for everyone — from first-timers to engineers.
        </motion.p>

        {/* Drop zone */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
          className="w-full max-w-xl">
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-200 overflow-hidden ${
              isDragging ? "border-primary bg-violet-50 scale-[1.02]"
                : hovered ? "border-primary/50 bg-white shadow-lg shadow-violet-100"
                  : "border-border bg-white/80"}`}
            style={{ backdropFilter: "blur(8px)" }}>
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <motion.div animate={{ y: isDragging ? -8 : hovered ? -3 : 0 }} transition={{ duration: 0.25 }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all ${
                  isDragging ? "bg-primary text-white shadow-lg shadow-violet-200" : "bg-muted text-muted-foreground"}`}>
                <Upload size={24} />
              </motion.div>
              <p className="text-xl font-semibold text-foreground mb-1">
                {isDragging ? "Release to upload" : "Drop your STL here"}
              </p>
              <p className="text-sm text-muted-foreground mb-5">STL · OBJ · 3MF — any size</p>
              <button
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                Browse Files
              </button>
              <p className="text-xs text-muted-foreground mt-4">No account required · Instant pricing · Free quote</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".stl,.obj,.3mf" multiple className="hidden"
              onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) onFilesSelected(files); }} />
          </div>

          <button onClick={() => onFilesSelected([
            new File([""], "bracket_assembly.stl", { type: "model/stl" }),
            new File([""], "mount_plate.stl", { type: "model/stl" }),
          ])} className="mt-4 text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors block mx-auto">
            Try with sample files →
          </button>
        </motion.div>
      </main>

      {auth.isLoggedIn && (
        <section className="border-t border-border bg-white px-4 sm:px-8 py-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary mb-2">Your activity</p>
                <h2 className="text-xl font-bold">Your place in the print queue</h2>
              </div>
              <button onClick={() => onNav("orders")} className="text-xs font-medium text-primary hover:underline">View orders</button>
            </div>
            {queue.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {queue.map(item => (
                  <button key={item.id} onClick={() => onQueueOrder(item.orderNumber)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-secondary hover:border-primary/20 transition-colors text-left">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.status === "printing" ? "bg-emerald-500" : item.status === "review" ? "bg-blue-400" : "bg-amber-400"}`} />
                    <span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{item.orderNumber}</span><span className="block text-xs text-muted-foreground">{item.parts} part{item.parts !== 1 ? "s" : ""} · {item.status}</span></span>
                    <span className="text-xs font-mono font-semibold text-primary">#{item.position}</span>
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">You do not have any orders in the global queue.</p>}
          </div>
        </section>
      )}

      {/* Feature strip */}
      <section className="border-t border-border bg-white/60 px-8 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {features.map(({ icon: Icon, label, sub }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06 }}
              className="flex flex-col items-center text-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
                <Icon size={18} className="text-primary" />
              </div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works teaser */}
      <section className="px-8 py-16 bg-background">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-3">Simple process</p>
          <h2 className="text-3xl font-bold mb-3">From file to doorstep in days</h2>
          <p className="text-muted-foreground">No account needed to get a quote. Order whenever you're ready.</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: "01", label: "Upload",    sub: "Drop your STL, OBJ, or 3MF file",           icon: Upload    },
            { n: "02", label: "Configure", sub: "Pick material, color, and strength",          icon: Layers    },
            { n: "03", label: "We print",  sub: "Bambu Lab X1C printers, pro filament",        icon: Printer   },
            { n: "04", label: "Delivered", sub: "Securely packed, at your door",               icon: Package   },
          ].map(s => (
            <div key={s.n} className="relative flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center shadow-sm mb-4">
                <s.icon size={20} className="text-primary" />
              </div>
              <span className="text-[10px] font-mono text-primary/60 font-medium mb-1">{s.n}</span>
              <p className="text-sm font-semibold mb-1">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <button onClick={() => onNav("how-it-works")}
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline underline-offset-2">
            Learn more about the process <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-8 py-16 bg-white/60 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-primary mb-10">What customers say</p>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-border p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white/80 px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-lg">Print<span className="text-primary">Nest</span></span>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            {[
              { label: "How it works", view: "how-it-works" as AppView },
              { label: "Materials",    view: "materials"    as AppView },
              { label: "Pricing",      view: "pricing"      as AppView },
            ].map(n => (
              <button key={n.label} onClick={() => onNav(n.view)} className="hover:text-foreground transition-colors">
                {n.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">© 2026 PrintNest. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  How It Works                                            */
/* ─────────────────────────────────────────────────────── */

