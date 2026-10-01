import { describe, expect, it } from "vitest";
import {
  defaultShop,
  emptyStore,
  invoiceNumber,
  invoiceTotal,
  localDate,
  mergeBackup,
  period,
  selectInvoices,
  validateItems,
  validateStore,
  validDate,
  type Invoice,
} from "./model";
const invoice = (id: string, date: string, branch = "A"): Invoice => ({
  id,
  number: invoiceNumber(date, Number(id) || 1),
  date,
  branch,
  recipient: "KOKARMINA",
  receiver: "",
  notes: "",
  items: [{ name: "Bolen", quantity: 10, price: 4300 }],
  shop: { ...defaultShop },
  createdAt: "2026-09-30T00:00:00Z",
  updatedAt: "2026-09-30T00:00:00Z",
});
describe("invoice arithmetic and validation", () => {
  it("calculates exact Rupiah totals, rounding each fractional-quantity line", () => {
    expect(
      invoiceTotal({
        items: [
          { name: "Bolen", quantity: 10, price: 4300 },
          { name: "Cake", quantity: 1.25, price: 15001 },
        ],
      }),
    ).toBe(61751);
  });
  it("rejects blank items, negative quantities, fractional prices, excess decimals and nonfinite values", () => {
    for (const item of [
      { name: " ", quantity: 1, price: 1 },
      { name: "a", quantity: -1, price: 1 },
      { name: "a", quantity: 1, price: 1.2 },
      { name: "a", quantity: 1.001, price: 1 },
      { name: "a", quantity: Infinity, price: 1 },
    ])
      expect(validateItems([item])).toBe(false);
    expect(
      validateItems([{ name: "Bolen", quantity: 1.25, price: 4300 }]),
    ).toBe(true);
  });
  it("keeps local calendar dates, including leap days", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
    expect(localDate(new Date(2026, 8, 30, 23, 55))).toBe("2026-09-30");
  });
});
describe("bulk selection", () => {
  it("includes both endpoints and sorts invoices by date", () => {
    const items = [
      invoice("3", "2026-09-16"),
      invoice("1", "2026-09-01"),
      invoice("2", "2026-09-15"),
      invoice("4", "2026-08-31"),
    ];
    expect(
      selectInvoices(items, "2026-09-01", "2026-09-15").map((x) => x.id),
    ).toEqual(["1", "2"]);
  });
  it("filters a branch and returns no invoices for a reversed range", () => {
    expect(
      selectInvoices(
        [invoice("1", "2026-09-02", "A"), invoice("2", "2026-09-02", "B")],
        "2026-09-01",
        "2026-09-15",
        "B",
      ).map((x) => x.id),
    ).toEqual(["2"]);
    expect(
      selectInvoices([invoice("1", "2026-09-02")], "2026-09-15", "2026-09-01"),
    ).toHaveLength(0);
  });
  it("supports 28, 29, 30 and 31 day months", () => {
    for (const [date, end] of [
      ["2026-02-18", "28"],
      ["2024-02-18", "29"],
      ["2026-09-18", "30"],
      ["2026-10-18", "31"],
    ])
      expect(period(date, 2).to).toBe(date.slice(0, 7) + "-" + end);
    expect(period("2026-09-18", 1)).toEqual({
      from: "2026-09-01",
      to: "2026-09-15",
    });
  });
});
describe("backup recovery", () => {
  it("round-trips settings and immutable invoice snapshots", () => {
    const state = {
      ...emptyStore(),
      invoices: [invoice("1", "2026-09-01")],
      nextSequence: 2,
    };
    expect(validateStore(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it("merges new invoices without duplication and keeps numbering above either backup", () => {
    const current = {
      ...emptyStore(),
      invoices: [invoice("1", "2026-09-01")],
      nextSequence: 12,
    };
    const incoming = {
      ...emptyStore(),
      invoices: [invoice("1", "2026-09-01"), invoice("2", "2026-09-02")],
      nextSequence: 3,
    };
    const merged = mergeBackup(current, incoming);
    expect(merged.invoices).toHaveLength(2);
    expect(merged.nextSequence).toBe(12);
    expect(mergeBackup(merged, incoming).invoices).toHaveLength(2);
  });
  it("fails before overwriting an invoice with different contents", () => {
    const current = {
      ...emptyStore(),
      invoices: [invoice("1", "2026-09-01")],
      nextSequence: 2,
    };
    const incoming = {
      ...current,
      invoices: [{ ...current.invoices[0], notes: "Changed" }],
    };
    expect(() => mergeBackup(current, incoming)).toThrow("berbeda");
    expect(current.invoices[0].notes).toBe("");
  });
  it("rejects malformed data, duplicate numbers and remote stamp URLs", () => {
    const i = invoice("1", "2026-09-01");
    for (const bad of [
      { ...emptyStore(), version: 2 },
      { ...emptyStore(), invoices: [i, { ...i, id: "other" }] },
      {
        ...emptyStore(),
        shop: { ...defaultShop, stamp: "https://example.com/tracker.png" },
      },
      { ...emptyStore(), invoices: [{ ...i, date: "2026-99-01" }] },
    ])
      expect(() => validateStore(bad)).toThrow();
  });
});
