import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck,
  ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight,
  Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock,
  RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame,
  Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight,
  Sparkles, BarChart3, Camera
} from "lucide-react";

/* ─────────────────────────────────────────────────────── */
/*  Types                                                   */
/* ─────────────────────────────────────────────────────── */

type Material = "pla" | "petg" | "clear-petg" | "tpu" | "pla-plus" | "asa";
type Color = "white" | "black" | "red" | "blue" | "green" | "orange" | "gray";
type Details = "fine" | "standard" | "fast";
type Strength = "maximum" | "strong" | "standard" | "lightweight";
type SupportMode = "best-surface" | "standard" | "automatic";
type DeliverySpeed = "economy" | "standard" | "priority" | "rush";
type PostProcessing = "none" | "support-removal" | "smoothing";
type FailedPrint = "no-retry" | "1-retry" | "2-retry" | "unlimited";
type Protection = "minimal" | "standard" | "fragile" | "extremely-fragile";
type InfillPattern = "gyroid" | "cubic" | "grid" | "lightning" | "honeycomb";
type Orientation = "auto" | "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";
type AppView =
  | "landing" | "workspace" | "checkout" | "tracking"
  | "orders" | "profile" | "signin"
  | "how-it-works" | "pricing" | "materials";
type OrderStatus = "delivered" | "shipped" | "printing" | "packaging" | "waiting" | "review" | "issue";

interface PrintFile {
  id: string; name: string; size: number; quantity: number;
  orientation: Orientation; note: string; mass: number; time: number; price: number;
}

interface Batch {
  id: string; name: string; files: PrintFile[]; expanded: boolean; mode: "simple" | "advanced";
  material: Material; color: Color; details: Details; strength: Strength; support: SupportMode;
  multiColor: boolean; deliverySpeed: DeliverySpeed; failedPrint: FailedPrint;
  protection: Protection; postProcessing: PostProcessing; layerHeight: number;
  adaptiveLayer: boolean; infillDensity: number; infillPattern: InfillPattern;
  wallCount: number; supportPlacement: "build-plate" | "everywhere"; supportInterface: boolean;
}

interface UserProfile { name: string; email: string; }

interface AuthCallbacks {
  isLoggedIn: boolean; user: UserProfile | null;
  onSignIn: () => void; onMyOrders: () => void; onProfile: () => void; onSignOut: () => void;
}

interface MockOrder {
  id: string; orderNumber: string; date: string; status: OrderStatus;
  batches: number; parts: number; total: number; description: string;
  colors: string[]; printTime: string;
}

/* ─────────────────────────────────────────────────────── */
/*  Constants                                               */
/* ─────────────────────────────────────────────────────── */

const COLOR_OPTIONS: { id: Color; label: string; hex: string }[] = [
  { id: "white", label: "White", hex: "#EDEDEC" },
  { id: "black", label: "Black", hex: "#1C1C1E" },
  { id: "red", label: "Red", hex: "#E5383B" },
  { id: "blue", label: "Blue", hex: "#2563EB" },
  { id: "green", label: "Green", hex: "#16A34A" },
  { id: "orange", label: "Orange", hex: "#EA580C" },
  { id: "gray", label: "Gray", hex: "#9CA3AF" },
];

const MATERIAL_OPTIONS: { id: Material; label: string; sub: string; priceTier: number }[] = [
  { id: "pla",        label: "Easy & Affordable", sub: "PLA",        priceTier: 1 },
  { id: "petg",       label: "Weather Resistant",  sub: "PETG",       priceTier: 2 },
  { id: "clear-petg", label: "Transparent",        sub: "Clear PETG", priceTier: 2 },
  { id: "tpu",        label: "Flexible",           sub: "TPU",        priceTier: 3 },
  { id: "pla-plus",   label: "PLA+",               sub: "PLA+",       priceTier: 2 },
  { id: "asa",        label: "UV Resistant",       sub: "ASA",        priceTier: 3 },
];

const DETAILS_OPTIONS: { id: Details; label: string; sub: string; priceDelta: string }[] = [
  { id: "fine",     label: "Fine Detail",  sub: "0.1mm layers", priceDelta: "+40%" },
  { id: "standard", label: "Standard",     sub: "0.2mm layers", priceDelta: "" },
  { id: "fast",     label: "Fast Print",   sub: "0.3mm layers", priceDelta: "−15%" },
];

const STRENGTH_OPTIONS: { id: Strength; label: string; sub: string; priceDelta: string }[] = [
  { id: "maximum",    label: "Maximum Strength", sub: "80% infill", priceDelta: "+30%" },
  { id: "strong",     label: "Strong",           sub: "40% infill", priceDelta: "+15%" },
  { id: "standard",   label: "Standard",         sub: "15% infill", priceDelta: "" },
  { id: "lightweight",label: "Lightweight",      sub: "5% infill",  priceDelta: "−10%" },
];

const SUPPORT_OPTIONS: { id: SupportMode; label: string; sub: string }[] = [
  { id: "best-surface", label: "Best Surface Finish", sub: "No contact marks" },
  { id: "standard",     label: "Standard Supports",   sub: "Balanced approach" },
  { id: "automatic",    label: "Automatic",           sub: "Recommended" },
];

const INFILL_PATTERNS: InfillPattern[] = ["gyroid", "cubic", "grid", "lightning", "honeycomb"];

const DELIVERY_OPTIONS: { id: DeliverySpeed; label: string; days: string; price: string; priceDelta: number }[] = [
  { id: "economy",  label: "Economy",  days: "7–10 days", price: "Free", priceDelta: 0  },
  { id: "standard", label: "Standard", days: "3–5 days",  price: "+€4",  priceDelta: 4  },
  { id: "priority", label: "Priority", days: "1–2 days",  price: "+€12", priceDelta: 12 },
  { id: "rush",     label: "Rush",     days: "Next day",  price: "+€24", priceDelta: 24 },
];

const QUEUE = [
  { id: 214, status: "printing" as const, label: "Order #214", time: "~2h remaining" },
  { id: 215, status: "waiting"  as const, label: "Order #215", time: "Starts ~14:30" },
  { id: 216, status: "review"   as const, label: "Order #216", time: "Pending review" },
];

const MOCK_PAST_ORDERS: MockOrder[] = [
  {
    id: "mo1", orderNumber: "PN-2026-07-8742", date: "Jul 22, 2026",
    status: "shipped", batches: 1, parts: 4, total: 41.20,
    description: "electronics_enclosure.stl + 3 files", colors: ["#2563EB"], printTime: "9.4h",
  },
  {
    id: "mo2", orderNumber: "PN-2026-07-8738", date: "Jul 18, 2026",
    status: "delivered", batches: 1, parts: 2, total: 18.90,
    description: "phone_stand.stl, cable_clip.stl", colors: ["#9CA3AF"], printTime: "3.2h",
  },
  {
    id: "mo3", orderNumber: "PN-2026-07-8731", date: "Jul 12, 2026",
    status: "delivered", batches: 3, parts: 8, total: 87.40,
    description: "robot_arm_v2.stl + 7 files", colors: ["#1C1C1E", "#E5383B", "#16A34A"], printTime: "21.8h",
  },
  {
    id: "mo4", orderNumber: "PN-2026-07-8719", date: "Jul 3, 2026",
    status: "delivered", batches: 1, parts: 1, total: 8.50,
    description: "wall_hook.stl", colors: ["#EDEDEC"], printTime: "1.8h",
  },
];

/* ─────────────────────────────────────────────────────── */
/*  Helpers                                                 */
/* ─────────────────────────────────────────────────────── */

function makeBatch(name: string, files: PrintFile[]): Batch {
  return {
    id: `b-${Math.random().toString(36).slice(2)}`, name, files, expanded: true, mode: "simple",
    material: "pla", color: "black", details: "standard", strength: "standard", support: "automatic",
    multiColor: false, deliverySpeed: "standard", failedPrint: "1-retry", protection: "standard",
    postProcessing: "none", layerHeight: 0.2, adaptiveLayer: false, infillDensity: 15,
    infillPattern: "gyroid", wallCount: 3, supportPlacement: "build-plate", supportInterface: true,
  };
}

function makeFile(name: string, size: number): PrintFile {
  const seed = name.length * 7 + size;
  return {
    id: `f-${Math.random().toString(36).slice(2)}`, name, size, quantity: 1, orientation: "auto", note: "",
    mass: 8 + (seed % 60), time: +((0.5 + (seed % 50) / 10).toFixed(1)),
    price: +((2.4 + (seed % 120) / 10).toFixed(2)),
  };
}

function calcTotals(batch: Batch) {
  const matMult = { pla: 1, petg: 1.15, "clear-petg": 1.2, tpu: 1.3, "pla-plus": 1.1, asa: 1.25 }[batch.material] ?? 1;
  const detMult = { fine: 1.4, standard: 1, fast: 0.85 }[batch.details] ?? 1;
  const strMult = { maximum: 1.3, strong: 1.15, standard: 1, lightweight: 0.9 }[batch.strength] ?? 1;
  const ppCost  = { none: 0, "support-removal": 2, smoothing: 5 }[batch.postProcessing] ?? 0;
  const retryMult = { "no-retry": 0.95, "1-retry": 1, "2-retry": 1.1, unlimited: 1.2 }[batch.failedPrint] ?? 1;
  const totalMass    = batch.files.reduce((s, f) => s + f.mass  * f.quantity, 0);
  const totalTime    = batch.files.reduce((s, f) => s + f.time  * f.quantity, 0);
  const materialCost = +(totalMass * 0.028 * matMult).toFixed(2);
  const machineCost  = +(totalTime * 2.1   * detMult * strMult * retryMult).toFixed(2);
  const packaging    = 1.0;
  const postProcess  = +ppCost.toFixed(2);
  const total        = +(materialCost + machineCost + packaging + postProcess).toFixed(2);
  return { totalMass, totalTime, materialCost, machineCost, packaging, postProcess, total };
}

function fmt(n: number) { return `€${n.toFixed(2)}`; }
function priceTierDots(tier: number) { return "€".repeat(tier) + "·".repeat(3 - tier); }

function calcOrderSummary(batches: Batch[]) {
  const allTotals    = batches.map(calcTotals);
  const subtotal     = +allTotals.reduce((s, t) => s + t.total, 0).toFixed(2);
  const deliveryDelta = DELIVERY_OPTIONS.find(d => d.id === batches[0]?.deliverySpeed)?.priceDelta ?? 4;
  const totalMass    = allTotals.reduce((s, t) => s + t.totalMass, 0);
  const totalTime    = allTotals.reduce((s, t) => s + t.totalTime, 0);
  const totalParts   = batches.reduce((s, b) => s + b.files.reduce((ss, f) => ss + f.quantity, 0), 0);
  const grandTotal   = +(subtotal + deliveryDelta).toFixed(2);
  return { subtotal, deliveryDelta, totalMass, totalTime, totalParts, grandTotal };
}

function buildCurrentOrder(batches: Batch[]): MockOrder {
  const { totalParts, totalTime, grandTotal } = calcOrderSummary(batches);
  const allFiles = batches.flatMap(b => b.files);
  const colors   = [...new Set(batches.map(b => COLOR_OPTIONS.find(c => c.id === b.color)?.hex ?? "#1C1C1E"))];
  const desc     = allFiles.slice(0, 2).map(f => f.name).join(", ") + (allFiles.length > 2 ? ` + ${allFiles.length - 2} more` : "");
  return {
    id: "current", orderNumber: "PN-2026-07-8743", date: "Jul 24, 2026",
    status: "printing", batches: batches.length, parts: totalParts, total: grandTotal,
    description: desc || "No files", colors, printTime: `${totalTime.toFixed(1)}h`,
  };
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "User";
  return local.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]?.toUpperCase()).join("");
}

/* ─────────────────────────────────────────────────────── */
/*  Status Badge                                            */
/* ─────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  printing:  { label: "Printing",   bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500"  },
  shipped:   { label: "Shipped",    bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  delivered: { label: "Delivered",  bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  packaging: { label: "Packaging",  bg: "bg-purple-100",  text: "text-purple-700",  dot: "bg-purple-500"  },
  waiting:   { label: "Waiting",    bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400"   },
  review:    { label: "In Review",  bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400"    },
  issue:     { label: "Issue",      bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500"     },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === "printing" ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Info Page Wrapper (shared shell for static pages)       */
/* ─────────────────────────────────────────────────────── */

function InfoNav({ onBack, nav, auth }: {
  onBack: () => void;
  nav: { label: string; onClick: () => void }[];
  auth: AuthCallbacks;
}) {
  return (
    <header className="border-b border-border bg-white/90 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center gap-4">
        <button onClick={onBack} className="text-lg font-bold tracking-tight flex-shrink-0">
          Print<span className="text-primary">Nest</span>
        </button>
        <div className="hidden md:flex items-center gap-1 ml-4">
          {nav.map(n => (
            <button key={n.label} onClick={n.onClick}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
              {n.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={onBack}
            className="text-sm px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-violet-700 transition-colors">
            Get a quote →
          </button>
          <UserMenu auth={auth} />
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  User Menu                                               */
/* ─────────────────────────────────────────────────────── */

function UserMenu({ auth }: { auth: AuthCallbacks }) {
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

/* ─────────────────────────────────────────────────────── */
/*  Isometric Model Viewer                                  */
/* ─────────────────────────────────────────────────────── */

function IsometricPart({ colorHex }: { colorHex: string }) {
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

function ModelViewer({ batches }: { batches: Batch[] }) {
  const colorHex   = COLOR_OPTIONS.find(c => c.id === batches[0]?.color)?.hex ?? "#1C1C1E";
  const totalMass  = batches.reduce((s, b) => s + calcTotals(b).totalMass, 0);
  const totalTime  = batches.reduce((s, b) => s + calcTotals(b).totalTime, 0);
  const totalParts = batches.reduce((s, b) => s + b.files.reduce((ss, f) => ss + f.quantity, 0), 0);
  const firstName  = batches.flatMap(b => b.files)[0]?.name ?? "model.stl";
  return (
    <div className="relative h-full rounded-2xl overflow-hidden bg-[#06060C] flex flex-col"
      style={{ fontFamily: "'DM Mono', monospace" }}>
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: "linear-gradient(rgba(139,92,246,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.5) 1px,transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
      <div className="relative px-4 pt-4 flex items-center gap-2">
        <span className="text-[10px] font-mono text-violet-400/40 tracking-[0.18em] uppercase">3D Preview</span>
        <span className="ml-auto text-[10px] font-mono text-white/20 truncate max-w-[120px]">{firstName}</span>
      </div>
      <div className="relative flex-1 flex items-center justify-center">
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <IsometricPart colorHex={colorHex} />
        </motion.div>
      </div>
      <div className="relative border-t border-white/5 px-4 py-3 grid grid-cols-3 gap-2">
        {[{ label: "Parts", val: String(totalParts) }, { label: "Mass", val: `${totalMass}g` }, { label: "Print time", val: `${totalTime.toFixed(1)}h` }].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-white text-sm font-semibold">{s.val}</div>
            <div className="text-white/25 text-[10px] mt-0.5 tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Shared small components                                 */
/* ─────────────────────────────────────────────────────── */

function ModeToggle({ mode, onChange }: { mode: "simple" | "advanced"; onChange: (m: "simple" | "advanced") => void }) {
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

function SectionHeader({ label }: { label: string }) {
  return <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2 mt-4">{label}</p>;
}

function OptionPill<T extends string>({ options, value, onChange }: {
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

function ColorPicker({ value, onChange }: { value: Color; onChange: (v: Color) => void }) {
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

function OrientationPicker({ value, onChange }: { value: Orientation; onChange: (v: Orientation) => void }) {
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

function PriceBreakdown({ batch }: { batch: Batch }) {
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

function DeliveryTimeline({ batch }: { batch: Batch }) {
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

/* ─────────────────────────────────────────────────────── */
/*  Settings                                                */
/* ─────────────────────────────────────────────────────── */

function Slider({ label, value, min, max, step, unit, onChange }: {
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

function SimpleSettings({ batch, onChange }: { batch: Batch; onChange: (b: Batch) => void }) {
  return (
    <div className="space-y-1">
      <SectionHeader label="Material" />
      <div className="flex flex-col gap-1.5">
        {MATERIAL_OPTIONS.filter(m => ["pla", "petg", "clear-petg", "tpu"].includes(m.id)).map(m => (
          <button key={m.id} onClick={() => onChange({ ...batch, material: m.id as Material })}
            className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${
              batch.material === m.id ? "border-primary/30 bg-secondary text-foreground" : "border-border bg-white hover:bg-muted/40 text-foreground/70"}`}>
            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
              batch.material === m.id ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
              {batch.material === m.id && <Check size={9} className="text-white" />}
            </span>
            <span className="flex-1">
              <span className="font-medium text-[13px]">{m.label}</span>
              <span className="text-muted-foreground text-xs ml-1.5">{m.sub}</span>
            </span>
            <span className="text-[11px] font-mono text-muted-foreground/60">{priceTierDots(m.priceTier)}</span>
          </button>
        ))}
      </div>
      <ColorPicker value={batch.color} onChange={v => onChange({ ...batch, color: v })} />
      <SectionHeader label="Detail Level" />
      <OptionPill options={DETAILS_OPTIONS} value={batch.details} onChange={v => onChange({ ...batch, details: v })} />
      <SectionHeader label="Strength" />
      <OptionPill options={STRENGTH_OPTIONS} value={batch.strength} onChange={v => onChange({ ...batch, strength: v })} />
      <SectionHeader label="Supports" />
      <OptionPill options={SUPPORT_OPTIONS} value={batch.support} onChange={v => onChange({ ...batch, support: v })} />
    </div>
  );
}

function AdvancedSettings({ batch, onChange }: { batch: Batch; onChange: (b: Batch) => void }) {
  return (
    <div className="space-y-1">
      <SectionHeader label="Material" />
      <OptionPill options={MATERIAL_OPTIONS.map(m => ({ id: m.id, label: m.sub, sub: m.label }))}
        value={batch.material} onChange={v => onChange({ ...batch, material: v as Material })} />
      <ColorPicker value={batch.color} onChange={v => onChange({ ...batch, color: v })} />
      <SectionHeader label="Layer Quality" />
      <Slider label="Layer Height" value={batch.layerHeight} min={0.05} max={0.35} step={0.05} unit="mm"
        onChange={v => onChange({ ...batch, layerHeight: v })} />
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={batch.adaptiveLayer}
          onChange={e => onChange({ ...batch, adaptiveLayer: e.target.checked })} className="accent-violet-600" />
        <span className="text-foreground/80">Adaptive layer height</span>
      </label>
      <SectionHeader label="Strength" />
      <Slider label="Infill Density" value={batch.infillDensity} min={0} max={100} step={5} unit="%"
        onChange={v => onChange({ ...batch, infillDensity: v })} />
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5 mt-2">Infill Pattern</p>
      <div className="flex flex-wrap gap-1.5">
        {INFILL_PATTERNS.map(p => (
          <button key={p} onClick={() => onChange({ ...batch, infillPattern: p })}
            className={`px-2.5 py-1 rounded-lg text-xs capitalize border transition-all ${
              batch.infillPattern === p ? "bg-secondary border-primary/30 text-primary font-medium" : "bg-white border-border text-muted-foreground hover:bg-muted/40"}`}>
            {p}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Slider label="Wall Count" value={batch.wallCount} min={1} max={6} step={1} unit=" walls"
          onChange={v => onChange({ ...batch, wallCount: v })} />
      </div>
      <SectionHeader label="Supports" />
      <div className="space-y-1.5">
        {(["build-plate", "everywhere"] as const).map(sp => (
          <button key={sp} onClick={() => onChange({ ...batch, supportPlacement: sp })}
            className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl border text-sm transition-all ${
              batch.supportPlacement === sp ? "border-primary/30 bg-secondary text-foreground" : "border-border bg-white hover:bg-muted/40 text-foreground/70"}`}>
            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              batch.supportPlacement === sp ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
              {batch.supportPlacement === sp && <Check size={9} className="text-white" />}
            </span>
            <span className="capitalize font-medium text-[13px]">{sp.replace("-", " ")}</span>
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
        <input type="checkbox" checked={batch.supportInterface}
          onChange={e => onChange({ ...batch, supportInterface: e.target.checked })} className="accent-violet-600" />
        <span className="text-foreground/80">Support interface enabled</span>
      </label>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  File Row & Batch Card                                   */
/* ─────────────────────────────────────────────────────── */

function FileRow({ file, onChange, onRemove }: {
  file: PrintFile; onChange: (f: PrintFile) => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-xl group">
      <FileText size={13} className="text-muted-foreground flex-shrink-0" />
      <span className="text-sm font-medium flex-1 truncate min-w-0">{file.name}</span>
      <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground ml-auto flex-shrink-0">
        <span>{file.mass}g</span><span className="text-border">·</span>
        <span>{file.time}h</span><span className="text-border">·</span>
        <span className="text-foreground font-medium">{fmt(file.price)}</span>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <button onClick={() => onChange({ ...file, quantity: Math.max(1, file.quantity - 1) })}
          className="w-5 h-5 rounded-md bg-muted hover:bg-accent flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">−</span>
        </button>
        <span className="text-xs font-mono w-4 text-center">{file.quantity}</span>
        <button onClick={() => onChange({ ...file, quantity: file.quantity + 1 })}
          className="w-5 h-5 rounded-md bg-muted hover:bg-accent flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">+</span>
        </button>
      </div>
      <button onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive ml-1">
        <X size={12} />
      </button>
    </div>
  );
}

function BatchCard({ batch, onChange, onRemove, onAddFile }: {
  batch: Batch; onChange: (b: Batch) => void; onRemove: () => void; onAddFile: () => void;
}) {
  const totals    = calcTotals(batch);
  const matLabel  = MATERIAL_OPTIONS.find(m => m.id === batch.material)?.sub ?? "PLA";
  const colorHex  = COLOR_OPTIONS.find(c => c.id === batch.color)?.hex ?? "#1C1C1E";
  return (
    <div className="border border-border rounded-2xl bg-white overflow-hidden">
      <button onClick={() => onChange({ ...batch, expanded: !batch.expanded })}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <span className="w-5 h-5 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <Layers size={11} className="text-muted-foreground" />
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold">{batch.name}</span>
          <span className="text-xs text-muted-foreground ml-2">{matLabel}</span>
        </div>
        <span className="w-3.5 h-3.5 rounded-full border border-border/50 flex-shrink-0" style={{ backgroundColor: colorHex }} />
        <span className="text-xs font-mono font-semibold text-muted-foreground">{fmt(totals.total)}</span>
        {batch.expanded ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
      </button>

      {batch.expanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="mt-3 space-y-1.5">
            {batch.files.map(file => (
              <FileRow key={file.id} file={file}
                onChange={f => onChange({ ...batch, files: batch.files.map(ff => ff.id === f.id ? f : ff) })}
                onRemove={() => onChange({ ...batch, files: batch.files.filter(ff => ff.id !== file.id) })} />
            ))}
            <button onClick={onAddFile}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all">
              <Plus size={12} />Add file to batch
            </button>
          </div>
          <div className="mt-3">
            <OrientationPicker value={batch.files[0]?.orientation ?? "auto"}
              onChange={o => onChange({ ...batch, files: batch.files.map(f => ({ ...f, orientation: o })) })} />
          </div>
          <div className="flex items-center justify-between mt-5 mb-3">
            <span className="text-xs font-medium text-foreground/60 uppercase tracking-widest">Settings</span>
            <ModeToggle mode={batch.mode} onChange={m => onChange({ ...batch, mode: m })} />
          </div>
          {batch.mode === "simple"
            ? <SimpleSettings batch={batch} onChange={onChange} />
            : <AdvancedSettings batch={batch} onChange={onChange} />}

          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            <SectionHeader label="Post Processing" />
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "none" as PostProcessing, label: "None" },
                { id: "support-removal" as PostProcessing, label: "Support Removal", price: "+€2" },
                { id: "smoothing" as PostProcessing, label: "Smoothing", price: "+€5" },
              ].map(p => (
                <button key={p.id} onClick={() => onChange({ ...batch, postProcessing: p.id })}
                  className={`px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                    batch.postProcessing === p.id ? "bg-secondary border-primary/30 text-primary font-medium" : "bg-white border-border text-muted-foreground hover:bg-muted/40"}`}>
                  {p.label}{p.price && <span className="font-mono text-[10px] opacity-60">{p.price}</span>}
                </button>
              ))}
            </div>

            <SectionHeader label="Failed Print Policy" />
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "no-retry" as FailedPrint, label: "No retries",  price: "−5%"  },
                { id: "1-retry" as FailedPrint, label: "1 retry"                     },
                { id: "2-retry" as FailedPrint, label: "2 retries",   price: "+10%"  },
                { id: "unlimited" as FailedPrint, label: "Unlimited", price: "+20%"  },
              ].map(r => (
                <button key={r.id} onClick={() => onChange({ ...batch, failedPrint: r.id })}
                  className={`px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 ${
                    batch.failedPrint === r.id ? "bg-secondary border-primary/30 text-primary font-medium" : "bg-white border-border text-muted-foreground hover:bg-muted/40"}`}>
                  {r.label}{r.price && <span className="font-mono text-[10px] opacity-60">{r.price}</span>}
                </button>
              ))}
            </div>

            <SectionHeader label="Packaging Protection" />
            <div className="flex flex-wrap gap-1.5">
              {(["minimal", "standard", "fragile", "extremely-fragile"] as Protection[]).map(p => (
                <button key={p} onClick={() => onChange({ ...batch, protection: p })}
                  className={`px-3 py-1.5 rounded-xl text-xs border transition-all capitalize ${
                    batch.protection === p ? "bg-secondary border-primary/30 text-primary font-medium" : "bg-white border-border text-muted-foreground hover:bg-muted/40"}`}>
                  {p.replace("-", " ")}
                </button>
              ))}
            </div>

            <SectionHeader label="Delivery" />
            <div className="grid grid-cols-2 gap-1.5">
              {DELIVERY_OPTIONS.map(d => (
                <button key={d.id} onClick={() => onChange({ ...batch, deliverySpeed: d.id })}
                  className={`px-3 py-2 rounded-xl text-xs border transition-all text-left ${
                    batch.deliverySpeed === d.id ? "bg-secondary border-primary/30 text-foreground" : "bg-white border-border text-muted-foreground hover:bg-muted/40"}`}>
                  <div className="font-medium text-[13px]">{d.label}</div>
                  <div className="text-muted-foreground mt-0.5 flex items-center justify-between">
                    <span>{d.days}</span><span className="font-mono text-[10px]">{d.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <PriceBreakdown batch={batch} />
          <DeliveryTimeline batch={batch} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Order Summary                                           */
/* ─────────────────────────────────────────────────────── */

function OrderSummary({ batches, onCheckout }: { batches: Batch[]; onCheckout: () => void }) {
  const { subtotal, deliveryDelta, totalMass, totalTime, totalParts, grandTotal } = calcOrderSummary(batches);
  return (
    <div className="border border-border rounded-2xl bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Order Summary</p>
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-2 mb-3">
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
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono font-medium">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-mono font-medium">{deliveryDelta === 0 ? "Free" : fmt(deliveryDelta)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-border/50 pt-1.5">
            <span>Total</span><span className="font-mono text-primary">{fmt(grandTotal)}</span>
          </div>
        </div>
        <button onClick={onCheckout}
          className="mt-3 w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
          Proceed to Checkout →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Queue Panel                                             */
/* ─────────────────────────────────────────────────────── */

function QueuePanel({ onClose }: { onClose: () => void }) {
  const statusConfig = {
    printing: { color: "bg-emerald-500", label: "Printing", ring: "ring-emerald-200" },
    waiting:  { color: "bg-amber-400",   label: "Waiting",  ring: "ring-amber-200"   },
    review:   { color: "bg-blue-400",    label: "Review",   ring: "ring-blue-200"    },
  };
  return (
    <motion.div initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="absolute right-0 top-0 h-full w-72 bg-white border-l border-border shadow-2xl flex flex-col z-20">
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <p className="text-sm font-semibold">Print Queue</p>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {QUEUE.map(item => {
          const cfg = statusConfig[item.status];
          return (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color} ring-2 ${cfg.ring}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.time}</p>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                item.status === "printing" ? "bg-emerald-50 text-emerald-700"
                  : item.status === "waiting" ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"}`}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-4 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">Your order would be</p>
        <p className="text-sm font-semibold text-center mt-0.5">Position #4 · Starts tomorrow ~11:00</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Workspace                                               */
/* ─────────────────────────────────────────────────────── */

function WorkspaceView({ batches, setBatches, onBack, onCheckout, showQueue, setShowQueue, auth }: {
  batches: Batch[]; setBatches: (b: Batch[]) => void;
  onBack: () => void; onCheckout: () => void;
  showQueue: boolean; setShowQueue: (v: boolean) => void;
  auth: AuthCallbacks;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateBatch  = (updated: Batch) => setBatches(batches.map(b => b.id === updated.id ? updated : b));
  const addBatch     = () => {
    const names = ["Batch A", "Batch B", "Batch C", "Batch D", "Batch E"];
    setBatches([...batches, makeBatch(names[batches.length] ?? `Batch ${batches.length + 1}`, [])]);
  };
  const addFileToBatch = (batchId: string) => {
    if (fileInputRef.current) { fileInputRef.current.dataset.targetBatch = batchId; fileInputRef.current.click(); }
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files    = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const targetId = fileInputRef.current?.dataset.targetBatch;
    const newFiles = files.map(f => makeFile(f.name, f.size));
    if (targetId) setBatches(batches.map(b => b.id === targetId ? { ...b, files: [...b.files, ...newFiles] } : b));
    else setBatches([...batches, makeBatch(`Batch ${String.fromCharCode(65 + batches.length)}`, newFiles)]);
    e.target.value = "";
  };
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-white/80 backdrop-blur-sm z-10 flex-shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
        </button>
        <span className="text-sm font-bold tracking-tight">Print<span className="text-primary">Nest</span></span>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          {batches.flatMap(b => b.files).slice(0, 3).map(f => (
            <span key={f.id} className="text-xs bg-muted px-2 py-0.5 rounded-md font-mono text-muted-foreground truncate max-w-[120px]">{f.name}</span>
          ))}
          <label className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors ml-1 flex-shrink-0">
            <Plus size={12} /><span>Add file</span>
            <input ref={fileInputRef} type="file" accept=".stl,.obj,.3mf" multiple className="hidden" onChange={handleFileInput} />
          </label>
        </div>
        <button onClick={() => setShowQueue(!showQueue)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
            showQueue ? "bg-secondary border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Queue
        </button>
        <UserMenu auth={auth} />
      </header>
      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-72 lg:w-80 xl:w-96 flex-shrink-0 p-4">
          <ModelViewer batches={batches} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "none" }}>
          {batches.map(batch => (
            <BatchCard key={batch.id} batch={batch} onChange={updateBatch}
              onRemove={() => setBatches(batches.filter(b => b.id !== batch.id))}
              onAddFile={() => addFileToBatch(batch.id)} />
          ))}
          <button onClick={addBatch}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:bg-white hover:border-primary/30 hover:text-foreground transition-all">
            <Plus size={15} />Add new batch
          </button>
          <OrderSummary batches={batches} onCheckout={onCheckout} />
          <div className="h-8" />
        </div>
        {showQueue && <QueuePanel onClose={() => setShowQueue(false)} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Landing                                                 */
/* ─────────────────────────────────────────────────────── */

function LandingView({ onFilesSelected, auth, onNav }: {
  onFilesSelected: (files: File[]) => void;
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
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50 bg-white/70 backdrop-blur-sm sticky top-0 z-20">
        <span className="text-xl font-bold tracking-tight">Print<span className="text-primary">Nest</span></span>
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: "How it works", view: "how-it-works" as AppView },
            { label: "Materials",    view: "materials"    as AppView },
            { label: "Pricing",      view: "pricing"      as AppView },
          ].map(n => (
            <button key={n.label} onClick={() => onNav(n.view)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
              {n.label}
            </button>
          ))}
          {auth.isLoggedIn && (
            <button onClick={auth.onMyOrders}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
              My Orders
            </button>
          )}
        </div>
        <UserMenu auth={auth} />
      </nav>

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

function HowItWorksView({ onBack, auth, onNav }: {
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

function FAQItem({ q, a }: { q: string; a: string }) {
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

const MATERIAL_DETAIL = [
  {
    id: "pla" as Material,
    name: "PLA", fullName: "Polylactic Acid",
    tagline: "The go-to for everyday prints",
    desc: "PLA is the most popular 3D printing material — biodegradable, easy to print, and available in every colour. Great for prototypes, decorative pieces, and anything that won't see heat or rough weather.",
    color: "bg-emerald-50 border-emerald-100",
    accent: "text-emerald-700",
    dotColor: "#16A34A",
    priceTier: 1,
    basePer100g: "€2.80",
    tempResist: "55 °C",
    strength: 3,
    flexibility: 1,
    weathering: 1,
    foodSafe: false,
    transparency: false,
    useCases: ["Prototypes", "Figurines", "Decorative objects", "Cosplay props", "Enclosures"],
    printDifficulty: "Easy",
    specs: [
      { label: "Nozzle temp",    val: "215 °C" },
      { label: "Bed temp",       val: "60 °C"  },
      { label: "Layer adhesion", val: "Good"   },
      { label: "Shrinkage",      val: "Low"    },
    ],
  },
  {
    id: "petg" as Material,
    name: "PETG", fullName: "Polyethylene Terephthalate Glycol",
    tagline: "Strong, tough, and weather-proof",
    desc: "PETG combines the ease of PLA with better impact resistance and temperature tolerance. It won't warp in a hot car and handles mild outdoor exposure. The choice for functional parts that see real use.",
    color: "bg-blue-50 border-blue-100",
    accent: "text-blue-700",
    dotColor: "#2563EB",
    priceTier: 2,
    basePer100g: "€3.22",
    tempResist: "75 °C",
    strength: 4,
    flexibility: 2,
    weathering: 3,
    foodSafe: true,
    transparency: false,
    useCases: ["Functional parts", "Phone holders", "Brackets", "Food-safe containers", "Outdoor use"],
    printDifficulty: "Easy",
    specs: [
      { label: "Nozzle temp",    val: "235 °C"    },
      { label: "Bed temp",       val: "85 °C"     },
      { label: "Layer adhesion", val: "Excellent" },
      { label: "Shrinkage",      val: "Very low"  },
    ],
  },
  {
    id: "clear-petg" as Material,
    name: "Clear PETG", fullName: "Transparent PETG",
    tagline: "Crystal-clear functional parts",
    desc: "The same robust chemistry as regular PETG, but printed with transparent filament. Perfect for light diffusers, display cases, liquid containers, and any part where you need to see what's inside.",
    color: "bg-sky-50 border-sky-100",
    accent: "text-sky-700",
    dotColor: "#0EA5E9",
    priceTier: 2,
    basePer100g: "€3.36",
    tempResist: "75 °C",
    strength: 4,
    flexibility: 2,
    weathering: 3,
    foodSafe: true,
    transparency: true,
    useCases: ["Light diffusers", "Display stands", "Protective covers", "Liquid containers"],
    printDifficulty: "Medium",
    specs: [
      { label: "Nozzle temp",    val: "240 °C"  },
      { label: "Bed temp",       val: "85 °C"   },
      { label: "Layer adhesion", val: "Good"    },
      { label: "Clarity",        val: "High"    },
    ],
  },
  {
    id: "tpu" as Material,
    name: "TPU 95A", fullName: "Thermoplastic Polyurethane",
    tagline: "Rubbery, flexible, shock-absorbing",
    desc: "TPU is the material for anything that needs to flex, compress, or absorb impact without breaking. Grips, gaskets, phone cases, and cable organisers all benefit from its elastic properties.",
    color: "bg-orange-50 border-orange-100",
    accent: "text-orange-700",
    dotColor: "#EA580C",
    priceTier: 3,
    basePer100g: "€3.64",
    tempResist: "80 °C",
    strength: 3,
    flexibility: 5,
    weathering: 3,
    foodSafe: false,
    transparency: false,
    useCases: ["Phone cases", "Flexible joints", "Grips & handles", "Gaskets", "Wearables"],
    printDifficulty: "Medium",
    specs: [
      { label: "Nozzle temp",    val: "230 °C" },
      { label: "Bed temp",       val: "50 °C"  },
      { label: "Shore hardness", val: "95A"    },
      { label: "Elongation",     val: "600%"   },
    ],
  },
  {
    id: "pla-plus" as Material,
    name: "PLA+", fullName: "PLA Plus",
    tagline: "PLA, but stronger and less brittle",
    desc: "PLA+ adds toughness modifiers to standard PLA, giving you better impact resistance and reduced brittleness without sacrificing print quality. A drop-in upgrade for any PLA project that needs a little more durability.",
    color: "bg-violet-50 border-violet-100",
    accent: "text-violet-700",
    dotColor: "#7C3AED",
    priceTier: 2,
    basePer100g: "€3.08",
    tempResist: "60 °C",
    strength: 4,
    flexibility: 2,
    weathering: 1,
    foodSafe: false,
    transparency: false,
    useCases: ["Stronger prototypes", "Tool holders", "Jigs & fixtures", "Display pieces"],
    printDifficulty: "Easy",
    specs: [
      { label: "Nozzle temp",    val: "220 °C" },
      { label: "Bed temp",       val: "65 °C"  },
      { label: "Impact resist",  val: "High"   },
      { label: "Brittleness",    val: "Low"    },
    ],
  },
  {
    id: "asa" as Material,
    name: "ASA", fullName: "Acrylonitrile Styrene Acrylate",
    tagline: "Engineered for outdoor durability",
    desc: "ASA is specifically formulated to resist UV radiation and prolonged weather exposure without fading or becoming brittle. The right choice for anything that lives outdoors: garden mounts, signage, car parts, enclosures.",
    color: "bg-amber-50 border-amber-100",
    accent: "text-amber-700",
    dotColor: "#D97706",
    priceTier: 3,
    basePer100g: "€3.50",
    tempResist: "98 °C",
    strength: 4,
    flexibility: 1,
    weathering: 5,
    foodSafe: false,
    transparency: false,
    useCases: ["Outdoor signage", "Garden mounts", "Car parts", "Weatherproof enclosures"],
    printDifficulty: "Medium",
    specs: [
      { label: "Nozzle temp",  val: "250 °C"     },
      { label: "Bed temp",     val: "100 °C"     },
      { label: "UV stability", val: "Excellent"  },
      { label: "Shrinkage",    val: "Medium"     },
    ],
  },
];

function StatBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < value ? color : "bg-muted"}`} />
      ))}
    </div>
  );
}

function MaterialsView({ onBack, auth, onNav, onStartWithMaterial }: {
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

function PricingView({ onBack, auth, onNav, onStart }: {
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

function SignInView({ onSignIn, onBack }: { onSignIn: (email: string) => void; onBack: () => void }) {
  const [tab, setTab]         = useState<"signin" | "signup">("signin");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);

  const handle = () => {
    if (!email) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onSignIn(email); }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <button onClick={onBack} className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /><span>Back</span>
      </button>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold">Print<span className="text-primary">Nest</span></span>
          <p className="text-muted-foreground text-sm mt-1">
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </p>
        </div>
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          {(["signin", "signup"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {tab === "signup" && (
            <div>
              <label className="text-xs font-medium text-foreground/70 block mb-1.5">Full name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-foreground/70 block mb-1.5">Email address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                onKeyDown={e => e.key === "Enter" && handle()}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-foreground/70">Password</label>
              {tab === "signin" && <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>}
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handle()}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
            </div>
          </div>
          <button onClick={handle} disabled={!email || loading}
            className="w-full py-3 mt-1 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Signing in…" : tab === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">or</span></div>
        </div>
        <button onClick={onBack}
          className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          Continue as guest
        </button>
        <p className="text-center text-xs text-muted-foreground mt-6">
          {tab === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setTab(tab === "signin" ? "signup" : "signin")} className="text-primary hover:underline font-medium">
            {tab === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Checkout                                                */
/* ─────────────────────────────────────────────────────── */

function CheckoutView({ batches, onBack, onPlaceOrder, auth }: {
  batches: Batch[]; onBack: () => void; onPlaceOrder: () => void; auth: AuthCallbacks;
}) {
  const { subtotal, deliveryDelta, totalMass, totalTime, totalParts, grandTotal } = calcOrderSummary(batches);
  const [email, setEmail]   = useState(auth.user?.email ?? "");
  const [agreed, setAgreed] = useState(false);
  const delivery             = DELIVERY_OPTIONS.find(d => d.id === batches[0]?.deliverySpeed) ?? DELIVERY_OPTIONS[1];
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <header className="flex items-center gap-3 px-6 py-3.5 border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /><span className="hidden sm:block">Back</span>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <span className="text-sm font-bold">Print<span className="text-primary">Nest</span></span>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold">1</span>
          <span className="hidden sm:block">Configure</span>
          <ChevronRight size={11} />
          <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">2</span>
          <span className="text-foreground font-medium">Review</span>
          <ChevronRight size={11} />
          <span className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-bold">3</span>
          <span className="hidden sm:block">Confirm</span>
        </div>
        <UserMenu auth={auth} />
      </header>
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
              <button onClick={onPlaceOrder}
                className="w-full py-3.5 mt-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm">
                Place Order · {fmt(grandTotal)}
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

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "done") return (
    <span className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 ring-4 ring-emerald-50">
      <CheckCircle size={14} className="text-white" />
    </span>
  );
  if (status === "active") return (
    <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-4 ring-violet-100">
      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
    </span>
  );
  return (
    <span className="w-7 h-7 rounded-full bg-white border-2 border-border flex items-center justify-center flex-shrink-0">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
    </span>
  );
}

function PrintingBatchCard({ batchName, material, color, fileCount, printProgress, currentLayer, totalLayers, printerName, startTime, remainingMins, status }: {
  batchName: string; material: string; color: string; fileCount: number;
  printProgress: number; currentLayer: number; totalLayers: number;
  printerName: string; startTime: string; remainingMins: number;
  status: "printing" | "queued";
}) {
  const colorHex  = COLOR_OPTIONS.find(c => c.id === color)?.hex ?? "#1C1C1E";
  const colorLabel = COLOR_OPTIONS.find(c => c.id === color)?.label ?? "Black";
  const matLabel  = MATERIAL_OPTIONS.find(m => m.id === material)?.sub ?? "PLA";
  const hours     = Math.floor(remainingMins / 60), mins = remainingMins % 60;
  const remaining = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (status === "queued") return (
    <div className="border border-border rounded-xl p-3.5 opacity-70">
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
        <span className="text-sm font-semibold">{batchName}</span>
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex }} />
        <span className="text-xs text-muted-foreground">{colorLabel} {matLabel} · {fileCount} file{fileCount !== 1 ? "s" : ""}</span>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md">Queued</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2 ml-4">Est. start after current batch · ~15:10</p>
    </div>
  );
  return (
    <div className="border border-violet-200 bg-violet-50/30 rounded-xl p-3.5">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
        <span className="text-sm font-semibold">{batchName}</span>
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex }} />
        <span className="text-xs text-muted-foreground">{colorLabel} {matLabel} · {fileCount} file{fileCount !== 1 ? "s" : ""}</span>
        <span className="ml-auto text-xs font-mono font-semibold text-primary">{printProgress.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-violet-100 overflow-hidden mb-3">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
          style={{ width: `${printProgress}%` }} transition={{ duration: 0.5 }} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Printer",   val: printerName },
          { label: "Started",   val: startTime   },
          { label: "Layer",     val: `${currentLayer}/${totalLayers}` },
          { label: "Remaining", val: remaining   },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg p-2 text-center">
            <div className="text-xs font-semibold font-mono text-foreground">{s.val}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-violet-200 text-xs text-violet-400 hover:bg-white transition-colors">
        <Camera size={12} />Live camera feed — coming soon
      </button>
    </div>
  );
}

function TrackingTimeline({ batches, printProgress, currentLayer }: {
  batches: Batch[]; printProgress: number; currentLayer: number;
}) {
  const totalLayers    = 665;
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["printing", "file-analysis"]));
  const toggle = (id: string) => { const n = new Set(expanded); n.has(id) ? n.delete(id) : n.add(id); setExpanded(n); };
  const remainingMins  = Math.max(0, Math.round(((100 - printProgress) / 100) * 192));

  const stages: { id: string; label: string; status: StageStatus; time?: string; description: string }[] = [
    { id: "received",    label: "Order Received",        status: "done",   time: "Today · 09:14", description: `${batches.reduce((s, b) => s + b.files.length, 0)} files received, payment confirmed.` },
    { id: "file-analysis", label: "File Analysis",       status: "done",   time: "Today · 09:21", description: "All files passed automated geometry analysis." },
    { id: "waiting",     label: "Waiting for Printing",  status: "done",   time: "Today · 11:00", description: "Entered queue at position #4." },
    { id: "printing",    label: "Printing",              status: "active", time: "Today · 11:42", description: `${batches.length} batch${batches.length !== 1 ? "es" : ""} — ${batches[0]?.name ?? "Batch A"} printing now.` },
    { id: "inspection",  label: "Quality Inspection",    status: "pending", description: "Automated visual and dimensional check after printing." },
    { id: "packaging",   label: "Packaging",             status: "pending", description: "Secure packaging with selected protection level." },
    { id: "shipped",     label: "Shipped",               status: "pending", description: "Carrier pickup and tracking number assigned." },
    { id: "delivered",   label: "Delivered",             status: "pending", description: "Delivery to your address with confirmation." },
  ];

  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        const isExpanded = expanded.has(stage.id);
        const isLast     = i === stages.length - 1;
        return (
          <div key={stage.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <StageIcon status={stage.status} />
              {!isLast && <div className={`w-px flex-1 mt-1 mb-1 min-h-[24px] ${
                stage.status === "done" ? "bg-emerald-200"
                  : stage.status === "active" ? "bg-violet-200" : "bg-border"}`} />}
            </div>
            <div className="flex-1 pb-6">
              <button onClick={() => toggle(stage.id)} className="w-full flex items-center gap-2 text-left">
                <span className={`text-sm font-semibold ${stage.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                  {stage.label}
                </span>
                {stage.status === "active" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-violet-100 text-primary rounded-full font-medium">In Progress</span>
                )}
                {stage.time && <span className="text-xs text-muted-foreground ml-auto font-mono">{stage.time}</span>}
                {(stage.status !== "pending" || stage.id === "inspection") && (
                  <ChevronDown size={14} className={`text-muted-foreground ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                )}
              </button>
              <p className={`text-xs mt-0.5 ${stage.status === "pending" ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{stage.description}</p>
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {stage.id === "received" && (
                    <div className="bg-muted/40 rounded-xl p-3 text-xs space-y-1.5">
                      {[
                        `${batches.reduce((s, b) => s + b.files.length, 0)} files received and stored`,
                        `Payment of ${fmt(calcOrderSummary(batches).grandTotal)} confirmed`,
                        "Order #PN-2026-07-8743 assigned",
                      ].map(t => (
                        <div key={t} className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" /><span>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {stage.id === "file-analysis" && (
                    <div className="space-y-1.5">
                      {batches.flatMap(b => b.files).map(f => (
                        <div key={f.id} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 text-xs">
                          <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />
                          <span className="font-medium flex-1">{f.name}</span>
                          <span className="text-muted-foreground font-mono">{f.mass}g · {f.time}h</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {stage.id === "waiting" && (
                    <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                      <p>Entered queue at position #4 · 09:00</p>
                      <p>Position #3 · 09:22 — Order #213 completed</p>
                      <p>Position #2 · 10:14 — Order #211 completed</p>
                      <p className="text-emerald-600 font-medium">Printing started · 11:42</p>
                    </div>
                  )}
                  {stage.id === "printing" && (
                    <div className="space-y-2">
                      {batches.map((batch, i) => (
                        <PrintingBatchCard key={batch.id}
                          batchName={batch.name} material={batch.material} color={batch.color}
                          fileCount={batch.files.length} printProgress={i === 0 ? printProgress : 0}
                          currentLayer={i === 0 ? currentLayer : 0} totalLayers={totalLayers}
                          printerName={i === 0 ? "X1C #1" : "X1C #2"}
                          startTime={i === 0 ? "11:42" : "~15:10"}
                          remainingMins={i === 0 ? remainingMins : 120}
                          status={i === 0 ? "printing" : "queued"} />
                      ))}
                    </div>
                  )}
                  {stage.id === "inspection" && (
                    <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground space-y-1.5">
                      <p className="font-medium text-foreground/70 mb-1">What gets checked:</p>
                      {["Layer adhesion and print quality", "Dimensional accuracy ± 0.2mm", "Surface finish", "Structural integrity"].map(c => (
                        <div key={c} className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground" /><span>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrackingSidebar({ batches, printProgress }: { batches: Batch[]; printProgress: number }) {
  const { totalMass, totalTime, totalParts, grandTotal } = calcOrderSummary(batches);
  const delivery = DELIVERY_OPTIONS.find(d => d.id === batches[0]?.deliverySpeed) ?? DELIVERY_OPTIONS[1];
  const [notifs, setNotifs] = useState({ printing: true, complete: true, issue: true, shipped: true, delivered: true });
  const toggle = (k: keyof typeof notifs) => setNotifs(n => ({ ...n, [k]: !n[k] }));
  return (
    <div className="space-y-4">
      <div className="border border-border rounded-2xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Order Status</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <StatusBadge status="printing" />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Overall progress</span>
              <span className="font-mono text-primary font-medium">{(printProgress * 0.45).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                style={{ width: `${printProgress * 0.45}%` }} />
            </div>
          </div>
          <div className="pt-2 space-y-2 border-t border-border/50">
            {[
              { label: "Order #",    val: "PN-2026-07-8743" },
              { label: "Placed",     val: "Jul 24 · 09:14"  },
              { label: "Est. done",  val: "Jul 24 · 16:30"  },
              { label: "Est. ship",  val: delivery.id === "rush" ? "Jul 25" : delivery.id === "priority" ? "Jul 26" : "Jul 27–29" },
              { label: "Total",      val: fmt(grandTotal)   },
              { label: "Print time", val: `${totalTime.toFixed(1)}h` },
              { label: "Material",   val: `${totalMass}g`   },
              { label: "Parts",      val: String(totalParts) },
            ].map(s => (
              <div key={s.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <span className={`font-mono font-medium ${s.label === "Total" ? "text-primary" : ""}`}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border border-border rounded-2xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
          <Bell size={12} className="text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Notifications</p>
        </div>
        <div className="px-4 py-3 space-y-2">
          {[
            { key: "printing"  as const, label: "Printing started"  },
            { key: "complete"  as const, label: "Print complete"     },
            { key: "issue"     as const, label: "Issue detected"     },
            { key: "shipped"   as const, label: "Shipped"            },
            { key: "delivered" as const, label: "Delivered"          },
          ].map(n => (
            <label key={n.key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-foreground/80">{n.label}</span>
              <button onClick={() => toggle(n.key)}
                className={`relative w-8 h-4 rounded-full transition-colors ${notifs[n.key] ? "bg-primary" : "bg-muted-foreground/25"}`}>
                <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all"
                  style={{ left: notifs[n.key] ? "18px" : "2px" }} />
              </button>
            </label>
          ))}
        </div>
      </div>
      <div className="border border-border rounded-2xl bg-white p-4 space-y-2">
        <p className="text-xs font-medium text-foreground/60 mb-2">Need help?</p>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 transition-colors text-sm">
          <Phone size={13} className="text-muted-foreground" />Contact support
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-sm text-red-600 border border-red-100">
          <X size={13} />Cancel order
        </button>
      </div>
    </div>
  );
}

function OrderTrackingView({ batches, onBack, auth }: {
  batches: Batch[]; onBack: () => void; auth: AuthCallbacks;
}) {
  const [printProgress, setPrintProgress] = useState(67.4);
  const [currentLayer,  setCurrentLayer]  = useState(448);

  useEffect(() => {
    const iv = setInterval(() => {
      setPrintProgress(p => p >= 100 ? 100 : +(p + 0.03).toFixed(2));
      setCurrentLayer(l => Math.min(l + 1, 665));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft size={16} className="text-muted-foreground" />
          </button>
          <span className="text-sm font-bold">Print<span className="text-primary">Nest</span></span>
          <div className="w-px h-4 bg-border mx-1" />
          <span className="text-sm font-mono text-muted-foreground hidden sm:block">Order #PN-2026-07-8743</span>
          <StatusBadge status="printing" />
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:block">Live</span>
            </div>
            <UserMenu auth={auth} />
          </div>
        </div>
      </header>
      <div className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-3">
            {[
              { label: "Batches",   val: String(batches.length) },
              { label: "Parts",     val: String(batches.reduce((s, b) => s + b.files.reduce((ss, f) => ss + f.quantity, 0), 0)) },
              { label: "Material",  val: `${batches.reduce((s, b) => s + calcTotals(b).totalMass, 0)}g` },
              { label: "Print time",val: `${batches.reduce((s, b) => s + calcTotals(b).totalTime, 0).toFixed(1)}h` },
              { label: "Placed",    val: "09:14" },
              { label: "Est. done", val: "16:30" },
              { label: "Delivery",  val: "Jul 27" },
              { label: "Total",     val: fmt(calcOrderSummary(batches).grandTotal) },
            ].map(s => (
              <div key={s.label}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
                <div className="text-sm font-semibold font-mono mt-0.5">{s.val}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Stage progress</span>
              <span className="text-xs font-mono text-primary font-medium">4 / 8 · Printing</span>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                  i < 3 ? "bg-emerald-400" : i === 3 ? "bg-violet-500" : "bg-muted"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-8 items-start">
          <div>
            <h2 className="text-lg font-bold mb-6">Order Timeline</h2>
            <TrackingTimeline batches={batches} printProgress={printProgress} currentLayer={currentLayer} />
          </div>
          <div className="sticky top-20">
            <TrackingSidebar batches={batches} printProgress={printProgress} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Orders List                                             */
/* ─────────────────────────────────────────────────────── */

function OrderCard({ order, onTrack }: { order: MockOrder; onTrack: () => void }) {
  const isActive = order.status !== "delivered";
  return (
    <div className="border border-border rounded-2xl bg-white overflow-hidden hover:border-primary/20 hover:shadow-sm transition-all">
      <div className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0 flex items-center gap-1">
          {order.colors.slice(0, 3).map((hex, i) => (
            <span key={i} className="w-8 h-8 rounded-xl border border-border/50 flex-shrink-0" style={{ backgroundColor: hex }} />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-muted-foreground truncate">{order.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span>{order.date}</span>
            <span className="text-border">·</span>
            <span>{order.batches} batch{order.batches !== 1 ? "es" : ""}</span>
            <span className="text-border">·</span>
            <span>{order.parts} part{order.parts !== 1 ? "s" : ""}</span>
            <span className="text-border">·</span>
            <span>{order.printTime}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-mono font-semibold text-sm">{fmt(order.total)}</p>
          <div className="flex items-center gap-2 mt-2">
            {order.status === "delivered" && (
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted">
                <RotateCcw size={11} />Reorder
              </button>
            )}
            <button onClick={onTrack}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? "bg-primary text-white hover:bg-violet-700" : "bg-muted text-foreground hover:bg-accent"}`}>
              {isActive ? "Track order" : "View details"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersView({ batches, auth, onTrackCurrent, onNewOrder }: {
  batches: Batch[]; auth: AuthCallbacks; onTrackCurrent: () => void; onNewOrder: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");
  const currentOrder  = batches.length > 0 ? buildCurrentOrder(batches) : null;
  const allOrders: MockOrder[] = [
    ...(currentOrder ? [currentOrder] : []),
    ...MOCK_PAST_ORDERS,
  ];
  const filtered  = allOrders.filter(o => {
    if (filter === "active")    return o.status !== "delivered";
    if (filter === "delivered") return o.status === "delivered";
    return true;
  });
  const activeCount = allOrders.filter(o => o.status !== "delivered").length;

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <span className="text-sm font-bold">Print<span className="text-primary">Nest</span></span>
          <div className="w-px h-4 bg-border mx-1" />
          <span className="text-sm font-semibold">My Orders</span>
          {activeCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-primary text-white rounded-full font-mono">{activeCount}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onNewOrder}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-violet-700 transition-colors font-medium">
              <Plus size={14} />New order
            </button>
            <UserMenu auth={auth} />
          </div>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl mb-6 w-fit">
          {([["all", "All"], ["active", "Active"], ["delivered", "Delivered"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
              {key === "active" && activeCount > 0 && (
                <span className="ml-1.5 text-[10px] font-mono bg-primary text-white px-1 py-0.5 rounded-full">{activeCount}</span>
              )}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Package size={24} className="text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold mb-1">No {filter === "all" ? "" : filter} orders yet</p>
            <p className="text-muted-foreground text-sm mb-6">Upload a model to get started.</p>
            <button onClick={onNewOrder} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
              Start a new order
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <OrderCard key={order.id} order={order}
                onTrack={() => { if (order.id === "current") onTrackCurrent(); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Profile                                                 */
/* ─────────────────────────────────────────────────────── */

function ProfileView({ auth, onMyOrders }: { auth: AuthCallbacks; onMyOrders: () => void }) {
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
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const totalOrders = MOCK_PAST_ORDERS.length + 1;
  const totalParts  = MOCK_PAST_ORDERS.reduce((s, o) => s + o.parts, 0) + 3;
  const totalSpent  = MOCK_PAST_ORDERS.reduce((s, o) => s + o.total, 0) + 32.5;

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <span className="text-sm font-bold">Print<span className="text-primary">Nest</span></span>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={onMyOrders}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Package size={14} />My Orders
          </button>
          <ChevronRight size={12} className="text-border" />
          <span className="text-sm font-semibold">Profile</span>
          <div className="ml-auto">
            <UserMenu auth={auth} />
          </div>
        </div>
      </header>
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

export default function App() {
  const [view, setView]         = useState<AppView>("landing");
  const [batches, setBatches]   = useState<Batch[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser]           = useState<UserProfile | null>(null);

  const handleSignIn = (email: string) => {
    setUser({ name: nameFromEmail(email), email });
    setIsLoggedIn(true);
    setView("orders");
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setUser(null);
    setView("landing");
  };

  const auth: AuthCallbacks = {
    isLoggedIn, user,
    onSignIn:   () => setView("signin"),
    onMyOrders: () => setView("orders"),
    onProfile:  () => setView("profile"),
    onSignOut:  handleSignOut,
  };

  const handleFilesSelected = (files: File[]) => {
    setBatches([makeBatch("Batch A", files.map(f => makeFile(f.name, f.size)))]);
    setView("workspace");
  };

  if (view === "signin") return (
    <SignInView onSignIn={handleSignIn} onBack={() => setView("landing")} />
  );
  if (view === "landing") return (
    <LandingView onFilesSelected={handleFilesSelected} auth={auth} onNav={setView} />
  );
  if (view === "how-it-works") return (
    <HowItWorksView onBack={() => setView("landing")} auth={auth} onNav={setView} />
  );
  if (view === "materials") return (
    <MaterialsView onBack={() => setView("landing")} auth={auth} onNav={setView}
      onStartWithMaterial={() => setView("landing")} />
  );
  if (view === "pricing") return (
    <PricingView onBack={() => setView("landing")} auth={auth} onNav={setView}
      onStart={() => setView("landing")} />
  );
  if (view === "workspace") return (
    <WorkspaceView batches={batches} setBatches={setBatches}
      onBack={() => setView("landing")} onCheckout={() => setView("checkout")}
      showQueue={showQueue} setShowQueue={setShowQueue} auth={auth} />
  );
  if (view === "checkout") return (
    <CheckoutView batches={batches} onBack={() => setView("workspace")}
      onPlaceOrder={() => {
        if (!isLoggedIn) { setUser({ name: "Guest", email: "guest@example.com" }); setIsLoggedIn(true); }
        setView("tracking");
      }} auth={auth} />
  );
  if (view === "tracking") return (
    <OrderTrackingView batches={batches} onBack={() => setView(isLoggedIn ? "orders" : "landing")} auth={auth} />
  );
  if (view === "orders") return (
    <OrdersView batches={batches} auth={auth}
      onTrackCurrent={() => setView("tracking")} onNewOrder={() => setView("landing")} />
  );
  if (view === "profile") return (
    <ProfileView auth={auth} onMyOrders={() => setView("orders")} />
  );
  return null;
}
