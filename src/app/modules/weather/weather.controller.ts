import { Request, Response } from "express";
import { WeatherService } from "./weather.service";

const getWeather = async (
  req: Request,
  res: Response
) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid latitude and longitude are required.",
      });
    }

    const result =
      await WeatherService.getWeather(
        lat,
        lon
      );

    return res.status(200).json({
      success: true,
      message:
        "Weather fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Weather controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch weather data.",
    });
  }
};

export const WeatherController = {
  getWeather,
};