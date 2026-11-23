import assert from "node:assert/strict";
import test from "node:test";
import { MAX_BARCODE_BYTES, dateFromBarcodeDay, parseBoardingPassText } from "../lib/flight/bcbp.ts";
import { flightDateBounds, normalizeAirport, normalizeFlightNumber, parseFlightClaim, validClaimId } from "../lib/flight/validation.ts";

const demo = "M1" + "SYNTHETIC/TEST".padEnd(20) + "E" + "TESTREF" +
  "DEL" + "BOM" + "AI " + "0202 " + "366" + "Y" + "123A" + "00001" + "1" + "00";
const now = new Date("2026-11-23T23:30:00Z");

test("BCBP returns only minimal fields and accepts bounded optional sections", () => {
  assert.equal(demo.length, 60);
  const expected = { ok: true, origin: "DEL", destination: "BOM", flightNumber: "AI202", dayOfYear: 366 };
  assert.deepEqual(parseBoardingPassText(demo + "\r\n"), expected);
  assert.deepEqual(parseBoardingPassText(demo.slice(0, 58) + "02XX^A02XY"), expected);
  assert.doesNotMatch(JSON.stringify(expected), /SYNTHETIC|TESTREF|123A/);
});

test("BCBP rejects malformed, unsupported, truncated and oversized input", () => {
  for (const value of [
    "", demo.slice(0, 59), demo + "\n\n", demo + "\u0000",
    demo.slice(0, 58) + "a?", demo.slice(0, 58) + "FF", demo + "^AZZ", demo + "^A02X",
  ]) assert.deepEqual(parseBoardingPassText(value), { ok: false, reason: "format" });
  assert.deepEqual(parseBoardingPassText("M2" + demo.slice(2)), { ok: false, reason: "segments" });
  assert.deepEqual(parseBoardingPassText(demo.replace("366", "000")), { ok: false, reason: "fields" });
  assert.deepEqual(parseBoardingPassText(demo.replace("BOM", "DEL")), { ok: false, reason: "fields" });
  assert.deepEqual(parseBoardingPassText(demo.padEnd(MAX_BARCODE_BYTES + 1)), { ok: false, reason: "size" });
});

test("departure dates use calendar days without guessing the year or applying a timezone offset", () => {
  assert.equal(dateFromBarcodeDay(2028, 366), "2028-12-31");
  assert.equal(dateFromBarcodeDay(2026, 366), null);
  assert.equal(dateFromBarcodeDay(2027, 1), "2027-01-01");
  assert.equal(dateFromBarcodeDay(2027, 0), null);
  assert.equal(dateFromBarcodeDay(NaN, 1), null);
  assert.deepEqual(flightDateBounds(now), { min: "2026-11-21", max: "2027-11-24" });
  assert.deepEqual(flightDateBounds(new Date("2027-01-01T00:00:00Z")), { min: "2026-12-30", max: "2028-01-02" });
});

test("server normalizes codes and rejects ambiguous form fields, invalid dates and absent consent", () => {
  assert.equal(normalizeFlightNumber(" 6e 0001a "), "6E1A");
  for (const value of ["0001", "AI 0000", "AI99999", "AAA1", "ß1", "AI\t202"]) {
    assert.equal(normalizeFlightNumber(value), null);
  }
  assert.equal(normalizeAirport(" del "), "DEL");
  assert.equal(normalizeAirport("ßh"), null);

  const form = new FormData();
  for (const [name, value] of Object.entries({
    flight_number: "ai 0202", departure_date: "2026-11-21", origin: "del", destination: "bom",
    source: "manual", consent: "on", user_id: "ignored", status: "ignored",
  })) form.set(name, value);
  assert.deepEqual(parseFlightClaim(form, now), {
    flight_number: "AI202", departure_date: "2026-11-21", origin: "DEL", destination: "BOM", source: "manual",
  });
  for (const date of ["2026-11-20", "2027-11-25", "2027-02-29", "2027-04-31", "11/23/2026"]) {
    form.set("departure_date", date);
    assert.equal(parseFlightClaim(form, now), null);
  }
  form.set("departure_date", "2027-11-24");
  assert.ok(parseFlightClaim(form, now));
  form.append("origin", "AAA");
  assert.equal(parseFlightClaim(form, now), null);
  form.set("origin", "DEL");
  form.delete("consent");
  assert.equal(parseFlightClaim(form, now), null);
  assert.equal(validClaimId("00000000-0000-4000-8000-000000000001"), true);
  assert.equal(validClaimId("../not-a-claim"), false);
});
