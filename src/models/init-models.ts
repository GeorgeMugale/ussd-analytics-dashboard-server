import type { Sequelize } from "sequelize";
import { DailySummary as _DailySummary } from "./dailySummary";
import type { DailySummaryAttributes, DailySummaryCreationAttributes } from "./dailySummary";
import { HourlyMetrics as _HourlyMetrics } from "./hourlyMetrics";
import type { HourlyMetricsAttributes, HourlyMetricsCreationAttributes } from "./hourlyMetrics";
import { MobileNetworks as _MobileNetworks } from "./mobileNetworks";
import type { MobileNetworksAttributes, MobileNetworksCreationAttributes } from "./mobileNetworks";
import { UssdMenuStructure as _UssdMenuStructure } from "./ussdMenuStructure";
import type { UssdMenuStructureAttributes, UssdMenuStructureCreationAttributes } from "./ussdMenuStructure";
import { UssdServices as _UssdServices } from "./ussdServices";
import type { UssdServicesAttributes, UssdServicesCreationAttributes } from "./ussdServices";
import { UssdSessions as _UssdSessions } from "./ussdSessions";
import type { UssdSessionsAttributes, UssdSessionsCreationAttributes } from "./ussdSessions";
import { UssdTransactions as _UssdTransactions } from "./ussdTransactions";
import type { UssdTransactionsAttributes, UssdTransactionsCreationAttributes } from "./ussdTransactions";
import { ZambianDistricts as _ZambianDistricts } from "./zambianDistricts";
import type { ZambianDistrictsAttributes, ZambianDistrictsCreationAttributes } from "./zambianDistricts";
import { ZambianProvinces as _ZambianProvinces } from "./zambianProvinces";
import type { ZambianProvincesAttributes, ZambianProvincesCreationAttributes } from "./zambianProvinces";

export {
  _DailySummary as DailySummary,
  _HourlyMetrics as HourlyMetrics,
  _MobileNetworks as MobileNetworks,
  _UssdMenuStructure as UssdMenuStructure,
  _UssdServices as UssdServices,
  _UssdSessions as UssdSessions,
  _UssdTransactions as UssdTransactions,
  _ZambianDistricts as ZambianDistricts,
  _ZambianProvinces as ZambianProvinces,
};

export type {
  DailySummaryAttributes,
  DailySummaryCreationAttributes,
  HourlyMetricsAttributes,
  HourlyMetricsCreationAttributes,
  MobileNetworksAttributes,
  MobileNetworksCreationAttributes,
  UssdMenuStructureAttributes,
  UssdMenuStructureCreationAttributes,
  UssdServicesAttributes,
  UssdServicesCreationAttributes,
  UssdSessionsAttributes,
  UssdSessionsCreationAttributes,
  UssdTransactionsAttributes,
  UssdTransactionsCreationAttributes,
  ZambianDistrictsAttributes,
  ZambianDistrictsCreationAttributes,
  ZambianProvincesAttributes,
  ZambianProvincesCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
  const DailySummary = _DailySummary.initModel(sequelize);
  const HourlyMetrics = _HourlyMetrics.initModel(sequelize);
  const MobileNetworks = _MobileNetworks.initModel(sequelize);
  const UssdMenuStructure = _UssdMenuStructure.initModel(sequelize);
  const UssdServices = _UssdServices.initModel(sequelize);
  const UssdSessions = _UssdSessions.initModel(sequelize);
  const UssdTransactions = _UssdTransactions.initModel(sequelize);
  const ZambianDistricts = _ZambianDistricts.initModel(sequelize);
  const ZambianProvinces = _ZambianProvinces.initModel(sequelize);

  UssdMenuStructure.belongsTo(UssdMenuStructure, { as: "parent_menu", foreignKey: "parent_menu_id"});
  UssdMenuStructure.hasMany(UssdMenuStructure, { as: "ussd_menu_structures", foreignKey: "parent_menu_id"});
  UssdMenuStructure.belongsTo(UssdServices, { as: "service", foreignKey: "service_id"});
  UssdServices.hasMany(UssdMenuStructure, { as: "ussd_menu_structures", foreignKey: "service_id"});
  UssdTransactions.belongsTo(UssdSessions, { as: "session", foreignKey: "session_id"});
  UssdSessions.hasMany(UssdTransactions, { as: "ussd_transactions", foreignKey: "session_id"});
  ZambianDistricts.belongsTo(ZambianProvinces, { as: "province", foreignKey: "province_id"});
  ZambianProvinces.hasMany(ZambianDistricts, { as: "zambian_districts", foreignKey: "province_id"});

  return {
    DailySummary: DailySummary,
    HourlyMetrics: HourlyMetrics,
    MobileNetworks: MobileNetworks,
    UssdMenuStructure: UssdMenuStructure,
    UssdServices: UssdServices,
    UssdSessions: UssdSessions,
    UssdTransactions: UssdTransactions,
    ZambianDistricts: ZambianDistricts,
    ZambianProvinces: ZambianProvinces,
  };
}
