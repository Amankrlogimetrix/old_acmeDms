// const express = require("express");
// const multer = require("multer");
// const router = express.Router();
// const storage = multer.memoryStorage();
// const upload = multer({ storage });
// const path = require("path");
// const FileUpload = require("../models/fileupload");
// const Folder = require("../models/folder");
// const winston = require("winston");
// const uploadfiledoctype = require("../models/uploadfilesdoctype");
// const { Op } = require("sequelize");
// const db = require("../util/database1");
// const { Sequelize } = require("sequelize");
// const folder = require("../models/folder");
// // const sub_folder = require("../models/subfolder");

// // Create a logger instance
// const logger = winston.createLogger({
//   level: "info",
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.json()
//   ),
//   transports: [
//     new winston.transports.File({ filename: "logs/app.log" }),
//     new winston.transports.Console(),
//   ],
// });

// router.post('/uploadcreate', upload.single('fileField'), async (req, res) => {
//   console.log(req.body, "_____dvdvd");
//   const file = req.file; 
//   const fileName = file.originalname;
//   console.log(fileName,"___filename");

//   if (!req.file) {
//     return res.status(400).json({ error: 'No file uploaded' });
//   }
//   try {
//   const { file_size, file_type, folder_name, workspace_name, doc_type ,user_id,parent_id} = req.body;
//   if(folder_name){
//     const uploaddocmetadata = await uploadfiledoctype.create({
//       user_id:user_id,
//       doc_type:doc_type,
//       field1:field1,
//       field2:field2,
//       field3:field3,
//       field4:field4,
//      field5:field5,
//      field6:field6,
//      field7:field7,
//      field8:field8,
//      field9:field9,
//     field10:field10
//   })
//   const newFile = await FileUpload.create({
//     levels:1,
//     user_id: user_id,
//     file_name: req.file.originalname,
//     file_size: fileData.length,
//     file_type: req.file.mimetype,
//     file_data: fileData,
//     doc_type: doc_type,
//     folder_name:folder_name,
//   });
//   res.status(200).json(newFile);
//   }
 
//   else {
//     const fileData = req.file.buffer;
//     const newFile = await FileUpload.create({
//       levels:0,
//       user_id: user_id,
//       file_name: req.file.originalname,
//       file_size: fileData.length,
//       file_type: req.file.mimetype,
//       file_data: fileData,
//       doc_type: doc_type,
//       folder_name:folder_name,
//     });
//     res.status(200).json(newFile);
//   }
//   }
//    catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });











// router.post("/createfolder", upload.none(), async (req, res) => {
//   console.log(req.body, "____");
//   try {
//     const { user_id, folder_name, folder_id, workspace_name, workspace_id } =
//       req.body;

//     let levels;

//     if (folder_id) {
//       // Find the folder with the provided folder_id
//       const parentFolder = await Folder.findOne({ where: { id: folder_id } });
//       if (!parentFolder) {
//         return res.status(404).json({ message: "Parent folder not found." });
//       }

//       // Increment the level of the parent folder by 1
//       levels = parentFolder.levels + 1;

//       // Create the folder in the database
  
      
//       const folder = await Folder.create({
//         workspace_id: workspace_id,
//         folder_name: folder_name,
//         levels: levels,
//         parent_id: folder_id,
//         workspace_name: workspace_name,
//       });
//       logger.info(`sub-Folder created: ${folder_name}`);
//       return res
//         .status(201)
//         .json({ message: "SUB_Folder created successfully.", folder });
//     } else {
//       const folder = await Folder.create({
//         workspace_id: workspace_id,
//         folder_name: folder_name,
//         levels: 0,
//         parent_id: 0,
//         workspace_name: workspace_name,
//       });
//     }
//     logger.info(`Folder created: ${folder_name}`);
//     return res
//       .status(201)
//       .json({ message: "Folder created successfully.", folder });
//   } catch (error) {
//     // Handle any errors that occur during the process
//     console.error("Error creating folder:", error);
//     return res
//       .status(500)
//       .json({ message: "An error occurred while creating the folder." });
//   }
// });


// router.post("/getfoldernames", async (req, res) => {
//   try {
//     const id = parseInt(req.body.parent_id); 
//    const levels = parseInt(req.body.levels);
//      console.log(req.body,"___body")
//     if (id && levels) {
//       console.log("inside if condition")
//       const folder_name = await Folder.findOne({
//         where :{
//         id:id
//         },
//         attributes: ["folder_name"],
//        })
//        console.log(folder_name.folder_name,"____________________-sdjsjcsjcbsj")
//       // Retrieve folder names where folder_id matches parent_id
//       const folders = await Folder.findAll({
//         where: {
//          levels: levels,
//          parent_id: id,
//         },
//         attributes: ["folder_name"],
//       })
//       console.log(folder,"folders___")

//       // Retrieve file data with matching folder_name
//       const files = await FileUpload.findAll({
//         where: {
//           folder_name:folder_name.folder_name,
//         },
//       });
// return res.status(200).json({ folders, files });
//     } else {
//       console.log("insdieelse")
//       // Retrieve folder names where levels = 0
//       const folders = await Folder.findAll({
//         where: {
//           levels: 0,
//         },
//         attributes: ["folder_name", "id", "parent_id", "levels"],
//       });

//       // Retrieve file data with matching folder_name
//       const files = await FileUpload.findAll({
//         where: {
//          levels:"0",
//         },
//       });
// //  console.log(files,"____files")
//       // Return the folder names and file data
//       return res.status(200).json({ folders, files });
//     }
//   } catch (error) {
//     // Handle any errors that occur during the process
//     console.error("Error retrieving folder names and file data:", error);
//     return res
//       .status(500)
//       .json({ message: "An error occurred while retrieving folder names and file data." });
//   }
// });

// module.exports = router;
