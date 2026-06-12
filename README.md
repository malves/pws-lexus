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

Les leads valides (statut `success`) sont poussés vers Databowl **uniquement en cas de succès**,
sans jamais bloquer l'enregistrement en base.

Deux niveaux d'identifiants :

- **`cid` / `sid`** — identifiants techniques d'intégration Databowl, **propres à chaque marque**
  (Lexus `628` / `1189`, Toyota `364` / `1189`).
- **Code campagne BACS** (champ `f_859_campaignid`) — **propre à chaque page** et
  **différent entre préproduction et production**. C'est la valeur que l'on règle au quotidien.

Le code campagne est **configurable par page** et **modifiable à chaud** depuis le back-office
(bouton **« Databowl »** du dashboard).

Ordre de priorité du code campagne : valeur enregistrée dans l'admin > `DATABOWL_<PAGE>_CAMPAIGN`
> `DATABOWL_CAMPAIGN_ID` (fallback global) > valeur par défaut du projet. Tant que la page est
désactivée, les leads sont enregistrés en base mais **non** envoyés à Databowl (statut `not_configured`).

```bash
# Exemple : surcharger un code campagne
DATABOWL_LBX_CAMPAIGN=701Sa00002elzpZ npm start
```

Codes campagnes fournis par l'agence :

| Page | Marque | Code |
|------|--------|------|
| LBX  | Lexus  | `701Sa00002elzpZ` |
| NX   | Lexus  | `701Sa00002elGuO` |
| CHR+ | Toyota | `701Sa00002enXXV` |
| Yaris Cross | Toyota | `701Sa00002enXXV` |

## Back-office (`/admin`)

- Authentification par compte unique (`ADMIN_USER` / `ADMIN_PASSWORD` du `.env`), session par cookie signe.
- Statistiques (total, leads valides, taux de succes, echecs serveur/navigateur, repartition LBX/NX).
- Filtres par page, statut et plage de dates.
- Edition des champs du lead (civilite, prenom, nom, email, telephone, concession).
- Suppression definitive d'une ligne.

## Variables d'environnement

Voir `.env.example` : `PORT`, `DATABOWL_LEXUS_CID`, `DATABOWL_LEXUS_SID`,
`DATABOWL_TOYOTA_CID`, `DATABOWL_TOYOTA_SID`,
`DATABOWL_LBX_CAMPAIGN`, `DATABOWL_NX_CAMPAIGN`, `DATABOWL_CAMPAIGN_ID`,
`ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `DB_PATH`.
