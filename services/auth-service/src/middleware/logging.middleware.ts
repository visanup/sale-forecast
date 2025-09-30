import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Add request ID to request object
  (req as any).requestId = requestId;

  // Log request start
  console.log({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  }, 'Request started');

  // Store start time for response logging
  (req as any).startTime = startTime;

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    }, 'Request completed');
  });

  next();
};