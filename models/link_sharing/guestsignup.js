const Sequelize=require('sequelize')
const sequelize=require('../../util/database')

const Guest=sequelize.define('Guestsignup', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    password:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    hash_password:{
        type:Sequelize.STRING,
        allowedNull:false
        
    },
    email:{
        type: Sequelize.STRING,
        allowedNull: false
    },
    user_status:{
        type: Sequelize.STRING,
        allowedNull: false
    },
},{
    schema: 'Link-sharing', 
})
module.exports=Guest;