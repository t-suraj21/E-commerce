const metricsService = require('../services/metricsService');

const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Skip logging health checks to reduce log noise, but record response time
    if (req.originalUrl !== '/health' && req.originalUrl !== '/api/health') {
      const memoryUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const logMessage = `[REQUEST] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${duration}ms - RSS Mem: ${memoryUsage} MB`;
      
      if (duration > 500) {
        console.warn(`[⚠️ SLOW REQUEST] ${logMessage}`);
      } else {
        console.log(logMessage);
      }
    }

    // Save metrics
    metricsService.recordRequest(duration);
  });

  next();
};

module.exports = loggerMiddleware;
