import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { ZambianDistricts, ZambianDistrictsId } from './zambianDistricts';

export interface ZambianProvincesAttributes {
  province_id: number;
  province_name: string;
  population_estimate?: number;
  urban_ratio?: number;
}

export type ZambianProvincesPk = "province_id";
export type ZambianProvincesId = ZambianProvinces[ZambianProvincesPk];
export type ZambianProvincesOptionalAttributes = "province_id" | "population_estimate" | "urban_ratio";
export type ZambianProvincesCreationAttributes = Optional<ZambianProvincesAttributes, ZambianProvincesOptionalAttributes>;

export class ZambianProvinces extends Model<ZambianProvincesAttributes, ZambianProvincesCreationAttributes> implements ZambianProvincesAttributes {
  province_id!: number;
  province_name!: string;
  population_estimate?: number;
  urban_ratio?: number;

  // ZambianProvinces hasMany ZambianDistricts via province_id
  zambian_districts!: ZambianDistricts[];
  getZambian_districts!: Sequelize.HasManyGetAssociationsMixin<ZambianDistricts>;
  setZambian_districts!: Sequelize.HasManySetAssociationsMixin<ZambianDistricts, ZambianDistrictsId>;
  addZambian_district!: Sequelize.HasManyAddAssociationMixin<ZambianDistricts, ZambianDistrictsId>;
  addZambian_districts!: Sequelize.HasManyAddAssociationsMixin<ZambianDistricts, ZambianDistrictsId>;
  createZambian_district!: Sequelize.HasManyCreateAssociationMixin<ZambianDistricts>;
  removeZambian_district!: Sequelize.HasManyRemoveAssociationMixin<ZambianDistricts, ZambianDistrictsId>;
  removeZambian_districts!: Sequelize.HasManyRemoveAssociationsMixin<ZambianDistricts, ZambianDistrictsId>;
  hasZambian_district!: Sequelize.HasManyHasAssociationMixin<ZambianDistricts, ZambianDistrictsId>;
  hasZambian_districts!: Sequelize.HasManyHasAssociationsMixin<ZambianDistricts, ZambianDistrictsId>;
  countZambian_districts!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof ZambianProvinces {
    return ZambianProvinces.init({
    province_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    province_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "zambian_provinces_province_name_key"
    },
    population_estimate: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    urban_ratio: {
      type: DataTypes.DECIMAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'zambian_provinces',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "zambian_provinces_pkey",
        unique: true,
        fields: [
          { name: "province_id" },
        ]
      },
      {
        name: "zambian_provinces_province_name_key",
        unique: true,
        fields: [
          { name: "province_name" },
        ]
      },
    ]
  });
  }
}
