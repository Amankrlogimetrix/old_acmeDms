const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function(req, res, next) {

  const token = req.header("Authorization");
  // console.log(req.header,"___req")
  // Check if not token
  if (!token) {
    return res.status(403).json({ msg: "Token Not found" });
  }

  try {
  
        jwt.verify(token, process.env.jwtSecret,(err, user)=>{
            if (err){
              return res.status(400).send({message:err.message})
            }else{
              req.decodedToken = user
              next()
            }
        });

  } catch (err) {
    return res.status(401).json({ msg: "Token is not valid" });
  }
};