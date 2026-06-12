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

Toute la configuration Databowl se fait **exclusivement depuis le back-office**
(bouton **« Databowl »** du dashboard), **par page** et **modifiable à chaud**. Aucune variable
d'environnement Databowl n'est utilisée. Pour chaque page on règle :

- **Code campagne BACS** (champ `f_859_campaignid`) — propre à chaque page et différent
  entre préproduction et production.
- **`cid` / `sid`** — identifiants techniques d'intégration Databowl, propres à chaque page.
- **Paramètres personnalisés** — paires *nom de variable* + *valeur* ajoutées dynamiquement
  par page. Ils sont injectés dans le payload Databowl (et peuvent surcharger les champs par
  défaut s'ils portent le même nom). Le nom n'accepte que lettres, chiffres et `. _ -`.

Tant que la page est désactivée (ou si campagne / `cid` / `sid` manquent), les leads sont
enregistrés en base mais **non** envoyés à Databowl (statut `not_configured`).

Valeurs par défaut (seed initial, surchargé dès qu'on enregistre dans l'admin) :

| Page | Marque | Code campagne | cid | sid |
|------|--------|---------------|-----|-----|
| LBX  | Lexus  | `701Sa00002elzpZ` | `628` | `1189` |
| NX   | Lexus  | `701Sa00002elGuO` | `628` | `1189` |
| CHR+ | Toyota | `701Sa00002enXXV` | `364` | `1189` |
| Yaris Cross | Toyota | `701Sa00002enXXV` | `364` | `1189` |

## Back-office (`/admin`)

- Authentification par compte unique (`ADMIN_USER` / `ADMIN_PASSWORD` du `.env`), session par cookie signe.
- Statistiques (total, leads valides, taux de succes, echecs serveur/navigateur, repartition LBX/NX).
- Filtres par page, statut et plage de dates.
- Edition des champs du lead (civilite, prenom, nom, email, telephone, concession).
- Suppression definitive d'une ligne.

## Variables d'environnement

Voir `.env.example` : `PORT`, `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `DB_PATH`.
La configuration Databowl (code campagne, `cid`, `sid` par page) n'est **pas** dans `.env` :
elle se gère uniquement depuis l'admin.
