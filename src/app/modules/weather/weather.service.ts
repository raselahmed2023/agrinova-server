import axios from "axios";

const WEATHERAPI_KEY =
  process.env.WEATHERAPI_KEY;

const CACHE_TTL =
  10 * 60 * 1000;

type WeatherSource =
  | "open-meteo"
  | "weatherapi";

type WeatherResult = {
  current: {
    temperature: number;
    condition: string;
    code: number;
    humidity: number;
    windSpeed: number;
    rainProb: number;
  };

  recommendation: string;

  advisories: {
    title: string;
    description: string;
  }[];

  forecast: {
    day: string;
    code: number;
    temp: string;
    risk: string;
  }[];

  source: WeatherSource;
};

type CacheItem = {
  data: WeatherResult;
  expiresAt: number;
};

const cache =
  new Map<string, CacheItem>();

/* =========================
   HELPERS
========================= */

const getCondition = (
  code: number
) => {
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

const mapConditionToCode = (
  condition: string
) => {
  const text =
    condition.toLowerCase();

  if (text.includes("thunder")) return 95;

  if (
    text.includes("snow") ||
    text.includes("sleet") ||
    text.includes("ice")
  ) {
    return 71;
  }

  if (
    text.includes("rain") ||
    text.includes("shower")
  ) {
    return 61;
  }

  if (text.includes("drizzle")) {
    return 51;
  }

  if (
    text.includes("fog") ||
    text.includes("mist")
  ) {
    return 45;
  }

  if (text.includes("overcast")) {
    return 3;
  }

  if (
    text.includes("partly cloudy")
  ) {
    return 2;
  }

  if (text.includes("cloud")) {
    return 3;
  }

  if (
    text.includes("sunny") ||
    text.includes("clear")
  ) {
    return 0;
  }

  return 2;
};

const getRisk = (
  rainProb: number,
  code: number
) => {
  if (
    rainProb >= 60 ||
    code >= 95
  ) {
    return "High Risk";
  }

  if (rainProb >= 30) {
    return "Moderate Risk";
  }

  return "Low Risk";
};

const getRecommendation = (
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

const getAdvisories = (
  temperature: number,
  humidity: number,
  windSpeed: number,
  rainProb: number,
  code: number
) => {
  const advisories: {
    title: string;
    description: string;
  }[] = [];

  if (
    rainProb >= 50 ||
    code >= 51
  ) {
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
      title:
        "High Humidity Alert",
      description:
        "High humidity may increase fungal disease risk. Inspect crops regularly for symptoms.",
    });
  }

  if (windSpeed >= 25) {
    advisories.push({
      title:
        "Strong Wind Alert",
      description:
        "Strong winds may affect spraying and vulnerable crops. Delay spraying if necessary.",
    });
  }

  return advisories;
};

const makeResult = (
  source: WeatherSource,
  temperature: number,
  condition: string,
  code: number,
  humidity: number,
  windSpeed: number,
  rainProb: number,
  forecast: WeatherResult["forecast"]
): WeatherResult => {
  return {
    current: {
      temperature,
      condition,
      code,
      humidity,
      windSpeed,
      rainProb,
    },

    recommendation:
      getRecommendation(
        temperature,
        humidity,
        windSpeed,
        rainProb
      ),

    advisories:
      getAdvisories(
        temperature,
        humidity,
        windSpeed,
        rainProb,
        code
      ),

    forecast,

    source,
  };
};

/* =========================
   OPEN-METEO
========================= */

const fetchOpenMeteo = async (
  lat: number,
  lon: number
): Promise<WeatherResult> => {
  const response =
    await axios.get(
      "https://api.open-meteo.com/v1/forecast",
      {
        params: {
          latitude: lat,
          longitude: lon,

          current:
            "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",

          daily:
            "weather_code,temperature_2m_max,precipitation_probability_max",

          timezone:
            "Asia/Dhaka",
        },

        timeout: 10000,
      }
    );

  const current =
    response.data?.current;

  const daily =
    response.data?.daily;

  if (!current || !daily) {
    throw new Error(
      "Invalid Open-Meteo response."
    );
  }

  const temperature =
    Number(
      current.temperature_2m ?? 0
    );

  const humidity =
    Number(
      current.relative_humidity_2m ??
        0
    );

  const windSpeed =
    Number(
      current.wind_speed_10m ?? 0
    );

  const code =
    Number(
      current.weather_code ?? 0
    );

  const rainProb =
    Number(
      daily
        .precipitation_probability_max?.[0] ??
        0
    );

  const forecast =
    [0, 1, 2].map(
      (index) => {
        const dayCode =
          Number(
            daily
              .weather_code?.[
              index
            ] ?? 0
          );

        const temp =
          Number(
            daily
              .temperature_2m_max?.[
              index
            ] ?? 0
          );

        const rain =
          Number(
            daily
              .precipitation_probability_max?.[
              index
            ] ?? 0
          );

        return {
          day:
            index === 0
              ? "Today"
              : index === 1
                ? "Tomorrow"
                : "Day 3",

          code: dayCode,

          temp:
            `${Math.round(
              temp
            )}°C`,

          risk:
            getRisk(
              rain,
              dayCode
            ),
        };
      }
    );

  return makeResult(
    "open-meteo",
    temperature,
    getCondition(code),
    code,
    humidity,
    windSpeed,
    rainProb,
    forecast
  );
};

/* =========================
   WEATHERAPI FALLBACK
========================= */

const fetchWeatherApi = async (
  lat: number,
  lon: number
): Promise<WeatherResult> => {
  if (!WEATHERAPI_KEY) {
    throw new Error(
      "WEATHERAPI_KEY is not configured."
    );
  }

  const response =
    await axios.get(
      "https://api.weatherapi.com/v1/forecast.json",
      {
        params: {
          key: WEATHERAPI_KEY,
          q: `${lat},${lon}`,
          days: 3,
          aqi: "no",
          alerts: "no",
        },

        timeout: 10000,
      }
    );

  const current =
    response.data?.current;

  const days =
    response.data?.forecast
      ?.forecastday;

  if (
    !current ||
    !Array.isArray(days)
  ) {
    throw new Error(
      "Invalid WeatherAPI response."
    );
  }

  const condition =
    String(
      current.condition?.text ??
        "Unknown"
    );

  const code =
    mapConditionToCode(
      condition
    );

  const temperature =
    Number(
      current.temp_c ?? 0
    );

  const humidity =
    Number(
      current.humidity ?? 0
    );

  const windSpeed =
    Number(
      current.wind_kph ?? 0
    );

  const rainProb =
    Number(
      days[0]?.day
        ?.daily_chance_of_rain ??
        0
    );

  const forecast =
    days
      .slice(0, 3)
      .map(
        (
          item: any,
          index: number
        ) => {
          const conditionText =
            String(
              item?.day
                ?.condition
                ?.text ??
                "Unknown"
            );

          const dayCode =
            mapConditionToCode(
              conditionText
            );

          const rain =
            Number(
              item?.day
                ?.daily_chance_of_rain ??
                0
            );

          const temp =
            Number(
              item?.day
                ?.maxtemp_c ??
                0
            );

          return {
            day:
              index === 0
                ? "Today"
                : index === 1
                  ? "Tomorrow"
                  : "Day 3",

            code: dayCode,

            temp:
              `${Math.round(
                temp
              )}°C`,

            risk:
              getRisk(
                rain,
                dayCode
              ),
          };
        }
      );

  return makeResult(
    "weatherapi",
    temperature,
    condition,
    code,
    humidity,
    windSpeed,
    rainProb,
    forecast
  );
};

/* =========================
   MAIN SERVICE
========================= */

const getWeather = async (
  lat: number,
  lon: number
): Promise<WeatherResult> => {
  const cacheKey =
    `${lat.toFixed(3)}:${lon.toFixed(3)}`;

  const cached =
    cache.get(cacheKey);

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.data;
  }

  let result:
    | WeatherResult
    | null = null;

  try {
    result =
      await fetchOpenMeteo(
        lat,
        lon
      );

    console.log(
      "Weather source: Open-Meteo"
    );
  } catch (error) {
    if (
      axios.isAxiosError(
        error
      )
    ) {
      console.warn(
        `Open-Meteo failed: ${error.response?.status ?? "unknown"}`
      );
    } else {
      console.warn(
        "Open-Meteo failed."
      );
    }
  }

  if (!result) {
    try {
      result =
        await fetchWeatherApi(
          lat,
          lon
        );

      console.log(
        "Weather source: WeatherAPI"
      );
    } catch (error) {
      if (
        axios.isAxiosError(
          error
        )
      ) {
        console.error(
          "WeatherAPI failed:",
          error.response?.status,
          error.response?.data
        );
      } else {
        console.error(
          "WeatherAPI failed:",
          error
        );
      }
    }
  }

  if (result) {
    cache.set(
      cacheKey,
      {
        data: result,
        expiresAt:
          Date.now() +
          CACHE_TTL,
      }
    );

    return result;
  }

  if (cached?.data) {
    return cached.data;
  }

  throw new Error(
    "Weather providers are temporarily unavailable."
  );
};

export const WeatherService = {
  getWeather,
};