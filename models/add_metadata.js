const Sequelize=require('sequelize')
const sequelize=require('../util/database')

const doctype=sequelize.define('metadata', {
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

    workspace_name:{
        type:Sequelize.STRING,
        allowedNull:false
    },

    doctype:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    metadata_name:{
         type:Sequelize.STRING,
        allowedNull:false
    }
    
})

module.exports=doctype;


