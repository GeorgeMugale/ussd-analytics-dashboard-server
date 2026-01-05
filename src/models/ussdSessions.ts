import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { UssdTransactions, UssdTransactionsId } from './ussdTransactions';

export interface UssdSessionsAttributes {
  session_id: string;
  msisdn: string;
  network_provider?: string;
  province?: string;
  district?: string;
  service_code: string;
  session_start: Date;
  session_end?: Date;
  session_duration?: number;
  session_status?: string;
  created_at?: Date;
}

export type UssdSessionsPk = "session_id";
export type UssdSessionsId = UssdSessions[UssdSessionsPk];
export type UssdSessionsOptionalAttributes = "network_provider" | "province" | "district" | "session_end" | "session_duration" | "session_status" | "created_at";
export type UssdSessionsCreationAttributes = Optional<UssdSessionsAttributes, UssdSessionsOptionalAttributes>;

export class UssdSessions extends Model<UssdSessionsAttributes, UssdSessionsCreationAttributes> implements UssdSessionsAttributes {
  session_id!: string;
  msisdn!: string;
  network_provider?: string;
  province?: string;
  district?: string;
  service_code!: string;
  session_start!: Date;
  session_end?: Date;
  session_duration?: number;
  session_status?: string;
  created_at?: Date;

  // UssdSessions hasMany UssdTransactions via session_id
  ussd_transactions!: UssdTransactions[];
  getUssd_transactions!: Sequelize.HasManyGetAssociationsMixin<UssdTransactions>;
  setUssd_transactions!: Sequelize.HasManySetAssociationsMixin<UssdTransactions, UssdTransactionsId>;
  addUssd_transaction!: Sequelize.HasManyAddAssociationMixin<UssdTransactions, UssdTransactionsId>;
  addUssd_transactions!: Sequelize.HasManyAddAssociationsMixin<UssdTransactions, UssdTransactionsId>;
  createUssd_transaction!: Sequelize.HasManyCreateAssociationMixin<UssdTransactions>;
  removeUssd_transaction!: Sequelize.HasManyRemoveAssociationMixin<UssdTransactions, UssdTransactionsId>;
  removeUssd_transactions!: Sequelize.HasManyRemoveAssociationsMixin<UssdTransactions, UssdTransactionsId>;
  hasUssd_transaction!: Sequelize.HasManyHasAssociationMixin<UssdTransactions, UssdTransactionsId>;
  hasUssd_transactions!: Sequelize.HasManyHasAssociationsMixin<UssdTransactions, UssdTransactionsId>;
  countUssd_transactions!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof UssdSessions {
    return UssdSessions.init({
    session_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true
    },
    msisdn: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    network_provider: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    province: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    district: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    service_code: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    session_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    session_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    session_duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    session_status: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'ussd_sessions',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "idx_sessions_msisdn",
        fields: [
          { name: "msisdn" },
        ]
      },
      {
        name: "idx_sessions_network",
        fields: [
          { name: "network_provider" },
        ]
      },
      {
        name: "idx_sessions_province",
        fields: [
          { name: "province" },
        ]
      },
      {
        name: "idx_sessions_timestamp",
        fields: [
          { name: "session_start" },
        ]
      },
      {
        name: "ussd_sessions_pkey",
        unique: true,
        fields: [
          { name: "session_id" },
        ]
      },
    ]
  });
  }
}
