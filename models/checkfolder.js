const Sequelize=require('sequelize')
const sequelize=require('../util/database')
const check_folder=sequelize.define('check_folder', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true,
    },
    parent_id:{
        type: Sequelize.INTEGER,
        allowedNull: true,
    },
    folder_id:{

        type: Sequelize.INTEGER,
        allowNull: true
      },
    folder_name:{
        type: Sequelize.STRING,
            allowNull: true
    },
    workspace_name:{
        type: Sequelize.STRING,
        allowNull: true
      },
      
      workspace_id:{
        type: Sequelize.STRING,
        allowNull: true
      },
      data: {
        type: Sequelize.ARRAY(Sequelize.JSONB),
        allowNull: true,
        defaultValue: [], 
      },

    
})

module.exports=check_folder;