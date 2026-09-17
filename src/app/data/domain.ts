/* ─────────────────────────────────────────────────────── */
/*  Types                                                   */
/* ─────────────────────────────────────────────────────── */

export type Material = "pla" | "petg" | "clear-petg" | "tpu" | "pla-plus" | "asa";
export type Color = "white" | "black" | "red" | "blue" | "green" | "orange" | "gray";
export type Details = "fine" | "standard" | "fast";
export type Strength = "maximum" | "strong" | "standard" | "lightweight";
export type SupportMode = "best-surface" | "standard" | "automatic";
export type DeliverySpeed = "economy" | "standard" | "priority" | "rush";
export type PostProcessing = "none" | "support-removal" | "smoothing";
export type FailedPrint = "no-retry" | "1-retry" | "2-retry" | "unlimited";
export type Protection = "minimal" | "standard" | "fragile" | "extremely-fragile";
export type InfillPattern = "gyroid" | "cubic" | "grid" | "lightning" | "honeycomb";
export type Orientation = "auto" | "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";
export type AppView =
  | "landing" | "workspace" | "checkout" | "tracking"
  | "dashboard" | "orders" | "profile" | "signin"
  | "how-it-works" | "pricing" | "materials" | "admin";
export type OrderStatus = "delivered" | "shipped" | "printing" | "packaging" | "waiting" | "review" | "issue";
export type OrderStageId = "received" | "file-analysis" | "waiting" | "printing" | "inspection" | "packaging" | "shipped" | "delivered";

export interface OrderTimelineEvent {
  id: OrderStageId;
  label: string;
  status: "done" | "active" | "pending";
  timestamp?: string;
  description: string;
}

export interface PrintFile {
  id: string; name: string; size: number; quantity: number;
  orientation: Orientation; note: string; mass: number; time: number; price: number;
  storagePath?: string; downloadURL?: string;
}

export interface Batch {
  id: string; name: string; files: PrintFile[]; expanded: boolean; mode: "simple" | "advanced";
  material: Material; color: Color; details: Details; strength: Strength; support: SupportMode;
  multiColor: boolean; deliverySpeed: DeliverySpeed; failedPrint: FailedPrint;
  protection: Protection; postProcessing: PostProcessing; layerHeight: number;
  adaptiveLayer: boolean; infillDensity: number; infillPattern: InfillPattern;
  wallCount: number; supportPlacement: "build-plate" | "everywhere"; supportInterface: boolean;
}

export interface UserProfile { name: string; email: string; }

export interface AuthCallbacks {
  isLoggedIn: boolean; user: UserProfile | null;
  onSignIn: () => void; onHome: () => void; onDashboard: () => void; onMyOrders: () => void; onProfile: () => void; onSignOut: () => void;
  onUpdateProfile?: (profile: UserProfile) => Promise<void>;
}

export interface MockOrder {
  id: string; orderNumber: string; date: string; status: OrderStatus;
  batches: number; parts: number; total: number; description: string;
  colors: string[]; printTime: string;
  files?: { name: string; storagePath?: string; downloadURL?: string }[];
  timeline?: OrderTimelineEvent[];
  placedAt?: string;
  estimatedCompletion?: string;
  estimatedDelivery?: string;
}

export interface QueueItem {
  id: string;
  ownerId: string;
  orderNumber: string;
  status: "printing" | "waiting" | "review";
  position: number;
  eta?: string;
  batches: number;
  parts: number;
}

/* ─────────────────────────────────────────────────────── */
/*  Constants                                               */
/* ─────────────────────────────────────────────────────── */

export const COLOR_OPTIONS: { id: Color; label: string; hex: string }[] = [
  { id: "white", label: "White", hex: "#EDEDEC" },
  { id: "black", label: "Black", hex: "#1C1C1E" },
  { id: "red", label: "Red", hex: "#E5383B" },
  { id: "blue", label: "Blue", hex: "#2563EB" },
  { id: "green", label: "Green", hex: "#16A34A" },
  { id: "orange", label: "Orange", hex: "#EA580C" },
  { id: "gray", label: "Gray", hex: "#9CA3AF" },
];

export const MATERIAL_OPTIONS: { id: Material; label: string; sub: string; priceTier: number }[] = [
  { id: "pla",        label: "Easy & Affordable", sub: "PLA",        priceTier: 1 },
  { id: "petg",       label: "Weather Resistant",  sub: "PETG",       priceTier: 2 },
  { id: "clear-petg", label: "Transparent",        sub: "Clear PETG", priceTier: 2 },
  { id: "tpu",        label: "Flexible",           sub: "TPU",        priceTier: 3 },
  { id: "pla-plus",   label: "PLA+",               sub: "PLA+",       priceTier: 2 },
  { id: "asa",        label: "UV Resistant",       sub: "ASA",        priceTier: 3 },
];

export const DETAILS_OPTIONS: { id: Details; label: string; sub: string; priceDelta: string }[] = [
  { id: "fine",     label: "Fine Detail",  sub: "0.1mm layers", priceDelta: "+40%" },
  { id: "standard", label: "Standard",     sub: "0.2mm layers", priceDelta: "" },
  { id: "fast",     label: "Fast Print",   sub: "0.3mm layers", priceDelta: "−15%" },
];

export const STRENGTH_OPTIONS: { id: Strength; label: string; sub: string; priceDelta: string }[] = [
  { id: "maximum",    label: "Maximum Strength", sub: "80% infill", priceDelta: "+30%" },
  { id: "strong",     label: "Strong",           sub: "40% infill", priceDelta: "+15%" },
  { id: "standard",   label: "Standard",         sub: "15% infill", priceDelta: "" },
  { id: "lightweight",label: "Lightweight",      sub: "5% infill",  priceDelta: "−10%" },
];

export const SUPPORT_OPTIONS: { id: SupportMode; label: string; sub: string }[] = [
  { id: "best-surface", label: "Best Surface Finish", sub: "No contact marks" },
  { id: "standard",     label: "Standard Supports",   sub: "Balanced approach" },
  { id: "automatic",    label: "Automatic",           sub: "Recommended" },
];

export const INFILL_PATTERNS: InfillPattern[] = ["gyroid", "cubic", "grid", "lightning", "honeycomb"];

export const DELIVERY_OPTIONS: { id: DeliverySpeed; label: string; days: string; price: string; priceDelta: number }[] = [
  { id: "economy",  label: "Economy",  days: "7–10 days", price: "Free", priceDelta: 0  },
  { id: "standard", label: "Standard", days: "3–5 days",  price: "+€4",  priceDelta: 4  },
  { id: "priority", label: "Priority", days: "1–2 days",  price: "+€12", priceDelta: 12 },
  { id: "rush",     label: "Rush",     days: "Next day",  price: "+€24", priceDelta: 24 },
];

export const QUEUE = [
  { id: 214, status: "printing" as const, label: "Order #214", time: "~2h remaining" },
  { id: 215, status: "waiting"  as const, label: "Order #215", time: "Starts ~14:30" },
  { id: 216, status: "review"   as const, label: "Order #216", time: "Pending review" },
];

export const MOCK_PAST_ORDERS: MockOrder[] = [
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

export function makeBatch(name: string, files: PrintFile[]): Batch {
  return {
    id: `b-${Math.random().toString(36).slice(2)}`, name, files, expanded: true, mode: "simple",
    material: "pla", color: "black", details: "standard", strength: "standard", support: "automatic",
    multiColor: false, deliverySpeed: "standard", failedPrint: "1-retry", protection: "standard",
    postProcessing: "none", layerHeight: 0.2, adaptiveLayer: false, infillDensity: 15,
    infillPattern: "gyroid", wallCount: 3, supportPlacement: "build-plate", supportInterface: true,
  };
}

export function makeFile(name: string, size: number): PrintFile {
  const seed = name.length * 7 + size;
  return {
    id: `f-${Math.random().toString(36).slice(2)}`, name, size, quantity: 1, orientation: "auto", note: "",
    mass: 8 + (seed % 60), time: +((0.5 + (seed % 50) / 10).toFixed(1)),
    price: +((2.4 + (seed % 120) / 10).toFixed(2)),
  };
}

export function calcTotals(batch: Batch) {
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

export function fmt(n: number) { return `€${n.toFixed(2)}`; }
export function priceTierDots(tier: number) { return "€".repeat(tier) + "·".repeat(3 - tier); }

export function calcOrderSummary(batches: Batch[]) {
  const allTotals    = batches.map(calcTotals);
  const subtotal     = +allTotals.reduce((s, t) => s + t.total, 0).toFixed(2);
  const deliveryDelta = DELIVERY_OPTIONS.find(d => d.id === batches[0]?.deliverySpeed)?.priceDelta ?? 4;
  const totalMass    = allTotals.reduce((s, t) => s + t.totalMass, 0);
  const totalTime    = allTotals.reduce((s, t) => s + t.totalTime, 0);
  const totalParts   = batches.reduce((s, b) => s + b.files.reduce((ss, f) => ss + f.quantity, 0), 0);
  const grandTotal   = +(subtotal + deliveryDelta).toFixed(2);
  return { subtotal, deliveryDelta, totalMass, totalTime, totalParts, grandTotal };
}

export function buildCurrentOrder(batches: Batch[]): MockOrder {
  const { totalParts, totalTime, grandTotal } = calcOrderSummary(batches);
  const allFiles = batches.flatMap(b => b.files);
  const colors   = [...new Set(batches.map(b => COLOR_OPTIONS.find(c => c.id === b.color)?.hex ?? "#1C1C1E"))];
  const desc     = allFiles.slice(0, 2).map(f => f.name).join(", ") + (allFiles.length > 2 ? ` + ${allFiles.length - 2} more` : "");
  const placedAt = new Date().toISOString();
  const orderNumber = `PN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    id: "current", orderNumber, date: new Date().toLocaleDateString(),
    status: "waiting", batches: batches.length, parts: totalParts, total: grandTotal,
    description: desc || "No files", colors, printTime: `${totalTime.toFixed(1)}h`,
    placedAt,
    estimatedCompletion: new Date(Date.now() + totalTime * 60 * 60 * 1000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    files: allFiles.map(file => ({
      name: file.name,
      ...(file.storagePath ? { storagePath: file.storagePath } : {}),
      ...(file.downloadURL ? { downloadURL: file.downloadURL } : {}),
    })),
    timeline: [
      { id: "received", label: "Order Received", status: "active", timestamp: placedAt, description: `${totalParts} part${totalParts !== 1 ? "s" : ""} submitted and awaiting processing.` },
    ],
  };
}

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "User";
  return local.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function initials(name: string) {
  return name.split(" ").slice(0, 2).map(n => n[0]?.toUpperCase()).join("");
}

/* ─────────────────────────────────────────────────────── */
/*  Status Badge                                            */
/* ─────────────────────────────────────────────────────── */

export const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  printing:  { label: "Printing",   bg: "bg-violet-100",  text: "text-violet-700",  dot: "bg-violet-500"  },
  shipped:   { label: "Shipped",    bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500"    },
  delivered: { label: "Delivered",  bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  packaging: { label: "Packaging",  bg: "bg-purple-100",  text: "text-purple-700",  dot: "bg-purple-500"  },
  waiting:   { label: "Waiting",    bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-400"   },
  review:    { label: "In Review",  bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400"    },
  issue:     { label: "Issue",      bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500"     },
};


/*export const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  printing: { label: "Printing", bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  shipped: { label: "Shipped", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  delivered: { label: "Delivered", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  packaging: { label: "Packaging", bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  waiting: { label: "Waiting", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-400" },
  review: { label: "In Review", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  issue: { label: "Issue", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};*/
