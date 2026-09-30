import { useEffect, useState } from "react";
import { Material, MATERIAL_OPTIONS, COLOR_OPTIONS, type AuthCallbacks, type Batch, type MockOrder, type OrderStageId } from "../data/domain";
import { firebaseAuth, deleteAdminData, loadAdminData, loadAdminOrders, loadAllQueue, saveAdminData, updateAdminOrderFields, updateOrderTimeline, updateQueuePosition } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck,
  ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight,
  Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock,
  RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame,
  Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight,
  Sparkles, BarChart3, Camera,
  AlertOctagon, AlertTriangle, Search, RefreshCw, TrendingUp,
  LayoutDashboard, ListOrdered, FlaskConical, Settings2, ChevronLeft
} from "lucide-react";

type AdminOrderStatus =
  | "waiting" | "slicing" | "printing" | "paused"
  | "inspection" | "issue" | "packaging" | "shipped" | "delivered";

type AdminTab = "dashboard" | "orders" | "queue" | "printers" | "filament" | "settings";

interface AdminNote { id: string; text: string; author: string; ts: string; }

interface AdminFile {
  name: string; sizeMb: number; mass: number; time: number; url: string;
  analysis: "passed" | "warning" | "failed";
  warning?: string;
}

interface AdminBatch {
  id: string; label: string; material: string; color: string; colorHex: string;
  details: string; strength: string; files: AdminFile[];
  postProcessing: string; protection: string;
}
function fmt(n: number) { return `€${n.toFixed(2)}`; }
interface AdminOrder {
  id: string; number: string;
  customer: string; email: string; phone: string; address: string;
  date: string; time: string; placed: number; /* ms timestamp for sorting */
  batches: AdminBatch[];
  deliverySpeed: string; total: number;
  status: AdminOrderStatus;
  priority: number; /* 1 = highest */
  assignedPrinter: string | null;
  notes: AdminNote[];
  activity: { status: AdminOrderStatus; ts: string; actor: string }[];
  failPolicy: string;
}

interface AdminPrinter {
  id: string; name: string; model: string;
  status: "printing" | "idle" | "paused" | "error" | "maintenance";
  job: string | null; jobId: string | null;
  progress: number; layer: number; totalLayers: number;
  eta: string | null; material: string; colorHex: string;
  nozzleTemp: number; bedTemp: number; chamberTemp: number;
  fanSpeed: number; printSpeed: number;
  totalPrints: number; successRate: number;
  lastMaintenance: string;
}

interface FilamentSpool {
  id: string; material: string; matId: Material; color: string; colorHex: string;
  remaining: number; total: number; brand: string; expires: string;
}

/* ── Admin constants ─────────────────────────────────── */

const A_STATUS: Record<AdminOrderStatus, { label: string; dot: string; bg: string; text: string }> = {
  waiting:    { label: "Waiting",     dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700"   },
  slicing:    { label: "Slicing",     dot: "bg-sky-400",     bg: "bg-sky-50",     text: "text-sky-700"     },
  printing:   { label: "Printing",    dot: "bg-violet-500",  bg: "bg-violet-50",  text: "text-violet-700"  },
  paused:     { label: "Paused",      dot: "bg-orange-400",  bg: "bg-orange-50",  text: "text-orange-700"  },
  inspection: { label: "Inspection",  dot: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-700"    },
  issue:      { label: "Issue",       dot: "bg-red-500",     bg: "bg-red-50",     text: "text-red-700"     },
  packaging:  { label: "Packaging",   dot: "bg-purple-400",  bg: "bg-purple-50",  text: "text-purple-700"  },
  shipped:    { label: "Shipped",     dot: "bg-indigo-400",  bg: "bg-indigo-50",  text: "text-indigo-700"  },
  delivered:  { label: "Delivered",   dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
};

/* ── Admin helpers ───────────────────────────────────── */

function AStatusBadge({ status, pulse }: { status: AdminOrderStatus; pulse?: boolean }) {
  const c = A_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${pulse && status === "printing" ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
}

function AStatusSelect({ value, onChange }: { value: AdminOrderStatus; onChange: (s: AdminOrderStatus) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as AdminOrderStatus)}
      className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer font-medium">
      {(Object.keys(A_STATUS) as AdminOrderStatus[]).map(s => (
        <option key={s} value={s}>{A_STATUS[s].label}</option>
      ))}
    </select>
  );
}

function fmtMass(g: number) { return g >= 1000 ? `${(g / 1000).toFixed(2)}kg` : `${g}g`; }
function totalFiles(o: AdminOrder) { return o.batches.reduce((s, b) => s + b.files.length, 0); }
function totalMassOrder(o: AdminOrder) { return o.batches.reduce((s, b) => b.files.reduce((ss, f) => ss + f.mass, 0) + s, 0); }
function totalTimeOrder(o: AdminOrder) { return o.batches.reduce((s, b) => b.files.reduce((ss, f) => ss + f.time, 0) + s, 0); }

/* ── Order detail panel ──────────────────────────────── */

function OrderDetailPanel({ order, onClose, onStatusChange, onAddNote, printers }: {
  order: AdminOrder;
  onClose: () => void;
  onStatusChange: (id: string, s: AdminOrderStatus) => void;
  onAddNote: (id: string, text: string) => void;
  printers: AdminPrinter[];
}) {
  const [noteText, setNoteText] = useState("");

  const submitNote = () => {
    if (!noteText.trim()) return;
    onAddNote(order.id, noteText.trim());
    setNoteText("");
  };

  const hasIssue = order.batches.some(b => b.files.some(f => f.analysis === "failed"));
  const hasWarning = order.batches.some(b => b.files.some(f => f.analysis === "warning"));
  const assignedPrinter = printers.find(p => p.id === order.assignedPrinter);

  return (
    <motion.div
      initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-[480px] bg-[#F9F9FC] border-l border-border shadow-2xl flex flex-col z-40 overflow-hidden"
      style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-border px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-bold">{order.number}</span>
            <AStatusBadge status={order.status} pulse />
          </div>
          <p className="text-sm font-semibold">{order.customer}</p>
          <p className="text-xs text-muted-foreground">{order.email} · {order.phone}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "none" }}>

        {/* Alerts */}
        {hasIssue && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
            <AlertOctagon size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Print issue detected</p>
              {order.batches.flatMap(b => b.files.filter(f => f.analysis === "failed")).map(f => (
                <p key={f.name}>{f.name}: {f.warning}</p>
              ))}
            </div>
          </div>
        )}
        {!hasIssue && hasWarning && (
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">File warnings</p>
              {order.batches.flatMap(b => b.files.filter(f => f.analysis === "warning")).map(f => (
                <p key={f.name}>{f.name}: {f.warning}</p>
              ))}
            </div>
          </div>
        )}

        {/* Status + actions row */}
        <div className="bg-white border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Status &amp; actions</p>
          <div className="flex items-center gap-2 flex-wrap">
            <AStatusSelect value={order.status} onChange={s => onStatusChange(order.id, s)} />
            {order.status === "issue" && (
              <button onClick={() => onStatusChange(order.id, "waiting")}
                className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors font-medium">
                Re-queue for reprint
              </button>
            )}
            {(order.status === "printing" || order.status === "paused") && (
              <button onClick={() => onStatusChange(order.id, order.status === "paused" ? "printing" : "paused")}
                className="text-xs px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors font-medium">
                {order.status === "paused" ? "Resume print" : "Pause print"}
              </button>
            )}
            {order.status === "inspection" && (
              <button onClick={() => onStatusChange(order.id, "packaging")}
                className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium">
                Approve &amp; package
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Delivery</span>
              <p className="font-medium mt-0.5">{order.deliverySpeed}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Priority</span>
              <p className="font-medium mt-0.5">#{order.priority}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Fail policy</span>
              <p className="font-medium mt-0.5">{order.failPolicy}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned printer</span>
              <p className="font-medium mt-0.5">{assignedPrinter?.name ?? "Unassigned"}</p>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="bg-white border border-border rounded-2xl p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Customer</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><User size={12} className="text-muted-foreground" />{order.customer}</div>
            <div className="flex items-center gap-2"><Mail size={12} className="text-muted-foreground" />{order.email}</div>
            <div className="flex items-center gap-2"><Phone size={12} className="text-muted-foreground" />{order.phone}</div>
            <div className="flex items-start gap-2"><MapPin size={12} className="text-muted-foreground flex-shrink-0 mt-0.5" />{order.address}</div>
          </div>
          <button className="mt-3 text-xs text-primary hover:underline">Send email to customer →</button>
        </div>

        {/* Batches & files */}
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground px-4 py-3 border-b border-border/50">
            Batches &amp; files
          </p>
          <div className="divide-y divide-border/50">
            {order.batches.map(batch => (
              <div key={batch.id} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full border border-border/50 flex-shrink-0" style={{ backgroundColor: batch.colorHex }} />
                  <span className="text-sm font-semibold">{batch.label}</span>
                  <span className="text-xs text-muted-foreground">{batch.color} {batch.material}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span>Detail: <span className="text-foreground">{batch.details}</span></span>
                  <span>Strength: <span className="text-foreground">{batch.strength}</span></span>
                  <span>Post: <span className="text-foreground">{batch.postProcessing}</span></span>
                  <span>Pack: <span className="text-foreground">{batch.protection}</span></span>
                </div>
                <div className="space-y-1.5">
                  {batch.files.map(f => (
                    <div key={f.name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                      f.analysis === "failed" ? "bg-red-50 border border-red-100"
                        : f.analysis === "warning" ? "bg-amber-50 border border-amber-100"
                          : "bg-muted/40"}`}>
                      {f.analysis === "failed"  ? <AlertOctagon size={11} className="text-red-500 flex-shrink-0" />
                        : f.analysis === "warning" ? <AlertTriangle size={11} className="text-amber-500 flex-shrink-0" />
                          : <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />}
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 font-medium truncate" >{f.name}</a>
                      <span className="text-muted-foreground">{f.mass}g</span>
                      <span className="text-muted-foreground">{f.time}h</span>
                      <span className="text-muted-foreground">{f.sizeMb}MB</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white border border-border rounded-2xl p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Order summary</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Files",     val: String(totalFiles(order))             },
              { label: "Material",  val: fmtMass(totalMassOrder(order))        },
              { label: "Print time",val: `${totalTimeOrder(order).toFixed(1)}h`},
            ].map(s => (
              <div key={s.label} className="bg-muted/40 rounded-xl p-2 text-center">
                <p className="font-mono font-semibold text-sm">{s.val}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-semibold text-sm pt-2 border-t border-border/50">
            <span>Total</span>
            <span className="font-mono text-primary">{fmt(order.total)}</span>
          </div>
        </div>

        {/* Activity */}
        <div className="bg-white border border-border rounded-2xl p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Activity log</p>
          <div className="space-y-0">
            {order.activity.map((a, i) => {
              const c = A_STATUS[a.status];
              const isLast = i === order.activity.length - 1;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${c.dot}`} />
                    {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[14px]" />}
                  </div>
                  <div className="pb-3">
                    <span className="text-xs font-medium">{c.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{a.ts} · {a.actor}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-border rounded-2xl p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Internal notes</p>
          {order.notes.length === 0 && (
            <p className="text-xs text-muted-foreground mb-3">No notes yet.</p>
          )}
          <div className="space-y-2 mb-3">
            {order.notes.map(n => (
              <div key={n.id} className="bg-muted/40 rounded-xl px-3 py-2">
                <p className="text-xs">{n.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{n.author} · {n.ts}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={noteText} onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitNote()}
              placeholder="Add a note…"
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={submitNote}
              className="text-xs px-3 py-2 bg-primary text-white rounded-xl hover:bg-violet-700 transition-colors font-medium">
              Add
            </button>
          </div>
        </div>

        {/* Danger */}
        <div className="bg-white border border-red-100 rounded-2xl p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-red-400 mb-3">Danger zone</p>
          <div className="flex gap-2 flex-wrap">
            <button className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
              Cancel order
            </button>
            <button className="text-xs px-3 py-1.5 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
              Issue refund
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
function ATab_Dashboard({ orders, printers, onTabChange }: {
  orders: AdminOrder[];
  printers: AdminPrinter[];
  onTabChange: (t: AdminTab) => void;
}) {
  const today      = orders.filter(o => o.date === "Today");
  const todayRev   = today.reduce((s, o) => s + o.total, 0);
  const issues     = orders.filter(o => o.status === "issue").length;
  const active     = orders.filter(o => !["delivered", "shipped"].includes(o.status)).length;
  const printing   = printers.filter(p => p.status === "printing").length;

  const kpis = [
    { label: "Revenue today",    val: fmt(todayRev),            sub: `${today.length} orders`,            icon: TrendingUp,   color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Active jobs",      val: String(active),           sub: "in pipeline",                        icon: RefreshCw,    color: "text-blue-600",   bg: "bg-blue-50"   },
    { label: "Printers busy",    val: `${printing} / ${printers.length}`, sub: "currently printing",       icon: Printer,      color: "text-emerald-600",bg: "bg-emerald-50"},
    { label: "Open issues",      val: String(issues),           sub: issues ? "need attention" : "all clear", icon: AlertOctagon, color: issues ? "text-red-600" : "text-emerald-600", bg: issues ? "bg-red-50" : "bg-emerald-50" },
  ];

  const spark = [124, 98, 210, 185, 164, 230, Math.round(todayRev)];
  const sparkMax = Math.max(...spark);
  const days  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];

  return (
    <div className="space-y-5">
      {/* Issue banner */}
      {issues > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          <AlertOctagon size={15} className="flex-shrink-0" />
          <span><strong>{issues} order{issues > 1 ? "s" : ""}</strong> have print issues and need attention.</span>
          <button onClick={() => onTabChange("orders")}
            className="ml-auto text-xs font-semibold border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap">
            Review →
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white border border-border rounded-2xl p-5">
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon size={16} className={k.color} />
            </div>
            <p className="text-2xl font-bold font-mono">{k.val}</p>
            <p className="text-sm font-medium mt-0.5">{k.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-4">
        {/* Revenue bar chart */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-semibold text-sm">Revenue — last 7 days</p>
              <p className="text-xs text-muted-foreground mt-0.5">{fmt(spark.reduce((a, b) => a + b, 0))} total</p>
            </div>
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg font-medium">+12% vs prev. week</span>
          </div>
          <div className="flex items-end gap-2 h-28 mt-2">
            {spark.map((v, i) => {
              const isToday = i === spark.length - 1;
              const pct = (v / sparkMax) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full rounded-t-lg relative" style={{ height: `${Math.max(pct, 4)}%`, background: isToday ? "rgb(139,92,246)" : "rgb(237,233,254)" }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono pointer-events-none">
                      {fmt(v)}
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{days[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline summary */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="font-semibold text-sm mb-4">Pipeline</p>
          <div className="space-y-2">
            {(["waiting", "slicing", "printing", "inspection", "packaging", "shipped"] as AdminOrderStatus[]).map(s => {
              const count = orders.filter(o => o.status === s).length;
              const c = A_STATUS[s];
              return (
                <div key={s} className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                  <span className="text-sm flex-1">{c.label}</span>
                  <span className="text-sm font-mono font-semibold">{count}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.dot}`} style={{ width: `${(count / orders.length) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => onTabChange("queue")}
            className="mt-4 text-xs text-primary hover:underline w-full text-center block">
            Manage queue →
          </button>
        </div>
      </div>

      {/* Printer fleet */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
          <p className="font-semibold text-sm">Printer fleet</p>
          <button onClick={() => onTabChange("printers")} className="text-xs text-primary hover:underline">View all →</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {printers.map(p => (
            <div key={p.id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  p.status === "printing" ? "bg-emerald-500 animate-pulse"
                    : p.status === "paused" ? "bg-orange-400"
                      : p.status === "error" ? "bg-red-500"
                        : p.status === "maintenance" ? "bg-amber-400"
                          : "bg-gray-300"}`} />
                <span className="font-semibold text-sm">{p.name}</span>
              </div>
              <p className={`text-xs capitalize font-medium ${
                p.status === "printing" ? "text-emerald-600" : p.status === "maintenance" ? "text-amber-600" : p.status === "error" ? "text-red-600" : "text-muted-foreground"}`}>
                {p.status}
              </p>
              {p.status === "printing" && (
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-violet-400 rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{p.progress.toFixed(0)}% · {p.eta}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
          <p className="font-semibold text-sm">Recent orders</p>
          <button onClick={() => onTabChange("orders")} className="text-xs text-primary hover:underline">All orders →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-xs font-medium text-muted-foreground">
                <th className="text-left px-4 py-2.5">Order</th>
                <th className="text-left px-4 py-2.5">Customer</th>
                <th className="text-left px-4 py-2.5">Files</th>
                <th className="text-left px-4 py-2.5">Total</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 7).map(o => (
                <tr key={o.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{o.number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{o.customer}</p>
                    <p className="text-xs text-muted-foreground">{o.date} · {o.time}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{totalFiles(o)} file{totalFiles(o) !== 1 ? "s" : ""} · {fmtMass(totalMassOrder(o))}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{fmt(o.total)}</td>
                  <td className="px-4 py-3"><AStatusBadge status={o.status} pulse /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Orders tab ──────────────────────────────────────── */

function ATab_Orders({ orders, onUpdateOrder, onSelectOrder, selectedId, printers }: {
  orders: AdminOrder[];
  onUpdateOrder: (o: AdminOrder) => void;
  onSelectOrder: (id: string | null) => void;
  selectedId: string | null;
  printers: AdminPrinter[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatus | "all">("all");

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = o.number.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const issueCount = orders.filter(o => o.status === "issue").length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order, customer, email…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AdminOrderStatus | "all")}
          className="text-sm border border-border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All statuses ({orders.length})</option>
          {(Object.keys(A_STATUS) as AdminOrderStatus[]).map(s => (
            <option key={s} value={s}>{A_STATUS[s].label} ({orders.filter(o => o.status === s).length})</option>
          ))}
        </select>
      </div>

      {issueCount > 0 && statusFilter === "all" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertOctagon size={14} className="flex-shrink-0" />
          <span><strong>{issueCount} order{issueCount > 1 ? "s" : ""}</strong> flagged with print issues.</span>
          <button onClick={() => setStatusFilter("issue")} className="ml-auto text-xs font-semibold underline">
            Filter to issues
          </button>
        </div>
      )}

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20 text-xs font-medium text-muted-foreground">
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Batches / Files</th>
                <th className="text-left px-4 py-3">Print time</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Delivery</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">No orders match your search.</td></tr>
              ) : filtered.map(o => {
                const fileCount = totalFiles(o);
                const hasAny = o.batches.some(b => b.files.some(f => f.analysis !== "passed"));
                return (
                  <tr key={o.id}
                    onClick={() => onSelectOrder(o.id === selectedId ? null : o.id)}
                    className={`border-b border-border/30 last:border-0 cursor-pointer transition-colors ${o.id === selectedId ? "bg-violet-50/70" : "hover:bg-muted/20"}`}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold">{o.number}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{o.date} · {o.time}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium whitespace-nowrap">{o.customer}</p>
                      <p className="text-xs text-muted-foreground">{o.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <p>{o.batches.length} batch{o.batches.length !== 1 ? "es" : ""}</p>
                      <p className="flex items-center gap-1">
                        {fileCount} file{fileCount !== 1 ? "s" : ""}
                        {hasAny && <AlertTriangle size={10} className="text-amber-500" />}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{totalTimeOrder(o).toFixed(1)}h</td>
                    <td className="px-4 py-3 font-mono font-semibold">{fmt(o.total)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{o.deliverySpeed}</td>
                    <td className="px-4 py-3"><AStatusBadge status={o.status} pulse /></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <AStatusSelect value={o.status} onChange={s => onUpdateOrder({ ...o, status: s })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10">
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {orders.length} orders · Click a row to open detail panel</p>
        </div>
      </div>
    </div>
  );
}

/* ── Queue tab ───────────────────────────────────────── */

function ATab_Queue({ orders, onUpdateOrder, onReorder, printers }: {
  orders: AdminOrder[];
  onUpdateOrder: (o: AdminOrder) => void;
  onReorder: (orderId: string, targetPosition: number) => Promise<void>;
  printers: AdminPrinter[];
}) {
  const queued = [...orders]
    .filter(o => ["waiting", "slicing", "printing", "paused"].includes(o.status))
    .sort((a, b) => a.priority - b.priority);

  const move = async (id: string, dir: -1 | 1) => {
    const idx = queued.findIndex(o => o.id === id);
    const target = queued[idx + dir];
    if (!target) return;
    await onReorder(id, target.priority);
    onUpdateOrder({ ...queued[idx], priority: target.priority });
    onUpdateOrder({ ...target, priority: queued[idx].priority });
  };

  const assignPrinter = (orderId: string, printerId: string | null) => {
    const o = orders.find(x => x.id === orderId);
    if (o) onUpdateOrder({ ...o, assignedPrinter: printerId });
  };

  const idlePrinters = printers.filter(p => p.status === "idle");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{queued.length} jobs in queue — drag to reprioritize or assign a printer</p>
        {idlePrinters.length > 0 && (
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg font-medium">
            {idlePrinters.length} printer{idlePrinters.length > 1 ? "s" : ""} available
          </span>
        )}
      </div>

      {queued.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <p className="text-muted-foreground text-sm">No jobs in queue.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queued.map((o, idx) => {
            const c = A_STATUS[o.status];
            const assignedP = printers.find(p => p.id === o.assignedPrinter);
            const fileCount = totalFiles(o);
            return (
              <div key={o.id} className={`bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all ${o.status === "issue" ? "border-red-200" : o.status === "printing" ? "border-violet-200" : "border-border"}`}>
                {/* Priority controls */}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => void move(o.id, -1)} disabled={idx === 0}
                    className="w-6 h-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-25 transition-colors">
                    <ChevronUp size={12} />
                  </button>
                  <span className="text-xs font-mono font-bold text-muted-foreground w-4 text-center">#{o.priority}</span>
                  <button onClick={() => void move(o.id, 1)} disabled={idx === queued.length - 1}
                    className="w-6 h-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-25 transition-colors">
                    <ChevronDown size={12} />
                  </button>
                </div>

                {/* Status dot */}
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot} ${o.status === "printing" ? "animate-pulse" : ""}`} />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-sm font-bold">{o.number}</span>
                    <AStatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-foreground/80">{o.customer}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.batches.length} batch{o.batches.length !== 1 ? "es" : ""} · {fileCount} file{fileCount !== 1 ? "s" : ""} · {totalTimeOrder(o).toFixed(1)}h · {fmtMass(totalMassOrder(o))}
                  </p>
                </div>

                {/* Material swatches */}
                <div className="flex gap-1 flex-shrink-0">
                  {o.batches.map(b => (
                    <span key={b.id} title={`${b.color} ${b.material}`}
                      className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: b.colorHex }} />
                  ))}
                </div>

                {/* Delivery */}
                <span className="text-xs text-muted-foreground hidden lg:block flex-shrink-0 w-16 text-right">{o.deliverySpeed}</span>

                {/* Printer assign */}
                <select value={o.assignedPrinter ?? ""}
                  onChange={e => assignPrinter(o.id, e.target.value || null)}
                  className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-ring flex-shrink-0 cursor-pointer">
                  <option value="">Unassigned</option>
                  {printers.filter(p => p.status === "idle" || p.id === o.assignedPrinter).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  {o.assignedPrinter && !printers.some(p => p.status === "idle" && p.id !== o.assignedPrinter) && (() => {
                    const assigned = printers.find(p => p.id === o.assignedPrinter);
                    
                    return assigned && assigned.status !== "idle"
                      ? <option value={assigned.id}>{assigned.name} ({assigned.status})</option>
                      : null;
                  })()}
                </select>

                {/* Total */}
                <span className="font-mono font-semibold text-sm flex-shrink-0">{fmt(o.total)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed today */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Completed / shipped today</p>
        </div>
        <div className="divide-y divide-border/40">
          {orders.filter(o => ["shipped", "delivered"].includes(o.status)).map(o => (
            <div key={o.id} className="flex items-center gap-4 px-4 py-2.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${A_STATUS[o.status].dot}`} />
              <span className="font-mono text-xs text-muted-foreground">{o.number}</span>
              <span className="text-sm flex-1">{o.customer}</span>
              <AStatusBadge status={o.status} />
              <span className="font-mono text-sm">{fmt(o.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Printers tab ────────────────────────────────────── */

function ATab_Printers({ printers, onUpdate, onAdd, onRemove }: { printers: AdminPrinter[]; onUpdate: (id: string, patch: Partial<AdminPrinter>) => Promise<void>; onAdd: () => Promise<void>; onRemove: (id: string) => Promise<void> }) {

  const summary = [
    { label: "Printing",    count: printers.filter(p => p.status === "printing").length,    color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Idle",        count: printers.filter(p => p.status === "idle").length,        color: "text-gray-500",    bg: "bg-gray-50"    },
    { label: "Paused",      count: printers.filter(p => p.status === "paused").length,      color: "text-orange-600",  bg: "bg-orange-50"  },
    { label: "Maintenance", count: printers.filter(p => p.status === "maintenance").length, color: "text-amber-600",   bg: "bg-amber-50"   },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map(s => (
          <div key={s.label} className="bg-white border border-border rounded-2xl p-4 text-center">
            <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {printers.map(p => {
          const isPrinting = p.status === "printing";
          const isPaused   = p.status === "paused";
          const statusDot  = isPrinting ? "bg-emerald-500 animate-pulse" : isPaused ? "bg-orange-400" : p.status === "error" ? "bg-red-500" : p.status === "maintenance" ? "bg-amber-400" : "bg-gray-300";
          return (
            <div key={p.id} className={`bg-white border rounded-2xl overflow-hidden ${isPrinting ? "border-emerald-200" : isPaused ? "border-orange-200" : p.status === "error" ? "border-red-200" : "border-border"}`}>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
                <div className="flex-1">
                  <input value={p.name} onChange={event => void onUpdate(p.id, { name: event.target.value })} className="w-full font-bold bg-transparent border-b border-transparent focus:border-primary focus:outline-none" />
                  <input value={p.model} onChange={event => void onUpdate(p.id, { model: event.target.value })} className="w-full text-xs text-muted-foreground bg-transparent border-b border-transparent focus:border-primary focus:outline-none" />
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${
                  isPrinting ? "bg-emerald-50 text-emerald-700"
                    : isPaused ? "bg-orange-50 text-orange-700"
                      : p.status === "error" ? "bg-red-50 text-red-700"
                        : p.status === "maintenance" ? "bg-amber-50 text-amber-700"
                          : "bg-gray-50 text-gray-600"}`}>{p.status}</span>
              </div>

              <div className="px-5 py-4 space-y-4">
                {(isPrinting || isPaused) ? (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current job</p>
                      <p className="text-sm font-medium">{p.job}</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Layer {p.layer} / {p.totalLayers}</span>
                        <span className="font-mono font-bold text-primary">{p.progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div className={`h-full rounded-full ${isPaused ? "bg-orange-400" : "bg-gradient-to-r from-violet-500 to-violet-400"}`}
                          style={{ width: `${p.progress}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">ETA: {p.eta}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <label className="text-xs text-muted-foreground">Progress %<input type="number" min="0" max="100" step="0.1" value={p.progress} onChange={event => void onUpdate(p.id, { progress: Number(event.target.value) })} className="mt-1 w-full px-2 py-1.5 rounded-lg border border-border font-mono text-foreground" /></label>
                        <label className="text-xs text-muted-foreground">Current layer<input type="number" min="0" value={p.layer} onChange={event => void onUpdate(p.id, { layer: Number(event.target.value) })} className="mt-1 w-full px-2 py-1.5 rounded-lg border border-border font-mono text-foreground" /></label>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Nozzle",  val: p.nozzleTemp > 0 ? `${p.nozzleTemp}°C` : "—"  },
                        { label: "Bed",     val: p.bedTemp > 0    ? `${p.bedTemp}°C`    : "—"  },
                        { label: "Chamber", val: `${p.chamberTemp}°C`                           },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/40 rounded-xl p-2 text-center">
                          <p className="font-mono text-sm font-semibold">{s.val}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Fan speed",    val: `${p.fanSpeed}%`    },
                        { label: "Print speed",  val: `${p.printSpeed}mm/s`},
                      ].map(s => (
                        <div key={s.label} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="font-mono font-medium">{s.val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: p.colorHex }} />
                      {p.material}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => void onUpdate(p.id, { status: isPaused ? "printing" : "paused" })}
                        className={`flex-1 text-xs py-2 rounded-xl border font-medium transition-colors ${isPaused ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-orange-200 text-orange-700 hover:bg-orange-50"}`}>
                        {isPaused ? "Resume" : "Pause"}
                      </button>
                      <button onClick={() => void onUpdate(p.id, { status: "idle", job: null, jobId: null })} className="flex-1 text-xs py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium">
                        Cancel print
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: "Total prints",   val: String(p.totalPrints)          },
                        { label: "Success rate",   val: `${p.successRate}%`            },
                        { label: "Chamber",        val: `${p.chamberTemp}°C`           },
                        { label: "Last service",   val: p.lastMaintenance              },
                      ].map(s => (
                        <div key={s.label}>
                          <p className="text-muted-foreground">{s.label}</p>
                          <p className="font-medium mt-0.5">{s.val}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {p.status === "maintenance"
                        ? "Scheduled maintenance. Est. return: tomorrow 08:00."
                        : "Ready — waiting for next queued job."}
                    </p>
                    <div className="flex gap-2">
                      {p.status === "idle" && (
                        <button onClick={() => void onUpdate(p.id, { status: "maintenance" })}
                          className="text-xs px-3 py-1.5 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors font-medium">
                          Set to maintenance
                        </button>
                      )}
                      {p.status === "maintenance" && (
                        <button onClick={() => void onUpdate(p.id, { status: "idle" })}
                          className="text-xs px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors font-medium">
                          Mark as ready
                        </button>
                      )}
                      <button onClick={() => void onRemove(p.id)} className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Remove</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => void onAdd()} className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-white hover:border-primary/30">+ Add printer</button>
    </div>
  );
}

/* ── Filament tab ────────────────────────────────────── */

function ATab_Filament({ spools, onAdd, onSave, onRemove }: { spools: FilamentSpool[]; onAdd: () => Promise<void>; onSave: (spool: FilamentSpool) => Promise<void>; onRemove: (id: string) => Promise<void> }) {
  const [search, setSearch] = useState("");
  const lowSpools = spools.filter(s => (s.remaining / s.total) < 0.20);
  const filtered  = spools.filter(s =>
    s.material.toLowerCase().includes(search.toLowerCase()) ||
    s.color.toLowerCase().includes(search.toLowerCase()) ||
    s.brand.toLowerCase().includes(search.toLowerCase())
  );

  const byMat = MATERIAL_OPTIONS.map(m => {
    const matSpools = spools.filter(s => s.matId === m.id);
    const totalG    = matSpools.reduce((s, x) => s + x.remaining, 0);
    const lowCount  = matSpools.filter(x => (x.remaining / x.total) < 0.20).length;
    return { ...m, totalG, lowCount, spoolCount: matSpools.length };
  });

  return (
    <div className="space-y-4">
      {lowSpools.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl text-sm text-amber-700">
          <AlertOctagon size={15} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Low stock alert</p>
            <p className="text-xs mt-0.5">{lowSpools.map(s => `${s.material} ${s.color}`).join(", ")} — below 20%</p>
          </div>
          <button className="ml-auto text-xs border border-amber-200 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors font-medium whitespace-nowrap">
            Reorder all
          </button>
        </div>
      )}

      {/* Material overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {byMat.map(m => {
          const pct = m.totalG > 0 ? Math.min(100, (m.totalG / (m.spoolCount * 1000)) * 100) : 0;
          return (
            <div key={m.id} className={`bg-white border rounded-2xl p-4 ${m.lowCount > 0 ? "border-amber-200" : "border-border"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">{m.sub}</p>
                {m.lowCount > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{m.lowCount} low</span>}
              </div>
              <p className="text-xl font-mono font-bold">{fmtMass(m.totalG)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.spoolCount} spool{m.spoolCount !== 1 ? "s" : ""}</p>
              <div className="h-1 rounded-full bg-muted mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${m.lowCount > 0 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Spool table */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search material, colour, brand…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={() => void onAdd()} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-medium">+ Add spool</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-xs font-medium text-muted-foreground">
                <th className="text-left px-4 py-2.5">Material</th>
                <th className="text-left px-4 py-2.5">Colour</th>
                <th className="text-left px-4 py-2.5">Remaining</th>
                <th className="text-left px-4 py-2.5 min-w-[140px]">Stock</th>
                <th className="text-left px-4 py-2.5">Brand</th>
                <th className="text-left px-4 py-2.5">Expires</th>
                <th className="text-left px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const pct = (s.remaining / s.total) * 100;
                const isLow = pct < 20;
                const isMid = pct < 50;
                const barColor = isLow ? "bg-red-400" : isMid ? "bg-amber-400" : "bg-emerald-400";
                return (
                  <tr key={s.id} className={`border-b border-border/30 last:border-0 transition-colors ${isLow ? "hover:bg-red-50/40" : "hover:bg-muted/20"}`}>
                    <td className="px-4 py-3 font-medium"><input value={s.material} onChange={event => void onSave({ ...s, material: event.target.value })} className="w-20 px-1.5 py-1 rounded border border-border" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0" style={{ backgroundColor: s.colorHex }} />
                        <input value={s.color} onChange={event => void onSave({ ...s, color: event.target.value })} className="w-20 px-1.5 py-1 rounded border border-border" />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      <input type="number" min="0" max={s.total} value={s.remaining} onChange={event => void onSave({ ...s, remaining: Number(event.target.value) })} className={`w-20 px-1.5 py-1 rounded border border-border ${isLow ? "text-red-600 font-bold" : ""}`} />
                      <span className="text-muted-foreground"> / <input type="number" min="1" value={s.total} onChange={event => void onSave({ ...s, total: Number(event.target.value) })} className="w-16 px-1.5 py-1 rounded border border-border" />g</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-mono w-9 text-right ${isLow ? "text-red-600 font-bold" : "text-muted-foreground"}`}>{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground"><input value={s.brand} onChange={event => void onSave({ ...s, brand: event.target.value })} className="w-24 px-1.5 py-1 rounded border border-border" /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono"><input value={s.expires} onChange={event => void onSave({ ...s, expires: event.target.value })} className="w-24 px-1.5 py-1 rounded border border-border" /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => void onRemove(s.id)} className="text-xs text-red-700 border border-red-200 bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors font-medium whitespace-nowrap">Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10">
          <p className="text-xs text-muted-foreground">{filtered.length} of {spools.length} spools · {lowSpools.length} below 20% threshold</p>
        </div>
      </div>
    </div>
  );
}

/* ── Settings tab ────────────────────────────────────── */

type AdminSettings = { materialPerG: number; machinePerH: number; packagingFlat: number; standard: number; priority: number; rush: number };

function ATab_Settings({ values, onSave }: { values: AdminSettings; onSave: (values: AdminSettings) => Promise<void> }) {
  const [pricing, setPricing] = useState({ materialPerG: values.materialPerG, machinePerH: values.machinePerH, packagingFlat: values.packagingFlat });
  const [delivery, setDelivery] = useState({ standard: values.standard, priority: values.priority, rush: values.rush });
  const [savedP, setSavedP] = useState(false);
  const [savedD, setSavedD] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Pricing */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <p className="font-semibold text-sm">Pricing configuration</p>
            <p className="text-xs text-muted-foreground mt-0.5">Base rates used in all quote calculations</p>
          </div>
          <button onClick={() => { void onSave({ ...values, ...pricing, ...delivery }).then(() => { setSavedP(true); setTimeout(() => setSavedP(false), 2000); }); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${savedP ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-primary text-white hover:bg-violet-700"}`}>
            {savedP ? "Saved ✓" : "Save"}
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {[
            { label: "Material cost",    sub: "Per gram of filament (before material multiplier)", key: "materialPerG" as const, unit: "€/g" },
            { label: "Machine time",     sub: "Per hour of print time (before detail/strength multipliers)", key: "machinePerH" as const, unit: "€/h" },
            { label: "Packaging (flat)", sub: "Added once per batch", key: "packagingFlat" as const, unit: "€" },
          ].map(f => (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.sub}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{f.unit}</span>
                  <input type="number" step="0.01" value={pricing[f.key]}
                    onChange={e => setPricing(p => ({ ...p, [f.key]: +e.target.value }))}
                    className="w-20 text-right text-sm font-mono border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div>
            <p className="font-semibold text-sm">Delivery surcharges</p>
            <p className="text-xs text-muted-foreground mt-0.5">Added on top of order subtotal</p>
          </div>
          <button onClick={() => { void onSave({ ...values, ...pricing, ...delivery }).then(() => { setSavedD(true); setTimeout(() => setSavedD(false), 2000); }); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${savedD ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-primary text-white hover:bg-violet-700"}`}>
            {savedD ? "Saved ✓" : "Save"}
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { label: "Economy",  sub: "7–10 days",  key: null,        val: "Free" },
            { label: "Standard", sub: "3–5 days",   key: "standard" as const },
            { label: "Priority", sub: "1–2 days",   key: "priority" as const },
            { label: "Rush",     sub: "Next day",   key: "rush"     as const },
          ].map(f => (
            <div key={f.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.sub}</p>
              </div>
              {f.key ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">€</span>
                  <input type="number" step="1" value={delivery[f.key]}
                    onChange={e => setDelivery(d => ({ ...d, [f.key!]: +e.target.value }))}
                    className="w-16 text-right text-sm font-mono border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ) : (
                <span className="text-sm font-mono font-medium text-emerald-600">Free</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Material multipliers (read-only display) */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <p className="font-semibold text-sm">Material multipliers</p>
          <p className="text-xs text-muted-foreground mt-0.5">Applied to material cost</p>
        </div>
        <div className="px-5 py-3 space-y-2">
          {[
            { mat: "PLA",        mult: "×1.00" },
            { mat: "PLA+",       mult: "×1.10" },
            { mat: "PETG",       mult: "×1.15" },
            { mat: "Clear PETG", mult: "×1.20" },
            { mat: "ASA",        mult: "×1.25" },
            { mat: "TPU",        mult: "×1.30" },
          ].map(r => (
            <div key={r.mat} className="flex justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
              <span className="text-muted-foreground">{r.mat}</span>
              <span className="font-mono font-medium">{r.mult}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-muted/20 border-t border-border/40">
          <p className="text-xs text-muted-foreground">Multipliers are coded — contact your developer to adjust.</p>
        </div>
      </div>
    </div>
  );
}


function toAdminStatus(order: MockOrder): AdminOrderStatus {
  if (order.status === "printing") return "printing";
  if (order.status === "review") return "inspection";
  if (order.status === "packaging") return "packaging";
  if (order.status === "shipped") return "shipped";
  if (order.status === "delivered") return "delivered";
  if (order.status === "issue") return "issue";
  return "waiting";
}

function toAdminOrder(order: MockOrder, index: number): AdminOrder {
  const settings = order.settings ?? [];
  return {
    id: order.id,
    number: order.orderNumber,
    customer: order.ownerName || "Unknown customer",
    email: order.ownerEmail || "",
    phone: "",
    address: "",
    date: order.date,
    time: order.placedAt ? new Date(order.placedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    placed: order.placedAt ? Date.parse(order.placedAt) : Date.now(),
    batches: settings.map(batch => ({
      id: batch.id,
      label: batch.name,
      material: MATERIAL_OPTIONS.find(option => option.id === batch.material)?.sub ?? batch.material,
      color: batch.color,
      colorHex: COLOR_OPTIONS.find(option => option.id === batch.color)?.hex ?? "#9CA3AF",
      details: batch.details,
      strength: batch.strength,
      postProcessing: batch.postProcessing,
      protection: batch.protection,
      files: batch.files.map(file => ({ name: file.name, url: file.url, sizeMb: +(file.size / 1024 / 1024).toFixed(2), mass: file.mass, time: file.time, analysis: "passed" as const })),
    })),
    deliverySpeed: settings[0]?.deliverySpeed ?? "standard",
    total: order.total,
    status: toAdminStatus(order),
    priority: index + 1,
    assignedPrinter: null,
    notes: [],
    activity: (order.timeline ?? []).filter(stage => stage.timestamp).map(stage => ({ status: toAdminStatus(order), ts: new Date(stage.timestamp!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), actor: "System" })),
    failPolicy: settings[0]?.failedPrint ?? "1-retry",
  };
}

function stageForAdminStatus(status: AdminOrderStatus): OrderStageId {
  if (status === "slicing") return "file-analysis";
  if (status === "printing" || status === "paused") return "printing";
  if (status === "inspection" || status === "issue") return "inspection";
  if (status === "packaging") return "packaging";
  if (status === "shipped") return "shipped";
  if (status === "delivered") return "delivered";
  return "waiting";
}

export function NewAdminView({ auth, onBack }: { auth: AuthCallbacks; onBack: () => void }) {
  const [tab, setTab]             = useState<AdminTab>("dashboard");
  const [orders, setOrders]       = useState<AdminOrder[]>([]);
  const [sourceOrders, setSourceOrders] = useState<MockOrder[]>([]);
  const [queueItems, setQueueItems] = useState<{ id: string; orderId?: string; orderNumber: string; position: number }[]>([]);
  const [printers, setPrinters]   = useState<AdminPrinter[]>([]);
  const [spools, setSpools]       = useState<FilamentSpool[]>([]);
  const [settings, setSettings]   = useState({ materialPerG: 0.028, machinePerH: 2.10, packagingFlat: 1.00, standard: 4, priority: 12, rush: 24 });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    void Promise.all([
      loadAdminOrders(), loadAllQueue(),
      loadAdminData<AdminPrinter>(userId, "printers"),
      loadAdminData<FilamentSpool>(userId, "filaments"),
      loadAdminData<typeof settings>(userId, "settings"),
    ]).then(([nextOrders, nextQueue, nextPrinters, nextSpools, nextSettings]) => {
      setSourceOrders(nextOrders);
      setQueueItems(nextQueue);
      setPrinters(nextPrinters.length ? nextPrinters : []);
      setSpools(nextSpools);
      if (nextSettings[0]) setSettings(current => ({ ...current, ...nextSettings[0] }));
      const positions = new Map(nextQueue.map(item => [item.orderId ?? item.orderNumber, item.position]));
      setOrders(nextOrders.map((order, index) => ({ ...toAdminOrder(order, index), priority: positions.get(order.id) ?? positions.get(order.orderNumber) ?? index + 1 })));
    });
  }, []);

  const updatePrinter = async (id: string, patch: Partial<AdminPrinter>) => {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    const updated = printers.map(printer => printer.id === id ? { ...printer, ...patch } : printer);
    setPrinters(updated);
    await saveAdminData(userId, "printers", id, updated.find(printer => printer.id === id) as unknown as Record<string, unknown>);
  };

  const addPrinter = async () => {
    const printer: AdminPrinter = { id: `printer-${crypto.randomUUID()}`, name: `Printer ${printers.length + 1}`, model: "Bambu Lab X1C", status: "idle", job: null, jobId: null, progress: 0, layer: 0, totalLayers: 0, eta: null, material: "—", colorHex: "#E5E5E5", nozzleTemp: 0, bedTemp: 0, chamberTemp: 0, fanSpeed: 0, printSpeed: 0, totalPrints: 0, successRate: 100, lastMaintenance: new Date().toLocaleDateString() };
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    await saveAdminData(userId, "printers", printer.id, printer as unknown as Record<string, unknown>);
    setPrinters(current => [...current, printer]);
  };

  const removePrinter = async (id: string) => {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    await deleteAdminData(userId, "printers", id);
    setPrinters(current => current.filter(printer => printer.id !== id));
  };

  const saveSettings = async (nextSettings: typeof settings) => {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    await saveAdminData(userId, "settings", "pricing", nextSettings as unknown as Record<string, unknown>);
    setSettings(nextSettings);
  };

  const saveSpool = async (spool: FilamentSpool) => {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    await saveAdminData(userId, "filaments", spool.id, spool as unknown as Record<string, unknown>);
    setSpools(current => current.some(item => item.id === spool.id) ? current.map(item => item.id === spool.id ? spool : item) : [...current, spool]);
  };

  const addSpool = async () => saveSpool({ id: `spool-${crypto.randomUUID()}`, matId: "pla", material: "PLA", color: "Black", colorHex: "#1C1C1E", remaining: 1000, total: 1000, brand: "", expires: "" });

  const removeSpool = async (id: string) => {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    await deleteAdminData(userId, "filaments", id);
    setSpools(current => current.filter(spool => spool.id !== id));
  };

  const handleStatusChange = async (id: string, status: AdminOrderStatus) => {
    const source = sourceOrders.find(order => order.id === id);
    if (source) {
      const updated = await updateOrderTimeline(source, stageForAdminStatus(status), status === "printing" ? source.printingBatchId ?? source.settings?.[0]?.id : undefined);
      setSourceOrders(prev => prev.map(order => order.id === id ? updated : order));
    }
    setOrders(prev => prev.map(o => o.id !== id ? o : {
      ...o, status,
      activity: [...o.activity, { status, ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), actor: "Admin" }],
    }));
  };

  const updateOrder = (updated: AdminOrder) => {
    const previous = orders.find(order => order.id === updated.id);
    setOrders(prev => prev.map(order => order.id === updated.id ? updated : order));
    if (previous?.status !== updated.status) void handleStatusChange(updated.id, updated.status);
    if (previous?.assignedPrinter !== updated.assignedPrinter) void updateAdminOrderFields(updated.id, { assignedPrinter: updated.assignedPrinter });
  };

  const handleReorder = async (orderId: string, targetPosition: number) => {
    const item = queueItems.find(queueItem => queueItem.orderId === orderId);
    if (!item) return;
    await updateQueuePosition(item.id, targetPosition);
    const nextQueue = await loadAllQueue();
    setQueueItems(nextQueue);
    const positions = new Map(nextQueue.map(queueItem => [queueItem.orderId ?? queueItem.orderNumber, queueItem.position]));
    setOrders(current => current.map(order => ({ ...order, priority: positions.get(order.id) ?? positions.get(order.number) ?? order.priority })));
  };

  const handleAddNote = (id: string, text: string) => {
    const note = {
      id: `n-${Date.now()}`, text, author: "Admin",
      ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
    const order = orders.find(item => item.id === id);
    if (order) void updateAdminOrderFields(id, { notes: [...order.notes, note] });
    setOrders(prev => prev.map(o => o.id !== id ? o : {
      ...o, notes: [...o.notes, {
        ...note,
      }],
    }));
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId) ?? null;

  const navItems: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard",  icon: LayoutDashboard },
    { id: "orders",    label: "Orders",     icon: ListOrdered     },
    { id: "queue",     label: "Queue",      icon: Layers          },
    { id: "printers",  label: "Printers",   icon: Printer         },
    { id: "filament",  label: "Filament",   icon: FlaskConical    },
    { id: "settings",  label: "Settings",   icon: Settings2       },
  ];

  const issueCount = orders.filter(o => o.status === "issue").length;
  const activeCount = orders.filter(o => !["delivered", "shipped"].includes(o.status)).length;
  const printing = printers.filter(p => p.status === "printing").length;

  const titles: Record<AdminTab, string> = {
    dashboard: "Dashboard", orders: "Orders", queue: "Print queue",
    printers: "Printer fleet", filament: "Filament inventory", settings: "Settings",
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-border flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-border">
          <div className="text-base font-bold tracking-tight mb-0.5">
            Print<span className="text-primary">Nest</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Admin</span>
        </div>

        {/* Quick stats strip */}
        <div className="flex border-b border-border divide-x divide-border">
          {[
            { val: activeCount, label: "active",   color: "text-violet-600" },
            { val: printing,    label: "printing",  color: "text-emerald-600" },
            { val: issueCount,  label: "issues",    color: issueCount > 0 ? "text-red-600" : "text-muted-foreground" },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center py-2">
              <p className={`text-base font-bold font-mono leading-none ${s.color}`}>{s.val}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setTab(item.id); if (item.id !== "orders") setSelectedOrderId(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${tab === item.id ? "bg-primary/10 text-primary" : "text-foreground/60 hover:bg-muted hover:text-foreground"}`}>
              <item.icon size={15} />
              {item.label}
              {item.id === "orders" && issueCount > 0 && (
                <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-mono">{issueCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <button onClick={onBack}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted">
            <ChevronLeft size={13} />Back to site
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-border px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-base font-bold">{titles[tab]}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {printers.some(p => p.status === "printing") && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {printing} printing
              </div>
            )}
            <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">A</div>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto p-6 ${selectedOrder && tab === "orders" ? "mr-[480px]" : ""} transition-all`}>
          {tab === "dashboard" && <ATab_Dashboard orders={orders} printers={printers} onTabChange={setTab} />}
          {tab === "orders"    && (
            <ATab_Orders orders={orders} onUpdateOrder={updateOrder}
              onSelectOrder={setSelectedOrderId} selectedId={selectedOrderId} printers={printers} />
          )}
          {tab === "queue"     && <ATab_Queue orders={orders} onUpdateOrder={updateOrder} onReorder={handleReorder} printers={printers} />}
          {tab === "printers"  && <ATab_Printers printers={printers} onUpdate={updatePrinter} onAdd={addPrinter} onRemove={removePrinter} />}
          {tab === "filament"  && <ATab_Filament spools={spools} onAdd={addSpool} onSave={saveSpool} onRemove={removeSpool} />}
          {tab === "settings"  && <ATab_Settings values={settings} onSave={saveSettings} />}
        </main>
      </div>

      {/* Order detail slide-over */}
      <AnimatePresence>
        {selectedOrder && tab === "orders" && (
          <OrderDetailPanel
            order={selectedOrder}
            onClose={() => setSelectedOrderId(null)}
            onStatusChange={handleStatusChange}
            onAddNote={handleAddNote}
            printers={printers} />
        )}
      </AnimatePresence>
    </div>
  );
}
