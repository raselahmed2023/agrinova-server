import axios from 'axios';

const getWeatherFromOpenMeteo = async (lat: number, lon: number) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=Asia%2FDhaka`;

  const response = await axios.get(url, { headers: { 'Cache-Control': 'no-cache' } });
  const { current, daily } = response.data;

  // Dynamic Advisories
  const advisories = [];
  const todayTemp = Math.round(current.temperature_2m);
  const todayHumidity = current.relative_humidity_2m;
  const todayRainProb = daily?.precipitation_probability_max?.[0] ?? 0;

  if (todayTemp >= 35) {
    advisories.push({
      id: 'heat-alert',
      title: 'Heat Stress Warning',
      description: `Current temperature is ${todayTemp}°C. High thermal stress on crops—increase irrigation frequency.`,
      type: 'danger',
    });
  }

  if (todayHumidity >= 80) {
    advisories.push({
      id: 'humidity-alert',
      title: 'High Humidity Alert',
      description: `Humidity is at ${todayHumidity}%. Increased risk of fungal infection in crops.`,
      type: 'warning',
    });
  }

  if (todayRainProb >= 50 || current.weather_code >= 51) {
    advisories.push({
      id: 'rain-alert',
      title: 'Rainfall Advisory',
      description: `Rain probability is ${todayRainProb}%. Avoid application of fertilizers and chemical pesticides today.`,
      type: 'info',
    });
  }

  // Dynamic 3-Day Forecast Logic
  // Index 0 = Today, Index 1 = Tomorrow, Index 2 = Day 2, Index 3 = Day 3
  const forecast = [1, 2, 3].map((dayOffset, index) => {
    const tempNumber = Number(daily.temperature_2m_max[dayOffset]);
    const forecastCode = Number(daily.weather_code[dayOffset]);
    const rainProb = Number(daily.precipitation_probability_max[dayOffset] ?? 0);
    const dateStr = daily.time[dayOffset];

    const temp = Math.round(tempNumber);
    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    // Precise Risk Condition: High Risk ONLY IF Temp >= 36°C OR Heavy Rain Code >= 61 OR Rain Prob >= 75%
    const isHighRisk = temp >= 36 || forecastCode >= 61 || rainProb >= 75;

    return {
      day: index === 0 ? 'Tomorrow' : dayName,
      temp: `${temp}°C`,
      risk: isHighRisk ? 'High Risk' : 'Low Risk',
      code: forecastCode,
      rainProb,
    };
  });

  return {
    current: {
      temperature: todayTemp,
      condition: getWeatherCondition(current.weather_code),
      code: current.weather_code,
      humidity: todayHumidity,
      windSpeed: Math.round(current.wind_speed_10m),
      rainProb: todayRainProb,
    },
    recommendation:
      todayRainProb >= 50 || current.weather_code >= 51
        ? 'Postpone chemical spraying and harvesting due to active rain/high precipitation probability.'
        : todayTemp >= 35
        ? 'Schedule irrigation during early morning or late evening hours to reduce evapotranspiration loss.'
        : 'Optimal conditions for pesticide and fertilizer spraying today (Low wind and minimal rain risk).',
    advisories,
    forecast,
  };
};

const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rainy';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Overcast';
};

export const WeatherService = { getWeatherFromOpenMeteo };