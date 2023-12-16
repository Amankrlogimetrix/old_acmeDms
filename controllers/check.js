// const express = require("express");
// const multer = require("multer");
// const router = express.Router();
// const storage = multer.memoryStorage();
// const upload = multer({ storage });
// const path = require("path");
// const FileUpload = require("../models/checkfolder");
// const winston = require("winston");

// const { Op } = require("sequelize");

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

// // folder create
// router.post("/createfolders", upload.none(), async (req, res) => {
//   try {
//     const data = await FileUpload.create(req.body);
//     return res.json({
//       message: data,
//       success: true,
//       code: 201,
//     });
//   } catch (error) {
//     return res.json({
//       message: error,
//       success: false,
//       code: 500,
//     });
//   }
// });
// // folder update
// router.post("/updatefolders", upload.none(), async (req, res) => {
//   try {
//     const data = await FileUpload.update(
//       { data: newData },
//       { where: { id: rowId } }
//     );
//     return res.json({
//       message: data,
//       success: true,
//       code: 201,
//     });
//   } catch (error) {
//     return res.json({
//       message: error,
//       success: false,
//       code: 500,

//     });
//   }
// });
// // get folder
// router.post("/getFolders", upload.none(), async (req, res) => {
//   try {
//     const data = await FileUpload.findAll();
//     return res.json({
//       message: data,
//       success: true,
//       code: 200,
//     });
//   } catch (error) {
//     return res.json({
//       message: error,
//       success: false,
//       code: 500,
//     });
//   }
// });

// router.post("/getfoldernames", async (req, res) => {
//   try {
//     const { folder_id } = req.body;

//     if (folder_id) {
//       // Retrieve folder names where folder_id matches parent_id
//       const folders = await Folder.findAll({
//         where: {
//           parent_id: folder_id,
//         },
//         attributes: ["folder_name"],
//       });

//       // Return the folder names
//       return res.status(200).json({ folders });
//     } else {
//       // Retrieve folder names where levels = 0
//       const folders = await Folder.findAll({
//         where: {
//           levels: 0,
//         },
//         attributes: ["folder_name"],
//       });

//       // Return the folder names
//       return res.status(200).json({ folders });
//     }
//   } catch (error) {
//     // Handle any errors that occur during the process
//     console.error("Error retrieving folder names:", error);
//     return res
//       .status(500)
//       .json({ message: "An error occurred while retrieving folder names." });
//   }
// });

// module.exports = router;

// // const data1  = req.body.data
// // console.log(req.body.data,"boydd8vhhd")
// // console.log(data1.data,"_length")
// // data1.forEach(element => {
// //     console.log(element,"Odffodvsd")
// // });

// // try {
// //   const { user_id, folder_name, folder_id, workspace_name ,workspace_id} = req.body;
// // //    const len = req.body.data.data.length;
// // //    console.log(len,"___lengthk")
// //   let levels;
// //   if (folder_id) {
// //     // Find the folder with the provided folder_id
// //     const parentFolder = await FileUpload.findOne({ where: { id: folder_id } });

// //     if (!parentFolder) {
// //       return res.status(404).json({ message: 'Parent folder not found.' });
// //     }

// //     // Increment the level of the parent folder by 1
// //     levels = parentFolder.levels + 1;

// //       // Create the folder in the database
// //   const folder = await FileUpload.create({
// // //     workspace_id:workspace_id,
// // //    folder_name: folder_name,
// // //    levels: levels,
// // //    parent_id: folder_id,
// // //    workspace_name: workspace_name
// //   });
// //   logger.info(`sub-Folder created: ${folder_name}`);
// //   return res.status(201).json({ message: 'SUB_Folder created successfully.', folder });
// //   } else {
// //     const folder = await FileUpload.create({
// // //       workspace_id:workspace_id,
// // //    folder_name: folder_name,
// // //    levels:0,
// // //    parent_id: 0,
// // //    workspace_name: workspace_name
// //     });
// //   }
// //   logger.info(`Folder created: ${folder_name}`);
// //   return res.status(201).json({ message: 'Folder created successfully.', });
// // } catch (error) {
// //   // Handle any errors that occur during the process
// //   console.error('Error creating folder:', error);
// //   return res.status(500).json({ message: 'An error occurred while creating the folder.' });
// // }
