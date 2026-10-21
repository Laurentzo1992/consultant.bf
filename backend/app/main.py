from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin import setup_admin
from app.config import settings
from app.routers import auth, connections, consultants, missions, payments, users

app = FastAPI(title="Consultant.bf API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(consultants.router)
app.include_router(missions.router)
app.include_router(connections.router)
app.include_router(payments.router)

setup_admin(app)


@app.get("/health")
def health():
    return {"status": "ok"}
