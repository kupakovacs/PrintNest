import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera } = Icons;
import { StatusBadge, AppNav, InfoNav, UserMenu, ModeToggle, SectionHeader, OptionPill, ColorPicker, OrientationPicker, PriceBreakdown, DeliveryTimeline, Slider, IsometricPart } from "../components/common";
import { WorkspaceView, BatchCard, OrderSummary, ModelViewer, QueuePanel, FileRow, SimpleSettings, AdvancedSettings } from "../components/workspace";

export function StageIcon({ status }: { status: StageStatus }) {
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


export function PrintingBatchCard({ batchName, material, color, fileCount, printProgress, currentLayer, totalLayers, printerName, startTime, remainingMins, status }: {
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


export function TrackingTimeline({ batches, order, printProgress, currentLayer }: {
  batches: Batch[]; order: MockOrder; printProgress: number; currentLayer: number;
}) {
  const totalLayers    = 665;
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["received"]));
  const toggle = (id: string) => { const n = new Set(expanded); n.has(id) ? n.delete(id) : n.add(id); setExpanded(n); };
  const remainingMins  = Math.max(0, Math.round(((100 - printProgress) / 100) * 192));
  const printingBatchId = order.printingBatchId;

  const defaultStages = [
    { id: "received" as const, label: "Order Received", description: "Your order was submitted and is awaiting processing." },
    { id: "file-analysis" as const, label: "File Analysis", description: "Files will be checked for geometry and printability." },
    { id: "waiting" as const, label: "Waiting for Printing", description: "The order will enter the print queue after analysis." },
    { id: "printing" as const, label: "Printing", description: "Your parts will be printed when a machine is assigned." },
    { id: "inspection" as const, label: "Quality Inspection", description: "Printed parts will receive a visual and dimensional check." },
    { id: "packaging" as const, label: "Packaging", description: "Parts will be packed with the selected protection level." },
    { id: "shipped" as const, label: "Shipped", description: "Carrier pickup and tracking details will appear here." },
    { id: "delivered" as const, label: "Delivered", description: "Delivery confirmation will appear here." },
  ];
  const savedStages = new Map((order.timeline ?? []).map(stage => [stage.id, stage]));
  const stages = defaultStages.map(defaultStage => {
    const saved = savedStages.get(defaultStage.id);
    return {
      ...defaultStage,
      status: saved?.status ?? "pending" as StageStatus,
      description: saved?.description ?? defaultStage.description,
      time: saved?.timestamp ? new Date(saved.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : undefined,
    };
  });

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
                {(stage.status !== "pending" || stage.id === "received") && (
                  <ChevronDown size={14} className={`text-muted-foreground ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                )}
              </button>
              <p className={`text-xs mt-0.5 ${stage.status === "pending" ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{stage.description}</p>
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {stage.id === "received" && (
                    <div className="bg-muted/40 rounded-xl p-3 text-xs space-y-1.5">
                      {[
                        `${batches.reduce((s, b) => s + b.files.length, 0)} files selected for this order`,
                        `Order total: ${fmt(calcOrderSummary(batches).grandTotal)}`,
                        `Order ${order.orderNumber} created`,
                      ].map(t => (
                        <div key={t} className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" /><span>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {stage.id === "file-analysis" && stage.status !== "pending" && (
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
                  {stage.id === "waiting" && stage.status !== "pending" && (
                    <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                      <p>Entered queue at position #4 · 09:00</p>
                      <p>Position #3 · 09:22 — Order #213 completed</p>
                      <p>Position #2 · 10:14 — Order #211 completed</p>
                      <p className="text-emerald-600 font-medium">Printing started · 11:42</p>
                    </div>
                  )}
                  {stage.id === "printing" && stage.status !== "pending" && (
                    <div className="space-y-2">
                      {[...batches].sort((a, b) => Number(b.id === printingBatchId) - Number(a.id === printingBatchId)).map((batch, i) => (
                        <PrintingBatchCard key={batch.id}
                          batchName={batch.name} material={batch.material} color={batch.color}
                          fileCount={batch.files.length} printProgress={batch.id === printingBatchId ? order.printProgress ?? printProgress : 0}
                          currentLayer={batch.id === printingBatchId ? order.currentLayer ?? currentLayer : 0} totalLayers={totalLayers}
                          printerName={batch.id === printingBatchId ? "Assigned printer" : "Queued"}
                          startTime={batch.id === printingBatchId ? (order.timeline?.find(item => item.id === "printing")?.timestamp ? new Date(order.timeline.find(item => item.id === "printing")!.timestamp!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not started") : "Not started"}
                          remainingMins={batch.id === printingBatchId ? remainingMins : 0}
                          status={batch.id === printingBatchId ? "printing" : "queued"} />
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


export function TrackingSidebar({ batches, order, printProgress }: { batches: Batch[]; order: MockOrder; printProgress: number }) {
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
            <StatusBadge status={order.status} />
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
              { label: "Order #",    val: order.orderNumber },
              { label: "Placed",     val: order.placedAt ? new Date(order.placedAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "-" },
              { label: "Est. done",  val: order.estimatedCompletion ? new Date(order.estimatedCompletion).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-" },
              { label: "Est. ship",  val: order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString([], { month: "short", day: "numeric" }) : "-" },
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


export function OrderTrackingView({ batches, order: savedOrder, onBack, auth }: {
  batches: Batch[]; order?: MockOrder; onBack: () => void; auth: AuthCallbacks;
}) {
  const fallbackOrder = buildCurrentOrder(batches);
  const order = savedOrder?.timeline?.length
    ? savedOrder
    : { ...fallbackOrder, ...savedOrder, timeline: fallbackOrder.timeline };
  const timeline = order.timeline ?? [];
  const activeStage = timeline.find(stage => stage.status === "active");
  const completedStages = timeline.filter(stage => stage.status === "done").length;
  const stageIds = ["received", "file-analysis", "waiting", "printing", "inspection", "packaging", "shipped", "delivered"];
  const stageStatus = new Map(timeline.map(stage => [stage.id, stage.status]));
  const printProgress = 0;
  const currentLayer = 0;

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <AppNav
        auth={auth}
        onLogoClick={auth.onHome}
        showQuote={false}
        leftContent={<><span className="text-sm font-mono text-muted-foreground hidden sm:block">Order #{order.orderNumber}</span><StatusBadge status={order.status} /></>}
        rightContent={<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:block">Live</span>
            </div>}
      />
      <div className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-3">
            {[
              { label: "Batches",   val: String(batches.length) },
              { label: "Parts",     val: String(batches.reduce((s, b) => s + b.files.reduce((ss, f) => ss + f.quantity, 0), 0)) },
              { label: "Material",  val: `${batches.reduce((s, b) => s + calcTotals(b).totalMass, 0)}g` },
              { label: "Print time",val: `${batches.reduce((s, b) => s + calcTotals(b).totalTime, 0).toFixed(1)}h` },
              { label: "Placed",    val: order.placedAt ? new Date(order.placedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-" },
              { label: "Est. done", val: order.estimatedCompletion ? new Date(order.estimatedCompletion).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-" },
              { label: "Delivery",  val: order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString([], { month: "short", day: "numeric" }) : "-" },
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
              <span className="text-xs font-mono text-primary font-medium">{completedStages + (activeStage ? 1 : 0)} / {stageIds.length} · {activeStage?.label ?? order.status}</span>
            </div>
            <div className="flex gap-0.5">
              {stageIds.map((stageId, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                  stageStatus.get(stageId) === "done" ? "bg-emerald-400" : stageStatus.get(stageId) === "active" ? "bg-violet-500" : "bg-muted"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-8 items-start">
          <div>
            <h2 className="text-lg font-bold mb-6">Order Timeline</h2>
            <TrackingTimeline batches={batches} order={order} printProgress={printProgress} currentLayer={currentLayer} />
          </div>
          <div className="sticky top-20">
            <TrackingSidebar batches={batches} order={order} printProgress={printProgress} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Orders List                                             */
/* ─────────────────────────────────────────────────────── */

