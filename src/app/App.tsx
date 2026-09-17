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

export default function App() {
  const state = useAppState();
  const { view, navigate, batches, setBatches, showQueue, setShowQueue, auth } = state;

  switch (view) {
    case "signin": return <SignInView onGoogleSignIn={state.signIn} loading={state.authLoading} error={state.authError} onBack={() => navigate("landing")} />;
    case "landing": return <LandingView onFilesSelected={state.selectFiles} auth={auth} onNav={navigate} />;
    case "how-it-works": return <HowItWorksView onBack={() => navigate("landing")} auth={auth} onNav={navigate} />;
    case "materials": return <MaterialsView onBack={() => navigate("landing")} auth={auth} onNav={navigate} onStartWithMaterial={() => navigate("landing")} />;
    case "pricing": return <PricingView onBack={() => navigate("landing")} auth={auth} onNav={navigate} onStart={() => navigate("landing")} />;
    case "workspace": return <WorkspaceView batches={batches} setBatches={setBatches} onBack={() => navigate("landing")} onCheckout={() => navigate("checkout")} showQueue={showQueue} setShowQueue={setShowQueue} auth={auth} />;
    case "checkout": return <CheckoutView batches={batches} onBack={() => navigate("workspace")} onPlaceOrder={state.placeOrder} error={state.authError} auth={auth} />;
    case "tracking": return <OrderTrackingView batches={batches} onBack={() => navigate(auth.isLoggedIn ? "orders" : "landing")} auth={auth} />;
    case "dashboard": return <DashboardView batches={batches} orders={state.orders} auth={auth} onNewOrder={() => navigate("landing")} onOrders={() => navigate("orders")} onProfile={() => navigate("profile")} onTrack={() => navigate("tracking")} />;
    case "orders": return <OrdersView batches={batches} orders={state.orders} auth={auth} onTrackCurrent={() => navigate("tracking")} onNewOrder={() => navigate("landing")} />;
    case "profile": return <ProfileView auth={auth} onMyOrders={() => navigate("orders")} />;
    default: return null;
  }
}
