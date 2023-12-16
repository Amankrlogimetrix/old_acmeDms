const express = require('express');

const router = express.Router();

const Auth_workspace=require('../controllers/workspace_auth');
const Authenticate=require('../middleware/authorization')

// addcabinet -add and edit both
router.post('/wauth', Auth_workspace.auth_worksapce);
router.post('/getpermission', Auth_workspace.get_permission);
module.exports=router

