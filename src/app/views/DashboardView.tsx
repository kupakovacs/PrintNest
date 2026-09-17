import * as Icons from "lucide-react";
import { AppNav, StatusBadge } from "../components/common";
import {
  AuthCallbacks,
  Batch,
  MockOrder,
  MOCK_PAST_ORDERS,
  buildCurrentOrder,
  fmt,
  initials,
} from "../data/domain";

const { ArrowRight, Box, Clock3, Package, Plus, Settings2, Sparkles } = Icons;

interface DashboardViewProps {
  batches: Batch[];
  orders: MockOrder[];
  auth: AuthCallbacks;
  onNewOrder: () => void;
  onOrders: () => void;
  onProfile: () => void;
  onTrack: () => void;
}

export function DashboardView({ batches, orders: savedOrders, auth, onNewOrder, onOrders, onProfile, onTrack }: DashboardViewProps) {
  const user = auth.user ?? { name: "User", email: "" };
  const currentOrder = batches.length > 0 ? buildCurrentOrder(batches) : null;
  const orders: MockOrder[] = currentOrder ? [currentOrder, ...savedOrders] : savedOrders;
  const activeOrders = orders.filter(order => order.status !== "delivered");
  const totalSpent = orders.reduce((total, order) => total + order.total, 0);
  const totalParts = orders.reduce((total, order) => total + order.parts, 0);
  const initialsText = initials(user.name);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <AppNav
        auth={auth}
        onLogoClick={auth.onHome}
        showQuote={false}
        containerClassName="max-w-6xl mx-auto"
        leftContent={<span className="text-sm font-semibold">Dashboard</span>}
        rightContent={(
          <button onClick={onNewOrder}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-violet-700 transition-colors font-medium">
            <Plus size={14} />New order
          </button>
        )}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">Your workspace</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Good to see you, {user.name.split(" ")[0]}</h1>
            <p className="text-sm text-muted-foreground mt-2">Keep an eye on your prints and start something new.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-semibold">{initialsText}</span>
            <span className="hidden sm:block">{user.email}</span>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Active orders", value: String(activeOrders.length), icon: Clock3 },
            { label: "Total orders", value: String(orders.length), icon: Package },
            { label: "Parts printed", value: String(totalParts), icon: Box },
            { label: "Total spent", value: fmt(totalSpent), icon: Sparkles },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="border border-border rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <Icon size={15} className="text-primary" />
                </div>
                <p className="text-xl font-semibold font-mono">{stat.value}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr,0.6fr] gap-6 items-start">
          <div className="border border-border rounded-2xl bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Current activity</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your most recent print work</p>
              </div>
              <button onClick={onOrders} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </div>
            {activeOrders.length > 0 ? (
              <div className="divide-y divide-border/60">
                {activeOrders.slice(0, 2).map(order => (
                  <div key={order.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex items-center -space-x-2 flex-shrink-0">
                      {order.colors.slice(0, 3).map((color, index) => (
                        <span key={`${order.id}-${index}`} className="w-9 h-9 rounded-xl border-2 border-white" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{order.description}</p>
                    </div>
                    <button onClick={order.id === "current" ? onTrack : onOrders}
                      className="hidden sm:flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors">
                      {order.id === "current" ? "Track" : "View"} <ArrowRight size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <Package size={22} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Nothing in progress</p>
                <p className="text-xs text-muted-foreground mt-1">Your next print can start here.</p>
              </div>
            )}
          </div>

          <div className="border border-border rounded-2xl bg-white p-5">
            <p className="font-semibold text-sm">Account shortcuts</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Manage your PrintNest space</p>
            <div className="space-y-2">
              <button onClick={onNewOrder} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-violet-700 transition-colors text-left">
                <Plus size={16} /> Start a new order <ArrowRight size={14} className="ml-auto" />
              </button>
              <button onClick={onOrders} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-muted hover:bg-accent text-sm font-medium transition-colors text-left">
                <Package size={16} className="text-muted-foreground" /> Browse order history <ArrowRight size={14} className="ml-auto text-muted-foreground" />
              </button>
              <button onClick={onProfile} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-muted hover:bg-accent text-sm font-medium transition-colors text-left">
                <Settings2 size={16} className="text-muted-foreground" /> Profile & settings <ArrowRight size={14} className="ml-auto text-muted-foreground" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
