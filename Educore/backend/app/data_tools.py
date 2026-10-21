import json
import os
import re
import urllib.parse
import urllib.request


def _fetch_json(url):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Educore/1.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        payload = response.read()
    if not payload:
        return {}
    return json.loads(payload.decode("utf-8"))


def _extract_query_value(query, *keywords):
    text = query.strip()
    for keyword in keywords:
        pattern = rf"{keyword}\s+(?:in|for|about|on|of)?\s+(.+?)(?:\?|$)"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return text


def _weather_code_to_text(code):
    mapping = {
        0: "clear sky",
        1: "mainly clear",
        2: "partly cloudy",
        3: "overcast",
        45: "foggy",
        48: "foggy",
        51: "light drizzle",
        53: "drizzle",
        55: "heavy drizzle",
        61: "light rain",
        63: "rain",
        65: "heavy rain",
        71: "light snow",
        73: "snow",
        75: "heavy snow",
        80: "rain showers",
        81: "heavy showers",
        82: "violent showers",
        95: "thunderstorm",
        96: "thunderstorm with hail",
        99: "severe thunderstorm",
    }
    return mapping.get(code, "weather conditions")


def get_weather_result(query):
    location = _extract_query_value(query, "weather", "forecast", "temperature", "rain")
    if not location or location.lower() in {"weather", "forecast", "temperature"}:
        location = "Nairobi"

    api_key = os.getenv("OPENWEATHER_API_KEY", "").strip()
    if api_key:
        encoded_location = urllib.parse.quote(location)
        url = (
            "https://api.openweathermap.org/data/2.5/weather?"
            f"q={encoded_location}&appid={api_key}&units=metric"
        )
        try:
            data = _fetch_json(url)
        except Exception:
            data = {}
        if data.get("main"):
            weather = (data.get("weather") or [{}])[0]
            temp = data["main"].get("temp")
            feels_like = data["main"].get("feels_like")
            summary = (
                f"Current weather in {data.get('name', location)}: {temp}°C, "
                f"{weather.get('description', 'conditions')} (feels like {feels_like}°C)."
            )
            return {
                "tool": "weather",
                "status": "ok",
                "summary": summary,
                "data": {"location": data.get("name", location), "temperature_c": temp},
            }

    geo_url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode({
        "name": location,
        "count": 1,
        "language": "en",
        "format": "json",
    })
    try:
        geo_data = _fetch_json(geo_url)
    except Exception:
        return {
            "tool": "weather",
            "status": "unavailable",
            "summary": f"I couldn't fetch live weather for {location} right now.",
            "data": {"location": location},
        }

    results = geo_data.get("results") or []
    if not results:
        return {
            "tool": "weather",
            "status": "unavailable",
            "summary": f"I couldn't find a matching city for '{location}'.",
            "data": {"location": location},
        }

    city = results[0]
    coords_url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode({
        "latitude": city["latitude"],
        "longitude": city["longitude"],
        "current": "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
        "timezone": "auto",
    })
    try:
        forecast = _fetch_json(coords_url)
    except Exception:
        return {
            "tool": "weather",
            "status": "unavailable",
            "summary": f"I couldn't fetch live weather for {location} right now.",
            "data": {"location": location},
        }

    current = forecast.get("current") or {}
    temp = current.get("temperature_2m")
    code = current.get("weather_code")
    wind = current.get("wind_speed_10m")
    summary = (
        f"Current weather in {city.get('name', location)}: {temp}°C, "
        f"{_weather_code_to_text(code)} with wind at {wind} km/h."
    )
    return {
        "tool": "weather",
        "status": "ok",
        "summary": summary,
        "data": {
            "location": city.get("name", location),
            "temperature_c": temp,
            "condition": _weather_code_to_text(code),
            "wind_kph": wind,
        },
    }


def get_news_result(query):
    topic = _extract_query_value(query, "news", "headline", "latest", "article")
    if not topic or topic.lower() in {"news", "headline", "latest", "article"}:
        topic = "education"

    api_key = os.getenv("GNEWS_API_KEY", "").strip() or os.getenv("NEWSAPI_KEY", "").strip()
    if api_key:
        url = "https://gnews.io/api/v4/search?" + urllib.parse.urlencode({
            "q": topic,
            "lang": "en",
            "max": 3,
            "apikey": api_key,
        })
        try:
            data = _fetch_json(url)
        except Exception:
            data = {}
        articles = (data.get("articles") or [])[:3]
        if articles:
            items = []
            for article in articles:
                title = article.get("title") or "Untitled"
                source = article.get("source", {}).get("name") or "News source"
                url_value = article.get("url") or ""
                items.append({"title": title, "source": source, "url": url_value})
            return {
                "tool": "news",
                "status": "ok",
                "summary": f"Here are recent headlines about {topic}: " + "; ".join(item["title"] for item in items),
                "data": {"topic": topic, "articles": items},
            }

    guardian_key = os.getenv("GUARDIAN_API_KEY", "").strip()
    if guardian_key:
        url = "https://content.guardianapis.com/search?" + urllib.parse.urlencode({
            "q": topic,
            "api-key": guardian_key,
            "show-fields": "headline,trailText,shortUrl",
            "page-size": 3,
        })
        try:
            data = _fetch_json(url)
        except Exception:
            data = {}
        results = (data.get("response") or {}).get("results") or []
        if results:
            items = [{
                "title": item.get("fields", {}).get("headline") or item.get("webTitle"),
                "source": "The Guardian",
                "url": item.get("webUrl"),
            } for item in results]
            return {
                "tool": "news",
                "status": "ok",
                "summary": f"Recent coverage on {topic}: " + "; ".join(item["title"] for item in items),
                "data": {"topic": topic, "articles": items},
            }

    return {
        "tool": "news",
        "status": "unavailable",
        "summary": f"I couldn't fetch live news for '{topic}' because the news API key is not configured yet.",
        "data": {"topic": topic},
    }


def get_book_result(query):
    topic = _extract_query_value(query, "book", "read", "author")
    if not topic or topic.lower() in {"book", "read", "author"}:
        topic = "learning"

    search_url = "https://openlibrary.org/search.json?" + urllib.parse.urlencode({
        "q": topic,
        "limit": 3,
    })
    try:
        data = _fetch_json(search_url)
    except Exception:
        return {
            "tool": "book",
            "status": "unavailable",
            "summary": f"I couldn't look up book suggestions for '{topic}' right now.",
            "data": {"topic": topic},
        }

    docs = (data.get("docs") or [])[:3]
    if not docs:
        return {
            "tool": "book",
            "status": "unavailable",
            "summary": f"I couldn't find a good book match for '{topic}'.",
            "data": {"topic": topic},
        }

    first = docs[0]
    title = first.get("title") or topic
    author = ", ".join(first.get("author_name") or ["Unknown author"])
    summary = f"Book suggestion: '{title}' by {author}. It is a strong fit for '{topic}' and is worth checking out."
    return {
        "tool": "book",
        "status": "ok",
        "summary": summary,
        "data": {"topic": topic, "title": title, "author": author},
    }


def get_knowledge_result(query):
    topic = query.strip()
    safe_topic = urllib.parse.quote(topic)
    summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{safe_topic}"
    try:
        data = _fetch_json(summary_url)
    except Exception:
        return {
            "tool": "knowledge",
            "status": "unavailable",
            "summary": f"I couldn't fetch background information for '{topic}' right now.",
            "data": {"topic": topic},
        }

    title = data.get("title") or topic
    description = data.get("description") or "General background information"
    extract = data.get("extract") or "No summary was available."
    summary = f"{title}: {description}. {extract}"
    return {
        "tool": "knowledge",
        "status": "ok",
        "summary": summary,
        "data": {"topic": topic, "title": title, "description": description},
    }


def get_search_result(query):
    topic = (query or "").strip()
    if not topic:
        return {
            "tool": "search",
            "status": "unavailable",
            "summary": "Please provide a search query.",
            "data": {},
        }

    api_key = (os.getenv("SERPER_API_KEY") or os.getenv("GOOGLE_SERPER_API_KEY") or "").strip()
    if not api_key:
        return {
            "tool": "general",
            "status": "ok",
            "summary": "I can explain your lesson or answer a live data question such as weather, news, books, or general knowledge.",
            "data": {"query": topic},
        }

    request_body = json.dumps({"q": topic}).encode("utf-8")
    req = urllib.request.Request(
        "https://google.serper.dev/search",
        data=request_body,
        headers={
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return {
            "tool": "search",
            "status": "unavailable",
            "summary": f"I couldn't fetch live web results for '{topic}' right now.",
            "data": {"query": topic, "error": str(exc)},
        }

    results = []
    for item in (payload.get("organic") or [])[:3]:
        title = item.get("title") or "Result"
        link = item.get("link") or ""
        snippet = item.get("snippet") or item.get("description") or ""
        results.append({"title": title, "url": link, "snippet": snippet})

    if not results:
        return {
            "tool": "search",
            "status": "unavailable",
            "summary": f"I couldn't find live web results for '{topic}' right now.",
            "data": {"query": topic},
        }

    summary = "Latest search results: " + "; ".join(item["title"] for item in results)
    return {
        "tool": "search",
        "status": "ok",
        "summary": summary,
        "data": {"query": topic, "results": results},
    }


def route_data_query(query):
    text = (query or "").strip()
    if not text:
        return {
            "tool": "general",
            "status": "ok",
            "summary": "Please ask a question about weather, news, books, or a topic you want explained.",
            "data": {},
        }

    lower = text.lower()
    if re.search(r"\b(weather|forecast|temperature|rain|sunny|cloudy|humid)\b", lower):
        return get_weather_result(text)
    if re.search(r"\b(news|headline|latest|article|breaking)\b", lower):
        return get_news_result(text)
    if re.search(r"\b(book|books|author|read|novel|story)\b", lower):
        return get_book_result(text)
    if re.search(r"\b(define|what is|who is|history of|definition of)\b", lower):
        return get_knowledge_result(text)

    explicit_search = re.search(r"\b(search|find|lookup|look up|google|web|research|latest results|top results)\b", lower)
    general_education = re.search(r"\b(explain|teach|lesson|study|photosynthesis|math|science|biology|history|summarize)\b", lower)
    if explicit_search or (not general_education and len(text.split()) >= 2):
        serper_key = (os.getenv("SERPER_API_KEY") or os.getenv("GOOGLE_SERPER_API_KEY") or "").strip()
        if serper_key:
            return get_search_result(text)

    return {
        "tool": "general",
        "status": "ok",
        "summary": "I can explain your lesson or answer a live data question such as weather, news, books, or general knowledge.",
        "data": {"query": text},
    }
