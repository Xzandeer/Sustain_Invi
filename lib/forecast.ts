/**
 * Create helper function for moving average calculation
 * Computes N-day moving average from sales data
 */
export function calculateMovingAverage(
  data: number[],
  windowSize: number
): number[] {
  const averages: number[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      averages.push(data[i])
    } else {
      const window = data.slice(i - windowSize + 1, i + 1)
      const avg = window.reduce((a, b) => a + b, 0) / windowSize
      averages.push(Math.round(avg))
    }
  }

  return averages
}

/**
 * Generate 7-day forecast based on moving average
 */
export function generateForecast(movingAverages: number[], days: number = 7): number[] {
  const forecast: number[] = []
  const lastAverage = movingAverages[movingAverages.length - 1]

  for (let i = 0; i < days; i++) {
    forecast.push(lastAverage)
  }

  return forecast
}
