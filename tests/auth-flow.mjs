import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const flightsEnabled = process.env.AUREVIA_TEST_FLIGHTS_DISABLED !== "1";
const email = "account@example.invalid";
const initialPassword = "fixture phrase one";
const replacementPassword = "fixture phrase two";
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email,
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

function mockSupabase(tls) {
  const calls = [];
  const tokens = new Set();
  const claims = new Map();
  let password;
  let profile;
  let confirmed = false;
  let sequence = 0;
  let canRefresh = true;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const session = (expiresIn = 3600) => {
    const access_token = [
      encode({ alg: "HS256", typ: "JWT" }),
      encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + expiresIn, jti: ++sequence }),
      Buffer.from("local fixture signature").toString("base64url"),
    ].join(".");
    tokens.add(access_token);
    return { access_token, refresh_token: "local-refresh", expires_in: expiresIn, token_type: "bearer", user };
  };

  const server = createServer(tls, async (request, response) => {
    try {
      const url = new URL(request.url, "https://127.0.0.1");
      const route = url.pathname;
      const method = request.method;
      const auth = tokens.has(request.headers.authorization?.slice(7));
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const payload = chunks.length ? JSON.parse(Buffer.concat(chunks)) : {};
      const grant = url.searchParams.get("grant_type");
      calls.push({ method, route, grant, type: payload.type });
      const send = (status, body) => {
        response.writeHead(status, { "Content-Type": "application/json" });
        response.end(body === undefined ? undefined : JSON.stringify(body));
      };
      if (route === "/rest/v1/flight_claims") {
        if (!auth) return send(401, { code: "insufficient_privilege" });
        assert.equal(url.searchParams.get("user_id"), `eq.${user.id}`);
        if (method === "DELETE") {
          const id = url.searchParams.get("id")?.slice(3);
          claims.delete(id);
          return send(204);
        }
        if (method === "HEAD") {
          response.writeHead(200, { "Content-Range": `*/${claims.size}` });
          return response.end();
        }
        return send(200, [...claims.values()]);
      }
      if (route === "/rest/v1/rpc/submit_flight_claim") {
        if (!auth) return send(401, { code: "insufficient_privilege" });
        assert.deepEqual(Object.keys(payload).sort(), [
          "p_consent_version", "p_departure_date", "p_destination",
          "p_flight_number", "p_origin", "p_source",
        ]);
        assert.equal(payload.p_consent_version, 1);
        if ([...claims.values()].some((claim) => claim.flight_number === payload.p_flight_number)) {
          return send(200, "duplicate");
        }
        const id = crypto.randomUUID();
        claims.set(id, {
          id, flight_number: payload.p_flight_number, departure_date: payload.p_departure_date,
          origin: payload.p_origin, destination: payload.p_destination,
          source: payload.p_source, status: "unverified", expires_at: "2099-01-01T00:00:00Z",
        });
        return send(200, "saved");
      }
      const fail = (code, status = 400) => send(status, { code, error_code: code, msg: "Fixture-only provider failure" });

      if (route === "/auth/v1/signup" && method === "POST") {
        if (payload.email !== email) return fail("validation_failed");
        password = payload.password;
        return send(200, user);
      }
      if (route === "/auth/v1/resend" || route === "/auth/v1/recover") {
        return send(200, {});
      }
      if (route === "/auth/v1/verify") {
        if (payload.email !== email) return fail("otp_expired", 403);
        if (payload.type === "email" && payload.token === "123456") {
          confirmed = true;
          return send(200, session());
        }
        if (payload.type === "recovery" && payload.token === "654321" && confirmed) {
          return send(200, session());
        }
        return fail("otp_expired", 403);
      }
      if (route === "/auth/v1/token" && grant === "password") {
        if (!confirmed || payload.email !== email || payload.password !== password) {
          return fail("invalid_credentials");
        }
        return send(200, session(1));
      }
      if (route === "/auth/v1/token" && grant === "refresh_token") {
        return canRefresh && payload.refresh_token === "local-refresh"
          ? send(200, session())
          : fail("refresh_token_not_found");
      }
      if (route === "/auth/v1/user") {
        if (!auth) return fail("bad_jwt", 401);
        if (method === "PUT") password = payload.password;
        return send(200, user);
      }
      if (route === "/auth/v1/logout") {
        tokens.delete(request.headers.authorization?.slice(7));
        return send(204);
      }
      if (route === "/rest/v1/profiles") {
        if (!auth) return fail("insufficient_privilege", 401);
        if (method === "POST") {
          assert.equal(payload.user_id, user.id);
          assert.equal("avatar_path" in payload, false);
          profile = payload;
          return send(201);
        }
        assert.equal(url.searchParams.get("user_id"), `eq.${user.id}`);
        return send(200, profile ? [profile] : []);
      }
      return fail("unhandled_fixture_route", 404);
    } catch (error) {
      response.destroy(error);
    }
  });
  return { server, calls, getProfile: () => profile, getClaims: () => [...claims.values()], revokeRefresh: () => { canRefresh = false; } };
}

function cookieJar() {
  const cookies = new Map();
  return {
    header: () => Array.from(cookies, ([name, value]) => `${name}=${value}`).join("; "),
    update(response) {
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.slice(0, cookie.indexOf(";"));
        const index = pair.indexOf("=");
        const name = pair.slice(0, index);
        const value = pair.slice(index + 1);
        assert.match(cookie, /HttpOnly/i);
        assert.match(cookie, /SameSite=Lax/i);
        assert.match(cookie, /Secure/i);
        if (value) cookies.set(name, value);
        else cookies.delete(name);
      }
    },
  };
}

async function waitForApp(origin, child) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error("The production app exited during startup.");
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error("The production app did not start.");
}

async function exercise(origin, mock) {
  const jar = cookieJar();
  const request = async (path, options = {}) => {
    const response = await fetch(origin + path, {
      redirect: "manual",
      ...options,
      headers: { cookie: jar.header(), ...options.headers },
    });
    jar.update(response);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    return response;
  };

  const submit = async (path, button, values) => {
    const page = await request(path);
    assert.equal(page.status, 200);
    const html = await page.text();
    const form = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/g)]
      .map(([match]) => match)
      .find((match) => match.includes(`>${button}</button>`));
    assert.ok(form, `Missing ${button} form at ${path}`);
    const data = new FormData();
    for (const [tag] of form.matchAll(/<input\b[^>]*>/g)) {
      const name = tag.match(/\bname="([^"]+)"/)?.[1];
      if (name?.startsWith("$ACTION_")) {
        const value = tag.match(/\bvalue="([^"]*)"/)?.[1] ?? "";
        data.set(name, value.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
      }
    }
    assert.ok(data.keys().next().value?.startsWith("$ACTION_"), "Missing server action metadata");
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return request(path, { method: "POST", body: data, headers: { origin } });
  };

  const redirects = (response, path) => {
    assert.equal(response.status, 303);
    assert.equal(new URL(response.headers.get("location"), origin).href, origin + path);
  };

  const unauthorized = await request("/profile");
  assert.equal(unauthorized.status, 307);
  assert.equal(unauthorized.headers.get("location"), "/sign-in?next=/profile");
  const flightUnauthorized = await request("/flights?method=barcode");
  assert.equal(flightUnauthorized.status, 307);
  assert.equal(flightUnauthorized.headers.get("location"), "/sign-in?next=/flights");
  assert.equal(mock.calls.length, 0, "An anonymous visit contacted the provider");

  redirects(await submit("/sign-up", "Create account", { email, password: initialPassword }), "/auth/confirm?sent=1");
  assert.equal(jar.header(), "");
  assert.match(await (await submit("/auth/confirm?resend=1", "Send new code", { email })).text(), /If this address needs confirmation/);

  const invalid = await submit("/auth/confirm", "Confirm email", { email, code: "999999" });
  assert.match(await invalid.text(), /That code could not be verified/);
  assert.equal(jar.header(), "");
  redirects(await submit("/auth/confirm", "Confirm email", { email, code: "123456" }), "/dashboard");
  assert.match(jar.header(), /^sb-/);

  assert.match(await (await request("/profile")).text(), /Create your profile/);
  const saved = await submit("/profile", "Create profile", {
    display_name: "Fixture profile", bio: "A private bio", user_id: "untrusted",
  });
  assert.match(await saved.text(), /Profile saved/);
  assert.equal(mock.getProfile().discoverable, false);
  assert.match(await (await request("/profile")).text(), /Fixture profile/);

  const edited = await submit("/profile", "Save changes", {
    display_name: "Updated fixture profile", bio: "", discoverable: "on",
  });
  assert.match(await edited.text(), /Profile saved/);
  assert.equal(mock.getProfile().discoverable, true);

  if (flightsEnabled) {
    const flightPage = "/flights?method=manual";
    const claim = {
      flight_number: "ai 0202", departure_date: new Date().toISOString().slice(0, 10),
      origin: "del", destination: "bom", consent: "on", source: "manual",
    };
    assert.match(await (await request(flightPage)).text(), /You have no active flight claims/);
    const missingConsent = await submit(flightPage, "Save manual claim", { ...claim, consent: "" });
    assert.match(await missingConsent.text(), /Check the flight number/);
    assert.deepEqual(mock.getClaims(), []);
    const savedClaim = await submit(flightPage, "Save manual claim", {
      ...claim, user_id: "untrusted", status: "verified", raw_barcode: "SYNTHETIC_ONLY",
    });
    assert.match(await savedClaim.text(), /Flight claim saved as unverified/);
    assert.equal(mock.getClaims()[0].flight_number, "AI202");
    assert.equal(mock.getClaims()[0].status, "unverified");
    const replay = await submit(flightPage, "Save manual claim", { ...claim, source: "barcode_text" });
    assert.match(await replay.text(), /already saved this flight/);
    assert.equal(mock.getClaims().length, 1);
    assert.match(await (await request("/dashboard")).text(), /1 active unverified claim/);
    const deletion = await submit("/flights", "Confirm deletion", { claim_id: mock.getClaims()[0].id });
    assert.ok(deletion.ok);
    assert.deepEqual(mock.getClaims(), []);
    assert.match(await (await request("/flights")).text(), /You have no active flight claims/);
  } else {
    const disabled = await request("/flights?method=manual");
    assert.match(await disabled.text(), /Flight claims are unavailable on this installation/);
    assert.equal(mock.calls.some((entry) => entry.route.startsWith("/rest/v1/flight_claims")), false);
  }

  redirects(await submit("/dashboard", "Sign out", {}), "/sign-in");
  assert.equal(jar.header(), "");
  redirects(await submit("/sign-in", "Sign in", {
    email, password: initialPassword, next: "https://outside.invalid/",
  }), "/dashboard");
  // Allow for the SDK rounding its one-second fixture expiry to whole seconds.
  await delay(2100);
  const refreshed = await request("/dashboard");
  assert.match(await refreshed.text(), /Your dashboard/);
  assert.ok(mock.calls.some((entry) => entry.grant === "refresh_token"), "Proxy did not refresh the expired session");
  assert.ok(refreshed.headers.getSetCookie().length > 0, "Refresh cookies were not forwarded");

  redirects(await submit("/dashboard", "Sign out", {}), "/sign-in");
  redirects(await submit("/forgot-password", "Send recovery code", { email: "unknown@example.invalid" }), "/reset-password?sent=1");
  redirects(await submit("/forgot-password", "Send recovery code", { email }), "/reset-password?sent=1");
  const wrongCode = await submit("/reset-password", "Change password", {
    email, code: "999999", password: replacementPassword, password_confirmation: replacementPassword,
  });
  assert.match(await wrongCode.text(), /That code could not be verified/);
  redirects(await submit("/reset-password", "Change password", {
    email, code: "654321", password: replacementPassword, password_confirmation: replacementPassword,
  }), "/sign-in?reset=1");
  assert.equal(jar.header(), "", "Recovery issued a browser session");

  const oldPassword = await submit("/sign-in", "Sign in", { email, password: initialPassword });
  assert.match(await oldPassword.text(), /Sign-in failed/);
  redirects(await submit("/sign-in", "Sign in", { email, password: replacementPassword, next: "/profile" }), "/profile");
  assert.ok(mock.calls.some((entry) => entry.method === "PUT" && entry.route === "/auth/v1/user"));
  assert.ok(mock.calls.some((entry) => entry.type === "recovery"));

  mock.revokeRefresh();
  // Allow for the SDK rounding its one-second fixture expiry to whole seconds.
  await delay(2100);
  const revoked = await request("/profile");
  assert.equal(revoked.status, 307);
  assert.equal(revoked.headers.get("location"), "/sign-in?next=/profile");
  assert.equal(jar.header(), "", "Invalid refresh credentials were retained");
}

const directory = await mkdtemp(join(tmpdir(), "aurevia-auth-fixture-"));
let mock;
let child;
try {
  const cert = join(directory, "cert.pem");
  const key = join(directory, "key.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1", "-keyout", key, "-out", cert,
  ], { stdio: "ignore" });
  mock = mockSupabase({ key: await readFile(key), cert: await readFile(cert) });
  mock.server.listen(0, "127.0.0.1");
  await once(mock.server, "listening");
  const configuredPort = process.env.AUREVIA_TEST_PORT || "41734";
  const origin = `http://127.0.0.1:${configuredPort}`;
  child = spawn("./node_modules/.bin/next", ["start", "--hostname", "127.0.0.1", "--port", configuredPort], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      FLIGHT_CLAIMS_ENABLED: String(flightsEnabled),
      NODE_EXTRA_CA_CERTS: cert,
      SUPABASE_URL: `https://127.0.0.1:${mock.server.address().port}`,
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture",
    },
  });
  await waitForApp(origin, child);
  await exercise(origin, mock);
  console.log("Mock-backed production auth, session, profile, and flight claim checks passed.");
} finally {
  if (child && child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
  if (mock?.server.listening) {
    const closed = once(mock.server, "close");
    mock.server.close();
    await closed;
  }
  await rm(directory, { recursive: true, force: true });
}
