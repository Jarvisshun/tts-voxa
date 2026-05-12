import pytest
from utils.audio import get_audio_format, pcm_to_wav, save_audio


class TestGetAudioFormat:
    def test_wav_extension(self):
        assert get_audio_format("recording.wav") == "wav"

    def test_mp3_extension(self):
        assert get_audio_format("song.mp3") == "mp3"

    def test_m4a_extension(self):
        assert get_audio_format("voice.m4a") == "m4a"

    def test_webm_extension(self):
        assert get_audio_format("audio.webm") == "webm"

    def test_unknown_defaults_to_wav(self):
        assert get_audio_format("file.xyz") == "wav"

    def test_no_extension_defaults_to_wav(self):
        assert get_audio_format("noext") == "wav"

    def test_case_insensitive(self):
        assert get_audio_format("FILE.WAV") == "wav"


class TestPcmToWav:
    def test_converts_pcm_to_wav(self):
        pcm_bytes = b"\x00\x00" * 100
        wav_bytes = pcm_to_wav(pcm_bytes, sample_rate=24000, num_channels=1, bits_per_sample=16)
        assert len(wav_bytes) == 44 + 200
        assert wav_bytes[:4] == b"RIFF"
        assert wav_bytes[8:12] == b"WAVE"
        assert wav_bytes[12:16] == b"fmt "

    def test_stereo_pcm(self):
        pcm_bytes = b"\x00\x00" * 200
        wav_bytes = pcm_to_wav(pcm_bytes, sample_rate=44100, num_channels=2, bits_per_sample=16)
        assert len(wav_bytes) == 44 + 400
