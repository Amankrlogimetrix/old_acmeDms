const Sequelize = require("sequelize");
const sequelize = require("../util/database");

const uploadfiledoctype = sequelize.define("uploadfiledoctype", {
  id: {
    type: Sequelize.INTEGER,
    allowedNull: true,
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
  file_id:{
    type:Sequelize.INTEGER,
    allowedNull:true
  },
  doctype: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  file_name: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field1: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field2: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field3: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field4: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field5: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field6: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field7: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field8: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field9: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
  field10: {
    type: Sequelize.STRING,
    allowedNull: true,
  },
});

module.exports = uploadfiledoctype;
