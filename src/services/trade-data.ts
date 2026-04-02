/**
 * Represents a trade with essential details.
 */
export interface Trade {
  /**
   * The unique identifier for the trade.
   */
id: string;
  /**
   * The date when the trade was executed.
   */
  date: Date;
  /**
   * The asset traded (e.g., stock symbol, crypto pair).
   */
  asset: string;
  /**
   * The quantity of the asset traded.
   */
  quantity: number;
  /**
   * The entry price of the trade.
   */
  entryPrice: number;
  /**
   * The exit price of the trade.
   */
  exitPrice: number;
  /**
   * The profit or loss of the trade.
   */
  profitLoss: number;
}

/**
 * Asynchronously fetches trade data within a specified date range.
 *
 * @param startDate The start date of the range.
 * @param endDate The end date of the range.
 * @returns A promise that resolves to an array of Trade objects.
 */
export async function getTrades(startDate: Date, endDate: Date): Promise<Trade[]> {
  // TODO: Implement this by calling an API.

  return [
    {
      id: '1',
      date: new Date(),
      asset: 'AAPL',
      quantity: 10,
      entryPrice: 150.00,
      exitPrice: 155.00,
      profitLoss: 50.00,
    },
    {
      id: '2',
      date: new Date(),
      asset: 'TSLA',
      quantity: 5,
      entryPrice: 700.00,
      exitPrice: 680.00,
      profitLoss: -100.00,
    },
  ];
}
