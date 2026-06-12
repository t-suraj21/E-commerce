// Simple service to track performance metrics in-memory
class MetricsService {
  constructor() {
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.totalResponseTime = 0;
    
    this.totalQueries = 0;
    this.totalQueryDuration = 0;
    this.slowQueries = 0;
  }

  recordRequest(responseTimeMs) {
    this.totalRequests++;
    this.totalResponseTime += responseTimeMs;
  }

  recordQuery(durationMs) {
    this.totalQueries++;
    this.totalQueryDuration += durationMs;
    if (durationMs > 100) {
      this.slowQueries++;
    }
  }

  getMetrics() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const avgResponseTime = this.totalRequests > 0 
      ? parseFloat((this.totalResponseTime / this.totalRequests).toFixed(2)) 
      : 0;
    const avgQueryDuration = this.totalQueries > 0
      ? parseFloat((this.totalQueryDuration / this.totalQueries).toFixed(2))
      : 0;

    return {
      uptimeSeconds,
      requests: {
        total: this.totalRequests,
        averageResponseTimeMs: avgResponseTime
      },
      database: {
        totalQueries: this.totalQueries,
        averageQueryDurationMs: avgQueryDuration,
        slowQueriesCount: this.slowQueries
      }
    };
  }
}

module.exports = new MetricsService();
