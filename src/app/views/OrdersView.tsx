import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import {
  Material, Color, Details, Strength, SupportMode, DeliverySpeed, PostProcessing, FailedPrint, Protection, InfillPattern, Orientation, AppView, OrderStatus, PrintFile, Batch, UserProfile, AuthCallbacks, MockOrder, COLOR_OPTIONS, MATERIAL_OPTIONS, DETAILS_OPTIONS, STRENGTH_OPTIONS, SUPPORT_OPTIONS, INFILL_PATTERNS, DELIVERY_OPTIONS, QUEUE, MOCK_PAST_ORDERS, calcTotals, fmt, priceTierDots, calcOrderSummary, buildCurrentOrder, nameFromEmail, initials
} from "../data/domain";
import type { QueueItem } from "../data/domain";
import { QueuePanel } from "../components/workspace";
const { Upload, ChevronDown, ChevronUp, Plus, X, Package, Clock, Truck, ArrowLeft, Check, Layers, FileText, Zap, Shield, ChevronRight, Box, Bell, Eye, CheckCircle, Phone, User, LogOut, Mail, Lock, RotateCcw, MapPin, Printer, Droplets, Sun, Wind, Flame, Thermometer, Ruler, Weight, Cpu, Star, Info, ArrowRight, Sparkles, BarChart3, Camera, LayoutDashboard } = Icons;
import { StatusBadge, AppNav, InfoNav, UserMenu, ModeToggle, SectionHeader, OptionPill, ColorPicker, OrientationPicker, PriceBreakdown, DeliveryTimeline, Slider, IsometricPart } from "../components/common";

export function OrderCard({ order, onTrack }: { order: MockOrder; onTrack: () => void }) {
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


export function OrdersView({ batches, orders: savedOrders, queue, onQueueOrder, auth, onTrackCurrent, onNewOrder }: {
  batches: Batch[]; orders: MockOrder[]; queue: QueueItem[]; onQueueOrder: (orderNumber: string) => void; auth: AuthCallbacks; onTrackCurrent: () => void; onNewOrder: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "delivered">("all");
  const [showQueue, setShowQueue] = useState(false);
  const currentOrder  = batches.length > 0 ? buildCurrentOrder(batches) : null;
  const allOrders: MockOrder[] = [
    ...(currentOrder ? [currentOrder] : []),
    ...savedOrders,
  ];
  const filtered  = allOrders.filter(o => {
    if (filter === "active")    return o.status !== "delivered";
    if (filter === "delivered") return o.status === "delivered";
    return true;
  });
  const activeCount = allOrders.filter(o => o.status !== "delivered").length;

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <AppNav
        auth={auth}
        onLogoClick={auth.onHome}
        showQuote={false}
        containerClassName="max-w-6xl mx-auto"
        leftContent={<><button onClick={auth.onDashboard}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <LayoutDashboard size={14} />Dashboard
        </button><ChevronRight size={12} className="text-border" /><span className="text-sm font-semibold">My Orders</span>{activeCount > 0 && <span className="text-xs px-1.5 py-0.5 bg-primary text-white rounded-full font-mono">{activeCount}</span>}</>}
        rightContent={<div className="flex items-center gap-2"><button onClick={() => setShowQueue(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors font-medium">
          <Clock size={14} />Queue
        </button><button onClick={onNewOrder}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-violet-700 transition-colors font-medium">
          <Plus size={14} />New order
        </button></div>}
      />
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {showQueue && <QueuePanel queue={queue} onClose={() => setShowQueue(false)} onSelect={onQueueOrder} />}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">Account activity</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">My Orders</h1>
            <p className="text-sm text-muted-foreground mt-2">Track active prints and revisit everything you have ordered.</p>
          </div>
          <button onClick={onNewOrder}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-primary text-white hover:bg-violet-700 transition-colors font-medium w-fit">
            <Plus size={14} />New order
          </button>
        </section>
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
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Profile                                                 */
/* ─────────────────────────────────────────────────────── */

