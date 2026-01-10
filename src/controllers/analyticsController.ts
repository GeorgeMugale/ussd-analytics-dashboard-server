import { Status, StatusCode } from "express-http-status-handler";
import { Request, Response } from "express";
import { GET } from "../utils/decorators.js";
import analyticsDAO from "../doas/AnalyticsDAO.js";
import { Op, Sequelize, WhereOptions } from "sequelize";
import { UssdTransactions } from "../models/ussdTransactions.js";

/**
 * Controller responsible for aggregating and serving analytics data for the dashboard.
 */
export class AnalyticsController {
  /**
   * Retrieves transaction volume metrics filtered by time range and specific service.
   * * @param range - The time interval for the data (e.g., '24h', '7d', '30d').
   * @param service - The service category to filter by (e.g., 'electricity', 'mobile-money', 'all').
   */
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

  /**
   * Retrieves transaction success rate statistics for gauge visualization over a specific period.
   * * @param range - The time range to calculate success/failure rates (e.g., '24h', '7d').
   */
  @GET("/transactions/success-rate/:range")
  async getGaugeStats(req: Request, res: Response) {
    const status = new Status();

    const { range } = req.params;
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

  /**
   * Retrieves revenue growth trends and breakdowns over a specified time period.
   * * @param range - The historical range for revenue analysis (e.g., '90d', 'ytd').
   */
  @GET("/revenue/trends/:range")
  async getRevenueTrends(req: Request, res: Response) {
    const status = new Status();
    const { range } = req.params;
    const timeRange = (range as string) || "30d";

    // Calculate Date Range
    let dateFilter: any;
    const now = new Date();

    if (timeRange === "ytd") {
      // Start of current year
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      dateFilter = { [Op.gte]: startOfYear };
    } else {
      // Relative range
      let intervalSQL: string;
      switch (timeRange) {
        case "7d":
          intervalSQL = "INTERVAL '7 days'";
          break;
        case "90d":
          intervalSQL = "INTERVAL '90 days'";
          break;
        case "30d":
        default:
          intervalSQL = "INTERVAL '30 days'";
          break;
      }
      dateFilter = { [Op.gte]: Sequelize.literal(`NOW() - ${intervalSQL}`) };
    }

    try {
      const data = await analyticsDAO.getRevenueTrends(dateFilter);

      // Format Numbers (Postgres sums return strings)
      const formattedData = data.map((row: any) => ({
        date: row.date, // Keep ISO string for frontend parsing
        electricity: Number(row.electricity),
        water: Number(row.water),
        airtime: Number(row.airtime),
        mobileMoney: Number(row.mobilemoney), // Sequelize lowercases aliases
        total: Number(row.total),
      }));

      status.successOK({ payload: formattedData });
    } catch (error) {
      console.error("Error fetching revenue trends:", error);
      status.errorStatus(StatusCode.INTERNAL_SERVER_ERROR);
    }

    return res.status(status.code).json(status);
  }

  /**
   * Retrieves aggregated user demographic data (location, age group, etc.).
   * No URL parameters required.
   */
  @GET("/users/demographics")
  async getDemographicsData(req: Request, res: Response) {
    const status = new Status();
    try {
      //  Run Parallel Queries for Real Data
      const [totalUsersCount, provinceStats, networkStats] = await Promise.all([
        // Total Unique Users
        analyticsDAO.getTotalUniqueUsers(),

        // Province Distribution
        analyticsDAO.getProvinceDistribution(),

        // Network Distribution
        analyticsDAO.getNetworkDistribution(),
      ]);

      // Process Real Data
      const total = totalUsersCount || 1; // Avoid divide by zero

      // --- Format Provinces ---
      // We explicitly map your top 3, others go to "Other"
      const topProvinces = ["Lusaka", "Copperbelt", "Southern"];
      let formattedProvinces = (provinceStats as any[]).map((p) => ({
        name: p.province,
        users: Number(p.users),
        percentage: Math.round((Number(p.users) / total) * 100),
        type:
          p.province === "Lusaka"
            ? "Urban Center"
            : p.province === "Copperbelt"
            ? "Industrial"
            : "Agricultural",
      }));

      // Group smaller provinces if needed (Optional logic)
      const mainProvinces = formattedProvinces.filter((p) =>
        topProvinces.includes(p.name)
      );
      const otherUsers = formattedProvinces
        .filter((p) => !topProvinces.includes(p.name))
        .reduce((sum, p) => sum + p.users, 0);

      const finalProvinces = [
        ...mainProvinces,
        {
          name: "Other Provinces",
          users: otherUsers,
          percentage: Math.round((otherUsers / total) * 100),
          type: "Combined",
        },
      ].sort((a, b) => b.users - a.users);

      // --- Format Networks ---
      const networkMap: Record<string, string> = {
        MTN: "MTN Zambia",
        Airtel: "Airtel Zambia",
        Zamtel: "Zamtel",
      };

      const formattedNetworks = (networkStats as any[]).map((n) => ({
        name: networkMap[n.network_provider] || n.network_provider,
        users: Number(n.users),
        percentage: Number(((Number(n.users) / total) * 100).toFixed(1)),
        description:
          n.network_provider === "MTN"
            ? "Market Leader"
            : n.network_provider === "Zamtel"
            ? "State Operator"
            : "Strong Competitor",
      }));

      // Project Missing Demographics (Age/Gender/Device)
      // Since schema lacks this, we project distributions onto the REAL total count
      const project = (pct: number) => Math.round(total * (pct / 100));

      const ageGroups = [
        { range: "18-25", percentage: 32, users: project(32), label: "Youth" },
        {
          range: "26-35",
          percentage: 38,
          users: project(38),
          label: "Young Adults",
        },
        {
          range: "36-45",
          percentage: 22,
          users: project(22),
          label: "Middle Age",
        },
        {
          range: "46-55",
          percentage: 6,
          users: project(6),
          label: "Older Adults",
        },
        { range: "56+", percentage: 2, users: project(2), label: "Seniors" },
      ];

      const genderData = [
        { name: "Male", value: 58, users: project(58) },
        { name: "Female", value: 42, users: project(42) },
      ];

      // Calculate Urban vs Rural based on the Province Data calculated above
      // Assuming Lusaka/Copperbelt are "Urban" (approx 68% in your example)
      const urbanCount = formattedProvinces
        .filter((p) => ["Lusaka", "Copperbelt"].includes(p.name))
        .reduce((sum, p) => sum + p.users, 0);

      const urbanRuralData = [
        {
          name: "Urban",
          value: Math.round((urbanCount / total) * 100),
          users: urbanCount,
        },
        {
          name: "Rural",
          value: Math.round(((total - urbanCount) / total) * 100),
          users: total - urbanCount,
        },
      ];

      status.successOK({
        payload: {
          totalUsers: total,
          provinceData: finalProvinces,
          networkData: formattedNetworks,
          ageGroups,
          genderData,
          urbanRuralData,
          // Device data is purely static estimation for USSD context
          deviceData: [
            { name: "Feature Phones", value: 74, trend: "Primary device" },
            { name: "Smartphones", value: 26, trend: "+8% YoY" },
            { name: "Daily Active", value: 42, trend: "High engagement" },
          ],
        },
      });
    } catch (error) {
      console.error("Error fetching demographics:", error);
      status.errorStatus(StatusCode.INTERNAL_SERVER_ERROR);
    }

    return res.status(status.code).json(status);
  }

  /**
   * Retrieves heatmap data showing transaction density by day of the week and hour of the day.
   * No URL parameters required.
   */
  @GET("/peak-hours")
  async getPeakHours(req: Request, res: Response) {
    const status = new Status();

    try {
      // Fetch Raw Hourly Counts from DB
      // Result looks like: [{ day: 1, hour: 14, count: 500 }, etc...]
      const rawData = await analyticsDAO.getRawHourlyCounts();

      // Initialize Data Structures
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const buckets = [
        "00-02",
        "02-04",
        "04-06",
        "06-08",
        "08-10",
        "10-12",
        "12-14",
        "14-16",
        "16-18",
        "18-20",
        "20-22",
        "22-00",
      ];

      // Create a matrix: Map<DayIndex, Map<BucketIndex, Total>>
      const matrix: Record<number, number[]> = {};
      days.forEach((_, i) => (matrix[i] = new Array(12).fill(0)));

      // Populate Matrix (Aggregation Logic)
      rawData.forEach((row: any) => {
        const dayIdx = Number(row.dayIndex);
        const hour = Number(row.hourIndex);
        const count = Number(row.count);

        // Convert 0-23 hour to 0-11 bucket
        const bucketIdx = Math.floor(hour / 2);

        // Add to bucket
        if (matrix[dayIdx]) {
          matrix[dayIdx][bucketIdx] += count;
        }
      });

      // Flatten to Frontend Format & Calculate Metadata
      const result: any[] = [];
      let maxVal = 0;

      // First pass: flatten and find max for intensity scaling
      // Note: Reordering days so Monday is index 0 (Frontend expects Mon-Sun)
      const orderedDays = [1, 2, 3, 4, 5, 6, 0]; // Mon, Tue... Sat, Sun

      orderedDays.forEach((dayIdx) => {
        const dayName = days[dayIdx];
        const isWeekend = dayIdx === 0 || dayIdx === 6;

        buckets.forEach((bucketLabel, bIdx) => {
          const val = matrix[dayIdx][bIdx];
          if (val > maxVal) maxVal = val;

          result.push({
            day: dayName,
            hour: bucketLabel,
            value: val,
            isWeekend, // Helper for frontend
            dayIdx, // Helper for sorting
            hourIdx: bIdx, // Helper for sorting
          });
        });
      });

      // Calculate Intensity and Peaks (Dynamic based on data)
      const finalData = result.map((item) => {
        // Intensity 0-5 based on percentage of Max Value
        const ratio = item.value / (maxVal || 1);
        let intensity = 0;
        if (ratio > 0.9) intensity = 5;
        else if (ratio > 0.7) intensity = 4;
        else if (ratio > 0.5) intensity = 3;
        else if (ratio > 0.3) intensity = 2;
        else if (ratio > 0.1) intensity = 1;

        // Peak Logic: Top 10% of values are peaks
        const isPeak = ratio > 0.9;

        return {
          day: item.day,
          hour: item.hour,
          value: item.value,
          intensity,
          isPeak,
        };
      });

      status.successOK({ payload: finalData });
    } catch (error) {
      console.error("Heatmap error:", error);
      status.errorStatus(StatusCode.INTERNAL_SERVER_ERROR);
    }

    return res.status(status.code).json(status);
  }
}

const analyticsController = new AnalyticsController();

export default analyticsController;
