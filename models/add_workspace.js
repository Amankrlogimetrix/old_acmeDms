const Sequelize=require('sequelize')

const sequelize=require('../util/database')

const workspace=sequelize.define('workspace', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    workspace_name:{
        type:Sequelize.STRING,
        allowedNull:false
    },   
    selected_cabinet:{
        type:Sequelize.STRING,
        allowedNull:false
    }, 
    selected_groups:{
        type: Sequelize.JSONB, 
        allowNull: true
    },
    selected_users:{
        type: Sequelize.JSONB,
        allowNull: true
    },
    workspace_type:{
        type:Sequelize.STRING,
        allowNull: true
    },
    quota:{
        type:Sequelize.STRING,
        allowedNull:false
    },
user_id:{
        type:Sequelize.STRING,
        allowedNull:false
    },
})

module.exports=workspace;


