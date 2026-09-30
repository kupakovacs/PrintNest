import { useAppState } from "./state/useAppState";
import { LandingView } from "./views/LandingView";
import { HowItWorksView } from "./views/HowItWorksView";
import { MaterialsView } from "./views/MaterialsView";
import { PricingView } from "./views/PricingView";
import { SignInView } from "./views/SignInView";
import { CheckoutView } from "./views/CheckoutView";
import { OrderTrackingView } from "./views/TrackingView";
import { OrdersView } from "./views/OrdersView";
import { ProfileView } from "./views/ProfileView";
import { DashboardView } from "./views/DashboardView";
import { WorkspaceView } from "./components/workspace";
import { NewAdminView } from "./views/NewAdminView";

export default function App() {
  const state = useAppState();
  const { view, navigate, batches, setBatches, showQueue, setShowQueue, auth } = state;

  switch (view) {
    case "signin": return <SignInView onGoogleSignIn={state.signIn} loading={state.authLoading} error={state.authError} onBack={() => navigate("landing")} />;
    case "landing": return <LandingView onFilesSelected={state.selectFiles} queue={state.queue} onQueueOrder={state.openQueueOrder} auth={auth} onNav={navigate} />;
    case "how-it-works": return <HowItWorksView onBack={() => navigate("landing")} auth={auth} onNav={navigate} />;
    case "materials": return <MaterialsView onBack={() => navigate("landing")} auth={auth} onNav={navigate} onStartWithMaterial={() => navigate("landing")} />;
    case "pricing": return <PricingView onBack={() => navigate("landing")} auth={auth} onNav={navigate} onStart={() => navigate("landing")} />;
    case "workspace": return <WorkspaceView batches={batches} setBatches={setBatches} onBack={() => navigate("landing")} onCheckout={() => navigate("checkout")} showQueue={showQueue} setShowQueue={setShowQueue} queue={state.queue} onQueueOrder={state.openQueueOrder} auth={auth} />;
    case "checkout": return <CheckoutView batches={batches} onBack={() => navigate("workspace")} onPlaceOrder={state.placeOrder} loading={state.uploading} error={state.authError} auth={auth} />;
    case "tracking": return <OrderTrackingView batches={batches} order={state.orders.find(order => order.orderNumber === state.selectedOrderNumber) ?? state.orders[0]} onBack={() => navigate(auth.isLoggedIn ? "orders" : "landing")} auth={auth} />;
    case "dashboard": return <DashboardView batches={batches} orders={state.orders} queue={state.queue} onQueueOrder={state.openQueueOrder} onAdmin={state.isAdmin ? () => navigate("admin") : undefined} auth={auth} onNewOrder={() => navigate("landing")} onOrders={() => navigate("orders")} onProfile={() => navigate("profile")} onTrack={() => navigate("tracking")} />;
    case "orders": return <OrdersView batches={batches} orders={state.orders} queue={state.queue} onQueueOrder={state.openQueueOrder} auth={auth} onTrackCurrent={() => navigate("tracking")} onNewOrder={() => navigate("landing")} />;
    case "profile": return <ProfileView auth={auth} onMyOrders={() => navigate("orders")} />;
    case "admin": return state.isAdmin ? <NewAdminView auth={auth} onBack={() => navigate("dashboard")} /> : <DashboardView batches={batches} orders={state.orders} queue={state.queue} onQueueOrder={state.openQueueOrder} auth={auth} onNewOrder={() => navigate("landing")} onOrders={() => navigate("orders")} onProfile={() => navigate("profile")} onTrack={() => navigate("tracking")} />;
    default: return null;
  }
}
