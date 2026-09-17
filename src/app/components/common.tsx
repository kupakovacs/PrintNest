import { useState, useRef, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, STATUS_CONFIG, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera, LayoutDashboard } = Icons;

export function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === "printing" ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
}

type AppNavLink = { label: string; onClick: () => void };

export function AppNav({ auth, onLogoClick, navLinks, leftContent, rightContent, showQuote = true, containerClassName }: {
  auth: AuthCallbacks;
  onLogoClick: () => void;
  navLinks?: AppNavLink[];
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  showQuote?: boolean;
  containerClassName?: string;
}) {
  return (
    <header className="border-b border-border bg-white/90 backdrop-blur-sm sticky top-0 z-20">
      <div className={`${containerClassName ?? "max-w-6xl mx-auto"} px-4 sm:px-6 py-3.5 flex items-center gap-4`}>
        <button onClick={onLogoClick} className="text-lg font-bold tracking-tight flex-shrink-0">
          Print<span className="text-primary">Nest</span>
        </button>
        {leftContent && <div className="flex items-center gap-3 min-w-0">{leftContent}</div>}
        {navLinks && navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {navLinks.map(link => (
              <button key={link.label} onClick={link.onClick}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
                {link.label}
              </button>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          {rightContent}
          {showQuote && (
            <button onClick={onLogoClick}
              className="hidden sm:block text-sm px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-violet-700 transition-colors">
              Get a quote →
            </button>
          )}
          <UserMenu auth={auth} />
        </div>
      </div>
    </header>
  );
}


export function InfoNav({ onBack, nav, auth }: {
  onBack: () => void;
  nav: { label: string; onClick: () => void }[];
  auth: AuthCallbacks;
}) {
  return <AppNav auth={auth} onLogoClick={onBack} navLinks={nav} />;
}


export function UserMenu({ auth }: { auth: AuthCallbacks }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!auth.isLoggedIn) {
    return (
      <button onClick={auth.onSignIn}
        className="text-sm px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors font-medium">
        Sign in
      </button>
    );
  }

  const name = auth.user?.name ?? "User";
  const ini  = initials(name);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-muted transition-colors">
        <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {ini}
        </span>
        <span className="text-sm font-medium hidden sm:block">{name.split(" ")[0]}</span>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-border shadow-xl overflow-hidden z-50"
          style={{ fontFamily: "'Outfit', sans-serif" }}>
          <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{auth.user?.email}</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            <button onClick={() => { auth.onDashboard(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-muted transition-colors text-left">
              <LayoutDashboard size={14} className="text-muted-foreground" />Dashboard
            </button>
            <button onClick={() => { auth.onMyOrders(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-muted transition-colors text-left">
              <Package size={14} className="text-muted-foreground" />My Orders
            </button>
            <button onClick={() => { auth.onProfile(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-muted transition-colors text-left">
              <User size={14} className="text-muted-foreground" />Profile & Settings
            </button>
          </div>
          <div className="p-1.5 border-t border-border/60">
            <button onClick={() => { auth.onSignOut(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-red-50 hover:text-red-600 transition-colors text-left text-muted-foreground">
              <LogOut size={14} />Sign out
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}


export function IsometricPart({ colorHex }: { colorHex: string }) {
  const stroke = colorHex === "#EDEDEC" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  return (
    <svg width="220" height="200" viewBox="0 0 220 200" fill="none">
      <defs>
        <pattern id="layerH" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="skewX(-30)">
          <line x1="0" y1="2.5" x2="5" y2="2.5" stroke={stroke} strokeWidth="0.6" />
        </pattern>
        <pattern id="layerL" width="5" height="5" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2.5" x2="5" y2="2.5" stroke={stroke} strokeWidth="0.6" />
        </pattern>
      </defs>
      <ellipse cx="110" cy="168" rx="52" ry="8" fill={colorHex} opacity="0.15" />
      <polygon points="110,72 158,98 110,124 62,98" fill={colorHex} />
      <polygon points="110,72 158,98 110,124 62,98" fill="url(#layerH)" />
      <polygon points="62,98 110,124 110,144 62,118"  fill={colorHex} opacity="0.55" />
      <polygon points="62,98 110,124 110,144 62,118"  fill="url(#layerL)" opacity="0.7" />
      <polygon points="110,124 158,98 158,118 110,144" fill={colorHex} opacity="0.38" />
      <polygon points="110,124 158,98 158,118 110,144" fill="url(#layerL)" opacity="0.7" />
      <polygon points="75,80 95,70 95,90 75,100"  fill={colorHex} />
      <polygon points="62,98 75,80 75,100 62,118"  fill={colorHex} opacity="0.55" />
      <polygon points="75,100 95,90 95,124 75,124" fill={colorHex} opacity="0.38" />
      <polygon points="125,70 145,80 145,100 125,90" fill={colorHex} />
      <polygon points="125,90 125,124 145,124 145,100" fill={colorHex} opacity="0.55" />
      <polygon points="145,80 158,98 158,118 145,100" fill={colorHex} opacity="0.38" />
      <line x1="110" y1="72" x2="158" y2="98" stroke="white" strokeWidth="0.5" opacity="0.15" />
      <line x1="110" y1="72" x2="62"  y2="98" stroke="white" strokeWidth="0.5" opacity="0.1" />
    </svg>
  );
}


export function ModeToggle({ mode, onChange }: { mode: "simple" | "advanced"; onChange: (m: "simple" | "advanced") => void }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs font-medium">
      {(["simple", "advanced"] as const).map(m => (
        <button key={m} onClick={() => onChange(m)}
          className={`px-3 py-1 rounded-md capitalize transition-all duration-150 ${mode === m ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {m}
        </button>
      ))}
    </div>
  );
}


export function SectionHeader({ label }: { label: string }) {
  return <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2 mt-4">{label}</p>;
}


export function OptionPill<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string; sub?: string; priceDelta?: string }[];
  value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl border text-sm transition-all duration-100 ${
            value === o.id
              ? "border-primary/30 bg-secondary text-foreground"
              : "border-border bg-white hover:bg-muted/40 text-foreground/70"}`}>
          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            value === o.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
            {value === o.id && <Check size={9} className="text-white" />}
          </span>
          <span className="flex-1">
            <span className="font-medium text-[13px]">{o.label}</span>
            {o.sub && <span className="text-muted-foreground text-xs ml-1.5">{o.sub}</span>}
          </span>
          {o.priceDelta && (
            <span className={`text-[10px] font-mono ml-auto ${o.priceDelta.startsWith("+") ? "text-amber-500" : "text-emerald-500"}`}>
              {o.priceDelta}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}


export function ColorPicker({ value, onChange }: { value: Color; onChange: (v: Color) => void }) {
  return (
    <div>
      <SectionHeader label="Color" />
      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map(c => (
          <button key={c.id} onClick={() => onChange(c.id)} title={c.label}
            className={`w-7 h-7 rounded-full border-2 transition-all ${value === c.id ? "border-primary scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
            style={{ backgroundColor: c.hex, boxShadow: value === c.id ? `0 0 0 3px rgba(91,33,182,0.2)` : undefined }} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">{COLOR_OPTIONS.find(c => c.id === value)?.label}</p>
    </div>
  );
}


export function OrientationPicker({ value, onChange }: { value: Orientation; onChange: (v: Orientation) => void }) {
  const faces: { id: Orientation; label: string; gridPos: string }[] = [
    { id: "+Z", label: "Top",    gridPos: "col-start-2 row-start-1" },
    { id: "-X", label: "Left",   gridPos: "col-start-1 row-start-2" },
    { id: "+Y", label: "Front",  gridPos: "col-start-2 row-start-2" },
    { id: "+X", label: "Right",  gridPos: "col-start-3 row-start-2" },
    { id: "-Y", label: "Back",   gridPos: "col-start-4 row-start-2" },
    { id: "-Z", label: "Bottom", gridPos: "col-start-2 row-start-3" },
  ];
  return (
    <div>
      <SectionHeader label="Orientation" />
      <button onClick={() => onChange("auto")} className={`text-xs px-2.5 py-1 rounded-lg border transition-all mb-2 ${
        value === "auto" ? "bg-secondary border-primary/30 text-primary font-medium" : "bg-white border-border text-muted-foreground"}`}>
        Auto (Recommended)
      </button>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: "repeat(4, 36px)", gridTemplateRows: "repeat(3, 28px)" }}>
        {faces.map(f => (
          <button key={f.id} onClick={() => onChange(f.id)}
            className={`${f.gridPos} rounded-md text-[10px] font-medium transition-all border ${
              value === f.id ? "bg-primary text-white border-primary" : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}


export function PriceBreakdown({ batch }: { batch: Batch }) {
  const t = calcTotals(batch);
  const rows = [
    { label: "Material",    value: t.materialCost },
    { label: "Machine time",value: t.machineCost  },
    { label: "Packaging",   value: t.packaging    },
    ...(t.postProcess > 0 ? [{ label: "Post processing", value: t.postProcess }] : []),
  ];
  return (
    <div className="bg-muted/50 rounded-xl p-3 mt-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Price Breakdown</p>
      <div className="space-y-1.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="text-sm font-mono font-medium">{fmt(r.value)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-1.5 mt-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold">Batch total</span>
          <span className="text-sm font-mono font-semibold text-primary">{fmt(t.total)}</span>
        </div>
      </div>
    </div>
  );
}


export function DeliveryTimeline({ batch }: { batch: Batch }) {
  const delivery = DELIVERY_OPTIONS.find(d => d.id === batch.deliverySpeed) ?? DELIVERY_OPTIONS[1];
  const deliveryDate = delivery.id === "rush" ? "Jul 25, 2026" : delivery.id === "priority" ? "Jul 26–27, 2026" : delivery.id === "standard" ? "Jul 27–29, 2026" : "Jul 31–Aug 3, 2026";
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Delivery Timeline</p>
      {[{ label: "Production", pct: 65 }, { label: "Ships", pct: 53 }, { label: "Delivered", pct: 40 }].map((s, i) => (
        <div key={s.label}>
          <span className="text-xs text-foreground/70">{s.label}</span>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-0.5">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
              initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }} />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground pt-1">Expected: <span className="font-mono font-medium text-foreground">{deliveryDate}</span></p>
    </div>
  );
}


export function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-foreground/70">{label}</span>
        <span className="text-xs font-mono font-medium">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-violet-600 h-1.5 rounded-full cursor-pointer" />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-muted-foreground">{min}{unit}</span>
        <span className="text-[10px] text-muted-foreground">{max}{unit}</span>
      </div>
    </div>
  );
}

