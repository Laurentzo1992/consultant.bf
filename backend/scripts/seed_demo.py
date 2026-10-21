"""Fills an empty database with demo consultants, companies and missions
(all already published) so the site can be explored locally.

Usage (run from the backend/ directory):
    python scripts/seed_demo.py

Every demo account uses the password "demo12345". Safe to re-run: accounts
that already exist are left untouched.
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Availability,
    CompanySize,
    ConsultantProfile,
    Domain,
    ListingStatus,
    Mission,
    User,
    UserRole,
    WorkMode,
)
from app.schemas import normalize_skills  # noqa: E402
from app.security import hash_password  # noqa: E402

PASSWORD = "demo12345"

CONSULTANTS = [
    ("Awa Ouedraogo", "Ouagadougou", Domain.finance, "Expert-comptable, audit et controle de gestion",
     "Audit financier, IFRS/SYSCOHADA, controle de gestion, Excel, Sage", 12, 150000, WorkMode.hybride),
    ("Issa Sawadogo", "Bobo-Dioulasso", Domain.informatique, "Developpeur full-stack et architecte cloud",
     "Python, React, PostgreSQL, Docker, AWS, Gestion de projet agile", 8, 120000, WorkMode.distance),
    ("Mariam Kabore", "Ouagadougou", Domain.suivi_evaluation,
     "Specialiste suivi-evaluation de projets de developpement",
     "Suivi-evaluation, Cadre logique, KoboToolbox, Stata, Redaction de rapports", 10, 130000, WorkMode.sur_site),
    ("Boukary Zongo", "Koudougou", Domain.agriculture, "Agronome, chaines de valeur agricoles",
     "Chaines de valeur, Agroecologie, Formation de producteurs, Etudes de faisabilite", 15, 110000, WorkMode.hybride),
    ("Fatimata Traore", "Ouagadougou", Domain.rh, "Consultante RH : recrutement et organisation",
     "Recrutement, GPEC, Droit du travail, Formation, Audit social", 9, 100000, WorkMode.hybride),
    ("Yacouba Compaore", "Ouagadougou", Domain.juridique, "Juriste d'affaires OHADA",
     "Droit OHADA, Contrats, Creation d'entreprise, Conformite", 11, 140000, WorkMode.sur_site),
    ("Salif Nikiema", "Ouagadougou", Domain.marketing, "Strategie digitale et communication",
     "Marketing digital, Reseaux sociaux, SEO, Etude de marche, Communication institutionnelle", 6, 80000,
     WorkMode.distance),
    ("Aminata Diallo", "Bobo-Dioulasso", Domain.environnement, "Etudes d'impact environnemental et social",
     "EIES, Normes de performance IFC, Plan de gestion environnementale, SIG", 13, 145000, WorkMode.hybride),
]

COMPANIES = [
    ("Paul Kafando", "Faso Agro SA", "Agro-industrie", CompanySize.pme, "Ouagadougou", [
        ("Etude de faisabilite d'une unite de transformation de karite", Domain.agriculture,
         "Etudes de faisabilite, Chaines de valeur, Analyse financiere", 8, "3 mois", 120000, WorkMode.hybride),
        ("Audit des comptes 2025", Domain.finance, "Audit financier, SYSCOHADA", 5, "6 semaines", 160000,
         WorkMode.sur_site),
    ]),
    ("Clarisse Some", "ONG Sahel Avenir", "Developpement / humanitaire", CompanySize.ong, "Ouagadougou", [
        ("Evaluation finale d'un projet de resilience", Domain.suivi_evaluation,
         "Suivi-evaluation, KoboToolbox, Redaction de rapports", 7, "2 mois", 140000, WorkMode.sur_site),
        ("Etude d'impact environnemental d'un forage", Domain.environnement, "EIES, SIG", 5, "1 mois", 150000,
         WorkMode.hybride),
    ]),
    ("Hamidou Ilboudo", "BurkiTech", "Numerique", CompanySize.tpe, "Bobo-Dioulasso", [
        ("Refonte de notre plateforme e-commerce", Domain.informatique, "React, Python, PostgreSQL, Docker", 4,
         "4 mois", 110000, WorkMode.distance),
        ("Strategie de lancement sur les reseaux sociaux", Domain.marketing, "Marketing digital, Reseaux sociaux",
         2, "6 semaines", 75000, WorkMode.distance),
    ]),
]


def _email(name: str) -> str:
    return name.lower().replace(" ", ".") + "@demo.consultant.bf"


def main() -> None:
    db = SessionLocal()
    try:
        created = 0
        for i, (name, city, domain, headline, skills, years, rate, mode) in enumerate(CONSULTANTS):
            if db.query(User).filter(User.email == _email(name)).first():
                continue
            user = User(
                email=_email(name), hashed_password=hash_password(PASSWORD), full_name=name,
                role=UserRole.consultant, phone=f"+226700000{i:02d}", whatsapp=True, city=city,
            )
            user.profile = ConsultantProfile(
                headline=headline,
                bio=f"{headline}. {years} ans d'experience aupres d'entreprises, d'ONG et d'institutions "
                f"publiques au Burkina Faso et dans la sous-region.",
                domain=domain, skills=normalize_skills(skills), years_experience=years, daily_rate=rate,
                availability=Availability.immediate if i % 2 == 0 else Availability.under_1_month,
                work_mode=mode, languages="Francais, Anglais" if i % 3 == 0 else "Francais, Moore", city=city,
                status=ListingStatus.published,
            )
            db.add(user)
            created += 1

        for j, (name, company, sector, size, city, missions) in enumerate(COMPANIES):
            if db.query(User).filter(User.email == _email(name)).first():
                continue
            user = User(
                email=_email(name), hashed_password=hash_password(PASSWORD), full_name=name,
                role=UserRole.entreprise, phone=f"+226710000{j:02d}", city=city,
                company_name=company, company_sector=sector, company_size=size,
            )
            for title, domain, skills, min_exp, duration, max_rate, mode in missions:
                user.missions.append(Mission(
                    title=title,
                    description=f"{company} recherche un consultant pour : {title.lower()}. "
                    f"Livrables attendus, calendrier et termes de reference detailles lors de la mise en relation.",
                    domain=domain, required_skills=normalize_skills(skills), min_experience=min_exp,
                    duration=duration, max_daily_rate=max_rate, work_mode=mode, city=city,
                    status=ListingStatus.published,
                ))
            db.add(user)
            created += 1

        db.commit()
        print(f"{created} comptes de demonstration crees (mot de passe : {PASSWORD}).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
