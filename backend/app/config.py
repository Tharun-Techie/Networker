from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Networker API"
    database_url: str = "postgresql+asyncpg://networker:networker_dev@localhost:5432/networker"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "networker_dev_pw"
    redis_url: str = "redis://localhost:6379/0"
    opensearch_url: str = "http://localhost:9200"
    s3_endpoint_url: str = "http://localhost:9000"
    s3_bucket: str = "networker-evidence"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
