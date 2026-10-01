import { readFileSync, writeFileSync } from "node:fs";
import { makePdf } from "../src/pdf.ts";
import { defaultShop, type Invoice } from "../src/model.ts";
const invoice: Invoice = {
  id: "example",
  number: "CONTOH-HYT-20260930-001",
  date: "2026-09-30",
  recipient: "KOKARMINA",
  branch: "Cabang Contoh",
  receiver: "",
  notes: "CONTOH - Bukan nota penagihan.",
  items: [
    { name: "Bolen Cokelat", quantity: 10, price: 4300 },
    { name: "Roti Keju", quantity: 5, price: 6000 },
  ],
  shop: { ...defaultShop, supplier: defaultShop.name },
  createdAt: "2026-09-30T00:00:00Z",
  updatedAt: "2026-09-30T00:00:00Z",
};
const stamp =
  "data:image/png;base64," +
  readFileSync(new URL("../public/hayati-stamp.png", import.meta.url)).toString(
    "base64",
  );
const doc = await makePdf([invoice], stamp);
const path = process.argv[2] || "hayati-contoh-nota.pdf";
writeFileSync(path, new Uint8Array(doc.output("arraybuffer")));
console.log(`Sample PDF written to ${path} (${doc.getNumberOfPages()} page).`);
