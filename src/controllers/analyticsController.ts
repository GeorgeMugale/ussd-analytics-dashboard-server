import { Status, StatusCode } from "express-http-status-handler";
import { Request, Response } from "express";
import { GET } from "../utils/decorators.js";
import analyticsDAO from "../doas/AnalyticsDAO.js";
import { Op, Sequelize, WhereOptions } from "sequelize";
import { UssdTransactions } from "../models/ussdTransactions.js";

export class AnalyticsController {
  @GET("/transactions/volume/:range/:service")
  async getTransactionVolume(req: Request, res: Response) {
    const status = new Status();

    try {
      const { range, service } = req.params; // "24h", "7d", etc.
      const timeRange = (range as string) || "7d";

      // Determine Logic based on Range (Matches SQL logic)
      let intervalSQL: string;
      let timeUnit: string;

      switch (timeRange) {
        case "24h":
          intervalSQL = "INTERVAL '24 hours'";
          timeUnit = "hour";
          break;
        case "30d":
          intervalSQL = "INTERVAL '30 days'";
          timeUnit = "day";
          break;
        case "90d":
          intervalSQL = "INTERVAL '90 days'";
          timeUnit = "day";
          break;
        case "7d":
        default:
          intervalSQL = "INTERVAL '7 days'";
          timeUnit = "day";
          break;
      }

      let serviceOption: WhereOptions<UssdTransactions> | null = {
        transaction_type: null as any,
      };

      switch (service) {
        case "electricity":
          serviceOption.transaction_type = "electricity_token";
          break;
        case "banking":
          serviceOption.transaction_type = {
            [Op.in]: ["balance_check", "account_registration"],
          };
          break;
        case "mobileMoney":
          serviceOption.transaction_type = {
            [Op.in]: ["money_transfer", "bill_payment"],
          };
          break;
        case "water":
          serviceOption.transaction_type = "water_bill_payment";
          break;
        case "airtime":
          serviceOption.transaction_type = "airtime_purchase";
          break;
        case "all":
        default:
          serviceOption = null;
          break;
      }

      // let DAO handle query
      const result = await analyticsDAO.getTransactionVolume(
        timeUnit,
        intervalSQL,
        serviceOption
      );

      // Format the rows for the frontend
      const formattedData = result.map((row: any) => {
        const dateObj = new Date(row.time_bucket);
        const isHourly = timeUnit === "hour";

        return {
          date: isHourly
            ? dateObj.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
          fullDate: dateObj.toISOString(),
          dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
            dateObj.getDay()
          ],
          hour: isHourly ? dateObj.getHours() : undefined,

          // Ensure Numbers (Raw SQL results often come as strings for BigInt/Decimal)
          total: Number(row.total),
          electricity: Number(row.electricity),
          water: Number(row.water),
          airtime: Number(row.airtime),
          mobileMoney: Number(row.mobilemoney), // Note: Sequelize raw usually lowercases aliases
          banking: Number(row.banking),
          avgSessionTime: Math.round(Number(row.avgsessiontime)),
          successRate: parseFloat(Number(row.successrate).toFixed(1)),
          revenue: Number(row.revenue),
          failedTransactions: Number(row.failedtransactions),
          peakConcurrentUsers: Number(row.peakconcurrentusers),
        };
      });

      status.successOK({ payload: formattedData });
    } catch (error) {
      console.log(error);

      status.errorStatus(StatusCode.INTERNAL_SERVER_ERROR);
    }
    res.status(status.code).json(status);
  }

  @GET("/transactions/success-rate/:range")
  async getGaugeStats(req: Request, res: Response) {
    const status = new Status();

    const { range } = req.query;
    const timeRange = (range as string) || "30d";

    // 1. Time Window Logic
    let intervalSQL: string;
    switch (timeRange) {
      case "24h":
        intervalSQL = "INTERVAL '24 hours'";
        break;
      case "7d":
        intervalSQL = "INTERVAL '7 days'";
        break;
      case "30d":
      default:
        intervalSQL = "INTERVAL '30 days'";
        break;
    }

    try {
      const timeFilter = {
        transaction_timestamp: {
          [Op.gte]: Sequelize.literal(`NOW() - ${intervalSQL}`),
        },
      };

      // 1. Determine Current vs Previous Time Ranges
      let currentIntervalSQL: string;
      let previousIntervalSQL: string;

      switch (timeRange) {
        case "24h":
          currentIntervalSQL = "INTERVAL '24 hours'";
          previousIntervalSQL = "INTERVAL '48 hours'"; // 24h * 2
          break;
        case "30d":
          currentIntervalSQL = "INTERVAL '30 days'";
          previousIntervalSQL = "INTERVAL '60 days'"; // 30d * 2
          break;
        case "7d":
        default:
          currentIntervalSQL = "INTERVAL '7 days'";
          previousIntervalSQL = "INTERVAL '14 days'"; // 7d * 2
          break;
      }

      // We run these in parallel for performance
      const [
        generalStats,
        activeSessions,
        topProvince,
        peakHourData,
        networkStats,
        previousPeriodStats,
      ] = await Promise.all([
        // A. General Metrics (Success Rate, Counts, Revenue, Avg Time)
        analyticsDAO.getGeneralMetrics(timeFilter),

        // B. Active Sessions (Live right now)
        analyticsDAO.getActiveSessions(),

        // C. Top Province (By Volume)
        analyticsDAO.getTopProvince(intervalSQL),

        // D. Peak Hour (0-23)
        analyticsDAO.getPeakHour(timeFilter),

        // E. Network Breakdown
        analyticsDAO.getNetworkBreakdown(timeFilter),

        // F. Previous Period Query
        analyticsDAO.getPreviousPeriodTotal(
          currentIntervalSQL,
          previousIntervalSQL
        ),
      ]);

      // --- 3. Calculations & Formatting ---

      // Calculate Avg Response Time (Separate query often cleaner for AVG on joins)
      const avgTimeResult = analyticsDAO.getAverageTimeResult(
        intervalSQL
      ) as any;

      // Get current total from the generalStats result we already fetched
      // (Ensure you cast to Number as counts can return strings)
      const currentTotal = Number((generalStats as any)?.total || 0);
      const previousTotal = Number(previousPeriodStats || 0);

      let trend = 0;

      // Avoid Division by Zero
      if (previousTotal === 0) {
        // If we have current data but no past data, it's 100% growth (or 0 if both empty)
        trend = currentTotal > 0 ? 100 : 0;
      } else {
        trend = ((currentTotal - previousTotal) / previousTotal) * 100;
      }

      // Round to 1 decimal place
      trend = parseFloat(trend.toFixed(1));

      // Process General Stats
      const stats: any = generalStats || {};

      // Process Network Market Share
      const totalVol = networkStats.reduce(
        (sum: number, n: any) => sum + Number(n.totalTransactions),
        0
      );
      const formattedNetworks = networkStats.map((n: any) => ({
        name: n.name || "Unknown",
        rate: parseFloat(Number(n.rate).toFixed(1)),
        marketShare: parseFloat(
          ((Number(n.totalTransactions) / totalVol) * 100).toFixed(1)
        ),
        totalTransactions: Number(n.totalTransactions),
      }));

      // Format Peak Hour (e.g., 14 -> "2:00 PM")
      const peakHourInt = peakHourData
        ? Number((peakHourData as any).hour)
        : 12;
      const peakHourStr = new Date(2024, 0, 1, peakHourInt).toLocaleTimeString(
        "en-US",
        { hour: "numeric", minute: "2-digit" }
      );

      status.successOK({
        payload: {
          metrics: {
            successRate: parseFloat(Number(stats.successRate || 0).toFixed(1)),
            successfulTxns: Number(stats.successfulTxns || 0),
            failedTxns: Number(stats.failedTxns || 0),
            avgResponseTime: parseFloat(
              Number(avgTimeResult?.avgTime || 0).toFixed(1)
            ),
            activeSessions: activeSessions,
            topProvince: (topProvince as any)?.province || "N/A",
            trend,
            peakHour: peakHourStr,
          },
          networks: formattedNetworks,
        },
      });
    } catch (error) {
      console.error("Error fetching gauge stats:", error);
      res.status(500).json({ error: "Internal Server Error" });
      status.errorStatus(StatusCode.INTERNAL_SERVER_ERROR);
    }

    return res.status(status.code).json(status);
  }
}

const analyticsController = new AnalyticsController();

export default analyticsController;
