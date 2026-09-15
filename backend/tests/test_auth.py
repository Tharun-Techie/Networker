import uuid

from fastapi.testclient import TestClient

from app.db_postgres import get_session
from app.main import app
from app.models_sql import User
from app.routers.auth import pwd


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeSession:
    """Minimal AsyncSession stand-in: execute/add/commit/refresh only."""

    def __init__(self, existing=None):
        self.existing = existing
        self.added: list = []

    async def execute(self, *args, **kwargs):
        return FakeResult(self.existing)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = uuid.uuid4()


def use_session(session):
    async def _get():
        yield session

    app.dependency_overrides[get_session] = _get


def test_register_creates_user():
    use_session(FakeSession())
    try:
        r = TestClient(app).post(
            "/api/auth/register", json={"email": "new@example.com", "password": "secret123"}
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["email"] == "new@example.com"
        assert body["role"] == "editor"
        assert body["id"]
    finally:
        app.dependency_overrides.clear()


def test_register_duplicate_conflicts():
    use_session(FakeSession(existing=User(email="dup@example.com", password_hash="x")))
    try:
        r = TestClient(app).post(
            "/api/auth/register", json={"email": "dup@example.com", "password": "secret123"}
        )
        assert r.status_code == 409, r.text
    finally:
        app.dependency_overrides.clear()


def test_login_returns_token():
    user = User(email="u@example.com", password_hash=pwd.hash("correct-horse"), role="editor")
    user.id = uuid.uuid4()
    use_session(FakeSession(existing=user))
    try:
        r = TestClient(app).post(
            "/api/auth/token", data={"username": "u@example.com", "password": "correct-horse"}
        )
        assert r.status_code == 200, r.text
        assert r.json()["access_token"]
    finally:
        app.dependency_overrides.clear()


def test_login_wrong_password_unauthorized():
    user = User(email="u@example.com", password_hash=pwd.hash("correct-horse"), role="editor")
    user.id = uuid.uuid4()
    use_session(FakeSession(existing=user))
    try:
        r = TestClient(app).post(
            "/api/auth/token", data={"username": "u@example.com", "password": "nope"}
        )
        assert r.status_code == 401, r.text
    finally:
        app.dependency_overrides.clear()
