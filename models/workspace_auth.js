const DataTypes=require('sequelize')
const sequelize=require('../util/database')
const Workspace = require('./add_workspace');
const workspace_auth = sequelize.define('workspace_auth', {
        id:{
        type: DataTypes.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    workspace_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    permission_upload: {
      type: DataTypes.STRING,

      allowNull: true
    },
    permission_view: {
      type: DataTypes.STRING,
      allowNull: true
    },
    permission_createfolder: {
      type: DataTypes.STRING,
      allowNull: true
    },
    permission_delete: {
      type: DataTypes.STRING,
      allowNull: true
    },
    permission_download: {
      type: DataTypes.STRING,
      allowNull: true
    },
    permission_share: {
      type: DataTypes.STRING,
      allowNull: true
    },
    permission_rename: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });
  
workspace_auth.belongsTo(Workspace, { foreignKey: 'workspace_id' });
  module.exports = workspace_auth;