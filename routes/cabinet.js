const express = require('express');

const router = express.Router();

const add_cabinetController=require('../controllers/add_cabinet');
const Authenticate=require('../middleware/authorization')
const {extractClientIP}= require('../middleware/clientIp');

router.use(extractClientIP);

// addcabinet -add and edit both
router.post('/add_cabinet', add_cabinetController.add_cabinet);
router.post('/deletecabinet',add_cabinetController.deletecabinet)
router.post('/cabinetdropdown',add_cabinetController.cabinet_dropdown)
router.post('/getcabinet',add_cabinetController.get_cabinet)
module.exports=router

