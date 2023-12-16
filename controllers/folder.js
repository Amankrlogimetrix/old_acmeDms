// const express = require('express');
// const router = express.Router();
// const Workspace = require('../models/add_workspace');
// const Folder = require('../models/folder');
// const FileUpload = require('../models/fileupload');
// const multer = require('multer');
// const storage = multer.memoryStorage();
// const upload = multer({ storage });


// router.post('/folders', upload.single('testing'), async (req, res) => {
//   console.log(req.body, "____bodyfolder");
//   console.log(req.file, "____file");

//   const workspaceId = req.body.workspace_id;
//   const folderName = req.body.folder_name;

//   try {
//     const workspace = await Workspace.findByPk(workspaceId);
//     if (!workspace) {
//       return res.status(404).json({ error: 'Workspace not found' });
//     }

//     // If a file is uploaded, save it to the database
//     if (req.file) {
//       const file = await FileUpload.create({
//         filename: req.file.filename,
//         path: req.file.path,
//         workspace_id: workspaceId
//       });
//       return res.status(201).json({ message: 'File uploaded successfully', file });
//     }

//     // If a folder is created, save it to the database
//     if (folderName) {
//       const existingFolder = await Folder.findOne({ where: { workspace_id: workspaceId, folder_name: folderName } });
//       if (existingFolder) {
//         return res.status(409).json({ error: 'Folder already exists' });
//       }
//       const folder = await Folder.create({
//         folder_name: folderName,
//         workspace_id: workspaceId
//       });
//       return res.status(201).json({ message: 'Folder created successfully', folder });
//     }

//     return res.status(400).json({ error: 'Bad request' });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// });
