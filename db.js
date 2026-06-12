const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, "leads.db");

const dbDir = path.dirname(DB_PATH);
fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
// DELETE (pas WAL) : compatible avec un bind-mount d'un seul fichier leads.db.
// WAL exige des fichiers .db-wal/.db-shm ecrivables a cote de la base.
db.pragma("journal_mode = DELETE");

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at   TEXT    NOT NULL,
    status       TEXT    NOT NULL,           -- success | server_validation_failed | client_validation_failed
    page         TEXT,                       -- LBX | NX | CHR | YARIS
    page_url     TEXT,
    civilite     TEXT,
    prenom       TEXT,
    nom          TEXT,
    email        TEXT,
    telephone    TEXT,
    concession   TEXT,
    modele       TEXT,
    offre        TEXT,
    rgpd         INTEGER DEFAULT 0,
    ip           TEXT,
    referer      TEXT,
    error        TEXT,                        -- detail des champs manquants / message
    databowl_status   TEXT,                   -- created | rejected | error | not_configured | skipped
    databowl_lead_id  TEXT,
    databowl_request  TEXT,                   -- payload envoye (debug admin)
    click_id          TEXT,                   -- ClickID PowerSpace (cookie / query)
    powerspace_status TEXT,                   -- success | rejected | error | skipped
    powerspace_request TEXT                   -- requete / reponse (debug admin)
  );
`);

try {
  db.exec(`ALTER TABLE submissions ADD COLUMN databowl_request TEXT`);
} catch {
  // colonne deja presente
}
for (const col of ["click_id", "powerspace_status", "powerspace_request"]) {
  try {
    db.exec(`ALTER TABLE submissions ADD COLUMN ${col} TEXT`);
  } catch {
    // colonne deja presente
  }
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_submissions_page ON submissions(page);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

function getSetting(key, defaultValue = null) {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value ?? "");
}

function getAnalyticsSettings() {
  const envId = (process.env.GA_MEASUREMENT_ID || "").trim();
  const envEnabled = /^(1|true|yes)$/i.test(String(process.env.GA_ENABLED || ""));
  const rowId = getSetting("ga_measurement_id");
  const measurement_id = (rowId && String(rowId).trim()) || envId;
  const enabledRaw = getSetting("ga_enabled");
  const enabled = enabledRaw != null ? enabledRaw === "1" : envEnabled;
  return { enabled, measurement_id };
}

function setAnalyticsSettings({ enabled, measurement_id }) {
  setSetting("ga_enabled", enabled ? "1" : "0");
  setSetting("ga_measurement_id", measurement_id || "");
}

// --------------------------------------------------------------------------
// Databowl : configuration par page (code campagne BACS f_859_campaignid,
// identifiants techniques cid/sid). Tout est configurable EXCLUSIVEMENT depuis
// l'admin ; les valeurs par defaut ci-dessous servent uniquement de seed initial.
// --------------------------------------------------------------------------
const DATABOWL_PAGES = ["LBX", "NX", "CHR", "YARIS"];
const DEFAULT_DATABOWL_SETTINGS = {
  LBX: { campaign: "701Sa00002elzpZ", cid: "628", sid: "1189" },
  NX: { campaign: "701Sa00002elGuO", cid: "628", sid: "1189" },
  CHR: { campaign: "701Sa00002enXXV", cid: "364", sid: "1189" },
  YARIS: { campaign: "701Sa00002enXXV", cid: "364", sid: "1189" }
};

// Les paramètres personnalisés sont stockés en JSON : un tableau d'objets
// { name, value } ajoutés dynamiquement depuis l'admin et envoyés à Databowl.
function parseDatabowlParams(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((p) => ({
      name: String((p && p.name) || "").trim(),
      value: String((p && p.value) != null ? p.value : "").trim()
    }))
    .filter((p) => p.name);
}

function getDatabowlPageSettings(page) {
  const p = String(page).toUpperCase();
  const key = p.toLowerCase();
  const defaults = DEFAULT_DATABOWL_SETTINGS[p] || { campaign: "", cid: "", sid: "" };
  const campaign = getSetting(`databowl_${key}_campaign`, defaults.campaign) || "";
  const cid = getSetting(`databowl_${key}_cid`, defaults.cid) || "";
  const sid = getSetting(`databowl_${key}_sid`, defaults.sid) || "";
  const enabledRaw = getSetting(
    `databowl_${key}_enabled`,
    campaign && cid && sid ? "1" : "0"
  );
  const params = parseDatabowlParams(getSetting(`databowl_${key}_params`, ""));
  return { enabled: enabledRaw === "1", campaign, cid, sid, params };
}

function getDatabowlSettings() {
  const out = {};
  for (const page of DATABOWL_PAGES) out[page] = getDatabowlPageSettings(page);
  return out;
}

function setDatabowlSettings(settings = {}) {
  for (const page of DATABOWL_PAGES) {
    const cfg = settings[page];
    if (!cfg) continue;
    const key = page.toLowerCase();
    setSetting(`databowl_${key}_enabled`, cfg.enabled ? "1" : "0");
    setSetting(`databowl_${key}_campaign`, cfg.campaign || "");
    setSetting(`databowl_${key}_cid`, cfg.cid || "");
    setSetting(`databowl_${key}_sid`, cfg.sid || "");
    setSetting(
      `databowl_${key}_params`,
      JSON.stringify(parseDatabowlParams(JSON.stringify(cfg.params || [])))
    );
  }
  return getDatabowlSettings();
}

const insertStmt = db.prepare(`
  INSERT INTO submissions (
    created_at, status, page, page_url,
    civilite, prenom, nom, email, telephone, concession,
    modele, offre, rgpd, ip, referer, error,
    databowl_status, databowl_lead_id, click_id
  ) VALUES (
    @created_at, @status, @page, @page_url,
    @civilite, @prenom, @nom, @email, @telephone, @concession,
    @modele, @offre, @rgpd, @ip, @referer, @error,
    @databowl_status, @databowl_lead_id, @click_id
  )
`);

function insertSubmission(data) {
  const row = {
    created_at: data.created_at || new Date().toISOString(),
    status: data.status,
    page: data.page || null,
    page_url: data.page_url || null,
    civilite: data.civilite || null,
    prenom: data.prenom || null,
    nom: data.nom || null,
    email: data.email || null,
    telephone: data.telephone || null,
    concession: data.concession || null,
    modele: data.modele || null,
    offre: data.offre || null,
    rgpd: data.rgpd ? 1 : 0,
    ip: data.ip || null,
    referer: data.referer || null,
    error: data.error || null,
    databowl_status: data.databowl_status || null,
    databowl_lead_id: data.databowl_lead_id || null,
    click_id: data.click_id || null
  };
  const info = insertStmt.run(row);
  return info.lastInsertRowid;
}

function updateSubmissionDatabowl(id, databowl_status, databowl_lead_id, databowl_request) {
  db.prepare(
    `UPDATE submissions SET databowl_status = ?, databowl_lead_id = ?, databowl_request = ? WHERE id = ?`
  ).run(
    databowl_status || null,
    databowl_lead_id || null,
    databowl_request || null,
    id
  );
}

function updateSubmissionPowerSpace(id, powerspace_status, powerspace_request) {
  db.prepare(
    `UPDATE submissions SET powerspace_status = ?, powerspace_request = ? WHERE id = ?`
  ).run(powerspace_status || null, powerspace_request || null, id);
}

const EDITABLE_FIELDS = ["civilite", "prenom", "nom", "email", "telephone", "concession"];

function updateSubmission(id, fields) {
  const keys = Object.keys(fields).filter((k) => EDITABLE_FIELDS.includes(k));
  if (keys.length === 0) return 0;
  const setClause = keys.map((k) => `${k} = @${k}`).join(", ");
  const params = { id };
  keys.forEach((k) => {
    params[k] = fields[k] === undefined ? null : fields[k];
  });
  const info = db.prepare(`UPDATE submissions SET ${setClause} WHERE id = @id`).run(params);
  return info.changes;
}

function deleteSubmission(id) {
  const info = db.prepare(`DELETE FROM submissions WHERE id = ?`).run(id);
  return info.changes;
}

function getSubmission(id) {
  return db.prepare(`SELECT * FROM submissions WHERE id = ?`).get(id);
}

const SORTABLE_COLUMNS = {
  id: "id",
  created_at: "created_at",
  page: "page",
  status: "status",
  civilite: "civilite",
  prenom: "prenom",
  nom: "nom",
  email: "email",
  telephone: "telephone",
  concession: "concession",
  rgpd: "rgpd",
  ip: "ip",
  databowl_status: "databowl_status",
  powerspace_status: "powerspace_status",
  error: "error"
};

function listSubmissions(filters = {}) {
  const where = [];
  const params = {};

  if (filters.page) {
    where.push("page = @page");
    params.page = filters.page;
  }
  if (filters.status) {
    where.push("status = @status");
    params.status = filters.status;
  }
  if (filters.date_from) {
    where.push("created_at >= @date_from");
    params.date_from = filters.date_from;
  }
  if (filters.date_to) {
    where.push("created_at <= @date_to");
    params.date_to = filters.date_to;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Number(filters.limit) || 200, 1000);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const sortCol = SORTABLE_COLUMNS[filters.sort_by] || "created_at";
  const sortDir = filters.sort_dir === "asc" ? "ASC" : "DESC";
  const tieBreaker = sortCol === "id" ? "" : ", id DESC";

  const rows = db
    .prepare(
      `SELECT * FROM submissions ${whereSql} ORDER BY ${sortCol} ${sortDir}${tieBreaker} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM submissions ${whereSql}`)
    .get(params).n;

  return { rows, total, limit, offset };
}

function getStats() {
  const total = db.prepare(`SELECT COUNT(*) AS n FROM submissions`).get().n;
  const byStatus = db
    .prepare(`SELECT status, COUNT(*) AS n FROM submissions GROUP BY status`)
    .all();
  const byPage = db
    .prepare(`SELECT page, COUNT(*) AS n FROM submissions WHERE status = 'success' GROUP BY page`)
    .all();

  const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
  const success = statusMap.success || 0;
  const failed = total - success;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  return {
    total,
    success,
    failed,
    server_validation_failed: statusMap.server_validation_failed || 0,
    client_validation_failed: statusMap.client_validation_failed || 0,
    success_rate: successRate,
    by_page: Object.fromEntries(byPage.map((r) => [r.page || "?", r.n]))
  };
}

module.exports = {
  db,
  DB_PATH,
  EDITABLE_FIELDS,
  insertSubmission,
  updateSubmissionDatabowl,
  updateSubmissionPowerSpace,
  updateSubmission,
  deleteSubmission,
  getSubmission,
  listSubmissions,
  getStats,
  getAnalyticsSettings,
  setAnalyticsSettings,
  DATABOWL_PAGES,
  getDatabowlSettings,
  getDatabowlPageSettings,
  setDatabowlSettings
};
