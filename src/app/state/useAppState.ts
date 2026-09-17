import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppView, Batch, MockOrder, QueueItem, UserProfile, AuthCallbacks } from "../data/domain";
import { buildCurrentOrder, makeBatch, makeFile, nameFromEmail } from "../data/domain";
import { addToGlobalQueue, loadGlobalQueue, loadOrders, saveOrder, saveUser, signInWithGoogle, signOutOfFirebase, watchAuth } from "../firebase";
import { uploadSTL } from "../data/UploadData";

const R2_BUCKET = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_R2_BUCKET;

export function useAppState() {
  const [view, setView] = useState<AppView>("landing");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(null);
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ batchId: string; files: File[] } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => watchAuth(async nextUser => {
    setFirebaseUser(nextUser);
    if (!nextUser) { setUser(null); setOrders([]); setQueue([]); return; }
    const profile = { name: nextUser.displayName ?? nameFromEmail(nextUser.email ?? "user@example.com"), email: nextUser.email ?? "" };
    setUser(profile);
    try { await saveUser(nextUser, profile); } catch { setAuthError("Your account loaded, but profile data could not be synced."); }
    try { setOrders(await loadOrders(nextUser)); } catch { setOrders([]); }
    try { setQueue(await loadGlobalQueue(nextUser.uid)); } catch { setQueue([]); }
    setView(current => current === "signin" ? "dashboard" : current);
  }), []);

  const isLoggedIn = user !== null;
  const isAdmin = Boolean(firebaseUser && (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ADMIN_UID === firebaseUser.uid);
  const navigate = useCallback((next: AppView) => setView(next), []);
  const signIn = useCallback(async () => {
    setAuthError(null); setAuthLoading(true);
    try { await signInWithGoogle(); } catch (error) {
      if ((error as { code?: string }).code !== "auth/popup-closed-by-user") setAuthError("Google sign-in was not completed.");
    } finally { setAuthLoading(false); }
  }, []);
  const signOut = useCallback(() => { void signOutOfFirebase(); setUser(null); setFirebaseUser(null); setBatches([]); setOrders([]); setQueue([]); setShowQueue(false); setView("landing"); }, []);
  const updateProfile = useCallback(async (profile: UserProfile) => {
    if (!firebaseUser) return;
    await saveUser(firebaseUser, profile);
    setUser(profile);
  }, [firebaseUser]);
  const selectFiles = useCallback((files: File[]) => {
    const batch = makeBatch("Batch A", files.map(file => makeFile(file.name, file.size)));
    setBatches([batch]); setPendingUpload({ batchId: batch.id, files }); setView("workspace");
  }, []);
  const placeOrder = useCallback(async () => {
    if (!firebaseUser || !user || batches.length === 0) { setView("signin"); return; }
    if (!pendingUpload || !R2_BUCKET) { setAuthError("No upload is ready, or the R2 bucket is not configured."); return; }
    try {
      setAuthError(null); setUploading(true);
      const uploadedFiles = await Promise.all(pendingUpload.files.map(async (file, index) => ({
        ...batches[0].files[index],
        downloadURL: await uploadSTL(file, R2_BUCKET),
      })));
      const uploadedBatches = batches.map(batch => ({ ...batch, files: uploadedFiles }));
      setBatches(uploadedBatches);
      const saved = await saveOrder(firebaseUser, buildCurrentOrder(uploadedBatches));
      try {
        await addToGlobalQueue(firebaseUser, saved);
        setQueue(await loadGlobalQueue(firebaseUser.uid));
      } catch (queueError) {
        console.error("Global queue update failed", queueError);
      }
      setPendingUpload(null);
      setOrders(previous => [saved, ...previous]); setSelectedOrderNumber(saved.orderNumber); setView("tracking");
    } catch(error) {
      console.error(error);
      setAuthError("The upload or order save failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }, [batches, firebaseUser, pendingUpload, uploading, user]);
  const openQueueOrder = useCallback((orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    setShowQueue(false);
    setView("tracking");
  }, []);

  const auth: AuthCallbacks = useMemo(() => ({
    isLoggedIn, user,
    onSignIn: () => setView("signin"),
    onHome: () => setView("landing"),
    onDashboard: () => setView("dashboard"),
    onMyOrders: () => setView("orders"),
    onProfile: () => setView("profile"),
    onSignOut: signOut, onUpdateProfile: updateProfile,
  }), [isLoggedIn, user, signOut, updateProfile]);

  return { view, navigate, batches, setBatches, showQueue, setShowQueue, auth, selectFiles, signIn, placeOrder, openQueueOrder, selectedOrderNumber, orders, queue, authError, authLoading, uploading, isAdmin };
}
