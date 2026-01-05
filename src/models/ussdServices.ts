import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { UssdMenuStructure, UssdMenuStructureId } from './ussdMenuStructure';

export interface UssdServicesAttributes {
  service_id: number;
  service_code: string;
  service_name: string;
  service_provider?: string;
  service_type?: string;
  launch_date?: string;
  is_active?: boolean;
}

export type UssdServicesPk = "service_id";
export type UssdServicesId = UssdServices[UssdServicesPk];
export type UssdServicesOptionalAttributes = "service_id" | "service_provider" | "service_type" | "launch_date" | "is_active";
export type UssdServicesCreationAttributes = Optional<UssdServicesAttributes, UssdServicesOptionalAttributes>;

export class UssdServices extends Model<UssdServicesAttributes, UssdServicesCreationAttributes> implements UssdServicesAttributes {
  service_id!: number;
  service_code!: string;
  service_name!: string;
  service_provider?: string;
  service_type?: string;
  launch_date?: string;
  is_active?: boolean;

  // UssdServices hasMany UssdMenuStructure via service_id
  ussd_menu_structures!: UssdMenuStructure[];
  getUssd_menu_structures!: Sequelize.HasManyGetAssociationsMixin<UssdMenuStructure>;
  setUssd_menu_structures!: Sequelize.HasManySetAssociationsMixin<UssdMenuStructure, UssdMenuStructureId>;
  addUssd_menu_structure!: Sequelize.HasManyAddAssociationMixin<UssdMenuStructure, UssdMenuStructureId>;
  addUssd_menu_structures!: Sequelize.HasManyAddAssociationsMixin<UssdMenuStructure, UssdMenuStructureId>;
  createUssd_menu_structure!: Sequelize.HasManyCreateAssociationMixin<UssdMenuStructure>;
  removeUssd_menu_structure!: Sequelize.HasManyRemoveAssociationMixin<UssdMenuStructure, UssdMenuStructureId>;
  removeUssd_menu_structures!: Sequelize.HasManyRemoveAssociationsMixin<UssdMenuStructure, UssdMenuStructureId>;
  hasUssd_menu_structure!: Sequelize.HasManyHasAssociationMixin<UssdMenuStructure, UssdMenuStructureId>;
  hasUssd_menu_structures!: Sequelize.HasManyHasAssociationsMixin<UssdMenuStructure, UssdMenuStructureId>;
  countUssd_menu_structures!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof UssdServices {
    return UssdServices.init({
    service_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    service_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: "ussd_services_service_code_key"
    },
    service_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    service_provider: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    service_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    launch_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'ussd_services',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "ussd_services_pkey",
        unique: true,
        fields: [
          { name: "service_id" },
        ]
      },
      {
        name: "ussd_services_service_code_key",
        unique: true,
        fields: [
          { name: "service_code" },
        ]
      },
    ]
  });
  }
}
