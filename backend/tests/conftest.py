import pytest
import os
import sys
import asyncio
import tempfile

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Use a temporary file database for tests (shared across connections)
_test_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_test_db.close()
os.environ["DATABASE_PATH"] = _test_db.name
os.environ["MIMO_API_KEY"] = "test_key"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def setup_db():
    """Initialize database tables before each test."""
    from models.database import init_db
    loop = asyncio.new_event_loop()
    loop.run_until_complete(init_db())
    yield
    loop.close()


def pytest_sessionfinish(session, exitstatus):
    """Clean up temp database file."""
    try:
        os.unlink(_test_db.name)
    except OSError:
        pass
