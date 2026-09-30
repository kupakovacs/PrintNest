import { useEffect, useState } from "react";
import { RefreshCw, Trash2, ShieldCheck, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { AppNav } from "../components/common";
import { loadAdminOrders, loadAllQueue, removeQueueItem, updateOrderTimeline, updateQueuePosition, updateQueueStatus } from "../firebase";
import type { AuthCallbacks, MockOrder, OrderStageId, QueueItem } from "../data/domain";
import { ORDER_STAGES } from "../data/domain";

const statuses: QueueItem["status"][] = ["waiting", "printing", "review"];

export function AdminView({ auth, onBack }: { auth: AuthCallbacks; onBack: () => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try { const [nextQueue, nextOrders] = await Promise.all([loadAllQueue(), loadAdminOrders()]); setQueue(nextQueue); setOrders(nextOrders); setMessage(null); }
    catch { setMessage("Could not load the global queue."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const changeStatus = async (item: QueueItem, status: QueueItem["status"]) => {
    try { await updateQueueStatus(item, status); setQueue(items => items.map(current => current.id === item.id ? { ...current, status } : current)); setOrders(items => items.map(order => order.id === item.orderId ? { ...order, status } : order)); }
    catch { setMessage("Status update failed. Check your admin permissions."); }
  };

  const changePosition = async (item: QueueItem, value: string) => {
    const position = Number(value);
    if (!Number.isInteger(position) || position < 1) return;
    try { await updateQueuePosition(item.id, position); await refresh(); }
    catch { setMessage("Position update failed. Check your admin permissions."); }
  };

  const changeTimeline = async (order: MockOrder, stageId: OrderStageId, printingBatchId?: string) => {
    try {
      const updated = await updateOrderTimeline(order, stageId, printingBatchId);
      setOrders(items => items.map(current => current.id === updated.id ? updated : current));
      setQueue(items => items.map(item => item.orderId === updated.id ? { ...item, status: updated.status === "printing" ? "printing" : updated.status === "review" ? "review" : "waiting" } : item));
      setMessage(null);
    } catch { setMessage("Timeline update failed. Check your admin permissions."); }
  };

  const remove = async (item: QueueItem) => {
    try { await removeQueueItem(item.id); setQueue(items => items.filter(current => current.id !== item.id).map((current, index) => ({ ...current, position: index + 1 }))); }
    catch { setMessage("Removal failed. Check your admin permissions."); }
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <AppNav auth={auth} onLogoClick={onBack} showQuote={false}
        leftContent={<div className="flex items-center gap-2"><button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /></button><span className="text-sm font-semibold">Admin Dashboard</span></div>}
        rightContent={<button onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh</button>} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div><p className="text-xs uppercase tracking-widest text-primary font-medium mb-2">Operations</p><h1 className="text-2xl font-semibold">Global print queue</h1><p className="text-sm text-muted-foreground mt-1">Manage order status and queue membership.</p></div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck size={16} className="text-emerald-600" />Admin access</div>
        </div>
        {message && <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{message}</p>}
        <div className="border border-border rounded-2xl bg-white overflow-hidden">
          <div className="grid grid-cols-[1.4fr,1fr,110px,140px,48px] gap-4 px-5 py-3 border-b border-border text-xs uppercase tracking-widest text-muted-foreground"><span>Order</span><span>Owner</span><span>Position</span><span>Status</span><span /></div>
          {queue.length === 0 && <p className="px-5 py-12 text-center text-sm text-muted-foreground">No orders in the global queue.</p>}
          {queue.map(item => {
            const order = orders.find(candidate => candidate.id === item.orderId || candidate.orderNumber === item.orderNumber);
            const expanded = expandedId === item.id;
            return <div key={item.id} className="border-b border-border/60 last:border-0">
              <div className="grid grid-cols-[1.4fr,1fr,110px,140px,48px] gap-4 items-center px-5 py-4">
                <button onClick={() => setExpandedId(expanded ? null : item.id)} className="text-left"><p className="font-mono text-sm font-semibold">{item.orderNumber}</p><p className="text-xs text-muted-foreground">{item.parts} parts · {item.batches} batch{item.batches !== 1 ? "es" : ""}</p></button>
                <div><p className="text-xs truncate">{order?.ownerName || "Unknown owner"}</p><p className="font-mono text-[10px] text-muted-foreground truncate">{order?.ownerEmail || item.ownerId}</p></div>
                <input aria-label={`Position for ${item.orderNumber}`} type="number" min="1" value={item.position} onChange={event => void changePosition(item, event.target.value)} className="w-20 px-2 py-2 rounded-lg border border-border font-mono text-sm" />
                <select value={item.status} onChange={event => void changeStatus(item, event.target.value as QueueItem["status"])} className="px-2.5 py-2 rounded-lg border border-border bg-white text-sm"><option value="waiting">Waiting</option><option value="printing">Printing</option><option value="review">Review</option></select>
                <div className="flex items-center"><button onClick={() => setExpandedId(expanded ? null : item.id)} title="Show order details" className="p-2 text-muted-foreground hover:bg-muted rounded-lg">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button><button onClick={() => void remove(item)} title="Remove from queue" className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button></div>
              </div>
              {expanded && <AdminOrderDetails order={order} onTimelineChange={changeTimeline} />}
            </div>;
          })}
        </div>
      </main>
    </div>
  );
}

function AdminOrderDetails({ order, onTimelineChange }: { order?: MockOrder; onTimelineChange: (order: MockOrder, stageId: OrderStageId, printingBatchId?: string) => void }) {
  if (!order) return <div className="px-5 pb-4 text-xs text-amber-700">Order details are unavailable for this legacy queue item.</div>;
  return <div className="mx-5 mb-4 grid gap-4 rounded-xl bg-muted/40 p-4 text-xs md:grid-cols-2">
    <div><p className="font-semibold text-sm mb-2">Files</p>{order.files?.length ? order.files.map(file => <p key={file.name} className="flex justify-between gap-3 py-1"><span className="truncate">{file.name}</span><a className="text-primary hover:underline" href={file.downloadURL} target="_blank" rel="noreferrer">Open</a></p>) : <p className="text-muted-foreground">No file metadata saved.</p>}</div>
    <div><p className="font-semibold text-sm mb-2">Timeline progress</p><select value={order.timeline?.find(stage => stage.status === "active")?.id ?? "received"} onChange={event => { const stageId = event.target.value as OrderStageId; void onTimelineChange(order, stageId, stageId === "printing" ? order.printingBatchId ?? order.settings?.[0]?.id : undefined); }} className="w-full px-2.5 py-2 rounded-lg border border-border bg-white text-sm mb-3">{ORDER_STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select>{order.timeline?.some(stage => stage.status === "active" && stage.id === "printing") && order.settings?.length ? <><p className="font-semibold text-sm mb-2">Batch being printed</p><select value={order.printingBatchId ?? order.settings[0].id} onChange={event => void onTimelineChange(order, "printing", event.target.value)} className="w-full px-2.5 py-2 rounded-lg border border-border bg-white text-sm mb-4">{order.settings.map(batch => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></> : null}<p className="font-semibold text-sm mb-2">Print settings</p>{order.settings?.length ? order.settings.map(batch => <div key={batch.id} className="border-b border-border/60 pb-2 mb-2 last:border-0"><p className="font-medium">{batch.name}</p><p className="text-muted-foreground">{batch.material} · {batch.color} · {batch.details} · {batch.strength}</p><p className="text-muted-foreground">Infill {batch.infillDensity}% · {batch.infillPattern} · {batch.layerHeight}mm · {batch.wallCount} walls</p><p className="text-muted-foreground">Supports {batch.support} · {batch.deliverySpeed} delivery</p></div>) : <p className="text-muted-foreground">No settings saved for this legacy order.</p>}</div>
  </div>;
}
