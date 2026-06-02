// Insere des soumissions de demonstration pour tester le dashboard.
// Usage : npm run seed   (ou : node seed.js)
const db = require("./db");

function daysAgo(n, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d.toISOString();
}

const demo = [
  {
    status: "success", page: "LBX", page_url: "http://127.0.0.1:8010/index.html",
    civilite: "Mme", prenom: "Claire", nom: "Dubois", email: "claire.dubois@example.com",
    telephone: "0612345678", concession: "Paris 17", modele: "Lexus LBX 2WD", offre: "LBX_PART_JUIN_2026",
    rgpd: 1, ip: "82.64.12.5", referer: "https://www.google.com/", error: null,
    databowl_status: "created", databowl_lead_id: "100245", created_at: daysAgo(0)
  },
  {
    status: "success", page: "NX", page_url: "http://127.0.0.1:8010/nx.html",
    civilite: "M", prenom: "Antoine", nom: "Mercier", email: "antoine.mercier@example.com",
    telephone: "0698765432", concession: "Lyon Est", modele: "Lexus NX 350h Hybride 2WD Pack", offre: "NX_PART_JUIN_2026",
    rgpd: 1, ip: "90.12.45.200", referer: "https://www.facebook.com/", error: null,
    databowl_status: "not_configured", databowl_lead_id: null, created_at: daysAgo(1)
  },
  {
    status: "success", page: "LBX", page_url: "http://127.0.0.1:8010/index.html",
    civilite: "M", prenom: "Hugo", nom: "Lefevre", email: "hugo.lefevre@example.com",
    telephone: "0700112233", concession: "Bordeaux", modele: "Lexus LBX 2WD", offre: "LBX_PART_JUIN_2026",
    rgpd: 1, ip: "78.220.9.14", referer: "", error: null,
    databowl_status: "created", databowl_lead_id: "100246", created_at: daysAgo(2)
  },
  {
    status: "server_validation_failed", page: "NX", page_url: "http://127.0.0.1:8010/nx.html",
    civilite: "Mme", prenom: "Sophie", nom: "", email: "sophie@@bad", telephone: "0600000000",
    concession: "", modele: "Lexus NX 350h Hybride 2WD Pack", offre: "NX_PART_JUIN_2026",
    rgpd: 0, ip: "176.34.88.2", referer: "https://www.google.com/", error: "nom manquant, email invalide, RGPD non accepte",
    databowl_status: null, databowl_lead_id: null, created_at: daysAgo(2, 14)
  },
  {
    status: "client_validation_failed", page: "LBX", page_url: "http://127.0.0.1:8010/index.html",
    civilite: "", prenom: "Lea", nom: "", email: "", telephone: "",
    concession: "", modele: "Lexus LBX 2WD", offre: "LBX_PART_JUIN_2026",
    rgpd: 0, ip: "31.39.220.77", referer: "https://t.co/", error: "civilite, nom, email, telephone, rgpd",
    databowl_status: null, databowl_lead_id: null, created_at: daysAgo(3, 9)
  },
  {
    status: "client_validation_failed", page: "NX", page_url: "http://127.0.0.1:8010/nx.html",
    civilite: "M", prenom: "Karim", nom: "Benali", email: "", telephone: "0611223344",
    concession: "Marseille", modele: "Lexus NX 350h Hybride 2WD Pack", offre: "NX_PART_JUIN_2026",
    rgpd: 1, ip: "92.184.100.3", referer: "https://www.instagram.com/", error: "email",
    databowl_status: null, databowl_lead_id: null, created_at: daysAgo(4, 18)
  },
  {
    status: "success", page: "NX", page_url: "http://127.0.0.1:8010/nx.html",
    civilite: "Mme", prenom: "Nadia", nom: "Rossi", email: "nadia.rossi@example.com",
    telephone: "0755667788", concession: "Nice", modele: "Lexus NX 350h Hybride 2WD Pack", offre: "NX_PART_JUIN_2026",
    rgpd: 1, ip: "109.190.5.42", referer: "https://www.google.com/", error: null,
    databowl_status: "rejected", databowl_lead_id: null, created_at: daysAgo(5)
  }
];

let n = 0;
for (const row of demo) {
  db.insertSubmission(row);
  n++;
}
console.log(`Seed termine : ${n} soumissions inserees dans ${db.DB_PATH}`);
