# Landings Lexus JPO + Backend de monitoring

Deux landing pages statiques (Lexus LBX et NX) servies par un petit serveur Node.js,
avec enregistrement de **toutes** les soumissions de formulaire en SQLite et un
back-office sécurisé pour les consulter, éditer et supprimer.

## Installation

```bash
npm install
cp .env.example .env   # puis editez vos identifiants admin et le secret de session
```

> SQLite est gere via `better-sqlite3` (seule dependance). La base est creee
> automatiquement au demarrage (`leads.db` par defaut).

## Lancer en local

```bash
npm start
```

- LBX : http://127.0.0.1:8010/modele-lbx
- NX  : http://127.0.0.1:8010/modele-nx
- Admin : http://127.0.0.1:8010/admin/login

### Données de démonstration (optionnel)

```bash
npm run seed
```

## Fonctionnement

- **Toutes** les soumissions sont enregistrees en base avec un statut :
  - `success` — formulaire valide ;
  - `server_validation_failed` — champs obligatoires manquants / email invalide / RGPD refuse cote serveur ;
  - `client_validation_failed` — echec de validation cote navigateur (avant l'envoi reseau).
- Pour chaque soumission on conserve : page (LBX/NX), URL, IP, referer et horodatage.
- **Databowl est independant** : il n'est appele que pour les soumissions valides,
  et son resultat (`created` / `rejected` / `error` / `not_configured`) est stocke a titre indicatif.
  L'enregistrement en base ne depend jamais de Databowl.

### Databowl

L'agence doit fournir `f_859_campaignid`. Sans cette valeur, les leads sont
enregistres en base mais **non** envoyes a Databowl (statut `not_configured`).

```bash
DATABOWL_CAMPAIGN_ID="VALEUR_FOURNIE_PAR_L_AGENCE" npm start
```

## Back-office (`/admin`)

- Authentification par compte unique (`ADMIN_USER` / `ADMIN_PASSWORD` du `.env`), session par cookie signe.
- Statistiques (total, leads valides, taux de succes, echecs serveur/navigateur, repartition LBX/NX).
- Filtres par page, statut et plage de dates.
- Edition des champs du lead (civilite, prenom, nom, email, telephone, concession).
- Suppression definitive d'une ligne.

## Variables d'environnement

Voir `.env.example` : `PORT`, `DATABOWL_CAMPAIGN_ID`, `ADMIN_USER`, `ADMIN_PASSWORD`,
`SESSION_SECRET`, `DB_PATH`.
