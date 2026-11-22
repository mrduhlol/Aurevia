import assert from "node:assert/strict";
import test from "node:test";
import { accountDestination, formString, validEmail, validNewPassword, validOtp } from "../lib/auth/validation.ts";
import { parseProfile } from "../lib/profile/validation.ts";
import { readSupabaseConfig } from "../lib/supabase/config.ts";

test("auth redirects accept only the two account destinations", () => {
  assert.equal(accountDestination("/profile"), "/profile");
  for (const value of [null, [], "/dashboard", "/profile?x=1", "//outside.invalid", "https://outside.invalid", "/\\outside.invalid"]) {
    assert.equal(accountDestination(value), "/dashboard");
  }
});

test("auth input validation preserves passwords and rejects malformed codes", () => {
  const form = new FormData();
  form.set("password", "  pass phrase  ");
  assert.equal(formString(form, "password"), "  pass phrase  ");
  assert.equal(formString(form, "missing"), "");
  assert.equal(validEmail("person@example.invalid"), true);
  assert.equal(validEmail("person@example.invalid\nsecond"), false);
  assert.equal(validOtp("001234"), true);
  assert.equal(validOtp("01234a"), false);
  assert.equal(validNewPassword("short"), false);
  assert.equal(validNewPassword("🛫".repeat(18)), true);
  assert.equal(validNewPassword("🛫".repeat(19)), false);
  assert.equal(validNewPassword("a".repeat(12) + "\0"), false);
});

test("Supabase config requires an HTTPS origin and a publishable key", () => {
  const key = "sb_publishable_fixture";
  assert.deepEqual(readSupabaseConfig(" https://fixture.supabase.co/ ", key), {
    url: "https://fixture.supabase.co", publishableKey: key,
  });
  for (const url of ["", "http://fixture.invalid", "https://user@fixture.invalid", "https://fixture.invalid/path", "https://fixture.invalid/?x=1", "https://fixture.invalid/#x"]) {
    assert.equal(readSupabaseConfig(url, key), null);
  }
  assert.equal(readSupabaseConfig("https://fixture.invalid", "sb_secret_fixture"), null);
  assert.equal(readSupabaseConfig("https://fixture.invalid", ""), null);
});

test("profile validation normalizes display data and stores an explicit opt-in only", () => {
  const form = new FormData();
  form.set("display_name", "  Passenger  ");
  form.set("bio", "   ");
  form.set("user_id", "untrusted");
  assert.deepEqual(parseProfile(form), { display_name: "Passenger", bio: null, discoverable: false });
  form.set("discoverable", "on");
  form.set("bio", "First line\nSecond line");
  assert.deepEqual(parseProfile(form), { display_name: "Passenger", bio: "First line\nSecond line", discoverable: true });
  form.set("discoverable", "true");
  assert.equal(parseProfile(form), null);
  form.delete("discoverable");
  form.set("display_name", "🚀".repeat(60));
  assert.ok(parseProfile(form));
  form.set("bio", "x".repeat(241));
  assert.equal(parseProfile(form), null);
  form.set("bio", "Valid text");
  form.set("display_name", "Invalid\nName");
  assert.equal(parseProfile(form), null);
});
