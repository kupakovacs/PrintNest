import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, getFirestore, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { ORDER_STAGES, type MockOrder, type OrderStageId, type QueueItem, type UserProfile } from "./data/domain";

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
  const createdAt = serverTimestamp();
  const orderRef = doc(collection(firestore, "users", user.uid, "orders"));
  const savedOrder = { ...order, ownerId: user.uid, ownerName: user.displayName ?? "", ownerEmail: user.email ?? "", createdAt };
  const batch = writeBatch(firestore);
  batch.set(orderRef, savedOrder);
  batch.set(doc(firestore, "adminOrders", orderRef.id), savedOrder);
  await batch.commit();
  return { ...order, id: orderRef.id, ownerId: user.uid, ownerName: user.displayName ?? "", ownerEmail: user.email ?? "" };
}

export async function loadOrders(user: User): Promise<MockOrder[]> {
  const snapshot = await getDocs(query(collection(firestore, "users", user.uid, "orders"), orderBy("createdAt", "desc")));
  return snapshot.docs.map(orderDoc => orderDoc.data() as MockOrder);
}

export async function addToGlobalQueue(user: User, order: MockOrder) {
  const existing = await getDocs(query(collection(firestore, "queue"), orderBy("createdAt", "asc")));
  const queueRef = await addDoc(collection(firestore, "queue"), {
    ownerId: user.uid,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: "waiting",
    position: existing.size + 1,
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
  })).sort((a, b) => (a.queuePosition ?? a.position) - (b.queuePosition ?? b.position));
  allItems.forEach((item, index) => { item.position = index + 1; });
  return allItems.filter(item => item.ownerId === userId);
}

export async function loadAllQueue(): Promise<QueueItem[]> {
  const snapshot = await getDocs(query(collection(firestore, "queue"), orderBy("createdAt", "asc")));
  const items = snapshot.docs.map((queueDoc, index) => ({
    id: queueDoc.id,
    ...(queueDoc.data() as Omit<QueueItem, "id" | "position">),
    position: index + 1,
  })).sort((a, b) => (a.queuePosition ?? a.position) - (b.queuePosition ?? b.position));
  items.forEach((item, index) => { item.position = index + 1; });
  return items;
}

export async function updateQueueStatus(queueItem: QueueItem, status: QueueItem["status"]) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, "queue", queueItem.id), { status });
  if (queueItem.orderId) {
    batch.update(doc(firestore, "adminOrders", queueItem.orderId), { status });
    batch.update(doc(firestore, "users", queueItem.ownerId, "orders", queueItem.orderId), { status });
  }
  await batch.commit();
}

export async function updateQueuePosition(queueId: string, requestedPosition: number) {
  const queue = await loadAllQueue();
  const fromIndex = queue.findIndex(item => item.id === queueId);
  if (fromIndex < 0) throw new Error("Queue item not found");
  const toIndex = Math.max(0, Math.min(queue.length - 1, requestedPosition - 1));
  const [moved] = queue.splice(fromIndex, 1);
  queue.splice(toIndex, 0, moved);
  const batch = writeBatch(firestore);
  queue.forEach((item, index) => batch.update(doc(firestore, "queue", item.id), { queuePosition: index + 1 }));
  await batch.commit();
}

export function removeQueueItem(queueId: string) {
  return deleteDoc(doc(firestore, "queue", queueId));
}

export async function loadAdminOrders(): Promise<MockOrder[]> {
  const [adminSnapshot, legacySnapshot] = await Promise.all([
    getDocs(query(collection(firestore, "adminOrders"), orderBy("createdAt", "desc"))),
    getDocs(collectionGroup(firestore, "orders")),
  ]);
  const mirrored = adminSnapshot.docs.map(orderDoc => ({ ...(orderDoc.data() as MockOrder), id: orderDoc.id }));
  const mirroredNumbers = new Set(mirrored.map(order => order.orderNumber));
  const legacy = legacySnapshot.docs
    .map(orderDoc => ({ ...(orderDoc.data() as MockOrder), id: orderDoc.id, ownerId: orderDoc.ref.parent.parent?.id }))
    .filter(order => !mirroredNumbers.has(order.orderNumber));
  return [...mirrored, ...legacy];
}

export async function isFirestoreAdmin(userId: string) {
  const snapshot = await getDoc(doc(firestore, "users", userId));
  return snapshot.data()?.admin === true;
}

export async function updateOrderTimeline(order: MockOrder, activeStageId: OrderStageId, printingBatchId?: string) {
  const activeIndex = ORDER_STAGES.findIndex(stage => stage.id === activeStageId);
  if (activeIndex < 0) throw new Error("Unknown order stage");
  const previous = new Map((order.timeline ?? []).map(stage => [stage.id, stage]));
  const now = new Date().toISOString();
  const printingBatch = order.settings?.find(batch => batch.id === printingBatchId);
  const timeline = ORDER_STAGES.map((stage, index) => ({
    id: stage.id,
    label: stage.label,
    status: index < activeIndex ? "done" as const : index === activeIndex ? "active" as const : "pending" as const,
    ...(index <= activeIndex ? { timestamp: previous.get(stage.id)?.timestamp ?? now } : {}),
    description: stage.id === "printing" && printingBatch
      ? `${printingBatch.name} is printing now; other batches remain queued.`
      : stage.description,
  }));
  const status: MockOrder["status"] = activeStageId === "printing" ? "printing"
    : activeStageId === "inspection" ? "review"
      : activeStageId === "packaging" ? "packaging"
        : activeStageId === "shipped" ? "shipped"
          : activeStageId === "delivered" ? "delivered" : "waiting";
  const batch = writeBatch(firestore);
  const progress = activeStageId === "printing" ? { printingBatchId: printingBatch?.id, printProgress: 0, currentLayer: 0 } : {};
  if (order.id) batch.update(doc(firestore, "adminOrders", order.id), { timeline, status, ...progress });
  if (order.ownerId) batch.update(doc(firestore, "users", order.ownerId, "orders", order.id), { timeline, status, ...progress });
  await batch.commit();
  return { ...order, timeline, status, ...progress };
}

type AdminDataCollection = "printers" | "filaments" | "settings";

function adminDataCollection(userId: string, collectionName: AdminDataCollection) {
  return collection(firestore, "adminData", userId, collectionName);
}

export async function loadAdminData<T>(userId: string, collectionName: AdminDataCollection): Promise<(T & { id: string })[]> {
  const snapshot = await getDocs(adminDataCollection(userId, collectionName));
  return snapshot.docs.map(item => ({ id: item.id, ...(item.data() as T) }));
}

export function saveAdminData(userId: string, collectionName: AdminDataCollection, id: string, data: Record<string, unknown>) {
  return setDoc(doc(firestore, "adminData", userId, collectionName, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function deleteAdminData(userId: string, collectionName: AdminDataCollection, id: string) {
  return deleteDoc(doc(firestore, "adminData", userId, collectionName, id));
}

export function updateAdminOrderFields(orderId: string, fields: Record<string, unknown>) {
  return updateDoc(doc(firestore, "adminOrders", orderId), { ...fields, updatedAt: serverTimestamp() });
}