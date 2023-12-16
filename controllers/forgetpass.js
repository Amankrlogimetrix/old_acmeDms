
const express = require("express");
const router = express.Router();
// const Policy = require('')
const User = require('../models/add_user')
const SMTP = require('../models/adminSMTP');
const nodemailer = require('nodemailer');

router.post('/forgetpasslink', async (req, res) => {
  try {
    const { emp_code, email } = req.body;

    let user;

    if (emp_code) {
      // Find user by emp_code
      user = await User.findOne({
        where: {
          emp_code: emp_code,
        },
      });
    }

    if (!user && email) {
      // If user not found by emp_code, find by email
      user = await User.findOne({
        where: {
          email: email,
        },
      });
    }

    if (!user) {
      // If user not found
      return res.status(404).json({ message: "User not found." });
    }

    const data = await SMTP.findOne();

    const transporter = nodemailer.createTransport({
      host: data.host_serverip,
      port: data.port,
      secure: false,
      auth: {
        user: data.username,
        pass: data.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `ACME DocHub ${data.from_address}`,
      to: user.email,
      subject: "ACME DocHub - Your login password.",
      html: `<HTML>
      <img src="cid:acmeLogo" alt="acme_logo" style="width: 150px;">
      <p>Dear ${user.email},</p>
      <p>Your ACME DocHub application login password: ${user.emp_password}</p>
      <p>Regards,</p>
      <p style="margin-top: 0;">ACME DocHub</p>
      <HTML>`,
      attachments: [
        {
          filename: 'acmeLogo.jpeg',
          path: 'img/acmeLogo.5737c13751454da74081.jpeg',
          cid: 'acmeLogo',
        },
      ],
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return res.status(500).json({ message: "Failed to send the email." });
      } else {
        return res
          .status(200)
          .json({ success: true, message: "Reset link sent successfully." });
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
});


module.exports = router;
