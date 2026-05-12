import pytest


class TestConfig:
    def test_config_loads(self):
        from utils.config import AUDIO_STORE_PATH, DATABASE_PATH, MAX_TEXT_LENGTH, MAX_FILE_SIZE
        assert isinstance(AUDIO_STORE_PATH, str)
        assert isinstance(DATABASE_PATH, str)
        assert MAX_TEXT_LENGTH == 5000
        assert MAX_FILE_SIZE == 10 * 1024 * 1024

    def test_api_base_has_default(self):
        from utils.config import MIMO_API_BASE
        assert "xiaomimimo.com" in MIMO_API_BASE


class TestVersion:
    def test_version_readable(self):
        import sys, os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        # Simulate reading VERSION file
        version_file = os.path.join(os.path.dirname(__file__), "..", "..", "VERSION")
        if os.path.exists(version_file):
            with open(version_file) as f:
                version = f.read().strip()
            parts = version.split(".")
            assert len(parts) == 3
            assert all(p.isdigit() for p in parts)
