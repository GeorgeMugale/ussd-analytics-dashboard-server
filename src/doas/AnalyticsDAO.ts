import { Op, Sequelize, WhereOptions } from "sequelize";
import { UssdSessions } from "../models/ussdSessions.js";
import { UssdTransactions } from "../models/ussdTransactions.js";
import { Literal } from "sequelize/types/utils.js";

class AnalyticsDAO {
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

  getActiveSessions() {
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
}

const analyticsDAO = new AnalyticsDAO();

export default analyticsDAO;
