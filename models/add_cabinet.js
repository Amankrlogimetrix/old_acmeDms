const Sequelize=require('sequelize')

const sequelize=require('../util/database')

const cabinet=sequelize.define('add_cabinet', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    cabinet_name:{
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
})

module.exports=cabinet;
