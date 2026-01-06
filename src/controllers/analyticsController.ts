import { Status, StatusCode } from "express-http-status-handler";
import { Request, Response } from "express";
import { GET } from "../utils/decorators.js";
import analyticsDAO from "../doas/AnalyticsDAO.js";

export class AnalyticsController {
  @GET("/transactions/volume/:range/:service")
  async getTransactionVolume(req: Request, res: Response) {
    const status = new Status();

    try {
      const { range } = req.params; // "24h", "7d", etc.
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

      // let DAO handle query
      const result = await analyticsDAO.getTransactionVolume(
        timeUnit,
        intervalSQL
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
}

const analyticsController = new AnalyticsController();

export default analyticsController;
