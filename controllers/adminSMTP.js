const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const SMTP = require('../models/adminSMTP');
const app = express();
app.use(bodyParser.json());
const nodemailer = require('nodemailer');
// const SMTP = require('../models/adminSMTP')
// Create SMTP credentials
router.post('/createsmtp', (req, res) => {
    const { username, password, host_serverip, port, from_address,security, from_name, authentication } = req.body;
  
    SMTP.create({
      username,
      password,
      host_serverip,
      port,
      security,
      from_address,
      from_name,
      authentication
    })
      .then(createdSMTP => {
        res.status(201).json(createdSMTP);
      })
      .catch(error => {
         res.status(500).json({ error: 'Failed to create SMTP credential.' });
      });
  });
  

// Edit SMTP credentials

router.post('/editsmtp', (req, res) => {
    const smtpId = req.body.id;
    const { username, password, host_serverip, port, security,from_address, from_name, authentication } = req.body;
    SMTP.findByPk(smtpId)
      .then(smtp => {
        if (smtp) {
          smtp.update({
            username,
            password,
            host_serverip,
            port,
            security,
            from_address,
            from_name,
            authentication
          })
            .then(updatedSMTP => {
              res.status(200).json(updatedSMTP);
            })
            .catch(error => {
              res.status(500).json({ error: 'Failed to update SMTP credential.' });
            });
        } else {
          res.status(404).json({ error: 'SMTP credential not found.' });
        }
      })
      .catch(error => {
        res.status(500).json({ error: 'Failed to retrieve SMTP credential.' });
      });
  });
router.post('/getsmtp',async(req,res)=>{
   try {
    const data  = await SMTP.findAll()
    return res.status(200).json({data})
   } catch (error) {
    return res.status(400).json({message:"server error"})
   }

})




router.post('/testemail',async(req,res)=>{
try {
      const {to_address,subject,message}  = req.body;
      const data = await SMTP.findOne();
      const transporter = nodemailer.createTransport({
    host: data.host_serverip,
    port: data.port,
    secure: false,
    //service: 'smtp',
    auth: {
      user: data.username,
      pass: data.password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  const mailOptions = {
    from: `ACME DocHub ${data.from_address}`,
    to: to_address,
    subject: subject,
    html: `<HTML> <img src="cid:acmeLogo" alt="acme_logo">
    <p>${message} Dear ${to_address},</p>
    <p>The content has been shared with you.</p>
    <p>- File / Folder Name: png</p>
    <p>To access the content, click the following link to login: <a href="${process.env.HOST_FRONTEND}:${process.env.PORT_FRONTEND}/guestlogin">Login Link</a></p>
    <p>Your password is: 1234566</p>
    <p>This link is valid until: 78664335</p>
    <p>Regards,</p>
    <p>ACME DocHub</p>
    <HTML>`,
    attachments: [
      {
        filename: 'acmeLogo.jpeg',
        path: 'img/acmeLogo.5737c13751454da74081.jpeg',
        cid: 'acmeLogo', // Make sure the CID matches the image src in the HTML
      },
    ],
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error,"__this is error");
    }else{
      console.log(info,"all are perfect")
        return res.status(200).json({success:true,message:"email sent successfully "})
    }
})
} catch (error) {
    return res.status(400).json({success:false,message:"server error"})
}
})

  module.exports = router