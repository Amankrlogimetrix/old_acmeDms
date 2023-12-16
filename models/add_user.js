const Sequelize=require('sequelize')

const sequelize=require('../util/database')

const Users=sequelize.define('add_users', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    user_type:{
        type: Sequelize.STRING,
        allowedNull:false
    },
    display_name:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    emp_password:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    hash_password:{
        type:Sequelize.STRING,
        allowedNull:false
        
    },
    emp_code:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    email:{
        type: Sequelize.STRING,
        allowedNull: false
    },
    max_quota:{
        type: Sequelize.STRING,
        allowedNull: false
    },
    add_group:{
        type: Sequelize.STRING,
        allowedNull: false
    },
    user_status:{
        type: Sequelize.STRING,
        allowedNull: false
    },
    validity_date:{
        type: Sequelize.STRING,
        allowedNull: false
    },
    user_role:{
        type: Sequelize.STRING,
        allowedNull: false
    },
    level_1:{
        type: Sequelize.STRING,
        allowedNull: false
    },
    level_2:{
        type: Sequelize.STRING,
        allowedNull: false
    }
})

module.exports=Users;