const jwt = require("jsonwebtoken");
require("dotenv").config();

function jwtGenerator(user_id,username) {
  const payload = {
    user: {
      id: user_id,
      username:username
    },
  };

  return jwt.sign(payload, process.env.jwtSecret, { expiresIn: "1w" });
}

module.exports = jwtGenerator;
