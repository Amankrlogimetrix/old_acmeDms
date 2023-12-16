const Sequelize=require('sequelize')
const sequelize=require('../util/database')

const lastlogin=sequelize.define('last_login', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    user_email:{
        type: Sequelize.INTEGER,
        allowedNull: true,
    },
    login_time:{
        type:Sequelize.STRING,
        allowedNull:false
    }
})
// Folder.hasMany(FileUpload, { foreignKey: 'user_id' });
// FileUpload.belongsTo(Folder, { foreignKey: 'user_id' });

module.exports=lastlogin;



