import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { UssdServices, UssdServicesId } from './ussdServices';

export interface UssdMenuStructureAttributes {
  menu_id: number;
  service_id?: number;
  menu_level: number;
  menu_text: string;
  expected_input_type?: string;
  parent_menu_id?: number;
  next_menu_id?: number;
  is_terminal?: boolean;
}

export type UssdMenuStructurePk = "menu_id";
export type UssdMenuStructureId = UssdMenuStructure[UssdMenuStructurePk];
export type UssdMenuStructureOptionalAttributes = "menu_id" | "service_id" | "expected_input_type" | "parent_menu_id" | "next_menu_id" | "is_terminal";
export type UssdMenuStructureCreationAttributes = Optional<UssdMenuStructureAttributes, UssdMenuStructureOptionalAttributes>;

export class UssdMenuStructure extends Model<UssdMenuStructureAttributes, UssdMenuStructureCreationAttributes> implements UssdMenuStructureAttributes {
  menu_id!: number;
  service_id?: number;
  menu_level!: number;
  menu_text!: string;
  expected_input_type?: string;
  parent_menu_id?: number;
  next_menu_id?: number;
  is_terminal?: boolean;

  // UssdMenuStructure belongsTo UssdMenuStructure via parent_menu_id
  parent_menu!: UssdMenuStructure;
  getParent_menu!: Sequelize.BelongsToGetAssociationMixin<UssdMenuStructure>;
  setParent_menu!: Sequelize.BelongsToSetAssociationMixin<UssdMenuStructure, UssdMenuStructureId>;
  createParent_menu!: Sequelize.BelongsToCreateAssociationMixin<UssdMenuStructure>;
  // UssdMenuStructure belongsTo UssdServices via service_id
  service!: UssdServices;
  getService!: Sequelize.BelongsToGetAssociationMixin<UssdServices>;
  setService!: Sequelize.BelongsToSetAssociationMixin<UssdServices, UssdServicesId>;
  createService!: Sequelize.BelongsToCreateAssociationMixin<UssdServices>;

  static initModel(sequelize: Sequelize.Sequelize): typeof UssdMenuStructure {
    return UssdMenuStructure.init({
    menu_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ussd_services',
        key: 'service_id'
      }
    },
    menu_level: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    menu_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    expected_input_type: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    parent_menu_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ussd_menu_structure',
        key: 'menu_id'
      }
    },
    next_menu_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_terminal: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'ussd_menu_structure',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "ussd_menu_structure_pkey",
        unique: true,
        fields: [
          { name: "menu_id" },
        ]
      },
    ]
  });
  }
}
