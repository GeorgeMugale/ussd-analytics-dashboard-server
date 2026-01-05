import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface MobileNetworksAttributes {
  network_id: number;
  network_name: string;
  mnc?: string;
  market_share?: number;
}

export type MobileNetworksPk = "network_id";
export type MobileNetworksId = MobileNetworks[MobileNetworksPk];
export type MobileNetworksOptionalAttributes = "network_id" | "mnc" | "market_share";
export type MobileNetworksCreationAttributes = Optional<MobileNetworksAttributes, MobileNetworksOptionalAttributes>;

export class MobileNetworks extends Model<MobileNetworksAttributes, MobileNetworksCreationAttributes> implements MobileNetworksAttributes {
  network_id!: number;
  network_name!: string;
  mnc?: string;
  market_share?: number;


  static initModel(sequelize: Sequelize.Sequelize): typeof MobileNetworks {
    return MobileNetworks.init({
    network_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    network_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    mnc: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    market_share: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'mobile_networks',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "mobile_networks_pkey",
        unique: true,
        fields: [
          { name: "network_id" },
        ]
      },
    ]
  });
  }
}
