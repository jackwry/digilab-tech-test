from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, overridable via environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Browser origins allowed to call the API. Defaults to the Vite dev server.
    # Override via the ALLOWED_ORIGINS env var (a JSON array), e.g.
    #   ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:4173"]
    allowed_origins: list[str] = ["http://localhost:3000"]


SETTINGS = Settings()
