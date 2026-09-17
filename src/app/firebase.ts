import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, getFirestore, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import type { MockOrder, QueueItem, UserProfile } from "./data/domain";

const firebaseConfig = {
  apiKey: "AIzaSyBB9oVUCPegAPXProtkx39RJmGWWFMJYO4",
  authDomain: "printnest-7ca66.firebaseapp.com",
  projectId: "printnest-7ca66",
  storageBucket: "printnest-7ca66.firebasestorage.app",
  messagingSenderId: "396744606486",
  appId: "1:396744606486:web:94bf5e8f7d99a912fbc637",
  measurementId: "G-NQH70C8QG1"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export function watchAuth(callback: (user: User | null) => void) { return onAuthStateChanged(firebaseAuth, callback); }
export function signInWithGoogle() { return signInWithPopup(firebaseAuth, googleProvider); }
export function signOutOfFirebase() { return signOut(firebaseAuth); }

export async function uploadPrintFile(user: User, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileRef = ref(storage, `users/${user.uid}/files/${Date.now()}-${safeName}`);
  const snapshot = await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
  return { storagePath: snapshot.ref.fullPath, downloadURL: await getDownloadURL(snapshot.ref) };
}

export async function saveUser(user: User, profile: UserProfile) {
  await setDoc(doc(firestore, "users", user.uid), {
    name: profile.name, email: profile.email, photoURL: user.photoURL ?? null, updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveOrder(user: User, order: MockOrder) {
    console.log("Saving order for user:", user.uid, "Order details:", order, "Timestamp:", serverTimestamp());
  const orderRef = await addDoc(collection(firestore, "users", user.uid, "orders"), { ...order, createdAt: serverTimestamp() });
  return { ...order, id: orderRef.id };
}

export async function loadOrders(user: User): Promise<MockOrder[]> {
  const snapshot = await getDocs(query(collection(firestore, "users", user.uid, "orders"), orderBy("createdAt", "desc")));
  return snapshot.docs.map(orderDoc => orderDoc.data() as MockOrder);
}

export async function addToGlobalQueue(user: User, order: MockOrder) {
  const queueRef = await addDoc(collection(firestore, "queue"), {
    ownerId: user.uid,
    orderNumber: order.orderNumber,
    status: "waiting",
    position: 0,
    batches: order.batches,
    parts: order.parts,
    eta: order.estimatedCompletion ?? null,
    createdAt: serverTimestamp(),
  });
  return queueRef.id;
}

export async function loadGlobalQueue(userId: string): Promise<QueueItem[]> {
  const snapshot = await getDocs(query(collection(firestore, "queue"), orderBy("createdAt", "asc")));
  const allItems = snapshot.docs.map((queueDoc, index) => ({
    id: queueDoc.id,
    ...(queueDoc.data() as Omit<QueueItem, "id" | "position">),
    position: index + 1,
  }));
  return allItems.filter(item => item.ownerId === userId);
}

export async function loadAllQueue(): Promise<QueueItem[]> {
  const snapshot = await getDocs(query(collection(firestore, "queue"), orderBy("createdAt", "asc")));
  return snapshot.docs.map((queueDoc, index) => ({
    id: queueDoc.id,
    ...(queueDoc.data() as Omit<QueueItem, "id" | "position">),
    position: index + 1,
  }));
}

export function updateQueueStatus(queueId: string, status: QueueItem["status"]) {
  return updateDoc(doc(firestore, "queue", queueId), { status });
}

export function removeQueueItem(queueId: string) {
  return deleteDoc(doc(firestore, "queue", queueId));
}