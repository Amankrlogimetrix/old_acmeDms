const Sequelize = require("sequelize");

const sequelize = require("../../util/database");

const policy = sequelize.define(
  "policy",
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
    policy_type: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    selected_users: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    selected_group: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    minimum_character: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    minimum_Alphabets: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    minimum_numeric: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    minimum_special_character: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    inncorrect_password_attend: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    properties_name: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    minimum_maximum_days: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    subject: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    message: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    Bandwidth_min_max: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    print: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    download_per: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    delete_per: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    view: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    create_folder: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    upload_file: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    upload_folder: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    share: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    rename: {
      type: Sequelize.STRING,
      allowedNull: true,
    },
    move: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    rights: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    comments: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    minimum_numeric: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    recycle_bin: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    no_of_days: {
      type: Sequelize.STRING,
      allowedNull: false, 
    },    
    versions: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
    no_of_versions: {
      type: Sequelize.STRING,
      allowedNull: false,
    },
  },
  {
    schema: "policies",
  }
);

module.exports = policy;
