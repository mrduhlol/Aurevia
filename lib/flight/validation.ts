export const FLIGHT_SOURCES = ["manual", "barcode_text"] as const;
export type FlightSource = (typeof FLIGHT_SOURCES)[number];

export type FlightDetails = {
  flight_number: string;
  departure_date: string;
  origin: string;
  destination: string;
};

export const CONSENT_VERSION = 1;
export const MAX_ACTIVE_FLIGHT_CLAIMS = 20;
const DAY_MS = 86_400_000;

export function normalizeFlightNumber(value: string) {
  if (value.length > 16) return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9 ]+$/.test(trimmed)) return null;
  const match = /^([A-Z0-9]{2}) *([0-9]{1,4})([A-Z]?)$/.exec(trimmed.toUpperCase());
  if (!match || !/[A-Z]/.test(match[1]) || Number(match[2]) === 0) return null;
  return match[1] + String(Number(match[2])) + match[3];
}

export function normalizeAirport(value: string) {
  if (value.length > 8) return null;
  const code = value.trim();
  return /^[A-Za-z]{3}$/.test(code) ? code.toUpperCase() : null;
}

export function flightDateBounds(now = new Date()) {
  const utcDay = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  return {
    min: new Date(utcDay - 2 * DAY_MS).toISOString().slice(0, 10),
    max: new Date(utcDay + 366 * DAY_MS).toISOString().slice(0, 10),
  };
}

export function validDepartureDate(value: string, bounds = flightDateBounds()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < bounds.min || value > bounds.max) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseFlightClaim(form: FormData, now = new Date()) {
  const fields = ["flight_number", "departure_date", "origin", "destination", "source", "consent"] as const;
  const entries = fields.map((field) => form.getAll(field));
  if (entries.some((values) => values.length !== 1 || typeof values[0] !== "string")) return null;

  const [number, departure_date, from, to, source, consent] = entries.map(([value]) => value as string);
  const flight_number = normalizeFlightNumber(number);
  const origin = normalizeAirport(from);
  const destination = normalizeAirport(to);

  if (!flight_number || !origin || !destination || origin === destination ||
      !validDepartureDate(departure_date, flightDateBounds(now)) ||
      (source !== "manual" && source !== "barcode_text") || consent !== "on") {
    return null;
  }

  return { flight_number, departure_date, origin, destination, source } satisfies FlightDetails & { source: FlightSource };
}

export function validClaimId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
}
