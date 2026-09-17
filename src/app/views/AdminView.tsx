import { useEffect, useState } from "react";
import { RefreshCw, Trash2, ShieldCheck, ArrowLeft } from "lucide-react";
import { AppNav } from "../components/common";
import { loadAllQueue, removeQueueItem, updateQueueStatus } from "../firebase";
import type { AuthCallbacks, QueueItem } from "../data/domain";

const statuses: QueueItem["status"][] = ["waiting", "printing", "review"];

export function AdminView({ auth, onBack }: { auth: AuthCallbacks; onBack: () => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try { setQueue(await loadAllQueue()); setMessage(null); }
    catch { setMessage("Could not load the global queue."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const changeStatus = async (item: QueueItem, status: QueueItem["status"]) => {
    try { await updateQueueStatus(item.id, status); setQueue(items => items.map(current => current.id === item.id ? { ...current, status } : current)); }
    catch { setMessage("Status update failed. Check your admin permissions."); }
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
          <div className="grid grid-cols-[1.4fr,1fr,100px,140px,48px] gap-4 px-5 py-3 border-b border-border text-xs uppercase tracking-widest text-muted-foreground"><span>Order</span><span>Owner</span><span>Position</span><span>Status</span><span /></div>
          {queue.length === 0 && <p className="px-5 py-12 text-center text-sm text-muted-foreground">No orders in the global queue.</p>}
          {queue.map(item => (
            <div key={item.id} className="grid grid-cols-[1.4fr,1fr,100px,140px,48px] gap-4 items-center px-5 py-4 border-b border-border/60 last:border-0">
              <div><p className="font-mono text-sm font-semibold">{item.orderNumber}</p><p className="text-xs text-muted-foreground">{item.parts} parts · {item.batches} batch{item.batches !== 1 ? "es" : ""}</p></div>
              <p className="font-mono text-xs text-muted-foreground truncate">{item.ownerId}</p>
              <p className="font-mono text-sm">#{item.position}</p>
              <select value={item.status} onChange={event => void changeStatus(item, event.target.value as QueueItem["status"])} className="px-2.5 py-2 rounded-lg border border-border bg-white text-sm"><option value="waiting">Waiting</option><option value="printing">Printing</option><option value="review">Review</option></select>
              <button onClick={() => void remove(item)} title="Remove from queue" className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
