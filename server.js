const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

loadEnv();

const db = require("./db");
const { renderLogin, renderDashboard } = require("./admin/pages");

const PORT = Number(process.env.PORT || 8010);
const ROOT = __dirname;
const DATABOWL_ENDPOINT = "https://neo.databowl.com/api/v1/lead";
const DATABOWL_CAMPAIGN_ID = process.env.DATABOWL_CAMPAIGN_ID || "";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 heures
const COOKIE_NAME = "lexus_admin";

const LANDING_ROUTES = {
  "/modele-lbx": "index.html",
  "/modele-nx": "nx.html"
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

// --------------------------------------------------------------------------
// .env minimaliste (pas de dependance)
// --------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// --------------------------------------------------------------------------
// Helpers HTTP
// --------------------------------------------------------------------------
function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendHtml(res, status, html) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  return raw ? JSON.parse(raw) : {};
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket.remoteAddress || "";
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

// --------------------------------------------------------------------------
// Sessions (cookie signe HMAC, sans stockage serveur)
// --------------------------------------------------------------------------
function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function createSessionToken(user) {
  const payload = JSON.stringify({ u: user, exp: Date.now() + SESSION_TTL_MS });
  const b64 = Buffer.from(payload).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [b64, sig] = token.split(".");
  const expected = sign(b64);
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf-8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function isAuthed(req) {
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[COOKIE_NAME]) !== null;
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`);
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// --------------------------------------------------------------------------
// Leads
// --------------------------------------------------------------------------
const REQUIRED_FIELDS = ["civilite", "prenom", "nom", "email", "telephone"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detectPage(lead) {
  const fromUrl = String(lead.page_url || "").toLowerCase();
  if (fromUrl.includes("modele-nx") || fromUrl.includes("nx.html")) return "NX";
  if (fromUrl.includes("modele-lbx") || fromUrl.includes("index.html")) return "LBX";
  const model = String(lead.modele || "").toLowerCase();
  return model.includes("nx") ? "NX" : "LBX";
}

function validateLead(lead) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!String(lead[field] || "").trim()) errors.push(`${field} manquant`);
  }
  if (lead.email && !EMAIL_RE.test(String(lead.email))) errors.push("email invalide");
  if (!lead.rgpd) errors.push("RGPD non accepte");
  return errors;
}

function buildDatabowlPayload(lead, page) {
  const params = new URLSearchParams();
  const modelName = page === "NX" ? "Lexus NX" : "Lexus LBX";
  const offerCode = lead.offre || (page === "NX" ? "NX_PART_JUIN_2026" : "LBX_PART_JUIN_2026");

  params.set("cid", "628");
  params.set("sid", "2");
  params.set("f_1_email", lead.email || "");
  params.set("f_2_title", lead.civilite || "");
  params.set("f_3_firstname", lead.prenom || "");
  params.set("f_4_lastname", lead.nom || "");
  params.set("f_12_phone1", lead.telephone || "");
  params.set("f_859_campaignid", DATABOWL_CAMPAIGN_ID);
  params.set("f_1354_wishedmodellexus", modelName);
  params.set("f_760_wishedbrand", "Lexus");
  params.set("f_769_wishedfinancingtype", "LLD");
  params.set(
    "f_762_comments",
    [
      `Landing ${modelName} JPO`,
      `Offre: ${offerCode}`,
      lead.concession ? `Concession souhaitee: ${lead.concession}` : "",
      `RGPD: ${lead.rgpd ? "true" : "false"}`,
      `URL: ${lead.page_url || ""}`
    ]
      .filter(Boolean)
      .join(" | ")
  );

  return params;
}

// Appel Databowl independant : ne bloque jamais l'enregistrement en base.
async function pushToDatabowl(id, lead, page) {
  if (!DATABOWL_CAMPAIGN_ID) {
    db.updateSubmissionDatabowl(id, "not_configured", null);
    return;
  }
  try {
    const response = await fetch(DATABOWL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: buildDatabowlPayload(lead, page).toString()
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }
    if (response.ok && json.result === "created") {
      db.updateSubmissionDatabowl(id, "created", json.lead_id || "");
    } else {
      db.updateSubmissionDatabowl(id, "rejected", null);
    }
  } catch (error) {
    db.updateSubmissionDatabowl(id, "error", null);
  }
}

async function handleLead(req, res) {
  let lead;
  try {
    lead = await readJson(req);
  } catch {
    return sendJson(res, 400, { result: "error", message: "Requete invalide." });
  }

  try {
    const page = detectPage(lead);
    const ip = getClientIp(req);
    const referer = req.headers["referer"] || req.headers["referrer"] || "";
    const errors = validateLead(lead);

    const base = {
      page,
      page_url: lead.page_url,
      civilite: lead.civilite,
      prenom: lead.prenom,
      nom: lead.nom,
      email: lead.email,
      telephone: lead.telephone,
      concession: lead.concession,
      modele: lead.modele,
      offre: lead.offre,
      rgpd: lead.rgpd,
      ip,
      referer
    };

    // Echec de validation cote serveur : enregistre puis refuse.
    if (errors.length) {
      db.insertSubmission({
        ...base,
        status: "server_validation_failed",
        error: errors.join(", ")
      });
      return sendJson(res, 400, { result: "error", message: "Champs obligatoires manquants." });
    }

    // Soumission valide : enregistree comme succes (independamment de Databowl).
    const id = db.insertSubmission({ ...base, status: "success" });

    // Databowl est appele en parallele, sans bloquer la reponse de succes.
    pushToDatabowl(id, lead, page).catch(() => {});

    return sendJson(res, 200, { result: "created", id });
  } catch (error) {
    console.error("[api/lead]", error);
    return sendJson(res, 500, {
      result: "error",
      message: "Erreur interne. Merci de reessayer dans quelques instants."
    });
  }
}

// Echecs de validation cote navigateur (avant l'envoi reseau du lead).
async function handleTrack(req, res) {
  let payload;
  try {
    payload = await readJson(req);
  } catch {
    return sendJson(res, 400, { result: "error" });
  }
  const page = detectPage(payload);
  db.insertSubmission({
    status: "client_validation_failed",
    page,
    page_url: payload.page_url,
    civilite: payload.civilite,
    prenom: payload.prenom,
    nom: payload.nom,
    email: payload.email,
    telephone: payload.telephone,
    concession: payload.concession,
    modele: payload.modele,
    offre: payload.offre,
    rgpd: payload.rgpd,
    ip: getClientIp(req),
    referer: req.headers["referer"] || "",
    error: Array.isArray(payload.missing) ? payload.missing.join(", ") : payload.error || ""
  });
  return sendJson(res, 200, { result: "ok" });
}

// --------------------------------------------------------------------------
// Admin
// --------------------------------------------------------------------------
function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  res.writeHead(302, { Location: "/admin/login" });
  res.end();
  return false;
}

async function handleLogin(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { ok: false, message: "Requete invalide." });
  }
  const userOk = safeEqual(body.user || "", ADMIN_USER);
  const passOk = safeEqual(body.password || "", ADMIN_PASSWORD);
  if (!userOk || !passOk) {
    return sendJson(res, 401, { ok: false, message: "Identifiants incorrects." });
  }
  setSessionCookie(res, createSessionToken(ADMIN_USER));
  return sendJson(res, 200, { ok: true });
}

function handleAdminApi(req, res, url) {
  if (!isAuthed(req)) return sendJson(res, 401, { error: "non authentifie" });

  const parts = url.pathname.split("/").filter(Boolean); // ['api','admin','submissions', :id?]
  const resource = parts[2];
  const idPart = parts[3];

  if (resource === "stats" && req.method === "GET") {
    return sendJson(res, 200, db.getStats());
  }

  if (resource === "settings" && parts[3] === "analytics") {
    if (req.method === "GET") {
      return sendJson(res, 200, db.getAnalyticsSettings());
    }
    if (req.method === "PUT" || req.method === "PATCH") {
      return readJson(req)
        .then((body) => {
          const id = String(body.measurement_id || "").trim();
          const enabled = !!body.enabled;
          if (enabled && id && !/^G-[A-Z0-9]+$/i.test(id)) {
            return sendJson(res, 400, {
              ok: false,
              message: "ID de mesure invalide (format attendu : G-XXXXXXXXXX)."
            });
          }
          db.setAnalyticsSettings({ enabled, measurement_id: id });
          return sendJson(res, 200, { ok: true, ...db.getAnalyticsSettings() });
        })
        .catch(() => sendJson(res, 400, { ok: false, message: "Requete invalide." }));
    }
  }

  if (resource === "submissions") {
    if (req.method === "GET" && !idPart) {
      const filters = {
        page: url.searchParams.get("page") || undefined,
        status: url.searchParams.get("status") || undefined,
        date_from: url.searchParams.get("date_from") || undefined,
        date_to: url.searchParams.get("date_to") || undefined,
        limit: url.searchParams.get("limit") || undefined,
        offset: url.searchParams.get("offset") || undefined,
        sort_by: url.searchParams.get("sort_by") || undefined,
        sort_dir: url.searchParams.get("sort_dir") || undefined
      };
      return sendJson(res, 200, db.listSubmissions(filters));
    }

    const id = Number(idPart);
    if (idPart && !Number.isInteger(id)) {
      return sendJson(res, 400, { error: "id invalide" });
    }

    if (req.method === "DELETE" && id) {
      const changes = db.deleteSubmission(id);
      return sendJson(res, changes ? 200 : 404, { ok: !!changes });
    }

    if ((req.method === "PUT" || req.method === "PATCH") && id) {
      return readJson(req)
        .then((fields) => {
          const changes = db.updateSubmission(id, fields);
          if (!changes) return sendJson(res, 404, { ok: false, message: "Ligne introuvable ou aucun champ modifiable." });
          return sendJson(res, 200, { ok: true, submission: db.getSubmission(id) });
        })
        .catch(() => sendJson(res, 400, { ok: false, message: "Requete invalide." }));
    }
  }

  return sendJson(res, 404, { error: "not found" });
}

// --------------------------------------------------------------------------
// Static
// --------------------------------------------------------------------------
function buildGaSnippet(measurementId) {
  const id = String(measurementId || "").trim();
  if (!id) return "";
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${id}');
</script>`;
}

function injectGaScript(html) {
  const config = db.getAnalyticsSettings();
  if (!config.enabled || !config.measurement_id) return html;
  const snippet = buildGaSnippet(config.measurement_id);
  if (!snippet) return html;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${snippet}\n</head>`);
  }
  return html;
}

function sendHtmlFile(res, filePath) {
  fs.readFile(filePath, "utf-8", (error, content) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(injectGaScript(content));
  });
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(content);
  });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);

  if (urlPath === "/") {
    return sendHtmlFile(res, path.join(ROOT, "home.html"));
  }

  const landingFile = LANDING_ROUTES[urlPath];
  if (landingFile) {
    const landingPath = path.join(ROOT, landingFile);
    if (!landingPath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    return sendHtmlFile(res, landingPath);
  }

  const isAsset = urlPath.startsWith("/assets/");
  if (!isAsset) {
    res.writeHead(404);
    return res.end("Not found");
  }

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  sendFile(res, filePath);
}

function runAsync(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error(`[${req.method} ${req.url}]`, error);
      if (!res.headersSent) {
        sendJson(res, 500, { result: "error", message: "Erreur interne." });
      }
    });
  };
}

// --------------------------------------------------------------------------
// Routing
// --------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API publiques
  if (req.method === "POST" && pathname === "/api/lead") return runAsync(handleLead)(req, res);
  if (req.method === "POST" && pathname === "/api/track") return runAsync(handleTrack)(req, res);

  // Auth
  if (req.method === "POST" && pathname === "/admin/login") return runAsync(handleLogin)(req, res);
  if (pathname === "/admin/logout") {
    clearSessionCookie(res);
    res.writeHead(302, { Location: "/admin/login" });
    return res.end();
  }

  // Pages admin
  if (req.method === "GET" && pathname === "/admin/login") {
    if (isAuthed(req)) {
      res.writeHead(302, { Location: "/admin/dashboard" });
      return res.end();
    }
    return sendHtml(res, 200, renderLogin());
  }
  if (req.method === "GET" && (pathname === "/admin" || pathname === "/admin/dashboard")) {
    if (!requireAuth(req, res)) return;
    return sendHtml(res, 200, renderDashboard());
  }

  // API admin
  if (pathname.startsWith("/api/admin/")) return handleAdminApi(req, res, url);

  // Fichiers statiques (landing pages + assets)
  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Lexus landing + admin server running on http://127.0.0.1:${PORT}`);
  console.log(`  Landings : /modele-lbx (LBX) · /modele-nx (NX)`);
  console.log(`  Admin    : /admin/login`);
  if (!DATABOWL_CAMPAIGN_ID) {
    console.log("  [info] DATABOWL_CAMPAIGN_ID absent : leads enregistres en base mais non envoyes a Databowl.");
  }
});
