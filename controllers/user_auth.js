const express = require('express');
const router = express.Router();
const Workspace_auth = require('../models/workspace_auth');

const Workspace = require('../models/add_workspace');

router.post('/workspace_auths', async (req, res) => {
  try {
    const workspaceAuths = await Workspace_auth.findAll({
      include: [{
        model: Workspace,
        required: true,
      }],
    });
    res.status(200).json(workspaceAuths);
  } catch (err) {
   return res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
