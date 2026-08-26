import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import catchAsync from '../utils/catchAsync';

const validateRequest = (schema: ZodTypeAny) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });

    return next();
  });
};

export default validateRequest;

