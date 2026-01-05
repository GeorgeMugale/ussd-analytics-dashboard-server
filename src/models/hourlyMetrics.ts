import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface HourlyMetricsAttributes {
  metric_id: number;
  metric_date: string;
  metric_hour?: number;
  service_code?: string;
  transaction_count?: number;
  success_count?: number;
  failure_count?: number;
  total_amount?: number;
}

export type HourlyMetricsPk = "metric_id";
export type HourlyMetricsId = HourlyMetrics[HourlyMetricsPk];
export type HourlyMetricsOptionalAttributes = "metric_id" | "metric_hour" | "service_code" | "transaction_count" | "success_count" | "failure_count" | "total_amount";
export type HourlyMetricsCreationAttributes = Optional<HourlyMetricsAttributes, HourlyMetricsOptionalAttributes>;

export class HourlyMetrics extends Model<HourlyMetricsAttributes, HourlyMetricsCreationAttributes> implements HourlyMetricsAttributes {
  metric_id!: number;
  metric_date!: string;
  metric_hour?: number;
  service_code?: string;
  transaction_count?: number;
  success_count?: number;
  failure_count?: number;
  total_amount?: number;


  static initModel(sequelize: Sequelize.Sequelize): typeof HourlyMetrics {
    return HourlyMetrics.init({
    metric_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    metric_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    metric_hour: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    service_code: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    transaction_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    success_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    failure_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'hourly_metrics',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "hourly_metrics_pkey",
        unique: true,
        fields: [
          { name: "metric_id" },
        ]
      },
    ]
  });
  }
}
