const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, "leads.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at   TEXT    NOT NULL,
    status       TEXT    NOT NULL,           -- success | server_validation_failed | client_validation_failed
    page         TEXT,                       -- LBX | NX
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
    databowl_lead_id  TEXT
  );
`);

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
  return {
    enabled: getSetting("ga_enabled") === "1",
    measurement_id: getSetting("ga_measurement_id") || ""
  };
}

function setAnalyticsSettings({ enabled, measurement_id }) {
  setSetting("ga_enabled", enabled ? "1" : "0");
  setSetting("ga_measurement_id", measurement_id || "");
}

const insertStmt = db.prepare(`
  INSERT INTO submissions (
    created_at, status, page, page_url,
    civilite, prenom, nom, email, telephone, concession,
    modele, offre, rgpd, ip, referer, error,
    databowl_status, databowl_lead_id
  ) VALUES (
    @created_at, @status, @page, @page_url,
    @civilite, @prenom, @nom, @email, @telephone, @concession,
    @modele, @offre, @rgpd, @ip, @referer, @error,
    @databowl_status, @databowl_lead_id
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
    databowl_lead_id: data.databowl_lead_id || null
  };
  const info = insertStmt.run(row);
  return info.lastInsertRowid;
}

function updateSubmissionDatabowl(id, databowl_status, databowl_lead_id) {
  db.prepare(
    `UPDATE submissions SET databowl_status = ?, databowl_lead_id = ? WHERE id = ?`
  ).run(databowl_status || null, databowl_lead_id || null, id);
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
  updateSubmission,
  deleteSubmission,
  getSubmission,
  listSubmissions,
  getStats,
  getAnalyticsSettings,
  setAnalyticsSettings
};
