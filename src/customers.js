import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const customersRef = () => collection(db, "customers");
const customerIdAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const customerIdByteLimit = 256 - (256 % customerIdAlphabet.length);

function generateCustomerId() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random ID generation is unavailable in this browser.");
  }

  const id = [];
  const bytes = new Uint8Array(64);
  while (id.length < 35) {
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= customerIdByteLimit) continue;
      id.push(customerIdAlphabet[byte % customerIdAlphabet.length]);
      if (id.length === 35) break;
    }
  }
  return id.join("");
}

function formatDate(value) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (value.toDate) {
    return value.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return String(value);
}

export function emptyCustomer(userId = "") {
  return {
    certificateNumber: "",
    date: new Date().toISOString().slice(0, 10),
    makeBodyType: "",
    importerName: "",
    declarationNumber: "",
    model: "",
    country: "",
    chassisNo: "",
    engineNo: "",
    color: "",
    remarks: "",
    userId,
    status: "Pending",
  };
}

export function customerPayload(customer) {
  return {
    certificateNumber: (customer.certificateNumber || "").trim(),
    date: customer.date || "",
    makeBodyType: (customer.makeBodyType || "").trim(),
    importerName: (customer.importerName || "").trim(),
    declarationNumber: (customer.declarationNumber || "").trim(),
    model: (customer.model || "").trim(),
    country: (customer.country || "").trim(),
    chassisNo: (customer.chassisNo || "").trim(),
    engineNo: (customer.engineNo || "").trim(),
    color: (customer.color || "").trim(),
    remarks: (customer.remarks || "").trim(),
    userId: (customer.userId || "").trim(),
    status: customer.status || "Pending",
  };
}

function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return value;
  }
  if (value.toDate) return value.toDate().toISOString().slice(0, 10);
  return "";
}

export function mapCustomerDoc(snapshot) {
  const data = snapshot.data();
  const dateValue = toDateInputValue(data.date);
  return {
    id: snapshot.id,
    certificateNumber: data.certificateNumber || "",
    date: dateValue,
    dateLabel: formatDate(data.date || dateValue),
    makeBodyType: data.makeBodyType || "",
    importerName: data.importerName || "",
    declarationNumber: data.declarationNumber || "",
    model: data.model || "",
    country: data.country || "",
    chassisNo: data.chassisNo || "",
    engineNo: data.engineNo || "",
    color: data.color || "",
    remarks: data.remarks || "",
    userId: data.userId || "",
    status: data.status || "Pending",
  };
}

function timestampValue(value) {
  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function subscribeCustomers(onChange, onError) {
  return onSnapshot(
    customersRef(),
    (snapshot) => {
      const rows = snapshot.docs
        .slice()
        .sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          return (
            timestampValue(bData.createdAt) - timestampValue(aData.createdAt) ||
            timestampValue(bData.date) - timestampValue(aData.date)
          );
        })
        .map(mapCustomerDoc);
      onChange(rows);
    },
    onError
  );
}

export async function getCustomerById(customerId) {
  const snapshot = await getDoc(doc(db, "customers", customerId));
  return snapshot.exists() ? mapCustomerDoc(snapshot) : null;
}

export async function createCustomer(customer) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const customerId = generateCustomerId();
    const customerRef = doc(db, "customers", customerId);
    const created = await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(customerRef);
      if (existing.exists()) return false;
      transaction.set(customerRef, {
        ...customerPayload(customer),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    });
    if (created) return customerId;
  }
  throw new Error("Could not generate a unique customer ID. Please try again.");
}

export async function updateCustomer(customer) {
  await updateDoc(doc(db, "customers", customer.id), {
    ...customerPayload(customer),
    updatedAt: serverTimestamp(),
  });
}

export async function removeCustomer(customerId) {
  await deleteDoc(doc(db, "customers", customerId));
}
