// Pages HTML du back-office, rendues cote serveur (multi-marques).

const ADMIN_APP_NAME = "Landings JPO";
const THEME_STORAGE_KEY = "landing-admin-theme";
const THEME_STORAGE_KEY_LEGACY = "lexus-admin-theme";
const ADMIN_FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="6" fill="#1a1814"/>' +
      '<path fill="#96783d" d="M7 22V10h3.5v12H7zm6.5-9v9H17v-9h-3.5zm6.5 3v6H20v-6h-3.5zm6.5-6v12H27V10h-3.5z"/>' +
      "</svg>"
  );

const THEME_INIT_SCRIPT = `
<script>
(function(){
  var t = localStorage.getItem("${THEME_STORAGE_KEY}");
  if (!t) t = localStorage.getItem("${THEME_STORAGE_KEY_LEGACY}");
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
  <title>Admin · Connexion</title>
  <link rel="icon" href="${ADMIN_FAVICON}" type="image/svg+xml">
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
    .brand .name { letter-spacing: .14em; font-size: 17px; text-transform: uppercase; }
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
        <div class="name">${ADMIN_APP_NAME}</div>
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
  <title>Admin · Leads</title>
  <link rel="icon" href="${ADMIN_FAVICON}" type="image/svg+xml">
  ${THEME_INIT_SCRIPT}
  <style>
    ${BASE_STYLE}
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 28px; border-bottom: 1px solid var(--line);
      position: sticky; top: 0; background: var(--topbar-bg); backdrop-filter: blur(8px); z-index: 5;
    }
    .topbar .name { letter-spacing: .12em; text-transform: uppercase; font-size: 16px; }
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
      max-height: calc(100vh - 48px); overflow-y: auto;
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
    .debug-preview {
      margin: 0; padding: 14px 16px; background: var(--panel-2);
      border: 1px solid var(--line); border-radius: 2px;
      font-family: ui-monospace, monospace; font-size: 11px;
      color: var(--text); white-space: pre-wrap; word-break: break-word;
      max-height: min(60vh, 520px); overflow: auto;
    }
    .modal.debug-modal { max-width: 760px; }
    .dbw-page {
      padding: 14px; margin-bottom: 14px; background: var(--panel-2);
      border: 1px solid var(--line); border-radius: 3px;
    }
    .dbw-page-title {
      font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
      color: var(--gold); margin-bottom: 12px;
    }
    .dbw-page-title .muted { letter-spacing: 0; text-transform: none; }
    .dbw-page .grid { margin-top: 12px; }
    .dbw-params { margin-top: 14px; }
    .dbw-params-title {
      font-size: 12px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .04em; color: var(--muted); margin-bottom: 8px;
    }
    .dbw-param-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .dbw-param-row .dbw-param-name { flex: 0 0 42%; }
    .dbw-param-row .dbw-param-value { flex: 1 1 auto; }
    .dbw-param-row input {
      width: 100%; padding: 8px 10px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--input-bg, transparent);
      color: inherit; font: inherit;
    }
    .dbw-param-del { flex: 0 0 auto; padding: 6px 10px; line-height: 1; }
    .dbw-param-empty { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
    .dbw-params-add { margin-top: 2px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <div class="name">${ADMIN_APP_NAME}</div>
      <div class="sub">Monitoring des leads</div>
    </div>
    <div class="topbar-actions">
      <button type="button" class="btn sm" id="dbwOpenBtn">Databowl</button>
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
        <select id="fPage"><option value="">Toutes</option><option value="LBX">LBX</option><option value="NX">NX</option><option value="CHR">C-HR+</option><option value="CHR_V2">C-HR+ V2</option><option value="YARIS">YARIS</option></select>
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
            <th>Req. DB</th>
            <th class="sortable" data-sort="powerspace_status">PowerSpace<span class="sort-icon"></span></th>
            <th>Req. PS</th>
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

  <!-- Modal requete Databowl -->
  <div class="modal-bg" id="dbwReqModalBg">
    <div class="modal debug-modal">
      <h3>Requête Databowl <span class="gold" id="dbwReqId"></span></h3>
      <pre class="debug-preview" id="dbwReqBody"></pre>
      <div class="modal-foot">
        <button class="btn" id="dbwReqClose" type="button">Fermer</button>
      </div>
    </div>
  </div>

  <!-- Modal requete PowerSpace -->
  <div class="modal-bg" id="psReqModalBg">
    <div class="modal debug-modal">
      <h3>Requête PowerSpace <span class="gold" id="psReqId"></span></h3>
      <pre class="debug-preview" id="psReqBody"></pre>
      <div class="modal-foot">
        <button class="btn" id="psReqClose" type="button">Fermer</button>
      </div>
    </div>
  </div>

  <!-- Modal Google Analytics -->
  <div class="modal-bg" id="gaModalBg">
    <div class="modal">
      <h3>Google Analytics</h3>
      <p class="hint">Le tag gtag.js sera injecté automatiquement dans le &lt;head&gt; de toutes les pages publiques (accueil et landings modèles).</p>
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

  <!-- Modal Databowl -->
  <div class="modal-bg" id="dbwModalBg">
    <div class="modal">
      <h3>Databowl</h3>
      <p class="hint">Configuration propre à chaque page : code campagne BACS (champ <code>f_859_campaignid</code>) et identifiants techniques <strong>cid</strong> / <strong>sid</strong>. Les leads valides ne sont envoyés que si la page est activée (campagne, cid et sid renseignés). Vous pouvez aussi ajouter des <strong>paramètres personnalisés</strong> (nom de la variable + valeur) envoyés à Databowl pour la page concernée.</p>
      <div class="dbw-page">
        <div class="dbw-page-title">Page LBX <span class="muted">· /modele-lbx</span></div>
        <div class="row full">
          <label for="dbwLbxCampaign">Code campagne BACS</label>
          <input id="dbwLbxCampaign" type="text" placeholder="701Aa00001RlRnv" autocomplete="off" spellcheck="false">
        </div>
        <div class="grid">
          <div class="row">
            <label for="dbwLbxCid">cid</label>
            <input id="dbwLbxCid" type="text" inputmode="numeric" placeholder="628" autocomplete="off" spellcheck="false">
          </div>
          <div class="row">
            <label for="dbwLbxSid">sid</label>
            <input id="dbwLbxSid" type="text" inputmode="numeric" placeholder="1189" autocomplete="off" spellcheck="false">
          </div>
        </div>
        <div class="toggle">
          <input id="dbwLbxEnabled" type="checkbox">
          <label for="dbwLbxEnabled">Activer l'envoi des leads LBX</label>
        </div>
        <div class="dbw-params">
          <div class="dbw-params-title">Paramètres personnalisés</div>
          <div class="dbw-params-list" id="dbwLbxParams"></div>
          <button type="button" class="btn sm dbw-params-add" data-dbw-add="LBX">+ Ajouter un paramètre</button>
        </div>
      </div>
      <div class="dbw-page">
        <div class="dbw-page-title">Page NX <span class="muted">· /modele-nx</span></div>
        <div class="row full">
          <label for="dbwNxCampaign">Code campagne BACS</label>
          <input id="dbwNxCampaign" type="text" placeholder="701Aa00001sbScR" autocomplete="off" spellcheck="false">
        </div>
        <div class="grid">
          <div class="row">
            <label for="dbwNxCid">cid</label>
            <input id="dbwNxCid" type="text" inputmode="numeric" placeholder="628" autocomplete="off" spellcheck="false">
          </div>
          <div class="row">
            <label for="dbwNxSid">sid</label>
            <input id="dbwNxSid" type="text" inputmode="numeric" placeholder="1189" autocomplete="off" spellcheck="false">
          </div>
        </div>
        <div class="toggle">
          <input id="dbwNxEnabled" type="checkbox">
          <label for="dbwNxEnabled">Activer l'envoi des leads NX</label>
        </div>
        <div class="dbw-params">
          <div class="dbw-params-title">Paramètres personnalisés</div>
          <div class="dbw-params-list" id="dbwNxParams"></div>
          <button type="button" class="btn sm dbw-params-add" data-dbw-add="NX">+ Ajouter un paramètre</button>
        </div>
      </div>
      <div class="dbw-page">
        <div class="dbw-page-title">Page C-HR+ <span class="muted">· /modele-chr</span></div>
        <div class="row full">
          <label for="dbwChrCampaign">Code campagne BACS</label>
          <input id="dbwChrCampaign" type="text" placeholder="701Aa00001xxxx" autocomplete="off" spellcheck="false">
        </div>
        <div class="grid">
          <div class="row">
            <label for="dbwChrCid">cid</label>
            <input id="dbwChrCid" type="text" inputmode="numeric" placeholder="364" autocomplete="off" spellcheck="false">
          </div>
          <div class="row">
            <label for="dbwChrSid">sid</label>
            <input id="dbwChrSid" type="text" inputmode="numeric" placeholder="1189" autocomplete="off" spellcheck="false">
          </div>
        </div>
        <div class="toggle">
          <input id="dbwChrEnabled" type="checkbox">
          <label for="dbwChrEnabled">Activer l'envoi des leads C-HR+</label>
        </div>
        <div class="dbw-params">
          <div class="dbw-params-title">Paramètres personnalisés</div>
          <div class="dbw-params-list" id="dbwChrParams"></div>
          <button type="button" class="btn sm dbw-params-add" data-dbw-add="CHR">+ Ajouter un paramètre</button>
        </div>
      </div>
      <div class="dbw-page">
        <div class="dbw-page-title">Page C-HR+ V2 <span class="muted">· /modele-chr-plus</span></div>
        <div class="row full">
          <label for="dbwChrV2Campaign">Code campagne BACS</label>
          <input id="dbwChrV2Campaign" type="text" placeholder="701Aa00001xxxx" autocomplete="off" spellcheck="false">
        </div>
        <div class="grid">
          <div class="row">
            <label for="dbwChrV2Cid">cid</label>
            <input id="dbwChrV2Cid" type="text" inputmode="numeric" placeholder="364" autocomplete="off" spellcheck="false">
          </div>
          <div class="row">
            <label for="dbwChrV2Sid">sid</label>
            <input id="dbwChrV2Sid" type="text" inputmode="numeric" placeholder="1189" autocomplete="off" spellcheck="false">
          </div>
        </div>
        <div class="toggle">
          <input id="dbwChrV2Enabled" type="checkbox">
          <label for="dbwChrV2Enabled">Activer l'envoi des leads C-HR+ V2</label>
        </div>
      </div>
      <div class="dbw-page">
        <div class="dbw-page-title">Page YARIS <span class="muted">· /modele-yaris-cross</span></div>
        <div class="row full">
          <label for="dbwYarisCampaign">Code campagne BACS</label>
          <input id="dbwYarisCampaign" type="text" placeholder="701Aa00001xxxx" autocomplete="off" spellcheck="false">
        </div>
        <div class="grid">
          <div class="row">
            <label for="dbwYarisCid">cid</label>
            <input id="dbwYarisCid" type="text" inputmode="numeric" placeholder="364" autocomplete="off" spellcheck="false">
          </div>
          <div class="row">
            <label for="dbwYarisSid">sid</label>
            <input id="dbwYarisSid" type="text" inputmode="numeric" placeholder="1189" autocomplete="off" spellcheck="false">
          </div>
        </div>
        <div class="toggle">
          <input id="dbwYarisEnabled" type="checkbox">
          <label for="dbwYarisEnabled">Activer l'envoi des leads YARIS</label>
        </div>
        <div class="dbw-params">
          <div class="dbw-params-title">Paramètres personnalisés</div>
          <div class="dbw-params-list" id="dbwYarisParams"></div>
          <button type="button" class="btn sm dbw-params-add" data-dbw-add="YARIS">+ Ajouter un paramètre</button>
        </div>
      </div>
      <p class="settings-msg" id="dbwMsg" role="status"></p>
      <div class="modal-foot">
        <button class="btn" id="dbwCancel" type="button">Annuler</button>
        <button class="btn primary" id="dbwSave" type="button">Enregistrer</button>
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
      gaPreview: document.getElementById("gaPreview"),
      dbwOpenBtn: document.getElementById("dbwOpenBtn"),
      dbwModalBg: document.getElementById("dbwModalBg"),
      dbwLbxCampaign: document.getElementById("dbwLbxCampaign"),
      dbwLbxCid: document.getElementById("dbwLbxCid"),
      dbwLbxSid: document.getElementById("dbwLbxSid"),
      dbwLbxEnabled: document.getElementById("dbwLbxEnabled"),
      dbwNxCampaign: document.getElementById("dbwNxCampaign"),
      dbwNxCid: document.getElementById("dbwNxCid"),
      dbwNxSid: document.getElementById("dbwNxSid"),
      dbwNxEnabled: document.getElementById("dbwNxEnabled"),
      dbwChrCampaign: document.getElementById("dbwChrCampaign"),
      dbwChrCid: document.getElementById("dbwChrCid"),
      dbwChrSid: document.getElementById("dbwChrSid"),
      dbwChrEnabled: document.getElementById("dbwChrEnabled"),
      dbwChrV2Campaign: document.getElementById("dbwChrV2Campaign"),
      dbwChrV2Cid: document.getElementById("dbwChrV2Cid"),
      dbwChrV2Sid: document.getElementById("dbwChrV2Sid"),
      dbwChrV2Enabled: document.getElementById("dbwChrV2Enabled"),
      dbwYarisCampaign: document.getElementById("dbwYarisCampaign"),
      dbwYarisCid: document.getElementById("dbwYarisCid"),
      dbwYarisSid: document.getElementById("dbwYarisSid"),
      dbwYarisEnabled: document.getElementById("dbwYarisEnabled"),
      dbwLbxParams: document.getElementById("dbwLbxParams"),
      dbwNxParams: document.getElementById("dbwNxParams"),
      dbwChrParams: document.getElementById("dbwChrParams"),
      dbwYarisParams: document.getElementById("dbwYarisParams"),
      dbwModal: document.getElementById("dbwModalBg"),
      dbwSave: document.getElementById("dbwSave"),
      dbwCancel: document.getElementById("dbwCancel"),
      dbwMsg: document.getElementById("dbwMsg"),
      dbwReqModalBg: document.getElementById("dbwReqModalBg"),
      dbwReqId: document.getElementById("dbwReqId"),
      dbwReqBody: document.getElementById("dbwReqBody"),
      dbwReqClose: document.getElementById("dbwReqClose"),
      psReqModalBg: document.getElementById("psReqModalBg"),
      psReqId: document.getElementById("psReqId"),
      psReqBody: document.getElementById("psReqBody"),
      psReqClose: document.getElementById("psReqClose")
    };

    let loadedRows = [];

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
      if (body.enabled && !body.measurement_id) {
        els.gaMsg.textContent = "Saisissez un ID de mesure GA4 pour activer le tracking.";
        els.gaMsg.className = "settings-msg err";
        els.gaId.focus();
        return;
      }
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

    function dbwActiveCount(s) {
      let n = 0;
      ["LBX", "NX", "CHR", "CHR_V2", "YARIS"].forEach((p) => {
        const c = s[p] || {};
        if (c.enabled && c.campaign) n++;
      });
      return n;
    }

    const DBW_PARAM_LISTS = {
      LBX: function () { return els.dbwLbxParams; },
      NX: function () { return els.dbwNxParams; },
      CHR: function () { return els.dbwChrParams; },
      YARIS: function () { return els.dbwYarisParams; }
    };

    function dbwParamEmptyHint(listEl) {
      const hasRows = listEl.querySelector(".dbw-param-row");
      let hint = listEl.querySelector(".dbw-param-empty");
      if (hasRows) {
        if (hint) hint.remove();
      } else if (!hint) {
        hint = document.createElement("div");
        hint.className = "dbw-param-empty";
        hint.textContent = "Aucun paramètre personnalisé.";
        listEl.appendChild(hint);
      }
    }

    function addDbwParamRow(listEl, name, value) {
      const empty = listEl.querySelector(".dbw-param-empty");
      if (empty) empty.remove();
      const row = document.createElement("div");
      row.className = "dbw-param-row";
      const n = document.createElement("input");
      n.className = "dbw-param-name";
      n.type = "text";
      n.placeholder = "nom (ex: f_900_source)";
      n.autocomplete = "off";
      n.spellcheck = false;
      n.value = name || "";
      const v = document.createElement("input");
      v.className = "dbw-param-value";
      v.type = "text";
      v.placeholder = "valeur";
      v.autocomplete = "off";
      v.spellcheck = false;
      v.value = value || "";
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn sm danger dbw-param-del";
      del.textContent = "×";
      del.title = "Supprimer ce paramètre";
      del.addEventListener("click", function () {
        row.remove();
        dbwParamEmptyHint(listEl);
      });
      row.appendChild(n);
      row.appendChild(v);
      row.appendChild(del);
      listEl.appendChild(row);
    }

    function renderDbwParams(listEl, params) {
      listEl.innerHTML = "";
      (params || []).forEach(function (p) { addDbwParamRow(listEl, p.name, p.value); });
      dbwParamEmptyHint(listEl);
    }

    function collectDbwParams(listEl) {
      const out = [];
      listEl.querySelectorAll(".dbw-param-row").forEach(function (row) {
        const name = row.querySelector(".dbw-param-name").value.trim();
        const value = row.querySelector(".dbw-param-value").value.trim();
        if (name) out.push({ name: name, value: value });
      });
      return out;
    }

    els.dbwModal.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-dbw-add]");
      if (!btn) return;
      const getList = DBW_PARAM_LISTS[btn.getAttribute("data-dbw-add")];
      if (!getList) return;
      const listEl = getList();
      addDbwParamRow(listEl, "", "");
      const inputs = listEl.querySelectorAll(".dbw-param-row .dbw-param-name");
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    async function loadDbwSettings() {
      const s = await (await fetch("/api/admin/settings/databowl")).json();
      const lbx = s.LBX || {}, nx = s.NX || {}, chr = s.CHR || {}, chrV2 = s.CHR_V2 || {}, yaris = s.YARIS || {};
      els.dbwLbxCampaign.value = lbx.campaign || "";
      els.dbwLbxCid.value = lbx.cid || "";
      els.dbwLbxSid.value = lbx.sid || "";
      els.dbwLbxEnabled.checked = !!lbx.enabled;
      renderDbwParams(els.dbwLbxParams, lbx.params);
      els.dbwNxCampaign.value = nx.campaign || "";
      els.dbwNxCid.value = nx.cid || "";
      els.dbwNxSid.value = nx.sid || "";
      els.dbwNxEnabled.checked = !!nx.enabled;
      renderDbwParams(els.dbwNxParams, nx.params);
      els.dbwChrCampaign.value = chr.campaign || "";
      els.dbwChrCid.value = chr.cid || "";
      els.dbwChrSid.value = chr.sid || "";
      els.dbwChrEnabled.checked = !!chr.enabled;
      renderDbwParams(els.dbwChrParams, chr.params);
      els.dbwChrV2Campaign.value = chrV2.campaign || "";
      els.dbwChrV2Cid.value = chrV2.cid || "";
      els.dbwChrV2Sid.value = chrV2.sid || "";
      els.dbwChrV2Enabled.checked = !!chrV2.enabled;
      els.dbwYarisCampaign.value = yaris.campaign || "";
      els.dbwYarisCid.value = yaris.cid || "";
      els.dbwYarisSid.value = yaris.sid || "";
      els.dbwYarisEnabled.checked = !!yaris.enabled;
      renderDbwParams(els.dbwYarisParams, yaris.params);
      const active = dbwActiveCount(s);
      els.dbwOpenBtn.textContent = active ? "Databowl · " + active + "/5 actif" : "Databowl";
    }

    function openDbwModal() {
      els.dbwMsg.textContent = "";
      els.dbwMsg.className = "settings-msg";
      loadDbwSettings();
      els.dbwModalBg.classList.add("open");
      els.dbwLbxCampaign.focus();
    }

    function closeDbwModal() {
      els.dbwModalBg.classList.remove("open");
    }

    els.dbwOpenBtn.addEventListener("click", openDbwModal);
    els.dbwCancel.addEventListener("click", closeDbwModal);
    els.dbwModalBg.addEventListener("click", (e) => { if (e.target === els.dbwModalBg) closeDbwModal(); });

    els.dbwSave.addEventListener("click", async () => {
      els.dbwMsg.textContent = "";
      els.dbwMsg.className = "settings-msg";
      const body = {
        LBX: {
          campaign: els.dbwLbxCampaign.value.trim(),
          cid: els.dbwLbxCid.value.trim(),
          sid: els.dbwLbxSid.value.trim(),
          enabled: els.dbwLbxEnabled.checked,
          params: collectDbwParams(els.dbwLbxParams)
        },
        NX: {
          campaign: els.dbwNxCampaign.value.trim(),
          cid: els.dbwNxCid.value.trim(),
          sid: els.dbwNxSid.value.trim(),
          enabled: els.dbwNxEnabled.checked,
          params: collectDbwParams(els.dbwNxParams)
        },
        CHR: {
          campaign: els.dbwChrCampaign.value.trim(),
          cid: els.dbwChrCid.value.trim(),
          sid: els.dbwChrSid.value.trim(),
          enabled: els.dbwChrEnabled.checked,
          params: collectDbwParams(els.dbwChrParams)
        },
        CHR_V2: {
          campaign: els.dbwChrV2Campaign.value.trim(),
          cid: els.dbwChrV2Cid.value.trim(),
          sid: els.dbwChrV2Sid.value.trim(),
          enabled: els.dbwChrV2Enabled.checked
        },
        YARIS: {
          campaign: els.dbwYarisCampaign.value.trim(),
          cid: els.dbwYarisCid.value.trim(),
          sid: els.dbwYarisSid.value.trim(),
          enabled: els.dbwYarisEnabled.checked,
          params: collectDbwParams(els.dbwYarisParams)
        }
      };
      const res = await fetch("/api/admin/settings/databowl", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        els.dbwMsg.textContent = "Paramètres enregistrés.";
        els.dbwMsg.className = "settings-msg ok";
        els.dbwOpenBtn.textContent = (function(){
          const a = dbwActiveCount(data);
          return a ? "Databowl · " + a + "/5 actif" : "Databowl";
        })();
        setTimeout(closeDbwModal, 800);
      } else {
        els.dbwMsg.textContent = data.message || "Enregistrement impossible.";
        els.dbwMsg.className = "settings-msg err";
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
        ["LBX / NX / C-HR+ / C-HR+ V2 / YARIS", (s.by_page.LBX || 0) + " <small>/</small> " + (s.by_page.NX || 0) + " <small>/</small> " + (s.by_page.CHR || 0) + " <small>/</small> " + (s.by_page.CHR_V2 || 0) + " <small>/</small> " + (s.by_page.YARIS || 0), ""]
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
      loadedRows = rows;
      els.count.textContent = data.total + " soumission(s)" + (data.total > rows.length ? " · " + rows.length + " affichées" : "");
      els.empty.style.display = rows.length ? "none" : "block";
      els.rows.innerHTML = rows.map((r) => {
        const db = r.databowl_status ? '<span class="db">' + esc(r.databowl_status) + (r.databowl_lead_id ? " #" + esc(r.databowl_lead_id) : "") + '</span>' : '<span class="db muted">—</span>';
        const reqBtn = r.databowl_request
          ? '<button class="btn sm" data-dbw-req="' + r.id + '">Voir</button>'
          : '<span class="muted">—</span>';
        const ps = r.powerspace_status
          ? '<span class="db">' + esc(r.powerspace_status) + (r.click_id ? " · " + esc(r.click_id) : "") + '</span>'
          : '<span class="db muted">—</span>';
        const psReqBtn = r.powerspace_request
          ? '<button class="btn sm" data-ps-req="' + r.id + '">Voir</button>'
          : '<span class="muted">—</span>';
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
          '<td>' + reqBtn + '</td>' +
          '<td>' + ps + '</td>' +
          '<td>' + psReqBtn + '</td>' +
          '<td class="muted">' + esc(r.error) + '</td>' +
          '<td class="actions">' +
            '<button class="btn sm" data-edit="' + r.id + '">Éditer</button>' +
            '<button class="btn sm danger" data-del="' + r.id + '">Suppr.</button>' +
          '</td>' +
        '</tr>';
      }).join("");
    }

    function openDbwRequestModal(row) {
      if (!row) return;
      els.dbwReqId.textContent = "#" + row.id;
      els.dbwReqBody.textContent = row.databowl_request || "Aucune requete enregistree.";
      els.dbwReqModalBg.classList.add("open");
    }

    function closeDbwRequestModal() {
      els.dbwReqModalBg.classList.remove("open");
    }

    function openPsRequestModal(row) {
      if (!row) return;
      els.psReqId.textContent = "#" + row.id;
      els.psReqBody.textContent = row.powerspace_request || "Aucune requete enregistree.";
      els.psReqModalBg.classList.add("open");
    }

    function closePsRequestModal() {
      els.psReqModalBg.classList.remove("open");
    }

    els.dbwReqClose.addEventListener("click", closeDbwRequestModal);
    els.dbwReqModalBg.addEventListener("click", (e) => {
      if (e.target === els.dbwReqModalBg) closeDbwRequestModal();
    });
    els.psReqClose.addEventListener("click", closePsRequestModal);
    els.psReqModalBg.addEventListener("click", (e) => {
      if (e.target === els.psReqModalBg) closePsRequestModal();
    });

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
      const dbwReq = e.target.closest("[data-dbw-req]");
      const psReq = e.target.closest("[data-ps-req]");
      if (psReq) {
        const id = psReq.getAttribute("data-ps-req");
        const row = loadedRows.find((r) => String(r.id) === String(id));
        openPsRequestModal(row);
        return;
      }
      if (dbwReq) {
        const id = dbwReq.getAttribute("data-dbw-req");
        const row = loadedRows.find((r) => String(r.id) === String(id));
        openDbwRequestModal(row);
        return;
      }
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
    loadDbwSettings();
  </script>
  ${THEME_TOGGLE_SCRIPT}
</body>
</html>`;
}

module.exports = { renderLogin, renderDashboard };
