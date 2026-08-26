import { Request, Response } from 'express';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import { WeatherService } from './weather.service';

const getWeather = catchAsync(async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string) || 24.3745;
  const lon = parseFloat(req.query.lon as string) || 88.6042;

  const result = await WeatherService.getWeatherFromOpenMeteo(lat, lon);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Weather data fetched successfully',
    data: result,
  });
});

export const WeatherController = { getWeather };