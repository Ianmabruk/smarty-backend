import json
import os
import urllib.request


def _is_production_environment():
    return (
        (os.environ.get("FLASK_ENV") or "").lower() in {"production", "prod"}
        or (os.environ.get("APP_ENV") or "").lower() in {"production", "prod"}
        or bool(os.environ.get("RENDER"))
    )


def _env_first(*names, default=None):
    for name in names:
        value = (os.getenv(name) or "").strip()
        if value:
            return value
    return default


def _api_base_url():
    value = _env_first("OLLAMA_BASE_URL", "AI_API_BASE_URL", "OPENAI_BASE_URL")
    if value:
        return value.rstrip("/")
    if _is_production_environment():
        return None
    return "http://127.0.0.1:11434"


def _model_name():
    value = _env_first("OLLAMA_MODEL", "AI_MODEL", "OPENAI_MODEL")
    if value:
        return value
    if _is_production_environment():
        return None
    return "qwen2.5:7b"


def _is_ollama_provider():
    base = _api_base_url().lower()
    model = _model_name().lower()
    return "ollama" in base or "127.0.0.1:11434" in base or "localhost:11434" in base or model.startswith("qwen") or model.startswith("llama")


def _is_gemini_provider():
    base = _api_base_url().lower()
    model = _model_name().lower()
    return "generativelanguage.googleapis.com" in base or model.startswith("gemini")


def _generate_gemini_reply(messages, system_prompt=None):
    api_key = (os.getenv("AI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("The AI service isn’t configured on this server yet.")

    base_url = _api_base_url().rstrip("/")
    model_name = _model_name()
    endpoint = f"{base_url}/models/{model_name}:generateContent"

    if system_prompt:
        prompt_lines = [system_prompt]
    else:
        prompt_lines = []

    for message in messages:
        role = (message.get("role") or "user").strip()
        text = (message.get("content") or "").strip()
        if not text:
            continue
        if role == "assistant":
            prompt_lines.append(f"Assistant: {text}")
        elif role == "system":
            prompt_lines.append(f"System: {text}")
        else:
            prompt_lines.append(f"User: {text}")

    if not prompt_lines:
        raise RuntimeError("No chat content was provided to the AI model")

    payload = {
        "contents": [{"parts": [{"text": "\n".join(prompt_lines)}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 700},
    }

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Goog-Api-Key": api_key,
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=45) as response:
        body = response.read().decode("utf-8")

    data = json.loads(body or "{}")
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("The AI provider returned no usable reply")

    parts = (candidates[0].get("content") or {}).get("parts") or []
    if not parts:
        raise RuntimeError("The AI provider returned an empty response")

    content = "".join((part.get("text") or "") for part in parts).strip()
    if not content:
        raise RuntimeError("The AI provider returned an empty response")
    return content


def _generate_ollama_reply(messages, system_prompt=None):
    base_url = _api_base_url()
    if not base_url:
        raise RuntimeError("Ollama is not configured for this environment. Set OLLAMA_BASE_URL or AI_API_BASE_URL in production.")

    endpoint = f"{base_url.rstrip('/')}/api/chat"
    payload = {
        "model": _model_name(),
        "stream": False,
        "messages": [],
        "options": {"temperature": 0.2, "num_predict": 700},
    }

    if system_prompt:
        payload["messages"].append({"role": "system", "content": system_prompt})

    for message in messages:
        role = (message.get("role") or "user").strip()
        text = (message.get("content") or "").strip()
        if role in {"user", "assistant", "system"} and text:
            payload["messages"].append({"role": role, "content": text})

    if not payload["messages"]:
        raise RuntimeError("No chat content was provided to the AI model")

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            body = response.read().decode("utf-8")
    except Exception as exc:
        raise RuntimeError(f"Ollama could not complete the request: {exc}") from exc

    data = json.loads(body or "{}")
    message = data.get("message") or {}
    content = (message.get("content") or "").strip()
    if not content:
        raise RuntimeError("Ollama returned an empty response")
    return content


def generate_chat_reply(messages, system_prompt=None):
    if _is_ollama_provider():
        return _generate_ollama_reply(messages, system_prompt)

    if _is_gemini_provider():
        return _generate_gemini_reply(messages, system_prompt)

    api_key = (os.getenv("AI_API_KEY") or "").strip()
    if not api_key:
        if _is_production_environment():
            raise RuntimeError(
                "No AI provider is configured for this production environment. Set OLLAMA_BASE_URL and OLLAMA_MODEL or AI_API_KEY and AI_API_BASE_URL."
            )
        return (
            "The AI service isn’t configured on this server yet. "
            "Add a valid AI_API_KEY to the backend environment to enable live chat responses."
        )

    endpoint = f"{_api_base_url()}/chat/completions"
    payload = {
        "model": _model_name(),
        "messages": [],
        "temperature": 0.2,
        "max_tokens": 700,
    }

    if system_prompt:
        payload["messages"].append({"role": "system", "content": system_prompt})

    for message in messages:
        role = (message.get("role") or "user").strip()
        text = (message.get("content") or "").strip()
        if role in {"user", "assistant", "system"} and text:
            payload["messages"].append({"role": role, "content": text})

    if not payload["messages"]:
        raise RuntimeError("No chat content was provided to the AI model")

    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            body = response.read().decode("utf-8")
    except Exception as exc:
        raise RuntimeError(f"The AI provider could not complete the request: {exc}") from exc

    data = json.loads(body or "{}")
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("The AI provider returned no usable reply")

    message = choices[0].get("message") or {}
    content = (message.get("content") or "").strip()
    if not content:
        raise RuntimeError("The AI provider returned an empty response")
    return content


def generate_image_from_prompt(prompt):
    """Use an image-capable model when one is configured. With current Gemini text model, fail clearly instead of a generic server error."""
    prompt_text = (prompt or "").strip()
    if not prompt_text:
        raise ValueError("A prompt is required to generate an image.")

    model_name = (_model_name() or "").lower()
    if "image" in model_name or "imagen" in model_name or "flux" in model_name:
        raise RuntimeError("Image generation is configured but not yet implemented for this backend route.")

    raise RuntimeError("This server is using a text-only AI model. Image generation is not available until an image-capable model is configured.")
