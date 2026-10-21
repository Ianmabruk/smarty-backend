import importlib


def test_ai_data_router_can_detect_weather_requests():
    module = importlib.import_module("app.data_tools")
    result = module.route_data_query("What is the weather in Nairobi today?")

    assert result["tool"] == "weather"
    assert result["status"] in {"ok", "unavailable"}
    assert isinstance(result.get("summary", ""), str)


def test_ai_data_router_keeps_general_education_queries_local():
    module = importlib.import_module("app.data_tools")
    result = module.route_data_query("Explain photosynthesis simply")

    assert result["tool"] == "general"
    assert result["status"] == "ok"
