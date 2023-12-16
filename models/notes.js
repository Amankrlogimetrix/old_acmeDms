const  Sequelize  = require("sequelize");
const sequelize = require("../util/database");
const notes =sequelize.define('notes',{
id:{
   type:Sequelize.INTEGER,
    allowedNull:true,
    autoIncrement:true,
    primaryKey:true,
},
file_id:{
   type:Sequelize.STRING,
  allowedNull:false
},
notes_description:{
   type:Sequelize.STRING,    
   allowedNull:false,
},
created_by:{
   type: Sequelize.STRING,
   allowedNull:false
}
})
module.exports=notes
