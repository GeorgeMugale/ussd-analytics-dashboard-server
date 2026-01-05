import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ZambianProvinces, ZambianProvincesId } from './zambianProvinces';

export interface ZambianDistrictsAttributes {
  district_id: number;
  district_name: string;
  province_id?: number;
  is_urban?: boolean;
}

export type ZambianDistrictsPk = "district_id";
export type ZambianDistrictsId = ZambianDistricts[ZambianDistrictsPk];
export type ZambianDistrictsOptionalAttributes = "district_id" | "province_id" | "is_urban";
export type ZambianDistrictsCreationAttributes = Optional<ZambianDistrictsAttributes, ZambianDistrictsOptionalAttributes>;

export class ZambianDistricts extends Model<ZambianDistrictsAttributes, ZambianDistrictsCreationAttributes> implements ZambianDistrictsAttributes {
  district_id!: number;
  district_name!: string;
  province_id?: number;
  is_urban?: boolean;

  // ZambianDistricts belongsTo ZambianProvinces via province_id
  province!: ZambianProvinces;
  getProvince!: Sequelize.BelongsToGetAssociationMixin<ZambianProvinces>;
  setProvince!: Sequelize.BelongsToSetAssociationMixin<ZambianProvinces, ZambianProvincesId>;
  createProvince!: Sequelize.BelongsToCreateAssociationMixin<ZambianProvinces>;

  static initModel(sequelize: Sequelize.Sequelize): typeof ZambianDistricts {
    return ZambianDistricts.init({
    district_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    district_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    province_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'zambian_provinces',
        key: 'province_id'
      }
    },
    is_urban: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'zambian_districts',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "zambian_districts_pkey",
        unique: true,
        fields: [
          { name: "district_id" },
        ]
      },
    ]
  });
  }
}
