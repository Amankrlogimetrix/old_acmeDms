const Sequelize=require('sequelize')
const sequelize=require('../util/database')

const doctype=sequelize.define('docType', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
        
    },
    doctype_name:{
        type:Sequelize.STRING,
        allowedNull:false
    },

    doc_status:{
        type:Sequelize.STRING,
        allowedNull:false
    },
})

module.exports=doctype;


