import { Op, Sequelize, WhereOptions } from "sequelize";
import { UssdSessions } from "../models/ussdSessions.js";
import { UssdTransactions } from "../models/ussdTransactions.js";

/**
 * Data Access Object (DAO) for Analytics.
 * Responsible for executing complex aggregation queries and raw SQL operations
 * to fetch statistical data for the dashboard.
 */
class AnalyticsDAO {
  /**
   * Queries the database for time-series transaction volume data, grouped by the specified time unit.
   * * @param timeUnit - The SQL date part used for grouping results (e.g., 'HOUR', 'DAY', 'MONTH').
   * @param intervalSQL - The raw SQL interval string to filter the date range (e.g., 'INTERVAL 7 DAY').
   * @param serviceOption - Optional Sequelize 'where' clause to filter by a specific service type (e.g., { service_type: 'ELECTRICITY' }).
   * @returns {Promise<any[]>} A promise resolving to an array of aggregated data points containing timestamps and volume counts.
   */
  getTransactionVolume(
    timeUnit: string,
    intervalSQL: string,
    serviceOption: WhereOptions<UssdTransactions> | null
  ) {
    return UssdTransactions.findAll({
      attributes: [
        // --- TIME BUCKETING ---
        [
          Sequelize.literal(
            `DATE_TRUNC('${timeUnit}', "UssdTransactions"."transaction_timestamp")`
          ),
          "time_bucket",
        ],

        // --- TOTALS ---
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.col("UssdTransactions.transaction_id")
          ),
          "total",
        ],

        // --- SERVICE BREAKDOWNS (Pivots) ---
        [
          Sequelize.literal(
            `COUNT(CASE WHEN "UssdTransactions"."transaction_type" = 'electricity_token' THEN 1 END)`
          ),
          "electricity",
        ],
        [
          Sequelize.literal(
            `COUNT(CASE WHEN "UssdTransactions"."transaction_type" = 'water_bill_payment' THEN 1 END)`
          ),
          "water",
        ],
        [
          Sequelize.literal(
            `COUNT(CASE WHEN "UssdTransactions"."transaction_type" = 'airtime_purchase' THEN 1 END)`
          ),
          "airtime",
        ],
        [
          Sequelize.literal(
            `COUNT(CASE WHEN "UssdTransactions"."transaction_type" IN ('money_transfer', 'bill_payment') THEN 1 END)`
          ),
          "mobileMoney",
        ],
        [
          Sequelize.literal(
            `COUNT(CASE WHEN "UssdTransactions"."transaction_type" IN ('balance_check', 'account_registration') THEN 1 END)`
          ),
          "banking",
        ],

        // --- METRICS ---
        // Avg Duration (Requires Join)
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("AVG", Sequelize.col("session.session_duration")),
            0
          ),
          "avgSessionTime",
        ],

        // Success Rate: (Success / Total) * 100
        [
          Sequelize.literal(
            `(COUNT(CASE WHEN "UssdTransactions"."transaction_status" = 'success' THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100`
          ),
          "successRate",
        ],

        // Revenue
        [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("SUM", Sequelize.col("transaction_amount")),
            0
          ),
          "revenue",
        ],

        // Failures
        [
          Sequelize.literal(
            `COUNT(CASE WHEN "UssdTransactions"."transaction_status" IN ('failed', 'timeout', 'cancelled') THEN 1 END)`
          ),
          "failedTransactions",
        ],

        // Peak Users (Distinct Sessions)
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn(
              "DISTINCT",
              Sequelize.col("UssdTransactions.session_id")
            )
          ),
          "peakConcurrentUsers",
        ],
      ],
      include: [
        {
          model: UssdSessions,
          as: "session",
          attributes: [], // We only need columns for aggregation, and we don't need to return session object
          required: false, // LEFT JOIN (matches SQL 'LEFT JOIN')
        },
      ],
      where: {
        transaction_timestamp: {
          [Op.gte]: Sequelize.literal(`NOW() - ${intervalSQL}`),
        },

        ...(serviceOption ?? {}),
      },

      group: ["time_bucket"],
      order: [[Sequelize.literal("time_bucket"), "ASC"]],
      raw: true, // Returns plain JSON objects, not Sequelize Instances
    });
  }

  /**
   * Aggregates and returns general key performance indicators (KPIs) such as success rates, total transaction counts, revenue, and average session duration.
   * * @param timeFilter - A Sequelize 'where' clause used to filter the transactions by a specific time range.
   * @returns {Promise<any[]>} A promise that resolves to the aggregated metrics result containing the summary statistics.
   */
  getGeneralMetrics(timeFilter: WhereOptions<UssdTransactions>) {
    return UssdTransactions.findOne({
      attributes: [
        [Sequelize.fn("COUNT", "*"), "total"],
        [
          Sequelize.literal(
            `SUM(CASE WHEN transaction_status = 'success' THEN 1 ELSE 0 END)`
          ),
          "successfulTxns",
        ],
        [
          Sequelize.literal(
            `SUM(CASE WHEN transaction_status != 'success' THEN 1 ELSE 0 END)`
          ),
          "failedTxns",
        ],
        // Success Rate
        [
          Sequelize.literal(
            `(SUM(CASE WHEN transaction_status = 'success' THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100`
          ),
          "successRate",
        ],
      ],
      include: [
        {
          model: UssdSessions,
          as: "session",
          attributes: [],
          required: true, // Inner join to get duration
        },
      ],
      where: timeFilter,
      raw: true,
    });
  }

  /**
   * Counts and returns the number of active sessions
   * @returns {Promise<any[]>} A promise that resolves to the number of active sessions
   */
  getActiveSessions(): Promise<number> {
    return UssdSessions.count({
      where: {
        session_end: { [Op.not]: null as any }, // Still open
        session_start: {
          // Safety check: sessions started in last 10 mins
          [Op.gte]: Sequelize.literal("NOW() - INTERVAL '10 minutes'"),
        },
      },
    });
  }

  /**
   * Returns the peak hour within a specified time filter
   * @param timeFilter - A Sequelize 'where' clause used to filter the transactions by a specific time range.
   * @returns {Promise<any[]>} A promise that resolves to the number of active sessions
   */
  getPeakHour(timeFilter: WhereOptions<UssdTransactions>) {
    return UssdTransactions.findOne({
      attributes: [
        [Sequelize.literal(`EXTRACT(HOUR FROM transaction_timestamp)`), "hour"],
        [Sequelize.fn("COUNT", "*"), "count"],
      ],
      where: timeFilter,
      group: [
        Sequelize.literal(`EXTRACT(HOUR FROM transaction_timestamp)`) as any,
      ],
      order: [[Sequelize.literal("count"), "DESC"]],
      limit: 1,
      raw: true,
    });
  }

  /**
   * Returns the top province and its count
   * @param intervalSQL - The raw SQL interval string to filter the date range (e.g., 'INTERVAL 7 DAY').
   * @returns {Promise<any[]>} A promise that resolves to the top province
   */
  getTopProvince(intervalSQL: string) {
    return UssdSessions.findOne({
      attributes: ["province", [Sequelize.fn("COUNT", "*"), "count"]],
      where: {
        session_start: {
          [Op.gte]: Sequelize.literal(`NOW() - ${intervalSQL}`),
        },
      },
      group: ["province"],
      order: [[Sequelize.literal("count"), "DESC"]],
      limit: 1,
      raw: true,
    });
  }

  /**
   * Calculates the average session duration for sessions started within the specified interval.
   * @param intervalSQL - The SQL interval string defining the lookback period (e.g., "7 DAY").
   * @returns {Promise<any>} A promise resolving to an object containing the `avgTime`.
   */
  getAverageTimeResult(intervalSQL: string) {
    return UssdSessions.findOne({
      attributes: [
        [Sequelize.fn("AVG", Sequelize.col("session_duration")), "avgTime"],
      ],
      where: {
        session_start: {
          [Op.gte]: Sequelize.literal(`NOW() - ${intervalSQL}`),
        },
      },
      raw: true,
    });
  }

  /**
   * Counts the total number of transactions that occurred in a previous time period (used for trend comparison).
   * @param currentIntervalSQL - The SQL interval string for the start of the current period (e.g., "7 DAY").
   * @param previousIntervalSQL - The SQL interval string for the end of the previous period (e.g., "14 DAY").
   * @returns {Promise<number>} A promise resolving to the count of transactions in the previous period.
   */
  getPreviousPeriodTotal(
    currentIntervalSQL: string,
    previousIntervalSQL: string
  ) {
    return UssdTransactions.count({
      where: {
        transaction_timestamp: {
          [Op.and]: [
            // Older than start of current period
            { [Op.lt]: Sequelize.literal(`NOW() - ${currentIntervalSQL}`) },
            // But newer than end of previous period
            { [Op.gte]: Sequelize.literal(`NOW() - ${previousIntervalSQL}`) },
          ],
        },
      },
    });
  }

  /**
   * Aggregates transaction statistics (count and success rate) grouped by network provider.
   * @param timeFilter - A Sequelize 'where' clause to filter transactions by time range.
   * @returns {Promise<any[]>} A promise resolving to an array of network performance metrics.
   */
  getNetworkBreakdown(timeFilter: WhereOptions<UssdTransactions>) {
    return UssdTransactions.findAll({
      attributes: [
        [Sequelize.col("session.network_provider"), "name"], // Get network from joined session
        [Sequelize.fn("COUNT", "*"), "totalTransactions"],
        // Network Success Rate
        [
          Sequelize.literal(
            `(SUM(CASE WHEN transaction_status = 'success' THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0)) * 100`
          ),
          "rate",
        ],
      ],
      include: [
        {
          model: UssdSessions,
          as: "session",
          attributes: [],
          required: true,
        },
      ],
      where: timeFilter,
      group: [Sequelize.col("session.network_provider")],
      raw: true,
    });
  }

  /**
   * Aggregates daily revenue data pivoted by service type (Electricity, Water, Airtime, Mobile Money).
   * @param dateFilter - A Sequelize 'where' clause or operator to filter the date range.
   * @returns {Promise<any[]>} A promise resolving to an array of daily revenue summaries.
   */
  getRevenueTrends(dateFilter: any) {
    return UssdTransactions.findAll({
      attributes: [
        // Group by Day
        [Sequelize.literal(`DATE_TRUNC('day', transaction_timestamp)`), "date"],

        // Sum amounts based on Type (Pivot)
        // Electricity
        [
          Sequelize.literal(
            `SUM(CASE WHEN transaction_type = 'electricity_token' THEN transaction_amount ELSE 0 END)`
          ),
          "electricity",
        ],

        // Water
        [
          Sequelize.literal(
            `SUM(CASE WHEN transaction_type = 'water_bill_payment' THEN transaction_amount ELSE 0 END)`
          ),
          "water",
        ],

        // Airtime
        [
          Sequelize.literal(
            `SUM(CASE WHEN transaction_type = 'airtime_purchase' THEN transaction_amount ELSE 0 END)`
          ),
          "airtime",
        ],

        // Mobile Money (Transfers + Bill Pay)
        [
          Sequelize.literal(
            `SUM(CASE WHEN transaction_type IN ('money_transfer', 'bill_payment') THEN transaction_amount ELSE 0 END)`
          ),
          "mobileMoney",
        ],

        // Total Daily Revenue
        [Sequelize.fn("SUM", Sequelize.col("transaction_amount")), "total"],
      ],
      where: {
        transaction_status: "success", // Only count successful revenue
        transaction_timestamp: dateFilter,
      },
      group: [
        Sequelize.literal(`DATE_TRUNC('day', transaction_timestamp)`) as any,
      ],
      order: [[Sequelize.literal("date"), "ASC"]],
      raw: true,
    });
  }

  /**
   * Counts the total number of unique users (distinct MSISDNs) in the system.
   * @returns {Promise<number>} A promise resolving to the count of unique users.
   */
  getTotalUniqueUsers() {
    return UssdSessions.count({
      distinct: true,
      col: "msisdn",
    });
  }

  /**
   * Retrieves the distribution of unique users across different provinces.
   * @returns {Promise<any[]>} A promise resolving to an array of provinces and their user counts.
   */
  getProvinceDistribution() {
    return UssdSessions.findAll({
      attributes: [
        "province",
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn("DISTINCT", Sequelize.col("msisdn"))
          ),
          "users",
        ],
      ],
      group: ["province"],
      order: [[Sequelize.literal("users"), "DESC"]],
      raw: true,
    });
  }

  /**
   * Retrieves the distribution of unique users across different network providers.
   * @returns {Promise<any[]>} A promise resolving to an array of network providers and their user counts.
   */
  getNetworkDistribution() {
    return UssdSessions.findAll({
      attributes: [
        "network_provider",
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn("DISTINCT", Sequelize.col("msisdn"))
          ),
          "users",
        ],
      ],
      group: ["network_provider"],
      raw: true,
    });
  }

  /**
   * Aggregates transaction counts grouped by day of the week and hour of the day (typically for heatmaps).
   * Note: This method defaults to a 30-day lookback period to establish a representative average.
   * @returns {Promise<any[]>} A promise resolving to an array of hourly transaction counts.
   */
  getRawHourlyCounts() {
    return UssdTransactions.findAll({
      attributes: [
        // Postgres: 0=Sunday, 6=Saturday
        [
          Sequelize.literal(`EXTRACT(DOW FROM transaction_timestamp)`),
          "dayIndex",
        ],
        [
          Sequelize.literal(`EXTRACT(HOUR FROM transaction_timestamp)`),
          "hourIndex",
        ],
        [Sequelize.fn("COUNT", "*"), "count"],
      ],
      where: {
        transaction_timestamp: {
          // Analyze last 30 days to get a representative average
          [Op.gte]: Sequelize.literal("NOW() - INTERVAL '30 days'"),
        },
      },
      group: [
        Sequelize.literal(`EXTRACT(DOW FROM transaction_timestamp)`) as any,
        Sequelize.literal(`EXTRACT(HOUR FROM transaction_timestamp)`) as any,
      ],
      raw: true,
    });
  }
}

const analyticsDAO = new AnalyticsDAO();

export default analyticsDAO;
