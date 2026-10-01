export type Item = { name: string; quantity: number; price: number };
export type Shop = {
  name: string;
  phone: string;
  address: string;
  city: string;
  supplier: string;
  recipient: string;
  branch: string;
  receiver: string;
  stamp: string;
};
export type Invoice = {
  id: string;
  number: string;
  date: string;
  recipient: string;
  branch: string;
  receiver: string;
  notes: string;
  items: Item[];
  shop: Shop;
  createdAt: string;
  updatedAt: string;
};
export type Store = {
  version: 1;
  shop: Shop;
  invoices: Invoice[];
  nextSequence: number;
};
export const STORAGE_KEY = "hayati-nota-v1";
export const defaultShop: Shop = {
  name: "Hayati Cake & Bakery",
  phone: "081326203778",
  address: "Jl. Ki Hajar Dewantoro No. 71\n(Depan Pintu Gerbang Belakang UNS)",
  city: "Solo",
  supplier: "",
  recipient: "KOKARMINA",
  branch: "",
  receiver: "",
  stamp: "",
};
export const emptyStore = (): Store => ({
  version: 1,
  shop: { ...defaultShop },
  invoices: [],
  nextSequence: 1,
});
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value + "T12:00:00"));
export const lineTotal = (item: Item) => Math.round(item.quantity * item.price);
export const invoiceTotal = (invoice: Pick<Invoice, "items">) =>
  invoice.items.reduce((sum, item) => sum + lineTotal(item), 0);
export function period(
  date = localDate(),
  half: 1 | 2 = new Date(date + "T12:00:00").getDate() <= 15 ? 1 : 2,
) {
  const [year, month] = date.split("-").map(Number);
  return {
    from: `${year}-${String(month).padStart(2, "0")}-${half === 1 ? "01" : "16"}`,
    to: `${year}-${String(month).padStart(2, "0")}-${half === 1 ? "15" : new Date(year, month, 0).getDate()}`,
  };
}
export function selectInvoices(
  invoices: Invoice[],
  from: string,
  to: string,
  branch = "",
) {
  return invoices
    .filter(
      (i) => i.date >= from && i.date <= to && (!branch || i.branch === branch),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.number.localeCompare(b.number),
    );
}
export const invoiceNumber = (date: string, sequence: number) =>
  `HYT-${date.replaceAll("-", "")}-${String(sequence).padStart(3, "0")}`;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const textField = (value: unknown, max = 300) =>
  typeof value === "string" && value.length <= max;
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(value + "T12:00:00");
  return !Number.isNaN(d.getTime()) && localDate(d) === value;
}
function validStamp(value: unknown) {
  return (
    textField(value, 1800000) &&
    (value === "" ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
        value as string,
      ))
  );
}
function validShop(value: unknown): value is Shop {
  return (
    isObject(value) &&
    [
      "name",
      "phone",
      "city",
      "supplier",
      "recipient",
      "branch",
      "receiver",
    ].every((k) => textField(value[k])) &&
    textField(value.address, 1000) &&
    validStamp(value.stamp) &&
    !!value.name
  );
}
export function validateItems(items: unknown): items is Item[] {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.length <= 100 &&
    items.every(
      (i) =>
        isObject(i) &&
        typeof i.name === "string" &&
        textField(i.name, 150) &&
        !!i.name.trim() &&
        typeof i.quantity === "number" &&
        Number.isFinite(i.quantity) &&
        i.quantity > 0 &&
        i.quantity <= 999999 &&
        Math.abs(i.quantity * 100 - Math.round(i.quantity * 100)) < 0.00001 &&
        typeof i.price === "number" &&
        Number.isSafeInteger(i.price) &&
        i.price >= 0 &&
        i.price <= 1000000000,
    ) &&
    Number.isSafeInteger(invoiceTotal({ items }))
  );
}
export function validateStore(value: unknown): Store {
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !validShop(value.shop) ||
    !Number.isSafeInteger(value.nextSequence) ||
    Number(value.nextSequence) < 1 ||
    !Array.isArray(value.invoices) ||
    value.invoices.length > 20000
  )
    throw new Error("File cadangan tidak valid atau versinya belum didukung.");
  const ids = new Set(),
    numbers = new Set();
  for (const i of value.invoices) {
    if (
      !isObject(i) ||
      !textField(i.id) ||
      !i.id ||
      !textField(i.number) ||
      !i.number ||
      !validDate(i.date) ||
      !["recipient", "branch", "receiver"].every((k) => textField(i[k])) ||
      !textField(i.notes, 1500) ||
      !validateItems(i.items) ||
      !validShop(i.shop) ||
      !textField(i.createdAt) ||
      !textField(i.updatedAt) ||
      ids.has(i.id) ||
      numbers.has(i.number)
    )
      throw new Error(
        "Data nota dalam cadangan tidak valid atau nomor nota ganda.",
      );
    ids.add(i.id);
    numbers.add(i.number);
  }
  return value as unknown as Store;
}
export function mergeBackup(current: Store, incoming: Store): Store {
  const validated = validateStore(incoming);
  const merged = [...current.invoices];
  for (const i of validated.invoices) {
    const same = merged.find((x) => x.id === i.id || x.number === i.number);
    if (same) {
      if (JSON.stringify(same) !== JSON.stringify(i))
        throw new Error(
          `Nota ${i.number} berbeda dengan yang tersimpan. Impor dibatalkan agar data tidak tertimpa.`,
        );
    } else merged.push(i);
  }
  return {
    ...current,
    shop: current.invoices.length === 0 ? validated.shop : current.shop,
    invoices: merged,
    nextSequence: Math.max(
      current.nextSequence,
      validated.nextSequence,
      merged.length + 1,
    ),
  };
}
