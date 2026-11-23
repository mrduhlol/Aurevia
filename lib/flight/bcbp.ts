import { normalizeAirport, normalizeFlightNumber } from "./validation.ts";

export const MAX_BARCODE_BYTES = 512;

type BarcodeResult =
  | { ok: true; origin: string; destination: string; flightNumber: string; dayOfYear: number }
  | { ok: false; reason: "size" | "format" | "segments" | "fields" };

export function parseBoardingPassText(input: string): BarcodeResult {
  if (input.length > MAX_BARCODE_BYTES) return { ok: false, reason: "size" };
  // Accept one editor-added line ending while preserving fixed-width spaces.
  const text = input.replace(/\r?\n$/, "");
  if (text.length < 60 || !/^[\x20-\x7E]+$/.test(text) || !/^M[1-9]/.test(text)) {
    return { ok: false, reason: "format" };
  }
  if (text[1] !== "1") return { ok: false, reason: "segments" };

  const length = text.slice(58, 60);
  if (!/^[0-9A-F]{2}$/i.test(length)) return { ok: false, reason: "format" };
  const end = 60 + Number.parseInt(length, 16);
  if (text.length < end) return { ok: false, reason: "format" };

  const security = text.slice(end);
  if (security && (!/^\^[\x21-\x7E][0-9A-F]{2}/i.test(security) ||
      security.length !== 4 + Number.parseInt(security.slice(2, 4), 16))) {
    return { ok: false, reason: "format" };
  }

  const origin = normalizeAirport(text.slice(30, 33));
  const destination = normalizeAirport(text.slice(33, 36));
  const carrier = text.slice(36, 39).trim();
  const flight = text.slice(39, 44).trim();
  const flightNumber = carrier.length === 2 ? normalizeFlightNumber(carrier + flight) : null;
  const day = text.slice(44, 47);
  const dayOfYear = Number(day);

  if (!origin || !destination || origin === destination || !flightNumber ||
      !/^\d{3}$/.test(day) || dayOfYear < 1 || dayOfYear > 366) {
    return { ok: false, reason: "fields" };
  }

  return { ok: true, origin, destination, flightNumber, dayOfYear };
}

export function dateFromBarcodeDay(year: number, dayOfYear: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999 ||
      !Number.isInteger(dayOfYear) || dayOfYear < 1 || dayOfYear > 366) return null;

  const date = new Date(Date.UTC(year, 0, dayOfYear));
  return date.getUTCFullYear() === year ? date.toISOString().slice(0, 10) : null;
}
