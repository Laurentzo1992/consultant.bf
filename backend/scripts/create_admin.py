"""Create (or promote) an admin user. For an existing user, also resets the password.

Usage (run from the backend/ directory):
    python scripts/create_admin.py admin@example.com "MotDePasse123" "Admin Site" "+22670000000"
"""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.models import User, UserRole  # noqa: E402
from app.security import hash_password  # noqa: E402


def main() -> None:
    if len(sys.argv) != 5:
        print(__doc__)
        raise SystemExit(1)

    email, password, full_name, phone = sys.argv[1:5]

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_admin = True
            user.is_active = True
            user.hashed_password = hash_password(password)
            print(f"Utilisateur existant '{email}' promu administrateur (mot de passe mis a jour).")
        else:
            user = User(
                email=email,
                hashed_password=hash_password(password),
                full_name=full_name,
                phone=phone,
                # Admins are not a party to connections; the role only
                # matters if they also use the public site.
                role=UserRole.entreprise,
                company_name="Consultant.bf",
                is_admin=True,
            )
            db.add(user)
            print(f"Administrateur '{email}' cree.")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
