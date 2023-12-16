const Sequelize=require('sequelize')
// const Folder = require('../models/folder');
const sequelize=require('../util/database')

const Recyclebin=sequelize.define('Recycle', {
    id:{
        type: Sequelize.INTEGER,
        allowedNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    filemongo_id:{
        type:Sequelize.STRING,
        allowedNull: true,
    },
    user_id:{
        type: Sequelize.INTEGER,
        allowedNull: true,
    },
    workspace_id:{
        type: Sequelize.INTEGER,
        allowedNull: true,
    },
    file_name:{
        type:Sequelize.STRING,
        allowedNull:false
    },
    file_url:{
        type:Sequelize.STRING,
        allowedNull:true
    },
    file_description:{
        
        type:Sequelize.STRING,
        allowedNull:false
    },
    levels:{
        type:Sequelize.STRING,
        allowedNull:false
    },

    file_type:{
        type:Sequelize.STRING,
            allowNull: true
    },
   file_size:{
    type:Sequelize.BIGINT,
    allowNull: true
},
    doc_type:{
        type:Sequelize.STRING,
            allowNull: true
    },
    folder_name:{
        type:Sequelize.STRING,
            allowNull: true
    },
    policies_id:{
        type:Sequelize.STRING,
        allowNull: true
},
    policies_status:{
        type:Sequelize.STRING,
            allowNull: true
    },
    workspace_name:{
        type:Sequelize.STRING,
            allowNull: true
    },
    workspace_type:{
        type:Sequelize.STRING,
            allowNull: true
    },
time_stamp:{
        type:Sequelize.BIGINT,
        allowedNull: true,
    },
total_data_consumed:{
        type:Sequelize.INTEGER,
        allowedNull: true,
    },
user_type:{
        type:Sequelize.STRING,
        allowedNull: true,
    },
    recycle_user:{
        type:Sequelize.INTEGER,
        allowedNull: true,
    },

})
// Folder.hasMany(FileUpload, { foreignKey: 'user_id' });
// FileUpload.belongsTo(Folder, { foreignKey: 'user_id' });

module.exports=Recyclebin;



