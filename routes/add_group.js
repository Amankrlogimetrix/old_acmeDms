const express = require('express');

const router = express.Router();
const middleware = require('../middleware/authorization');

const add_userController=require('../controllers/add_group');
const Authenticate=require('../middleware/authorization')
const {extractClientIP}= require('../middleware/clientIp');

router.use(extractClientIP);



router.post('/add_group',middleware, add_userController.add_group);

router.post('/get_groups',add_userController.get_groups);
router.post('/dropdown_groups',add_userController.drop_groups);
router.post('/deletegroup',middleware, add_userController.deleteGroup);
module.exports=router
