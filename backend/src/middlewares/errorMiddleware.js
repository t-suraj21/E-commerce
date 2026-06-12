const errorMiddleware = (err, req, res, next) => {
  // Track system error logging
  console.error('[Unhandled Server Error]:', err);

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && isProd ? 'An internal server error occurred.' : err.message || 'Internal Server Error',
    ...(isProd ? {} : { stack: err.stack })
  });
};

module.exports = errorMiddleware;
