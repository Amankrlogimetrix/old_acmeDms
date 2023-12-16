const Sequelize=require('sequelize')
// const Folder = require('../models/folder');
const sequelize=require('../util/database')

const sub_folder=sequelize.define('sub_folder', {
     id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        primaryKey: true
    },
    parent_id:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    sub_folder1: {
        type:Sequelize.STRING,
        allowedNull:false
    },
    sub_folder2: {
        type:Sequelize.STRING,
        allowedNull:false
    },
    sub_folder2: {
        type:Sequelize.STRING,
        allowedNull:false
    },
    sub_folder3: {
        type:Sequelize.STRING,
        allowedNull:false
    },
    sub_folder4: {
        type:Sequelize.STRING,
        allowedNull:false
    },
    sub_folder5: {
        type:Sequelize.STRING,
        allowedNull:false
    },
   
    
})
// Folder.hasMany(FileUpload, { foreignKey: 'user_id' });
// FileUpload.belongsTo(Folder, { foreignKey: 'user_id' });

module.exports=sub_folder;
