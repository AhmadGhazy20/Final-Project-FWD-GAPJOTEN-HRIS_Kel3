import { errorResponse } from '../utils/apiResponse.js';

export const notFoundHandler = (req, res, next) => {
  errorResponse(res, `Route ${req.originalUrl} not found`, null, 404);
};

export const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err.stack || err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  errorResponse(
    res,
    message,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null,
    statusCode
  );
};

