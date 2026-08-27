import axios from "axios";

type CachedWeather = {
  data: unknown;
  expiresAt: number;
};

const weatherCache = new Map<string, CachedWeather>();

const CACHE_TTL = 10 * 60 * 1000;

const getWeatherCondition = (code: number) => {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";

  if (code >= 45 && code <= 48) {
    return "Foggy";
  }

  if (code >= 51 && code <= 57) {
    return "Drizzle";
  }

  if (code >= 61 && code <= 67) {
    return "Rain";
  }

  if (code >= 71 && code <= 77) {
    return "Snow";
  }

  if (code >= 80 && code <= 82) {
    return "Rain showers";
  }

  if (code >= 85 && code <= 86) {
    return "Snow showers";
  }

  if (code >= 95) {
    return "Thunderstorm";
  }

  return "Unknown";
};

const getAgronomicRecommendation = (
  temperature: number,
  humidity: number,
  windSpeed: number,
  rainProb: number
) => {
  if (rainProb >= 70) {
    return "High chance of rainfall. Avoid unnecessary irrigation and postpone pesticide application if possible.";
  }

  if (temperature >= 35) {
    return "High temperature detected. Consider irrigation during early morning or late afternoon and monitor crops for heat stress.";
  }

  if (humidity >= 85) {
    return "High humidity may increase fungal disease risk. Monitor crop leaves and improve field ventilation where possible.";
  }

  if (windSpeed >= 25) {
    return "Strong wind conditions are expected. Avoid spraying pesticides and secure vulnerable crops or farm structures.";
  }

  return "Weather conditions are generally suitable for normal farming activities. Continue regular crop monitoring.";
};

const getRiskAdvisories = (
  temperature: number,
  humidity: number,
  windSpeed: number,
  rainProb: number,
  weatherCode: number
) => {
  const advisories: {
    title: string;
    description: string;
  }[] = [];

  if (rainProb >= 50 || weatherCode >= 51) {
    advisories.push({
      title: "Rainfall Risk",
      description:
        "Rainfall is possible. Review irrigation plans and avoid field operations that may be affected by wet conditions.",
    });
  }

  if (temperature >= 35) {
    advisories.push({
      title: "Heat Stress Risk",
      description:
        "High temperature may cause crop moisture stress. Consider timely irrigation and avoid midday field operations.",
    });
  }

  if (humidity >= 85) {
    advisories.push({
      title: "High Humidity Alert",
      description:
        "High humidity may increase the risk of fungal disease. Inspect crops regularly for symptoms.",
    });
  }

  if (windSpeed >= 25) {
    advisories.push({
      title: "Strong Wind Alert",
      description:
        "Strong winds may affect spraying and vulnerable crops. Delay chemical spraying if necessary.",
    });
  }

  return advisories;
};

const getWeather = async (
  lat: number,
  lon: number
) => {
  const cacheKey = `${lat.toFixed(3)}:${lon.toFixed(3)}`;

  const cached = weatherCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const response = await axios.get(
      "https://api.open-meteo.com/v1/forecast",
      {
        params: {
          latitude: lat,
          longitude: lon,
          current:
            "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
          daily:
            "weather_code,temperature_2m_max,precipitation_probability_max",
          timezone: "Asia/Dhaka",
        },
        timeout: 10000,
        headers: {
          Accept: "application/json",
        },
      }
    );

    const weather = response.data;

    const current = weather.current;
    const daily = weather.daily;

    if (!current || !daily) {
      throw new Error(
        "Invalid weather data received from provider."
      );
    }

    const todayRainProb = Number(
      daily.precipitation_probability_max?.[0] ?? 0
    );

    const temperature = Number(
      current.temperature_2m ?? 0
    );

    const humidity = Number(
      current.relative_humidity_2m ?? 0
    );

    const windSpeed = Number(
      current.wind_speed_10m ?? 0
    );

    const weatherCode = Number(
      current.weather_code ?? 0
    );

    const forecast = [];

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const forecastCode = Number(
        daily.weather_code?.[dayOffset] ?? 0
      );

      const maxTemperature = Number(
        daily.temperature_2m_max?.[dayOffset] ?? 0
      );

      const rainProbability = Number(
        daily.precipitation_probability_max?.[
          dayOffset
        ] ?? 0
      );

      let risk = "Low Risk";

      if (
        rainProbability >= 60 ||
        forecastCode >= 95
      ) {
        risk = "High Risk";
      } else if (rainProbability >= 30) {
        risk = "Moderate Risk";
      }

      forecast.push({
        day:
          dayOffset === 0
            ? "Today"
            : dayOffset === 1
              ? "Tomorrow"
              : "Day 3",
        code: forecastCode,
        temp: `${Math.round(maxTemperature)}°C`,
        risk,
      });
    }

    const result = {
      current: {
        temperature,
        condition: getWeatherCondition(weatherCode),
        code: weatherCode,
        humidity,
        windSpeed,
        rainProb: todayRainProb,
      },

      recommendation: getAgronomicRecommendation(
        temperature,
        humidity,
        windSpeed,
        todayRainProb
      ),

      advisories: getRiskAdvisories(
        temperature,
        humidity,
        windSpeed,
        todayRainProb,
        weatherCode
      ),

      forecast,
    };

    weatherCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      console.error("Weather API error:", {
        status,
        message: error.message,
        data: error.response?.data,
      });

      if (status === 429) {
        const staleCache = weatherCache.get(cacheKey);

        if (staleCache?.data) {
          return staleCache.data;
        }

        throw new Error(
          "Weather service rate limit reached. Please try again shortly."
        );
      }

      throw new Error(
        `Weather provider request failed${
          status ? ` (${status})` : ""
        }.`
      );
    }

    throw error;
  }
};

export const WeatherService = {
  getWeather,
};