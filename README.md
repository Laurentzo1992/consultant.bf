# Consultant.bf

Plateforme de mise en relation entre **consultants independants** et **entreprises,
ONG et institutions** qui cherchent une expertise. Les profils et missions sont
publics mais anonymes ; l'identite et les coordonnees ne sont echangees qu'apres
validation de la mise en relation par un administrateur.

Construit sur la meme architecture que [site-relation](https://github.com/Laurentzo1992/site-relation)
(le site de rencontre dont il est derive) :

- **Backend** : FastAPI + SQLAlchemy + PostgreSQL, auth JWT, migrations Alembic
- **Administration** : [SQLAdmin](https://aminalaee.dev/sqladmin/) sur `/admin` (validation des mises en relation)
- **Frontend** : React (Vite)
- **Paiements** : LigdiCash et/ou SebPay (Mobile Money), ou `mock` en local

Deploiement en production (VPS + Docker Compose + Caddy) : voir **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## Ce qui change par rapport au site de rencontre

| Site de rencontre | Consultant.bf |
| --- | --- |
| Un seul type de membre | Deux roles a l'inscription : `consultant` ou `entreprise` (nom, secteur et taille de l'organisation) |
| Annonce (titre, description, genre/age recherches) | **Profil consultant** (titre, domaine, competences, experience, TJM, disponibilite, mode de travail) et **Mission** (domaine, competences requises, experience min., duree, TJM max, lieu, date de debut) |
| Demande de mise en relation sur une annonce | Deux sens : l'**entreprise contacte un consultant** (eventuellement a propos d'une de ses missions) ou le **consultant postule a une mission** — avec un message |
| — | **Matching** : score de compatibilite 0-100 (`backend/app/matching.py`) — consultants recommandes pour une mission, missions recommandees pour un consultant |
| Nom masque avant validation | Nom du consultant **et** nom de l'organisation masques ; seuls le secteur et la taille sont visibles |

## Fonctionnement

1. Inscription comme **consultant** ou **entreprise** (telephone et email toujours prives).
2. Le consultant cree son profil (`PUT /consultants/me`) et paie la publication -> profil visible.
3. L'entreprise cree une mission (`POST /missions`) et paie la publication -> mission visible.
4. Le matching propose :
   - a l'entreprise, les consultants les plus compatibles avec chaque mission (`GET /missions/{id}/matches`) ;
   - au consultant, les missions les plus compatibles avec son profil (`GET /consultants/me/matches`).
5. Une demande de mise en relation (`POST /connections`) est creee par celui qui en prend l'initiative,
   qui la paie -> statut `pending_admin`. Le destinataire la voit (identite masquee).
6. Un administrateur approuve ou rejette depuis `/admin`.
7. Une fois approuvee, chacun voit les coordonnees de l'autre (`GET /connections/{id}/contact`).

### Le score de compatibilite

Calcul transparent, sur 100 :

| Critere | Points | Regle |
| --- | --- | --- |
| Domaine | 35 | meme domaine d'expertise |
| Competences | 35 | part des competences requises que le consultant possede (une competence correspond si l'une contient l'autre : « audit » ~ « audit financier ») |
| Experience | 10 | complet si >= experience minimale, sinon au prorata |
| Lieu | 10 | mission a distance, ou meme ville ; partiel selon les modes de travail |
| TJM | 10 | complet si le TJM du consultant <= TJM max de la mission, sinon au prorata |

Seuls les resultats >= 30 sont proposes. Les candidats sont d'abord pre-filtres en SQL
(meme domaine ou au moins une competence en commun).

### Tarifs

Configurables dans `backend/.env` : `PROFILE_PRICE` (1000), `MISSION_PRICE` (2000),
`CONNECTION_REQUEST_PRICE` (1000), `CURRENCY` (XOF). Le frontend les lit via
`GET /payments/options`, rien n'est code en dur.

## Paiement

Identique au projet d'origine : `PAYMENT_PROVIDER=mock` (bouton « Simuler la confirmation »),
`ligdicash`, `sebpay`, ou plusieurs separes par des virgules. Les webhooks ne sont jamais crus
sur parole : le backend re-interroge toujours le fournisseur. Voir `backend/app/payments.py`.

## Demarrage rapide (Docker)

```bash
cp backend/.env.example backend/.env
docker compose up --build
docker compose exec backend python scripts/create_admin.py admin@example.com "MotDePasse123" "Admin" "+22670000000"
docker compose exec backend python scripts/seed_demo.py   # optionnel : donnees de demonstration
```

- Frontend : http://localhost:5173
- API : http://localhost:8001 — documentation : http://localhost:8001/docs
- Administration : http://localhost:8001/admin

## Demarrage en local (sans Docker)

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # ou source .venv/bin/activate sous Linux/Mac
pip install -r requirements-dev.txt
cp .env.example .env          # adapter DATABASE_URL
alembic upgrade head          # PostgreSQL
python scripts/create_admin.py admin@example.com "MotDePasse123" "Admin" "+22670000000"
python scripts/seed_demo.py   # optionnel : 8 consultants, 3 organisations, 6 missions (mot de passe demo12345)
uvicorn app.main:app --reload
```

Sans PostgreSQL, pour un essai rapide avec SQLite (les migrations ciblent PostgreSQL, on cree donc
les tables directement) :

```bash
set DATABASE_URL=sqlite:///./dev.db     # export DATABASE_URL=... sous Linux/Mac
python -c "from app.database import Base, engine; from app import models; Base.metadata.create_all(engine)"
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL doit pointer vers le backend
npm run dev
```

### Tests

```bash
cd backend
pytest        # 50 tests : roles, publication, masquage, mises en relation, matching, SebPay
ruff check .
```

## Structure du projet

```
backend/
  app/
    models.py            User (role), ConsultantProfile, Mission, ConnectionRequest, Payment
    schemas.py           schemas Pydantic (identite et contact JAMAIS exposes publiquement)
    matching.py          score de compatibilite consultant <-> mission
    crud.py              requetes
    routers/             auth, users, consultants, missions, connections, payments
    admin.py             SQLAdmin (profils, missions, demandes : approuver/rejeter)
    payments.py          logique de paiement (mock, LigdiCash, SebPay)
  alembic/               migrations (PostgreSQL)
  scripts/               create_admin.py, seed_demo.py, backup_db.sh
  tests/
frontend/
  src/
    pages/               Accueil, recherche consultants/missions, fiches, mon profil,
                         mes missions, consultants recommandes, demandes envoyees/recues...
    components/          Cartes, PaymentBox, ConnectionCard, Navbar, MatchScene...
    hooks/               useBrowse (recherche paginee), usePrices
    index.css            design system
```
