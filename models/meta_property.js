const  Sequelize  = require("sequelize");
const sequelize = require("../util/database");


const meta_property =sequelize.define('metaproperty',{
id:{
   type:Sequelize.INTEGER,
    allowedNull:true,
    autoIncrement:true,
    primaryKey:true,
},
metadata_name:{
   type:Sequelize.STRING,
  allowedNull:false
},
fieldname:{
   type:Sequelize.STRING,    
   allowedNull:false,
},
fieldtype:{
    type:Sequelize.STRING,
    allowedNull:false,
},
 metaproperties:{
   type: Sequelize.JSONB,
   allowNull: true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
},
doctype:{
   type:Sequelize.STRING,
   allowedNull:false,
},
meta_status:{
   type:Sequelize.STRING,
   allowedNull:false,
},
policy_no:{
   type:Sequelize.STRING,
   allowedNull:false,
},
policy_flag:{
   type:Sequelize.STRING,
   allowedNull:false,
}

})

module.exports=meta_property
