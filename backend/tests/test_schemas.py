import pytest
from pydantic import ValidationError
from models.schemas import TTSRequest, BatchCreateRequest, VoiceCreate, VoiceDesignRequest


class TestTTSRequest:
    def test_defaults(self):
        req = TTSRequest(text="hello")
        assert req.model == "mimo-v2.5-tts"
        assert req.voice == "mimo_default"
        assert req.format.value == "wav"
        assert req.speed == 1.0

    def test_custom_values(self):
        req = TTSRequest(text="test", model="custom", voice="冰糖", format="mp3", speed=1.5)
        assert req.model == "custom"
        assert req.voice == "冰糖"
        assert req.speed == 1.5

    def test_text_max_length(self):
        with pytest.raises(ValidationError):
            TTSRequest(text="a" * 5001)

    def test_speed_range(self):
        with pytest.raises(ValidationError):
            TTSRequest(text="test", speed=0.1)
        with pytest.raises(ValidationError):
            TTSRequest(text="test", speed=3.0)


class TestBatchCreateRequest:
    def test_defaults(self):
        req = BatchCreateRequest(name="test", texts=["hello", "world"])
        assert req.voice == "mimo_default"
        assert req.speed == 1.0

    def test_empty_texts_allowed(self):
        req = BatchCreateRequest(name="test", texts=[])
        assert req.texts == []


class TestVoiceCreate:
    def test_valid(self):
        v = VoiceCreate(name="My Voice", type="clone")
        assert v.name == "My Voice"
        assert v.type == "clone"
        assert v.voice_id is None

    def test_type_must_be_clone_or_design(self):
        with pytest.raises(ValidationError):
            VoiceCreate(name="test", type="invalid")

    def test_name_max_length(self):
        with pytest.raises(ValidationError):
            VoiceCreate(name="a" * 201, type="clone")


class TestVoiceDesignRequest:
    def test_valid(self):
        req = VoiceDesignRequest(description="warm voice", text="hello world")
        assert req.format.value == "wav"

    def test_description_max_length(self):
        with pytest.raises(ValidationError):
            VoiceDesignRequest(description="a" * 501, text="hello")
