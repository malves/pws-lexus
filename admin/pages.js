// Pages HTML du back-office, rendues cote serveur (style Lexus).

const THEME_STORAGE_KEY = "lexus-admin-theme";

const THEME_INIT_SCRIPT = `
<script>
(function(){
  var t = localStorage.getItem("${THEME_STORAGE_KEY}");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
})();
</script>`;

const THEME_TOGGLE_SCRIPT = `
<script>
(function(){
  var KEY = "${THEME_STORAGE_KEY}";
  function current() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
    document.querySelectorAll("[data-theme-toggle]").forEach(function(btn) {
      btn.textContent = theme === "light" ? "Mode sombre" : "Mode clair";
      btn.setAttribute("aria-label", theme === "light" ? "Passer en mode sombre" : "Passer en mode clair");
    });
  }
  document.querySelectorAll("[data-theme-toggle]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      apply(current() === "light" ? "dark" : "light");
    });
  });
  apply(current());
})();
</script>`;

const BASE_STYLE = `
  :root, [data-theme="dark"] {
    --bg: #090909;
    --panel: #14130f;
    --panel-2: #1b1a15;
    --text: #fffaf2;
    --ink: #10100f;
    --muted: rgba(255, 250, 242, .62);
    --gold: #bfa36b;
    --copper: #b5684d;
    --line: rgba(255, 255, 255, .12);
    --error: #d2654f;
    --ok: #7fa86b;
    --input-bg: #0f0e0b;
    --topbar-bg: rgba(9, 9, 9, .9);
    --card-bg: rgba(20, 19, 15, .86);
    --row-hover: rgba(255, 255, 255, .03);
    --modal-overlay: rgba(0, 0, 0, .62);
    --body-gradient-1: rgba(191, 163, 107, .10);
    --body-gradient-2: rgba(181, 104, 77, .10);
  }
  [data-theme="light"] {
    --bg: #f4f1ea;
    --panel: #ffffff;
    --panel-2: #f7f4ed;
    --text: #1a1814;
    --ink: #10100f;
    --muted: rgba(26, 24, 20, .58);
    --gold: #96783d;
    --copper: #a35940;
    --line: rgba(26, 24, 20, .12);
    --error: #c04f3a;
    --ok: #5f8550;
    --input-bg: #ffffff;
    --topbar-bg: rgba(244, 241, 234, .92);
    --card-bg: rgba(255, 255, 255, .95);
    --row-hover: rgba(26, 24, 20, .04);
    --modal-overlay: rgba(26, 24, 20, .35);
    --body-gradient-1: rgba(191, 163, 107, .18);
    --body-gradient-2: rgba(181, 104, 77, .12);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Helvetica Neue", Arial, sans-serif;
    background:
      radial-gradient(1200px 600px at 80% -10%, var(--body-gradient-1), transparent 60%),
      radial-gradient(900px 500px at -10% 110%, var(--body-gradient-2), transparent 60%),
      var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
    transition: background-color .2s ease, color .2s ease;
  }
  a { color: var(--gold); }
  .gold { color: var(--gold); }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    border: 1px solid var(--line); background: transparent; color: var(--text);
    padding: 9px 16px; border-radius: 2px; cursor: pointer; font-size: 13px;
    letter-spacing: .04em; text-transform: uppercase; transition: .15s ease;
  }
  .btn:hover { border-color: var(--gold); color: var(--gold); }
  .btn.primary {
    background: linear-gradient(180deg, var(--gold), #a98e57);
    color: var(--ink); border-color: transparent; font-weight: 600;
  }
  .btn.primary:hover { filter: brightness(1.06); color: var(--ink); }
  .btn.danger:hover { border-color: var(--error); color: var(--error); }
  .btn.sm { padding: 5px 10px; font-size: 11px; }
  input, select {
    width: 100%; background: var(--input-bg); border: 1px solid var(--line);
    color: var(--text); padding: 10px 12px; border-radius: 2px; font: inherit;
  }
  input:focus, select:focus { outline: none; border-color: var(--gold); }
  label { font-size: 12px; letter-spacing: .05em; color: var(--muted); text-transform: uppercase; }
  .theme-toggle-wrap { position: fixed; top: 18px; right: 18px; z-index: 10; }
  .topbar-actions { display: flex; align-items: center; gap: 8px; }
`;

function renderLogin() {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin Lexus · Connexion</title>
  <link rel="icon" href="/assets/logo.jpg" type="image/jpeg">
  ${THEME_INIT_SCRIPT}
  <style>
    ${BASE_STYLE}
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card {
      width: 100%; max-width: 380px; background: var(--card-bg);
      border: 1px solid var(--line); border-radius: 4px; padding: 34px 30px;
      backdrop-filter: blur(6px);
    }
    .brand { text-align: center; margin-bottom: 26px; }
    .brand .name { letter-spacing: .42em; font-size: 18px; text-transform: uppercase; }
    .brand .sub { color: var(--muted); font-size: 12px; letter-spacing: .12em; margin-top: 8px; text-transform: uppercase; }
    .field { margin-bottom: 16px; }
    .field label { display: block; margin-bottom: 6px; }
    .msg { color: var(--error); font-size: 13px; min-height: 18px; margin: 4px 0 10px; }
    button[type=submit] { width: 100%; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="theme-toggle-wrap">
    <button type="button" class="btn sm" data-theme-toggle aria-label="Passer en mode clair">Mode clair</button>
  </div>
  <div class="wrap">
    <form class="card" id="loginForm">
      <div class="brand">
        <div class="name">Lexus</div>
        <div class="sub">Espace administrateur</div>
      </div>
      <div class="field">
        <label for="user">Identifiant</label>
        <input id="user" name="user" autocomplete="username" required autofocus>
      </div>
      <div class="field">
        <label for="password">Mot de passe</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
      </div>
      <p class="msg" id="msg" role="alert"></p>
      <button type="submit" class="btn primary">Se connecter</button>
    </form>
  </div>
  <script>
    const form = document.getElementById("loginForm");
    const msg = document.getElementById("msg");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.textContent = "";
      const res = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: document.getElementById("user").value,
          password: document.getElementById("password").value
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.href = "/admin/dashboard";
      } else {
        msg.textContent = data.message || "Connexion impossible.";
      }
    });
  </script>
  ${THEME_TOGGLE_SCRIPT}
</body>
</html>`;
}

function renderDashboard() {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin Lexus · Leads</title>
  <link rel="icon" href="/assets/logo.jpg" type="image/jpeg">
  ${THEME_INIT_SCRIPT}
  <style>
    ${BASE_STYLE}
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 28px; border-bottom: 1px solid var(--line);
      position: sticky; top: 0; background: var(--topbar-bg); backdrop-filter: blur(8px); z-index: 5;
    }
    .topbar .name { letter-spacing: .4em; text-transform: uppercase; font-size: 16px; }
    .topbar .sub { color: var(--muted); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
    .container { padding: 24px 28px 60px; max-width: 1400px; margin: 0 auto; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr)); gap: 14px; margin-bottom: 26px; }
    .stat { background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 16px 18px; }
    .stat .k { color: var(--muted); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
    .stat .v { font-size: 30px; margin-top: 8px; font-weight: 300; }
    .stat .v small { font-size: 14px; color: var(--muted); }
    .stat.ok .v { color: var(--ok); }
    .stat.bad .v { color: var(--error); }
    .filters {
      display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;
      background: var(--panel); border: 1px solid var(--line); border-radius: 4px;
      padding: 16px 18px; margin-bottom: 18px;
    }
    .filters .f { display: flex; flex-direction: column; gap: 6px; min-width: 150px; }
    .filters .f.grow { flex: 1; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1100px; }
    th, td { text-align: left; padding: 11px 12px; border-bottom: 1px solid var(--line); white-space: nowrap; }
    th { color: var(--muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; position: sticky; top: 0; background: var(--panel-2); }
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { color: var(--text); }
    th.sortable.active { color: var(--gold); }
    th.sortable .sort-icon { margin-left: 4px; opacity: .45; font-size: 10px; }
    th.sortable.active .sort-icon { opacity: 1; color: var(--gold); }
    tbody tr:hover { background: var(--row-hover); }
    .pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 11px; letter-spacing: .04em; border: 1px solid var(--line); }
    .pill.success { color: var(--ok); border-color: rgba(127,168,107,.5); }
    .pill.server_validation_failed { color: var(--error); border-color: rgba(210,101,79,.5); }
    .pill.client_validation_failed { color: var(--copper); border-color: rgba(181,104,77,.5); }
    .db { font-size: 11px; color: var(--muted); }
    .muted { color: var(--muted); }
    .actions { display: flex; gap: 6px; }
    .empty { padding: 40px; text-align: center; color: var(--muted); }
    .count { color: var(--muted); font-size: 12px; margin: 12px 2px; }
    /* modal */
    .modal-bg {
      position: fixed; inset: 0; background: var(--modal-overlay); display: none;
      place-items: center; padding: 24px; z-index: 20;
    }
    .modal-bg.open { display: grid; }
    .modal {
      width: 100%; max-width: 480px; background: var(--panel); border: 1px solid var(--line);
      border-radius: 4px; padding: 26px;
    }
    .modal h3 { margin: 0 0 18px; font-weight: 400; letter-spacing: .1em; text-transform: uppercase; font-size: 15px; }
    .modal .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .modal .grid .full { grid-column: 1 / -1; }
    .modal .row { display: flex; flex-direction: column; gap: 6px; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
    .modal .hint { color: var(--muted); font-size: 12px; margin: 0 0 16px; line-height: 1.5; }
    .modal .toggle { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
    .modal .toggle input { width: auto; }
    .modal .toggle label { text-transform: none; letter-spacing: 0; font-size: 13px; color: var(--text); }
    .settings-msg { font-size: 13px; min-height: 18px; margin-top: 10px; }
    .settings-msg.ok { color: var(--ok); }
    .settings-msg.err { color: var(--error); }
    .settings-preview {
      margin-top: 14px; padding: 12px 14px; background: var(--panel-2);
      border: 1px solid var(--line); border-radius: 2px;
      font-family: ui-monospace, monospace; font-size: 11px;
      color: var(--muted); white-space: pre-wrap; word-break: break-all;
      max-height: 120px; overflow-y: auto;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <div class="name">Lexus</div>
      <div class="sub">Monitoring des leads JPO</div>
    </div>
    <div class="topbar-actions">
      <button type="button" class="btn sm" id="gaOpenBtn">Google Analytics</button>
      <button type="button" class="btn sm" data-theme-toggle aria-label="Passer en mode clair">Mode clair</button>
      <a class="btn sm" href="/admin/logout">Déconnexion</a>
    </div>
  </div>

  <div class="container">
    <div class="stats" id="stats"></div>

    <div class="filters">
      <div class="f">
        <label>Page</label>
        <select id="fPage"><option value="">Toutes</option><option value="LBX">LBX</option><option value="NX">NX</option></select>
      </div>
      <div class="f">
        <label>Statut</label>
        <select id="fStatus">
          <option value="">Tous</option>
          <option value="success">Succès</option>
          <option value="server_validation_failed">Échec serveur</option>
          <option value="client_validation_failed">Échec navigateur</option>
        </select>
      </div>
      <div class="f">
        <label>Du</label>
        <input id="fFrom" type="date">
      </div>
      <div class="f">
        <label>Au</label>
        <input id="fTo" type="date">
      </div>
      <div class="f">
        <button class="btn" id="resetBtn">Réinitialiser</button>
      </div>
    </div>

    <div class="count" id="count"></div>
    <div class="table-wrap">
      <table>
        <thead id="tableHead">
          <tr>
            <th class="sortable" data-sort="id">ID<span class="sort-icon"></span></th>
            <th class="sortable active" data-sort="created_at">Date<span class="sort-icon">▼</span></th>
            <th class="sortable" data-sort="page">Page<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="status">Statut<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="civilite">Civilité<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="prenom">Prénom<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="nom">Nom<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="email">Email<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="telephone">Téléphone<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="concession">Concession<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="rgpd">RGPD<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="ip">IP<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="databowl_status">Databowl<span class="sort-icon"></span></th>
            <th class="sortable" data-sort="error">Détail<span class="sort-icon"></span></th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
    <div class="empty" id="empty" style="display:none">Aucune soumission pour ces filtres.</div>
  </div>

  <!-- Modal edition -->
  <div class="modal-bg" id="modalBg">
    <div class="modal">
      <h3>Éditer la soumission <span class="gold" id="editId"></span></h3>
      <div class="grid">
        <div class="row"><label>Civilité</label>
          <select id="eCivilite"><option value="">—</option><option value="Mme">Mme</option><option value="M">M.</option></select></div>
        <div class="row"><label>Prénom</label><input id="ePrenom"></div>
        <div class="row"><label>Nom</label><input id="eNom"></div>
        <div class="row"><label>Téléphone</label><input id="eTelephone"></div>
        <div class="row full"><label>Email</label><input id="eEmail" type="email"></div>
        <div class="row full"><label>Concession</label><input id="eConcession"></div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="cancelEdit">Annuler</button>
        <button class="btn primary" id="saveEdit">Enregistrer</button>
      </div>
    </div>
  </div>

  <!-- Modal Google Analytics -->
  <div class="modal-bg" id="gaModalBg">
    <div class="modal">
      <h3>Google Analytics</h3>
      <p class="hint">Le tag gtag.js sera injecté automatiquement dans le &lt;head&gt; des pages publiques (accueil, LBX, NX).</p>
      <div class="row full">
        <label for="gaId">ID de mesure GA4</label>
        <input id="gaId" type="text" placeholder="G-S9MXH8G7T2" autocomplete="off" spellcheck="false">
      </div>
      <div class="toggle">
        <input id="gaEnabled" type="checkbox">
        <label for="gaEnabled">Activer le tracking</label>
      </div>
      <p class="settings-msg" id="gaMsg" role="status"></p>
      <div class="settings-preview" id="gaPreview" hidden></div>
      <div class="modal-foot">
        <button class="btn" id="gaCancel" type="button">Annuler</button>
        <button class="btn primary" id="gaSave" type="button">Enregistrer</button>
      </div>
    </div>
  </div>

  <script>
    const els = {
      stats: document.getElementById("stats"),
      rows: document.getElementById("rows"),
      empty: document.getElementById("empty"),
      count: document.getElementById("count"),
      fPage: document.getElementById("fPage"),
      fStatus: document.getElementById("fStatus"),
      fFrom: document.getElementById("fFrom"),
      fTo: document.getElementById("fTo"),
      resetBtn: document.getElementById("resetBtn"),
      modalBg: document.getElementById("modalBg"),
      tableHead: document.getElementById("tableHead"),
      gaOpenBtn: document.getElementById("gaOpenBtn"),
      gaModalBg: document.getElementById("gaModalBg"),
      gaId: document.getElementById("gaId"),
      gaEnabled: document.getElementById("gaEnabled"),
      gaSave: document.getElementById("gaSave"),
      gaCancel: document.getElementById("gaCancel"),
      gaMsg: document.getElementById("gaMsg"),
      gaPreview: document.getElementById("gaPreview")
    };

    let sortBy = "created_at";
    let sortDir = "desc";

    const STATUS_LABEL = {
      success: "Succès",
      server_validation_failed: "Échec serveur",
      client_validation_failed: "Échec navigateur"
    };

    function esc(v) {
      return String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    function fmtDate(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d)) return iso;
      return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
    }

    function gaPreviewSnippet(id) {
      if (!id) return "";
      var open = "<scr" + "ipt";
      var close = "</scr" + "ipt>";
      return '<!-- Google tag (gtag.js) -->\\n' +
        open + ' async src="https://www.googletagmanager.com/gtag/js?id=' + id + '">' + close + '\\n' +
        open + '>\\n' +
        "  window.dataLayer = window.dataLayer || [];\\n" +
        "  function gtag(){dataLayer.push(arguments);}\\n" +
        "  gtag('js', new Date());\\n\\n" +
        "  gtag('config', '" + id + "');\\n" +
        close;
    }

    function updateGaPreview() {
      const id = els.gaId.value.trim();
      const show = els.gaEnabled.checked && id;
      els.gaPreview.hidden = !show;
      els.gaPreview.textContent = show ? gaPreviewSnippet(id) : "";
    }

    async function loadGaSettings() {
      const s = await (await fetch("/api/admin/settings/analytics")).json();
      els.gaId.value = s.measurement_id || "";
      els.gaEnabled.checked = !!s.enabled;
      updateGaPreview();
      els.gaOpenBtn.textContent = s.enabled && s.measurement_id ? "Analytics · actif" : "Google Analytics";
    }

    function openGaModal() {
      els.gaMsg.textContent = "";
      els.gaMsg.className = "settings-msg";
      loadGaSettings();
      els.gaModalBg.classList.add("open");
      els.gaId.focus();
    }

    function closeGaModal() {
      els.gaModalBg.classList.remove("open");
    }

    els.gaOpenBtn.addEventListener("click", openGaModal);
    els.gaCancel.addEventListener("click", closeGaModal);
    els.gaModalBg.addEventListener("click", (e) => { if (e.target === els.gaModalBg) closeGaModal(); });

    els.gaId.addEventListener("input", updateGaPreview);
    els.gaEnabled.addEventListener("change", updateGaPreview);

    els.gaSave.addEventListener("click", async () => {
      els.gaMsg.textContent = "";
      els.gaMsg.className = "settings-msg";
      const body = {
        measurement_id: els.gaId.value.trim(),
        enabled: els.gaEnabled.checked
      };
      const res = await fetch("/api/admin/settings/analytics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        els.gaMsg.textContent = "Paramètres enregistrés.";
        els.gaMsg.className = "settings-msg ok";
        els.gaId.value = data.measurement_id || "";
        els.gaEnabled.checked = !!data.enabled;
        updateGaPreview();
        els.gaOpenBtn.textContent = data.enabled && data.measurement_id ? "Analytics · actif" : "Google Analytics";
        setTimeout(closeGaModal, 800);
      } else {
        els.gaMsg.textContent = data.message || "Enregistrement impossible.";
        els.gaMsg.className = "settings-msg err";
      }
    });

    async function loadStats() {
      const s = await (await fetch("/api/admin/stats")).json();
      els.stats.innerHTML = [
        ["Total soumissions", s.total, ""],
        ["Leads valides", s.success, "ok"],
        ["Taux de succès", s.success_rate + "<small>%</small>", ""],
        ["Échecs serveur", s.server_validation_failed, "bad"],
        ["Échecs navigateur", s.client_validation_failed, "bad"],
        ["LBX / NX", (s.by_page.LBX || 0) + " <small>/</small> " + (s.by_page.NX || 0), ""]
      ].map(([k, v, cls]) =>
        '<div class="stat ' + cls + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'
      ).join("");
    }

    function updateSortHeaders() {
      els.tableHead.querySelectorAll("th.sortable").forEach((th) => {
        const col = th.getAttribute("data-sort");
        const icon = th.querySelector(".sort-icon");
        const active = col === sortBy;
        th.classList.toggle("active", active);
        icon.textContent = active ? (sortDir === "asc" ? "▲" : "▼") : "";
      });
    }

    function queryString() {
      const p = new URLSearchParams();
      if (els.fPage.value) p.set("page", els.fPage.value);
      if (els.fStatus.value) p.set("status", els.fStatus.value);
      if (els.fFrom.value) p.set("date_from", els.fFrom.value + "T00:00:00.000Z");
      if (els.fTo.value) p.set("date_to", els.fTo.value + "T23:59:59.999Z");
      p.set("sort_by", sortBy);
      p.set("sort_dir", sortDir);
      return p.toString();
    }

    async function loadRows() {
      const res = await fetch("/api/admin/submissions?" + queryString());
      const data = await res.json();
      const rows = data.rows || [];
      els.count.textContent = data.total + " soumission(s)" + (data.total > rows.length ? " · " + rows.length + " affichées" : "");
      els.empty.style.display = rows.length ? "none" : "block";
      els.rows.innerHTML = rows.map((r) => {
        const db = r.databowl_status ? '<span class="db">' + esc(r.databowl_status) + (r.databowl_lead_id ? " #" + esc(r.databowl_lead_id) : "") + '</span>' : '<span class="db muted">—</span>';
        return '<tr>' +
          '<td>' + r.id + '</td>' +
          '<td>' + esc(fmtDate(r.created_at)) + '</td>' +
          '<td>' + esc(r.page || "") + '</td>' +
          '<td><span class="pill ' + r.status + '">' + (STATUS_LABEL[r.status] || r.status) + '</span></td>' +
          '<td>' + esc(r.civilite) + '</td>' +
          '<td>' + esc(r.prenom) + '</td>' +
          '<td>' + esc(r.nom) + '</td>' +
          '<td>' + esc(r.email) + '</td>' +
          '<td>' + esc(r.telephone) + '</td>' +
          '<td>' + esc(r.concession) + '</td>' +
          '<td>' + (r.rgpd ? "Oui" : "Non") + '</td>' +
          '<td class="muted">' + esc(r.ip) + '</td>' +
          '<td>' + db + '</td>' +
          '<td class="muted">' + esc(r.error) + '</td>' +
          '<td class="actions">' +
            '<button class="btn sm" data-edit="' + r.id + '">Éditer</button>' +
            '<button class="btn sm danger" data-del="' + r.id + '">Suppr.</button>' +
          '</td>' +
        '</tr>';
      }).join("");
    }

    function refresh() { loadStats(); loadRows(); }

    // Tri
    els.tableHead.addEventListener("click", (e) => {
      const th = e.target.closest("th.sortable");
      if (!th) return;
      const col = th.getAttribute("data-sort");
      if (col === sortBy) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortBy = col;
        sortDir = col === "created_at" || col === "id" ? "desc" : "asc";
      }
      updateSortHeaders();
      loadRows();
    });

    // Filtres
    [els.fPage, els.fStatus, els.fFrom, els.fTo].forEach((el) => el.addEventListener("change", loadRows));
    els.resetBtn.addEventListener("click", () => {
      els.fPage.value = ""; els.fStatus.value = ""; els.fFrom.value = ""; els.fTo.value = "";
      sortBy = "created_at";
      sortDir = "desc";
      updateSortHeaders();
      loadRows();
    });

    // Actions (delegation)
    let currentRow = null;
    document.getElementById("rows").addEventListener("click", async (e) => {
      const del = e.target.closest("[data-del]");
      const edit = e.target.closest("[data-edit]");
      if (del) {
        const id = del.getAttribute("data-del");
        if (!confirm("Supprimer définitivement la soumission #" + id + " ?")) return;
        await fetch("/api/admin/submissions/" + id, { method: "DELETE" });
        refresh();
        return;
      }
      if (edit) {
        const id = edit.getAttribute("data-edit");
        const res = await fetch("/api/admin/submissions?limit=1000");
        const data = await res.json();
        currentRow = (data.rows || []).find((r) => String(r.id) === String(id));
        if (!currentRow) { refresh(); return; }
        document.getElementById("editId").textContent = "#" + id;
        document.getElementById("eCivilite").value = currentRow.civilite || "";
        document.getElementById("ePrenom").value = currentRow.prenom || "";
        document.getElementById("eNom").value = currentRow.nom || "";
        document.getElementById("eEmail").value = currentRow.email || "";
        document.getElementById("eTelephone").value = currentRow.telephone || "";
        document.getElementById("eConcession").value = currentRow.concession || "";
        els.modalBg.classList.add("open");
      }
    });

    document.getElementById("cancelEdit").addEventListener("click", () => els.modalBg.classList.remove("open"));
    els.modalBg.addEventListener("click", (e) => { if (e.target === els.modalBg) els.modalBg.classList.remove("open"); });

    document.getElementById("saveEdit").addEventListener("click", async () => {
      if (!currentRow) return;
      const body = {
        civilite: document.getElementById("eCivilite").value,
        prenom: document.getElementById("ePrenom").value,
        nom: document.getElementById("eNom").value,
        email: document.getElementById("eEmail").value,
        telephone: document.getElementById("eTelephone").value,
        concession: document.getElementById("eConcession").value
      };
      await fetch("/api/admin/submissions/" + currentRow.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      els.modalBg.classList.remove("open");
      refresh();
    });

    refresh();
    loadGaSettings();
  </script>
  ${THEME_TOGGLE_SCRIPT}
</body>
</html>`;
}

module.exports = { renderLogin, renderDashboard };
