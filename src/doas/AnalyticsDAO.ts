import { Op, Sequelize, WhereOptions } from "sequelize";
import { UssdSessions } from "../models/ussdSessions.js";
import { UssdTransactions } from "../models/ussdTransactions.js";

class AnalyticsDAO {
  async getTransactionVolume(
    timeUnit: string,
    intervalSQL: string,
    serviceOption: WhereOptions<UssdTransactions> | null
  ) {
    return await UssdTransactions.findAll({
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
}

const analyticsDAO = new AnalyticsDAO();

export default analyticsDAO;
