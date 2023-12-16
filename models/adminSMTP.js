const Sequelize=require('sequelize')

const sequelize=require('../util/database')

const smtp=sequelize.define('smtp_details', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    username:{
        type:Sequelize.STRING,
        allowedNull:false
    },   
    password:{
        type:Sequelize.STRING,
        allowedNull:false
    }, 
    host_serverip:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    port:{
        type:Sequelize.STRING,
        allowedNull:false
    },
 from_address:{
        type:Sequelize.STRING,
        allowedNull:false
    },
  from_name:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    security:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    
authentication:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    
})

module.exports=smtp;

