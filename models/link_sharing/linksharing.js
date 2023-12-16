const Sequelize = require("sequelize");

const sequelize = require("../../util/database");

const link = sequelize.define(
  "guest",
  {
    id: {
      type: Sequelize.INTEGER,
      allowedNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    file_id: {
      type: Sequelize.INTEGER,
      allowedNull: true,
    },
    folder_id: {
      type: Sequelize.INTEGER,
      allowedNull: true,
    },
    guest_email: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    user_email: {
      type: Sequelize.STRING,
     allowNull: true,
    },
    expiry_date: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    share: {
      type: Sequelize.STRING,
      allowedNull: false,
      defaultValue: "false",
    },
    rename: {
      type: Sequelize.STRING,
      allowedNull: false,
      defaultValue: "false",
    },
    move: {
      type: Sequelize.STRING,
      allowedNull: false,
      defaultValue: "false",
    },
    rights: {
      type: Sequelize.STRING,
      allowedNull: false,
      defaultValue: "false",
    },
    comment: {
      type: Sequelize.STRING,
      allowedNull: false,
      defaultValue: "false",
    },
    properties: {
      type: Sequelize.STRING,
      allowedNull: false,
      defaultValue: "false",
    },
    delete_action: {
      type: Sequelize.STRING,
      allowedNull: false,
      defaultValue: "false",
    },
    download: {
      type: Sequelize.STRING,
      allowedNull: true,
      defaultValue: "false",
    },
    view: {
      type: Sequelize.STRING,
      allowedNull: true,
      defaultValue: "false",
    },
    create_folder: {
      type: Sequelize.STRING,
      allowedNull: true,
      defaultValue: "false",
    },
    upload_file: {
      type: Sequelize.STRING,
      allowedNull: true,
      defaultValue: "false",
    },
    upload_folder: {
      type: Sequelize.STRING,
      allowedNull: true,
      defaultValue: "false",
    },
    is_approved1:{
      type: Sequelize.STRING,
      allowedNull: true,
      defaultValue: "false",
    },
    is_approved2:{
      type: Sequelize.STRING,
      allowedNull: true,
      defaultValue: "false",
    },
    shared_by: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    shared_workspace_name:{
      type: Sequelize.STRING,
      allowedNull: false,
    }
  },
  {
    schema: "Link-sharing",
  }
);

module.exports = link;
