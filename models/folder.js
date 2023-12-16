const Sequelize = require("sequelize");

const sequelize = require("../util/database");
// const FileUpload = require('../models/fileupload');
const folder = sequelize.define("folders", {
  id: {
    type: Sequelize.INTEGER,
    allowedNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: Sequelize.INTEGER,
    allowedNull: true,
  },
  guest_id: {
    type: Sequelize.INTEGER,
    allowedNull: true,
  },
  parent_id: {
    type: Sequelize.INTEGER,
    allowedNull: true,
  },
  levels: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  folder_name: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  workspace_name: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  workspace_id: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  workspace_type: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  time_stamp: {
    type: Sequelize.BIGINT,
    allowedNull: true,
  },
  is_recycle: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  deleted_at:{
    type: Sequelize.BIGINT, //storing this in SECOND NOT in milisecond
    allowNull: true
  },
  policies_id :{
   type: Sequelize.STRING,
   allowNull:false 
  }
});
module.exports = folder;
