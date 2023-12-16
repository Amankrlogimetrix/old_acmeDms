const User=require('../models/users');
const bcrypt = require('bcrypt');
const jwtgenerator = require('../util/jwtGenerator')
var jwt = require('jsonwebtoken');
exports.register=(req,res)=>{

   const {username,email,password,role}=req.body

   bcrypt.hash(password,10, (err,hash)=>{

       User.findAll({where:{email:email}})
       .then(users=>{
           const user=users[0]
           if(user)
           res.json({success:false,message:'User Already exist. Please Login'})
           else
           {   
               User.create({
                   username:username,
                   email:email,
                   password:hash,
                   role:role
               })
               .then(()=>{
                   res.status(200).json({success:true,message:'Successfully Signed Up, Login now'})
               })
               .catch(err=>{
                //    console.log(err)
                   res.json({success:false,message:'error while registering'})
               })

           }
       })
   })
}



exports.loginUser=(req,res,next)=>{
   const userMail=req.body.email;
   const userPassword=req.body.password;

   User.findOne({
      where: {
           email: userMail, 
       }
   }).then((result)=>{
         bcrypt.compare(userPassword, result.password).then(function(Cresult) {
              if(Cresult==true){
             
               res.status(200).json({success:true,message:'User Log in Successful',token:jwtgenerator(result.dataValues.id,result.dataValues.username),username:result.dataValues.username}) 
              }else
              {
                 res.status(401).json({success:false,message:'User Not Authorized'})
              }
         })      
   }).catch(err=>{
      res.status(404).json({success:false,message:'User Not Found'})
   })
}