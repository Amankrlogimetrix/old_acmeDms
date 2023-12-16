const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const work_flow = require("../models/work_flow");
const middleware = require("../middleware/authorization");

router.post("/createworkflow", middleware, async (req, res) => {
  try {
    // const token = req.header("Authorization");
    // if (!token) {
    //   return res.status(400).send({ message: "you are not logged in" });
    // }
    // const decodedToken = jwt.verify(token, "acmedms");
    const user_id = req.decodedToken.user.id;

    let { id, policy_name, workspace_name, group_admin, user_email, l_1, l_2 } =
      req.body;
    if (!policy_name) {
      return res.status(400).send({ message: "Please enter policy name" });
    }
    if (!workspace_name) {
      return res.status(400).send({ message: "Please enter workspace name" });
    }
    if (!group_admin) {
      return res.status(400).send({ message: "Please enter group admin" });
    }
    if (!user_email) {
      return res.status(400).send({ message: "Please enter user email" });
    }
    let workFlow;
    if (id) {
      workFlow = await work_flow.findByPk(id);
      if (!workFlow) {
        return res.status(404).json({ message: "workFlow not found" });
      }
      (workFlow.policy_name = policy_name),
        (workFlow.workspace_name = workspace_name),
        (workFlow.group_admin = group_admin),
        (workFlow.user_email = user_email),
        (workFlow.l_1 = l_1),
        (workFlow.l_2 = l_2),
        await workFlow.save();

    } else {
       workFlow = await work_flow.create({
        policy_name: policy_name,
        workspace_name: workspace_name,
        group_admin: group_admin,
        user_email: user_email,
        l_1: l_1,
        l_2: l_2,
      });

    }
    return res.status(201).send({ message:"Work Flow Created/updated Sucessfully",workFlow });
  } catch (error) {
    return res.status(500).send({ message: "Server Error" });
  }
});

router.post("/getworkflow", async (req, res) => {
  try {
    const allWorkFlow = await work_flow.findAll({
      attributes: {
        include: ['updatedat'] 
      }
    });    
    return res.status(200).json({ allWorkFlow });
  } catch (error) {
    console.log(error);
  }
});

router.post("/deleteworkflow", async (req, res) => {
  try {
    const id = req.body.id;
    await work_flow.destroy({ where: { id: id } });
    return res.status(200).json({ message: "work flow delete successfully" });
  } catch (error) {
    return res.status(500).json({ message: "server error" });
  }
});

module.exports = router;
