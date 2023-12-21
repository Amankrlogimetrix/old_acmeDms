const express = require("express");
const router = express.Router();
const doctype = require("../models/doctype");
const docmetadata = require("../models/add_metadata");

// POST /doctypes
router.post("/createdoctype", async (req, res) => {
  try {
    const doc_type = req.body.doctype;
    const newDocType = await doctype.create({
      doctype_name: doc_type,
      doc_status: "true",
    });
    res.status(201).json(newDocType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});
router.post("/doclist", async (req, res) => {
  try {
    const workspaceAuths = await doctype.findAll({});
    return res.status(200).json(workspaceAuths);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/deletedoc", async (req, res) => {
  try {
    const id = req.body.id;
    const docType = await doctype.findByPk(id);
    if (!docType) {
      return res.status(404).json({ message: "Document type not found" });
    }
    await docType.destroy();
    return res.status(204).json({ message: "Document type deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
});
//   cabinet_name, worspace_name, doctype,metadeta_name

router.post("/createmetadata", async (req, res) => {
  try {
    const doctype = req.body.doctype;
    const cabinet_name = req.body.cabinet_name;
    const workspace_name = req.body.workspace_name;
    const metadata_name = req.body.metadata_name;
    const newmetadataType = await docmetadata.create({
      cabinet_name: cabinet_name,
      workspace_name: workspace_name,
      doctype: doctype,
      metadata_name: metadata_name,
    });
    return res.status(201).json(newmetadataType);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// delete
router.post("/deletemetadata", async (req, res) => {
  const id = parseInt(req.body.id);

  const row = await docmetadata.findOne({
    where: {
      id: id,
    },
  });

  if (!row) {
    return res
      .status(404)
      .json({ success: false, message: "Metadata not found" });
  }

  docmetadata
    .destroy({
      where: {
        id: id,
      },
    })
    .then(() => {
      res
        .status(200)
        .json({ success: true, message: "Metadata deleted successfully" });
    })
    .catch(() => {
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    });
});

router.post("/metalist", async (req, res) => {
  try {
    const workspaceAuths = await docmetadata.findAll({});
    return res.status(200).json(workspaceAuths);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/metaform", async (req, res) => {
  try {
    const doctype = req.body.doctype;
    const docmeta = await docmetadata.findAll({
      where: {
        doctype: doctype,
      },
    });
    return res.status(200).json(docmeta);
  } catch (error) {
    return res.status(500).json({ message: "error in metaform api" });
  }
});

router.post("/docstatus", async (req, res) => {
  try {
    const id = parseInt(req.body.id);
    const user = await doctype.findByPk(id);
    console.log(user,"userfromdoc")
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.doc_status = req.body.user_status.toString();
    await user.save();
    return res
      .status(200)
      .json({
        message: `doctype has been ${
          user.doc_status === "true" ? "enabled" : "disabled"
        }`,
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
module.exports = router;

//  filed of doc_type metadata
