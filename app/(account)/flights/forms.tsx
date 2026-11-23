"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { submitFlightClaim } from "../../../lib/flight/actions";
import { dateFromBarcodeDay, MAX_BARCODE_BYTES, parseBoardingPassText } from "../../../lib/flight/bcbp";
import { validDepartureDate } from "../../../lib/flight/validation";
import { ActionForm } from "../form";

type Bounds = { min: string; max: string };
type ParsedPass = Extract<ReturnType<typeof parseBoardingPassText>, { ok: true }>;

function Consent() {
  return (
    <div className="privacy-choice">
      <label>
        <input type="checkbox" name="consent" aria-describedby="flight-consent" required />
        Save this private flight claim
      </label>
      <p id="flight-consent">
        Aurevia keeps the flight number, date, airports, and entry method until the claim expires after 30 days.
        You can delete the claim sooner. It will stay unverified.
      </p>
    </div>
  );
}

export function ManualFlightForm({ bounds }: { bounds: Bounds }) {
  const [details, setDetails] = useState({ flight_number: "", departure_date: "", origin: "", destination: "" });
  const update = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    setDetails((current) => ({ ...current, [name]: value }));
  };

  return (
    <ActionForm action={submitFlightClaim} submit="Save manual claim" pendingLabel="Saving claim…">
      <input type="hidden" name="source" value="manual" />
      <div className="flight-field-grid">
        <div className="account-field">
          <label htmlFor="flight-number">Flight number</label>
          <input id="flight-number" name="flight_number" value={details.flight_number} onChange={update}
            maxLength={16} autoCapitalize="characters" autoComplete="off" spellCheck={false}
            aria-describedby="flight-number-hint" required />
          <small id="flight-number-hint">Use the airline and flight number as printed, for example AI 202.</small>
        </div>
        <div className="account-field">
          <label htmlFor="departure-date">Local departure date</label>
          <input id="departure-date" type="date" name="departure_date" value={details.departure_date}
            onChange={update} min={bounds.min} max={bounds.max} aria-describedby="departure-date-hint" required />
          <small id="departure-date-hint">Use the calendar date at the departure airport.</small>
        </div>
        <div className="account-field">
          <label htmlFor="flight-origin">Origin airport</label>
          <input id="flight-origin" name="origin" value={details.origin} onChange={update} maxLength={3}
            autoCapitalize="characters" autoComplete="off" spellCheck={false} pattern="[A-Za-z]{3}"
            aria-describedby="flight-origin-hint" required />
          <small id="flight-origin-hint">Three letters, for example DEL.</small>
        </div>
        <div className="account-field">
          <label htmlFor="flight-destination">Destination airport</label>
          <input id="flight-destination" name="destination" value={details.destination} onChange={update} maxLength={3}
            autoCapitalize="characters" autoComplete="off" spellCheck={false} pattern="[A-Za-z]{3}"
            aria-describedby="flight-destination-hint" required />
          <small id="flight-destination-hint">Three letters, for example BOM.</small>
        </div>
      </div>
      <Consent />
    </ActionForm>
  );
}

const barcodeErrors = {
  size: "The decoded barcode text is too long. Use a plain-text file up to 512 bytes or enter the flight manually.",
  format: "This isn’t supported boarding-pass barcode text. Try a decoded single-flight barcode or enter the flight manually.",
  segments: "This barcode contains multiple flights. Enter the segment you want to claim manually.",
  fields: "The barcode is missing supported flight details. Enter the flight manually.",
};

export function BarcodeFlightForm({ bounds }: { bounds: Bounds }) {
  const text = useRef<HTMLTextAreaElement>(null);
  const preview = useRef<HTMLHeadingElement>(null);
  const [pass, setPass] = useState<ParsedPass | null>(null);
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  const parse = (value: string) => {
    const result = parseBoardingPassText(value);
    setYear("");
    if (!result.ok) {
      setPass(null);
      setError(barcodeErrors[result.reason]);
      return;
    }
    setPass(result);
    setError("");
    requestAnimationFrame(() => preview.current?.focus());
  };

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setPass(null);
    setError("");
    if (text.current) text.current.value = "";
    if (file.size > MAX_BARCODE_BYTES) {
      setError(barcodeErrors.size);
      return;
    }
    if (!/\.txt$/i.test(file.name) || (file.type && file.type !== "text/plain")) {
      setError("Choose a plain-text .txt file containing decoded barcode text.");
      return;
    }
    setReading(true);
    try {
      parse(await file.text());
    } catch {
      setError("The file couldn’t be read. Try another text file or enter the flight manually.");
    } finally {
      setReading(false);
    }
  };

  const firstYear = Number(bounds.min.slice(0, 4));
  const lastYear = Number(bounds.max.slice(0, 4));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const date = pass && year ? dateFromBarcodeDay(Number(year), pass.dayOfYear) : null;
  const dateAllowed = date !== null && validDepartureDate(date, bounds);

  return (
    <div className="flight-barcode">
      <div className="account-field">
        <label htmlFor="barcode-text">Decoded barcode text</label>
        <textarea id="barcode-text" ref={text} rows={3} maxLength={MAX_BARCODE_BYTES}
          autoComplete="off" autoCorrect="off" spellCheck={false} aria-describedby="barcode-hint"
          onPaste={(event) => {
            const input = event.currentTarget;
            const remaining = input.value.length - (input.selectionEnd - input.selectionStart);
            if (remaining + event.clipboardData.getData("text").length > MAX_BARCODE_BYTES) {
              event.preventDefault();
              setPass(null);
              setError(barcodeErrors.size);
            }
          }} />
        <small id="barcode-hint">Read on this device. The original text is cleared after reading.</small>
      </div>
      <button type="button" className="primary-link" disabled={reading} onClick={() => {
        const input = text.current;
        if (!input) return;
        const value = input.value;
        input.value = "";
        parse(value);
      }}>Read barcode text</button>
      <label className="account-field flight-file">
        Or open a decoded .txt file
        <input type="file" accept=".txt,text/plain" onChange={readFile} disabled={reading} />
      </label>
      {reading && <p role="status">Reading on this device…</p>}
      {error && <p role="alert" className="account-error">{error}</p>}
      {pass && (
        <div className="flight-preview">
          <h3 ref={preview} tabIndex={-1}>Check the extracted details</h3>
          <p>{pass.flightNumber} from {pass.origin} to {pass.destination}</p>
          <div className="account-field">
            <label htmlFor="barcode-year">Departure year</label>
            <select id="barcode-year" value={year} onChange={(event) => setYear(event.target.value)}
              aria-describedby="barcode-year-hint">
              <option value="">Choose the year on your pass</option>
              {years.map((option) => <option key={option}>{option}</option>)}
            </select>
            <small id="barcode-year-hint">The barcode day does not include a reliable year.</small>
          </div>
          <p role="status">{dateAllowed ? `Local departure date: ${date}`
            : year ? "That year does not produce an eligible departure date. Check your pass or enter it manually." : ""}</p>
          {dateAllowed && (
            <ActionForm action={submitFlightClaim} submit="Save barcode-assisted claim" pendingLabel="Saving claim…">
              <input type="hidden" name="source" value="barcode_text" />
              <input type="hidden" name="flight_number" value={pass.flightNumber} />
              <input type="hidden" name="origin" value={pass.origin} />
              <input type="hidden" name="destination" value={pass.destination} />
              <input type="hidden" name="departure_date" value={date} />
              <Consent />
            </ActionForm>
          )}
        </div>
      )}
    </div>
  );
}
