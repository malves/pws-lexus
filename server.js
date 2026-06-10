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
const POWERSPACE_ENDPOINT = "https://a.pwspace.com/ld";

// Identifiants techniques d'integration Databowl (communs aux deux pages).
const DATABOWL_CID = process.env.DATABOWL_CID || "628";
const DATABOWL_SID = process.env.DATABOWL_SID || "1189";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 heures
const COOKIE_NAME = "lexus_admin";
const CLICK_ID_COOKIE = "lexus_click_id";
const CLICK_ID_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 jours

const LANDING_ROUTES = {
  "/modele-lbx": "index.html",
  "/modele-nx": "nx.html",
  "/modele-chr": "chr.html",
  "/modele-yaris-cross": "yaris-cross.html"
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
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

function normalizeClickIdParam(key) {
  return String(key).toLowerCase().replace(/[-_]/g, "");
}

function extractClickIdFromQuery(searchParams) {
  for (const [key, value] of searchParams.entries()) {
    if (normalizeClickIdParam(key) !== "clickid") continue;
    const trimmed = String(value || "").trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function setClickIdCookie(res, clickId) {
  const encoded = encodeURIComponent(clickId);
  res.appendHeader(
    "Set-Cookie",
    `${CLICK_ID_COOKIE}=${encoded}; Path=/; SameSite=Lax; Max-Age=${CLICK_ID_MAX_AGE_SEC}`
  );
}

function syncClickIdCookieFromUrl(req, res, url) {
  const clickId = extractClickIdFromQuery(url.searchParams);
  if (clickId) setClickIdCookie(res, clickId);
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
const REQUIRED_FIELDS = ["civilite", "prenom", "nom", "email", "telephone", "concession"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIPCODE_RE = /^\d{5}$/;

function detectPage(lead) {
  const fromUrl = String(lead.page_url || "").toLowerCase();
  if (fromUrl.includes("modele-yaris-cross") || fromUrl.includes("yaris-cross.html")) return "YARIS";
  if (fromUrl.includes("modele-chr") || fromUrl.includes("chr.html")) return "CHR";
  if (fromUrl.includes("modele-nx") || fromUrl.includes("nx.html")) return "NX";
  if (fromUrl.includes("modele-lbx") || fromUrl.includes("index.html")) return "LBX";
  const model = String(lead.modele || "").toLowerCase();
  if (model.includes("yaris cross") || model.includes("yaris-cross")) return "YARIS";
  if (model.includes("c-hr+") || model.includes("c-hr") || model.includes("chr")) return "CHR";
  return model.includes("nx") ? "NX" : "LBX";
}

function getPageMeta(page) {
  const metas = {
    YARIS: {
      brand: "Toyota",
      model: "Toyota Yaris Cross",
      offer: "YARIS_CROSS_PART_JUIN_2026",
      landing: "Toyota Yaris Cross"
    },
    CHR: {
      brand: "Toyota",
      model: "Toyota C-HR+",
      offer: "CHR_PART_JUIN_2026",
      landing: "Toyota C-HR+"
    },
    NX: {
      brand: "Lexus",
      model: "Lexus NX",
      offer: "NX_PART_JUIN_2026",
      landing: "Lexus NX"
    },
    LBX: {
      brand: "Lexus",
      model: "Lexus LBX",
      offer: "LBX_PART_JUIN_2026",
      landing: "Lexus LBX"
    }
  };
  return metas[page] || metas.LBX;
}

function validateLead(lead) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (!String(lead[field] || "").trim()) errors.push(`${field} manquant`);
  }

  if (lead.email && !EMAIL_RE.test(String(lead.email))) {
    errors.push("email invalide");
  }

  if (lead.concession && !ZIPCODE_RE.test(String(lead.concession).trim())) {
    errors.push("code postal invalide");
  }

  if (!lead.rgpd) {
    errors.push("RGPD non accepte");
  }

  return errors;
}

function buildDatabowlPayload(lead, page, cfg) {
  const params = new URLSearchParams();
  const meta = getPageMeta(page);
  const offerCode = lead.offre || meta.offer;

  params.set("cid", DATABOWL_CID);
  params.set("sid", DATABOWL_SID);
  params.set("f_1_email", lead.email || "");
  params.set("f_2_title", lead.civilite || "");
  params.set("f_3_firstname", lead.prenom || "");
  params.set("f_4_lastname", lead.nom || "");
  params.set("f_12_phone1", lead.telephone || "");
  params.set("f_39_zipcode", String(lead.concession || "").trim());
  params.set("f_859_campaignid", cfg.campaign || "");
  params.set("f_1354_wishedmodellexus", meta.model);
  params.set("f_760_wishedbrand", meta.brand);
  params.set("f_769_wishedfinancingtype", "LLD");
  params.set(
    "f_762_comments",
    [
      `Landing ${meta.landing} JPO`,
      `Offre: ${offerCode}`,
      lead.concession ? `Code postal: ${lead.concession}` : "",
      `RGPD: ${lead.rgpd ? "true" : "false"}`,
      `URL: ${lead.page_url || ""}`
    ]
      .filter(Boolean)
      .join(" | ")
  );

  return params;
}

function formatDatabowlRequest(body) {
  const lines = [];
  for (const [key, value] of new URLSearchParams(body)) {
    lines.push(`${key}=${value}`);
  }
  return [
    `POST ${DATABOWL_ENDPOINT}`,
    "Content-Type: application/x-www-form-urlencoded",
    "",
    ...lines
  ].join("\n");
}

// Appel Databowl independant : ne bloque jamais l'enregistrement en base.
// Le code campagne BACS est propre a chaque page (LBX / NX) et configurable
// dans l'admin (preprod en local, prod en production).
async function pushToDatabowl(id, lead, page) {
  const cfg = db.getDatabowlPageSettings(page);
  const body = buildDatabowlPayload(lead, page, cfg).toString();
  const requestLog = formatDatabowlRequest(body);

  if (!cfg.enabled || !cfg.campaign || !DATABOWL_CID || !DATABOWL_SID) {
    db.updateSubmissionDatabowl(
      id,
      "not_configured",
      null,
      `${requestLog}\n\n[non envoye: configuration incomplete]`
    );
    return;
  }

  try {
    const response = await fetch(DATABOWL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const text = await response.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    const fullLog = `${requestLog}\n\n--- Reponse HTTP ${response.status} ---\n${text}`;

    if (response.ok && json.result === "created") {
      db.updateSubmissionDatabowl(id, "created", json.lead_id || "", fullLog);
    } else {
      db.updateSubmissionDatabowl(id, "rejected", null, fullLog);
    }
  } catch (error) {
    db.updateSubmissionDatabowl(
      id,
      "error",
      `${requestLog}\n\n--- Erreur reseau ---\n${error.message || "erreur inconnue"}`
    );
  }
}

// Appel PowerSpace (pixel lead) : uniquement si un ClickID a ete capture en cookie.
async function pushToPowerSpace(id, clickId) {
  const url = `${POWERSPACE_ENDPOINT}?qci=${encodeURIComponent(clickId)}`;
  const requestLog = `GET ${url}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const fullLog = `${requestLog}\n\n--- Reponse HTTP ${response.status} ---\n${text}`;

    if (response.ok) {
      db.updateSubmissionPowerSpace(id, "success", fullLog);
    } else {
      db.updateSubmissionPowerSpace(id, "rejected", fullLog);
    }
  } catch (error) {
    db.updateSubmissionPowerSpace(
      id,
      "error",
      `${requestLog}\n\n--- Erreur reseau ---\n${error.message || "erreur inconnue"}`
    );
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
    const cookies = parseCookies(req);
    const clickId = cookies[CLICK_ID_COOKIE] || null;
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
      referer,
      click_id: clickId
    };

    // Echec de validation cote serveur : enregistre puis refuse.
    if (errors.length) {
      db.insertSubmission({
        ...base,
        status: "server_validation_failed",
        error: errors.join(", ")
      });

      return sendJson(res, 400, {
        result: "error",
        message: "Champs obligatoires manquants ou code postal invalide."
      });
    }

    // Soumission valide : enregistree comme succes (independamment de Databowl).
    const id = db.insertSubmission({ ...base, status: "success" });

    // Databowl est appele en parallele, sans bloquer la reponse de succes.
    pushToDatabowl(id, lead, page).catch(() => {});

    // PowerSpace : uniquement si un ClickID est present (cookie issu du query param a l'arrivee).
    if (clickId) {
      pushToPowerSpace(id, clickId).catch(() => {});
    } else {
      db.updateSubmissionPowerSpace(id, "skipped", "[non envoye: aucun ClickID]");
    }

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

  const parts = url.pathname.split("/").filter(Boolean);
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

          if (enabled && !id) {
            return sendJson(res, 400, {
              ok: false,
              message: "Saisissez un ID de mesure GA4 (ex. G-XXXXXXXXXX) pour activer le tracking."
            });
          }

          if (enabled && !/^G-[A-Z0-9]+$/i.test(id)) {
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

  if (resource === "settings" && parts[3] === "databowl") {
    if (req.method === "GET") {
      return sendJson(res, 200, db.getDatabowlSettings());
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      return readJson(req)
        .then((body) => {
          const settings = {};

          for (const page of db.DATABOWL_PAGES) {
            const raw = body[page] || {};
            const campaign = String(raw.campaign || "").trim();
            const enabled = !!raw.enabled;

            if (campaign && !/^[A-Za-z0-9._-]+$/.test(campaign)) {
              return sendJson(res, 400, {
                ok: false,
                message: `Databowl ${page} : code campagne invalide.`
              });
            }

            if (enabled && !campaign) {
              return sendJson(res, 400, {
                ok: false,
                message: `Databowl ${page} : le code campagne est requis pour activer l'envoi.`
              });
            }

            settings[page] = { enabled, campaign };
          }

          db.setDatabowlSettings(settings);
          return sendJson(res, 200, { ok: true, ...db.getDatabowlSettings() });
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

          if (!changes) {
            return sendJson(res, 404, {
              ok: false,
              message: "Ligne introuvable ou aucun champ modifiable."
            });
          }

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
const PLAUSIBLE_SCRIPT =
  '<script defer data-domain="journeesportesouvertes-lexus.fr" src="https://plausible.kleekr.com/js/script.js"></script>';

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
  window.lexusTrackLeadSuccess = function (opts) {
    if (typeof gtag !== "function") return;
    var o = opts || {};
    gtag("event", "generate_lead", {
      page: o.page || "",
      modele: o.modele || "",
      offre: o.offre || "",
      lead_id: o.lead_id != null ? String(o.lead_id) : ""
    });
  };
</script>`;
}

const CLICK_ID_CAPTURE_SCRIPT = `<script>
(function () {
  var params = new URLSearchParams(window.location.search);
  var clickId = null;
  params.forEach(function (value, key) {
    if (clickId) return;
    var k = String(key).toLowerCase().replace(/[-_]/g, "");
    if (k === "clickid" && String(value || "").trim()) clickId = String(value).trim();
  });
  if (!clickId) return;
  document.cookie = "${CLICK_ID_COOKIE}=" + encodeURIComponent(clickId) + "; Path=/; SameSite=Lax; Max-Age=${CLICK_ID_MAX_AGE_SEC}";
})();
</script>`;

function injectHeadScripts(html) {
  let out = html;

  if (!out.includes("lexus_click_id") && out.includes("</head>")) {
    out = out.replace("</head>", `${CLICK_ID_CAPTURE_SCRIPT}\n</head>`);
  }

  if (!out.includes("plausible.kleekr.com") && out.includes("</head>")) {
    out = out.replace("</head>", `${PLAUSIBLE_SCRIPT}\n</head>`);
  }

  const config = db.getAnalyticsSettings();

  if (!config.enabled || !config.measurement_id) return out;

  const snippet = buildGaSnippet(config.measurement_id);

  if (!snippet) return out;

  if (out.includes("</head>")) {
    return out.replace("</head>", `${snippet}\n</head>`);
  }

  return out;
}

function sendHtmlFile(res, filePath) {
  fs.readFile(filePath, "utf-8", (error, content) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(injectHeadScripts(content));
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
  const url = new URL(req.url, `http://${req.headers.host}`);
  const urlPath = decodeURIComponent(url.pathname);

  if (urlPath === "/") {
    syncClickIdCookieFromUrl(req, res, url);
    return sendHtmlFile(res, path.join(ROOT, "home.html"));
  }

  const landingFile = LANDING_ROUTES[urlPath];

  if (landingFile) {
    syncClickIdCookieFromUrl(req, res, url);

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
  console.log(`Landings JPO + admin server running on http://127.0.0.1:${PORT}`);
  console.log(`  Landings : /modele-lbx (LBX) · /modele-nx (NX) · /modele-chr (C-HR+) · /modele-yaris-cross (YARIS)`);
  console.log(`  Admin    : /admin/login`);
  console.log(`  [databowl] cid=${DATABOWL_CID} sid=${DATABOWL_SID}`);

  const dbw = db.getDatabowlSettings();

  for (const page of db.DATABOWL_PAGES) {
    const cfg = dbw[page];

    if (cfg.enabled && cfg.campaign) {
      console.log(`  [databowl] ${page} actif : campagne=${cfg.campaign}`);
    } else {
      console.log(`  [databowl] ${page} non configure : leads enregistres en base mais non envoyes a Databowl.`);
    }
  }

  const ga = db.getAnalyticsSettings();

  if (ga.enabled && ga.measurement_id) {
    console.log(`  [analytics] actif : ${ga.measurement_id}`);
  } else if (ga.enabled) {
    console.log(`  [analytics] active en base mais sans ID de mesure : tag non injecte.`);
  } else {
    console.log(`  [analytics] inactif (admin ou GA_ENABLED / GA_MEASUREMENT_ID).`);
  }
});