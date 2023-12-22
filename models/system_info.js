const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../util/database");

const SystemInfo = sequelize.define(
  "SystemInfos",
  {
    id: {
      type: Sequelize.INTEGER,
      allowedNull: true,
      autoIncrement: true,
      primaryKey: true,
    },
    memoryUsage: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    cpuUsagePercentage: {
      type: Sequelize.JSONB,
      allowedNull: false,
    },
    networkInfo: {
      type: Sequelize.JSONB,
      allowedNull: false,
    },
    driveDetails: {
      type: Sequelize.JSONB,
      allowedNull: false,
    },
    createdAt: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
);
module.exports = SystemInfo;
