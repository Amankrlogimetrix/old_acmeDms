const Sequelize=require('sequelize')

const sequelize=require('../../util/database')

const alllogs = sequelize.define('all_logs', {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: Sequelize.STRING,
      allowNull: true
    },
    guest_id:{
      type: Sequelize.STRING,
      allowNull : true 
    },
    category: {
      type: Sequelize.STRING,
      allowNull: false
    },
    action: {
      type: Sequelize.STRING,
      allowNull: false
    },
    timestamp: {
      type: Sequelize.BIGINT,
      allowedNull: true,
    },
    system_ip: {
      type: Sequelize.STRING,
      allowNull: false
    },
    file_id:{
      type:Sequelize.STRING,
      allowNull:true
    },
    folder_id:{
      type:Sequelize.STRING,
      allowNull:true
    }
  }, {
    schema: 'logsdetails' // Replace 'your_schema_name' with your desired schema name
  });
  
  
  module.exports=alllogs;