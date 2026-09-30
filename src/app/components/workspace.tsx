import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, QueueItem, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials, makeBatch, makeFile 
} from "../data/domain";


const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera } = Icons;
import { AppNav } from "./common";

import { IsometricPart, OrientationPicker, ModeToggle, SectionHeader, PriceBreakdown, DeliveryTimeline, ColorPicker, OptionPill, Slider} from "./common";
import { StlModel } from "../data/stlThumbnailGenerator";

export function ModelViewer({ batches }: { batches: Batch[] }) {
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
          <StlModel url={fileInputRef.current?.src ?? ""} />
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


export function SimpleSettings({ batch, onChange }: { batch: Batch; onChange: (b: Batch) => void }) {
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


export function AdvancedSettings({ batch, onChange }: { batch: Batch; onChange: (b: Batch) => void }) {
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


export function FileRow({ file, onChange, onRemove }: {
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


export function BatchCard({ batch, onChange, onRemove, onAddFile }: {
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


export function OrderSummary({ batches, onCheckout }: { batches: Batch[]; onCheckout: () => void }) {
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


export function QueuePanel({ queue, onClose, onSelect }: { queue: QueueItem[]; onClose: () => void; onSelect?: (orderNumber: string) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
        {queue.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">The global queue is empty.</p>}
        {queue.map(item => {
          const cfg = statusConfig[item.status];
          return (
            <button key={item.id} onClick={() => { setSelectedId(item.id); onSelect?.(item.orderNumber); }} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-colors ${selectedId === item.id ? "bg-secondary ring-1 ring-primary/20" : "bg-muted/40 hover:bg-muted"}`}>
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color} ring-2 ${cfg.ring}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.orderNumber}</p>
                <p className="text-xs text-muted-foreground">Position #{item.position} · {item.parts} part{item.parts !== 1 ? "s" : ""}</p>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                item.status === "printing" ? "bg-emerald-50 text-emerald-700"
                  : item.status === "waiting" ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"}`}>{cfg.label}</span>
            </button>
          );
        })}
      </div>
      <div className="px-4 py-4 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">{selectedId ? `Selected ${queue.find(item => item.id === selectedId)?.orderNumber ?? "order"}` : "Global queue"}</p>
        <p className="text-sm font-semibold text-center mt-0.5">{selectedId ? `Position #${queue.find(item => item.id === selectedId)?.position}` : `${queue.length} active order${queue.length !== 1 ? "s" : ""}`}</p>
      </div>
    </motion.div>
  );
}


export function WorkspaceView({ batches, setBatches, onBack, onCheckout, showQueue, setShowQueue, queue, onQueueOrder, auth }: {
  batches: Batch[]; setBatches: (b: Batch[]) => void;
  onBack: () => void; onCheckout: () => void;
  showQueue: boolean; setShowQueue: (v: boolean) => void; queue: QueueItem[]; onQueueOrder: (orderNumber: string) => void;
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
      <AppNav
        auth={auth}
        onLogoClick={onBack}
        showQuote={false}
        containerClassName="w-full"
        leftContent={<div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {batches.flatMap(b => b.files).slice(0, 3).map(f => (
            <span key={f.id} className="text-xs bg-muted px-2 py-0.5 rounded-md font-mono text-muted-foreground truncate max-w-[120px]">{f.name}</span>
          ))}
          <label className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors ml-1 flex-shrink-0">
            <Plus size={12} /><span>Add file</span>
            <input ref={fileInputRef} type="file" accept=".stl,.obj,.3mf" multiple className="hidden" onChange={handleFileInput} />
          </label>
        </div>}
        rightContent={<button onClick={() => setShowQueue(!showQueue)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
            showQueue ? "bg-secondary border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Queue
        </button>}
      />
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
        {showQueue && <QueuePanel queue={queue} onClose={() => setShowQueue(false)} onSelect={onQueueOrder} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Landing                                                 */
/* ─────────────────────────────────────────────────────── */

