import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { UssdSessions, UssdSessionsId } from './ussdSessions';

export interface UssdTransactionsAttributes {
  transaction_id: string;
  session_id?: string;
  ussd_string: string;
  menu_level?: number;
  selected_option?: string;
  input_value?: string;
  transaction_type?: string;
  transaction_amount?: number;
  currency?: string;
  transaction_status?: string;
  failure_reason?: string;
  transaction_timestamp?: Date;
}

export type UssdTransactionsPk = "transaction_id";
export type UssdTransactionsId = UssdTransactions[UssdTransactionsPk];
export type UssdTransactionsOptionalAttributes = "session_id" | "menu_level" | "selected_option" | "input_value" | "transaction_type" | "transaction_amount" | "currency" | "transaction_status" | "failure_reason" | "transaction_timestamp";
export type UssdTransactionsCreationAttributes = Optional<UssdTransactionsAttributes, UssdTransactionsOptionalAttributes>;

export class UssdTransactions extends Model<UssdTransactionsAttributes, UssdTransactionsCreationAttributes> implements UssdTransactionsAttributes {
  transaction_id!: string;
  session_id?: string;
  ussd_string!: string;
  menu_level?: number;
  selected_option?: string;
  input_value?: string;
  transaction_type?: string;
  transaction_amount?: number;
  currency?: string;
  transaction_status?: string;
  failure_reason?: string;
  transaction_timestamp?: Date;

  // UssdTransactions belongsTo UssdSessions via session_id
  session!: UssdSessions;
  getSession!: Sequelize.BelongsToGetAssociationMixin<UssdSessions>;
  setSession!: Sequelize.BelongsToSetAssociationMixin<UssdSessions, UssdSessionsId>;
  createSession!: Sequelize.BelongsToCreateAssociationMixin<UssdSessions>;

  static initModel(sequelize: Sequelize.Sequelize): typeof UssdTransactions {
    return UssdTransactions.init({
    transaction_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true
    },
    session_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      references: {
        model: 'ussd_sessions',
        key: 'session_id'
      }
    },
    ussd_string: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    menu_level: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    selected_option: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    input_value: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    transaction_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    transaction_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: "ZMW"
    },
    transaction_status: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    failure_reason: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    transaction_timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    tableName: 'ussd_transactions',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "idx_transactions_amount",
        fields: [
          { name: "transaction_amount" },
        ]
      },
      {
        name: "idx_transactions_status",
        fields: [
          { name: "transaction_status" },
        ]
      },
      {
        name: "idx_transactions_type",
        fields: [
          { name: "transaction_type" },
        ]
      },
      {
        name: "ussd_transactions_pkey",
        unique: true,
        fields: [
          { name: "transaction_id" },
        ]
      },
    ]
  });
  }
}
