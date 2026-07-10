export const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const logPayload = {
    statusCode,
    method: req.method,
    path: req.originalUrl,
    message: err.message,
  };

  if (statusCode >= 500) {
    console.error('Server error:', { ...logPayload, stack: err.stack });
  } else {
    console.warn('Request error:', logPayload);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message,
  });
};
