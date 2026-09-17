import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppView, Batch, MockOrder, UserProfile, AuthCallbacks } from "../data/domain";
import { buildCurrentOrder, makeBatch, makeFile, nameFromEmail } from "../data/domain";
import { loadOrders, saveOrder, saveUser, signInWithGoogle, signOutOfFirebase, watchAuth } from "../firebase";
import { uploadSTL } from "../data/UploadData";

const R2_BUCKET = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_R2_BUCKET;

export function useAppState() {
  const [view, setView] = useState<AppView>("landing");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<import("firebase/auth").User | null>(null);
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ batchId: string; files: File[] } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => watchAuth(async nextUser => {
    setFirebaseUser(nextUser);
    if (!nextUser) { setUser(null); setOrders([]); return; }
    const profile = { name: nextUser.displayName ?? nameFromEmail(nextUser.email ?? "user@example.com"), email: nextUser.email ?? "" };
    setUser(profile);
    try { await saveUser(nextUser, profile); } catch { setAuthError("Your account loaded, but profile data could not be synced."); }
    try { setOrders(await loadOrders(nextUser)); } catch { setOrders([]); }
    setView(current => current === "signin" ? "dashboard" : current);
  }), []);

  useEffect(() => {
    if (!firebaseUser || !pendingUpload) return;
    let cancelled = false;
    const upload = async () => {
      try {
        const batch = batches.find(item => item.id === pendingUpload.batchId);
        if (!batch) return;
        if (!R2_BUCKET) throw new Error("VITE_R2_BUCKET is not configured.");
        setUploading(true);
        const uploadedFiles = await Promise.all(pendingUpload.files.map(async (file, index) => ({
          ...batch.files[index],
          downloadURL: await uploadSTL(file, R2_BUCKET),
        })));
        if (!cancelled) {
          setBatches(current => current.map(item => item.id === batch.id ? { ...item, files: uploadedFiles } : item));
          setPendingUpload(null);
        }
      } catch {
        if (!cancelled) { setAuthError("The model could not be uploaded. Please try again."); setPendingUpload(null); }
      } finally {
        if (!cancelled) setUploading(false);
      }
    };
    void upload();
    return () => { cancelled = true; };
  }, [batches, firebaseUser, pendingUpload]);

  const isLoggedIn = user !== null;
  const navigate = useCallback((next: AppView) => setView(next), []);
  const signIn = useCallback(async () => {
    setAuthError(null); setAuthLoading(true);
    try { await signInWithGoogle(); } catch (error) {
      if ((error as { code?: string }).code !== "auth/popup-closed-by-user") setAuthError("Google sign-in was not completed.");
    } finally { setAuthLoading(false); }
  }, []);
  const signOut = useCallback(() => { void signOutOfFirebase(); setUser(null); setFirebaseUser(null); setBatches([]); setOrders([]); setShowQueue(false); setView("landing"); }, []);
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
    if (uploading || pendingUpload) {
      setAuthError("Please wait for your STL upload to finish before placing the order.");
      return;
    }
    const currentBatch = batches[0];
    if (currentBatch.files.some(file => !file.downloadURL)) {
      setAuthError("The STL upload is incomplete. Please select the file again.");
      return;
    }
    try {
      const saved = await saveOrder(firebaseUser, buildCurrentOrder(batches));
      setOrders(previous => [saved, ...previous]); setView("tracking");
    } catch {
      setAuthError("The order could not be saved. Check your Firebase connection and try again.");
    }
  }, [batches, firebaseUser, pendingUpload, uploading, user]);

  const auth: AuthCallbacks = useMemo(() => ({
    isLoggedIn, user,
    onSignIn: () => setView("signin"),
    onHome: () => setView("landing"),
    onDashboard: () => setView("dashboard"),
    onMyOrders: () => setView("orders"),
    onProfile: () => setView("profile"),
    onSignOut: signOut, onUpdateProfile: updateProfile,
  }), [isLoggedIn, user, signOut, updateProfile]);

  return { view, navigate, batches, setBatches, showQueue, setShowQueue, auth, selectFiles, signIn, placeOrder, orders, authError, authLoading };
}
