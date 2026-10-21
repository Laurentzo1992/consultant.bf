from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://consultantbf:consultantbf@localhost:5432/consultantbf"
    secret_key: str = "change-me-to-a-long-random-string"
    admin_session_secret: str = "change-me-too-another-long-random-string"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"

    # Fees, in `currency`. A consultant pays to publish their profile, a
    # company pays to publish a mission, and whoever initiates a connection
    # request (company -> consultant, or consultant applying to a mission)
    # pays for it.
    profile_price: int = 1000
    mission_price: int = 2000
    connection_request_price: int = 1000
    currency: str = "XOF"

    cors_origins: str = "http://localhost:5173"

    # Where uploaded CVs are stored (a Docker volume in compose).
    upload_dir: str = "uploads"
    cv_max_bytes: int = 5 * 1024 * 1024

    # One of "mock" (default, no external calls, useful for local dev),
    # "ligdicash" or "sebpay" -- or several, comma-separated ("ligdicash,sebpay"),
    # in which case the user picks at checkout and the first is the default.
    payment_provider: str = "mock"
    ligdicash_base_url: str = "https://app.ligdicash.com"
    ligdicash_api_key: str = ""
    ligdicash_auth_token: str = ""
    sebpay_base_url: str = "https://newapi.sebpay.bj"
    sebpay_public_key: str = ""
    sebpay_secret_key: str = ""

    # Used to build the URLs the payment providers redirect/call back to. Must
    # be publicly reachable for the callback URLs of real providers.
    public_backend_url: str = "http://localhost:8000"
    public_frontend_url: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def payment_providers(self) -> list[str]:
        providers = [p.strip().lower() for p in self.payment_provider.split(",") if p.strip()]
        return providers or ["mock"]


settings = Settings()
