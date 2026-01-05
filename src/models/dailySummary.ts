import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface DailySummaryAttributes {
  summary_date: string;
  total_sessions?: number;
  successful_transactions?: number;
  failed_transactions?: number;
  total_amount?: number;
  avg_session_duration?: number;
  unique_users?: number;
  peak_hour?: number;
  created_at?: Date;
}

export type DailySummaryPk = "summary_date";
export type DailySummaryId = DailySummary[DailySummaryPk];
export type DailySummaryOptionalAttributes = "total_sessions" | "successful_transactions" | "failed_transactions" | "total_amount" | "avg_session_duration" | "unique_users" | "peak_hour" | "created_at";
export type DailySummaryCreationAttributes = Optional<DailySummaryAttributes, DailySummaryOptionalAttributes>;

export class DailySummary extends Model<DailySummaryAttributes, DailySummaryCreationAttributes> implements DailySummaryAttributes {
  summary_date!: string;
  total_sessions?: number;
  successful_transactions?: number;
  failed_transactions?: number;
  total_amount?: number;
  avg_session_duration?: number;
  unique_users?: number;
  peak_hour?: number;
  created_at?: Date;


  static initModel(sequelize: Sequelize.Sequelize): typeof DailySummary {
    return DailySummary.init({
    summary_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true
    },
    total_sessions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    successful_transactions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    failed_transactions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0
    },
    avg_session_duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    unique_users: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    peak_hour: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'daily_summary',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "daily_summary_pkey",
        unique: true,
        fields: [
          { name: "summary_date" },
        ]
      },
    ]
  });
  }
}
