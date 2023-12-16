const Sequelize = require("sequelize");

const sequelize = require("../util/database");

const work_flow = sequelize.define(
  "work_flow",
  {
    id: {
      type: Sequelize.INTEGER,
      allowedNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    policy_name: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    workspace_name: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    group_admin: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    user_email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    l_1: {
      type: Sequelize.STRING,
      default: "false",
    },
    l_2: {
      type: Sequelize.STRING,
      default: "false",
    },
  },
  {
    timestamps: false, // Disable timestamps
  }
);

module.exports = work_flow;
