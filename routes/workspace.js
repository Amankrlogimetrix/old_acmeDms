const express = require('express');

const router = express.Router();

const add_workspaceController=require('../controllers/add_workspace');

// addcabinet -add and edit both
router.post('/add_workspace', add_workspaceController.add_workspace);
router.post('/deleteworkspace',add_workspaceController.deleteworksapce)
router.post('/getworkspace',add_workspaceController.get_workspace)
module.exports=router

