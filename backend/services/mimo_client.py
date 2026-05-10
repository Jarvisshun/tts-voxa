import httpx
import base64
import json


class MiMoClient:
    def __init__(self, api_key: str = "", api_base: str = ""):
        from utils.config import MIMO_API_KEY, MIMO_API_BASE
        self.api_base = api_base or MIMO_API_BASE
        self.api_key = api_key or MIMO_API_KEY

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def tts(
        self,
        text: str,
        model: str = "mimo-v2.5-tts",
        voice: str = "mimo_default",
        format: str = "wav",
        speed: float = 1.0,
        emotion: str | None = None,
    ) -> dict:
        messages = []
        if emotion:
            messages.append({"role": "user", "content": f"用{emotion}的语气说"})
        messages.append({"role": "assistant", "content": text})

        payload = {
            "model": model,
            "messages": messages,
            "modalities": ["text", "audio"],
            "audio": {"voice": voice, "format": format, "speed": speed},
            "stream": False,
        }

        async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
            resp = await client.post(
                f"{self.api_base}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "audio": data["choices"][0]["message"]["audio"]["data"],
                "format": format,
            }

    async def tts_stream(
        self,
        text: str,
        model: str = "mimo-v2.5-tts",
        voice: str = "mimo_default",
        format: str = "wav",
        speed: float = 1.0,
        emotion: str | None = None,
    ):
        messages = []
        if emotion:
            messages.append({"role": "user", "content": f"用{emotion}的语气说"})
        messages.append({"role": "assistant", "content": text})

        payload = {
            "model": model,
            "messages": messages,
            "modalities": ["text", "audio"],
            "audio": {"voice": voice, "format": format, "speed": speed},
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=120.0, trust_env=False) as client:
            async with client.stream(
                "POST",
                f"{self.api_base}/chat/completions",
                headers=self._headers(),
                json=payload,
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        chunk = line[6:]
                        if chunk == "[DONE]":
                            yield {"type": "complete"}
                            break
                        try:
                            data = json.loads(chunk)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            if "audio" in delta and "data" in delta["audio"]:
                                yield {
                                    "type": "audio_chunk",
                                    "data": delta["audio"]["data"],
                                }
                        except json.JSONDecodeError:
                            continue

    async def voice_clone(
        self,
        text: str,
        audio_base64: str,
        audio_format: str = "wav",
        output_format: str = "wav",
        emotion: str | None = None,
    ) -> dict:
        voice_dataurl = f"data:audio/{audio_format};base64,{audio_base64}"

        messages = []
        if emotion:
            messages.append({"role": "user", "content": f"用{emotion}的语气说"})
        else:
            messages.append({"role": "user", "content": "clone"})
        messages.append({"role": "assistant", "content": text})

        payload = {
            "model": "mimo-v2.5-tts-voiceclone",
            "messages": messages,
            "modalities": ["text", "audio"],
            "audio": {"voice": voice_dataurl, "format": output_format},
            "stream": False,
        }

        async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
            resp = await client.post(
                f"{self.api_base}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "audio": data["choices"][0]["message"]["audio"]["data"],
                "format": output_format,
            }

    async def voice_design(
        self,
        description: str,
        text: str,
        format: str = "wav",
    ) -> dict:
        payload = {
            "model": "mimo-v2.5-tts-voicedesign",
            "messages": [
                {"role": "user", "content": description},
                {"role": "assistant", "content": text},
            ],
            "modalities": ["text", "audio"],
            "audio": {"format": format},
            "stream": False,
        }

        async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
            resp = await client.post(
                f"{self.api_base}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "audio": data["choices"][0]["message"]["audio"]["data"],
                "format": format,
            }


async def get_client_for_provider(db) -> MiMoClient:
    from routers.config import get_default_provider
    provider = await get_default_provider(db)
    if provider:
        return MiMoClient(api_key=provider["api_key"], api_base=provider["api_base"])
    return MiMoClient()


mimo_client = MiMoClient()
