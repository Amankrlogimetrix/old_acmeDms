const express = require("express");
const multer = require("multer");
const router = express.Router();
const path = require("path");
const FileUpload = require("../models/fileupload");
const Folder = require("../models/folder");
const winston = require("winston");
const uploadfiledoctype = require("../models/uploadfilesdoctype");
const { Op, where } = require("sequelize");
const Guest = require("../models/link_sharing/linksharing");
const Guestsignup = require("../models/link_sharing/guestsignup");
// const db = require("../util/mongodb");
const { Sequelize } = require("sequelize");

const folder = require("../models/folder");
const loggs = require("../models/logsdetails/alllogs");
const User = require("../models/add_user");
const app = express();
const bodyParser = require("body-parser");
const middleware = require("../middleware/authorization");
const jwt = require("jsonwebtoken");
// const loggs  = require('../models/logsdetails/alllogs')
const Workspace = require("../models/add_workspace");
const RecycleBin = require("../models/recycle");
const Policy = require("../models/policies/policy");

// Middleware for parsing the request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
let obj_id;
// const sub_folder = require("../models/subfolder");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const { GridFsStorage } = require("multer-gridfs-storage");
router.use(bodyParser.json());
const url = `${process.env.URI}`;
const { ObjectId } = require("mongodb");
const workspace = require("../models/add_workspace");
const Redis = require("ioredis");
const {extractClientIP} = require("../middleware/clientIp")
router.use(extractClientIP);

// const redisClient = new Redis({
//   host: '127.0.0.1', // Default: '127.0.0.1'
//   port: 6379,               // Default: 6379
// })

// Connect to MongoDB
mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

// Create GridFS stream for file operations
const conn = mongoose.connection;
let gfs;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Set up Multer storage engine using GridFS
const storage = new GridFsStorage({
  url: url,
  file: (req, file) => {
    console.log(file, "___++filename");
    return {
      filename: file.originalname,
    };
  },
});

const upload = multer({ storage });

//checking user and workspace_quota
const checkFileSize = async (req, res, next) => {
  // console.log(req.decodedToken, "____decodedtoken1,i m here**");
  const user_id = req.decodedToken.user.id;
  const email = req.decodedToken.user.username;

  let fileExtension = req.query.fileExtension;

  const parts = req.query.q.split(",");
  const fileSize = parts[0] / 1024;

  let user_type = await User.findOne({
    where: {
      email: email,
    },
  });

  if (user_type.user_type === "User") {
    const user_policy = await Policy.findOne({
      where: {
        selected_users: {
          [Op.contains]: [email],
        },
      },
    });
    if (!user_policy) {
      return res
        .status(400)
        .send({ message: "You are not allowed to upload file" });
    }
    if (user_policy.dataValues.properties_name.length <= 0) {
      return res
        .status(400)
        .send({ message: "You are not allowed to upload file" });
    } else if (
      !user_policy.dataValues.properties_name.includes(fileExtension)
    ) {
      return res.status(400).send({
        message: `You are not Allowed to upload ${fileExtension} file`,
      });
    } else {
      req.user_policy = user_policy.dataValues.no_of_versions;
      req.versions = user_policy.dataValues.versions;
      req.Bandwidth_min_max = user_policy.dataValues.Bandwidth_min_max;
      req.file_size = parseInt(parts[0]);
      // console.log(req.user_policy,"____________user_policy")
    }
  }

  const workspace_names = parts[1];
  const workspace_namew = await Workspace.findOne({
    where: {
      workspace_name: workspace_names,
    },
  });
  const maxquotaworkspace = workspace_namew.quota;
  const userFileswork = await FileUpload.findAll({
    where: {
      workspace_name: workspace_names,
      is_recyclebin: "false",
    },
  });
  let userFileSizework = 0;
  for (const file of userFileswork) {
    userFileSizework += parseInt(file.file_size) / 1024;
  }

  if (userFileSizework + fileSize > maxquotaworkspace) {
    return res.status(400).json({
      message: `Workspace ${workspace_names} Quota Exceeded.`,
    });
  }

  const demail = await User.findOne({
    where: {
      id: user_id,
    },
  });
  // console.log(demail,"____eff")
  let guest_data = await Guestsignup.findOne({ where: { email: email } });

  if (!demail && guest_data && guest_data.user_status == "active") {
    next();
  }
  const maxquota = parseInt(demail.max_quota);

  const userFiles = await FileUpload.findAll({
    where: {
      user_id: user_id,
    },
  });
  let userFileSize = 0;

  for (const file of userFiles) {
    userFileSize += parseInt(file.file_size) / 1024;
  }
  if (userFileSize + fileSize > maxquota) {
    return res.status(203).json({
      message: "Quota Exceeded. Contact Site Admin or Upload less MB file.",
    });
  }

  next();
};

function dynamicUploadSpeedLimit(req, res, next) {
  // console.log(new Date,"_________________uploadlimiter enter1")

  const userBandwidthArray = req.Bandwidth_min_max;
  // console.log(userBandwidthArray, "____userBandwidthArray");
  if (userBandwidthArray && userBandwidthArray.length > 0) {
    // Use the first element of the array as the upload speed limit in Mbps
    const userUploadSpeedLimitInMbps = parseFloat(userBandwidthArray[0]); // Use parseFloat to handle decimals

    if (!isNaN(userUploadSpeedLimitInMbps)) {
      // Convert the file size in KB to bits
      const fileSizeInKB = req.file_size;
      // console.log(fileSizeInKB, "_fileSizeKb");
      const fileSizeInBits = fileSizeInKB * 8 * 1024; // KB to bits

      // console.log(fileSizeInBits, "_______________fileSizeInBits");

      const requiredSpeedInBitsPerSecond =
        userUploadSpeedLimitInMbps * (8 * 1024 * 1024);
      const desiredTimeInSeconds =
        fileSizeInBits / requiredSpeedInBitsPerSecond;

      let limiterTime = Math.floor(desiredTimeInSeconds);

      // Custom middleware to introduce a delay
      // const uploadLimiter = (req, res, next) => {
      //   setTimeout(() => {
      //     console.log("________uploaded_by_defined_speed_Limit.")
      //     next();

      //   }, limiterTime ); // Convert seconds to milliseconds
      // };

      const uploadLimiter = (req, res, next) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            // console.log("________uploaded_by_defined_speed_Limit.")
            resolve();
          }, limiterTime);
        }).then(() => next());
      };

      // Calculate the desired time in seconds based on the user's speed
      // const requiredSpeedInBitsPerSecond =
      //   userUploadSpeedLimitInMbps * (8 * 1024 * 1024);
      // const desiredTimeInSeconds =
      //   fileSizeInBits / requiredSpeedInBitsPerSecond;

      // let limiterTime = Math.floor(desiredTimeInSeconds);
      // console.log(limiterTime, "___limiter");
      // Convert the user's speed from Mbps to bytes per second (B/s)
      // const userUploadSpeedLimitInBytesPerSecond =
      //   userUploadSpeedLimitInMbps * (125 * 1024); // Assuming 1 Mbps = 125 KB/s

      // const uploadLimiter = rateLimit({
      //   windowMs: limiterTime, // 1 second
      //   max: userUploadSpeedLimitInBytesPerSecond,
      //   message: "Upload speed limit exceeded",
      // });

      // Pass the desired time in seconds to the route handler if needed
      req.desiredTimeInSeconds = desiredTimeInSeconds;

      uploadLimiter(req, res, next);
    } else {
      next(); // If the first element is not a valid number, proceed without rate limiting
    }
  } else {
    next(); // If the array is empty or not present, proceed without rate limiting
  }
}

// const uploadLimiter = async (req, res, next) => {
//   try {
//     const userId = getUserId(req);
//     const delayKey = `delay:user:${userId}`;

//     const delayTimestamp = await redisClient.get(delayKey);
//     const currentTime = Date.now();

//     if (!delayTimestamp || currentTime >= parseInt(delayTimestamp)) {
//       // No delay or delay has passed, proceed with the request

//       // Simulate an upload delay (you can replace this with your actual upload logic)
//       // For example, you might save the file to disk, process it, etc.
//       await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds delay

//       next();
//     } else {
//       // Delay has not passed, respond with a message
//       return res.status(429).send('Upload delay in progress');
//     }
//   } catch (error) {
//     console.error('Redis error:', error);
//     return res.status(500).send('Internal Server Error');
//   }
// };

router.post(
  "/uploadcreate",
  middleware,
  checkFileSize,
  dynamicUploadSpeedLimit,
  upload.any(),
  async (req, res) => {
    // upload.any()
    // const fileSize = req.query.q
    // console.log(req.body.files,"___filebody")

    // const token = req.header("Authorization");
    // // console.log(token,"____toevsdvsdsvs")~
    // const decodedToken = jwt.verify(token, "acmedms");
    const user_id = req.decodedToken.user.id;
    const user_email = req.decodedToken.user.username;
    const clientIP = req.clientIP

    // console.log(new Date(), "date_time_of_controllere");

    // const uploadSpeedMbps = await getNetworkUploadSpeed();

    //   console.log(uploadSpeedMbps, "__________________uploadSpeedMbps");

    //   if (uploadSpeedMbps !== null && uploadSpeedMbps < 1) {
    //     return res
    //       .status(200)
    //       .json({ message: "Download speed is less than 1 Mbps" });
    //   }

    let guest_id;
    const user_type1 = await User.findOne({ where: { id: user_id } });
    let user_type;
    if (!user_type1) {
      guest_id = await Guestsignup.findOne({ where: { id: user_id } });
      // guest_id = user_id
    } else {
      user_type = user_type1.user_type;
    }

    // console.log(req.body.data,"newdata")
    const worksapce_namesf = JSON.parse(req.body.data);
    // const fileSize = (worksapce_namesf.file_Size)/1024
    // console.log(fileSize,"filesize________________")
    // console.log(worksapce_namesf,"_______booo")
    const workspace_names = worksapce_namesf.workspace_name;
    // console.log(workspace_names,"__work")

    const file = req.files;
    if (file.length == 0) {
      return res
        .status(400)
        .send({ message: "Please choose a file to upload." });
    }

    const filedataw = file[0].size / 1024;
    const demail = await User.findOne({
      where: {
        id: user_id,
      },
    });
    // console.log(demail,"____eff")
    let maxquota;
    if (demail) {
      maxquota = demail.max_quota;
    }

    // const userFiles = await FileUpload.findAll({
    //     where: {
    //         user_id: user_id

    //     }
    // });
    //     let userFileSize = 0;
    //     for (const file of userFiles) {
    //         userFileSize +=parseInt( file.file_size)/1024;
    //     }
    //     console.log(userFileSize,maxquota,"___filesize*****")
    //  if((userFileSize+fileSize)>maxquota){
    //   return res.status(203).json({message:"Quota Exceeded. Contact Site Admin or Upload less MB file."})
    //  }

    // console.log(user_id,"IIIIvjnjvsd")

    // console.log(file,"fileinapi")
    obj_id = file[0].id.toString();
    //  console.log(obj_id,"mongoiddes")
    // async function getmongoid(obj_id){
    //   return obj_id;
    // }

    const data = JSON.parse(req.body.data);
    // console.log(data, "____data_________-");
    // console.log(data.Feilds_Name,"datat")
    const Fields_Name = data.Feilds_Name;
    const modifiedFields = {};
    Object.keys(Fields_Name).forEach((key, index) => {
      modifiedFields["field" + (index + 1)] = Fields_Name[key];
    });
    // console.log(modifiedFields);
    // console.log(filed_name,"resultrssv")
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const {
        file_size,
        file_type,
        folder_id,
        workspace_name,
        doctype,
        parent_id,
        policies_id,
        fileDesc,
        workspace_type,
        workspace_id,
      } = JSON.parse(req.body.data);
      const fileData1 = req.files[0];
      const file_name = fileData1.originalname;
      const extension = file_name.split(".").pop();
      const filed_name = req.body.Fields_Name;
      if (user_type === "User") {
        let level_file = folder_id ? "1" : "0";
        const filesWithSameName = await FileUpload.findAll({
          where: {
            file_name: file_name,
            folder_id: folder_id || null,
            levels: level_file,
            user_type: "User",
            // workspace_name: workspace_name,
            is_recyclebin: "false",
          },
        });

        if (filesWithSameName.length > 0) {
          if (
            req.versions === "false" &&
            filesWithSameName[0].file_name === file_name
          ) {
            return res
              .status(404)
              .send({ message: `${file_name}, Already Exist.` });
          }

          if (filesWithSameName.length >= req.user_policy) {
            return res.status(400).send({
              message: `You can upload up to ${req.user_policy} versions.`,
            });
          }
        }
      }

      if (folder_id) {
        const user_id1 = user_type1 ? user_type1.id : null;
        const guest_id_value = guest_id ? guest_id.id : null;

        // const uploaddocmetadata = await uploadfiledoctype.create({
        //   user_id: user_type1?.id || null,
        //   guest_id: guest_id?.id || null,
        //   file_name: file_name,
        //   doctype: doctype,
        //   field1: modifiedFields ? modifiedFields.field1 : null,
        //   field2: modifiedFields ? modifiedFields.field2 : null,
        //   field3: modifiedFields ? modifiedFields.field3 : null,
        //   field4: modifiedFields ? modifiedFields.field4 : null,
        //   field5: modifiedFields ? modifiedFields.field5 : null,
        //   field6: modifiedFields ? modifiedFields.field6 : null,
        //   field7: modifiedFields ? modifiedFields.field7 : null,
        //   field8: modifiedFields ? modifiedFields.field8 : null,
        //   field9: modifiedFields ? modifiedFields.field9 : null,
        //   field10: modifiedFields ? modifiedFields.field10 : null,
        // });

        // const fileData = req.files[0].buffer;

        // const fileDatastr = req.files[0].str;
        // console.log(fileDatastr,"____________filedatass")
        // Assuming only one file is uploade
        // const extension = file_name.split('.').pop();
        const data1 = file[0].size;
        const newFile = await FileUpload.create({
          levels: 1,
          filemongo_id: obj_id,
          user_id: user_type1?.id || null,
          guest_id: guest_id_value?.id || null,
          file_name: file_name,
          file_size: data1,
          file_type: extension,
          time_stamp: Date.now(),
          doc_type: doctype,
          policies_id: policies_id,
          folder_id: folder_id,
          workspace_name: workspace_name,
          workspace_id: workspace_id,
          file_description: fileDesc,
          workspace_type: workspace_type,
          user_type: user_type || "guest",
          is_recyclebin: "false",
        });

        const uploaddocmetadata = await uploadfiledoctype.create({
          user_id: user_id1,
          guest_id: guest_id_value,
          file_name: file_name,
          file_id: newFile.id,
          doctype: doctype,
          field1: modifiedFields ? modifiedFields.field1 : null,
          field2: modifiedFields ? modifiedFields.field2 : null,
          field3: modifiedFields ? modifiedFields.field3 : null,
          field4: modifiedFields ? modifiedFields.field4 : null,
          field5: modifiedFields ? modifiedFields.field5 : null,
          field6: modifiedFields ? modifiedFields.field6 : null,
          field7: modifiedFields ? modifiedFields.field7 : null,
          field8: modifiedFields ? modifiedFields.field8 : null,
          field9: modifiedFields ? modifiedFields.field9 : null,
          field10: modifiedFields ? modifiedFields.field10 : null,
        });

        let uploadedBy;
        if (newFile.guest_id && newFile.user_id === null) {
          uploadedBy = "By Guest";
        } else {
          uploadedBy = "By User";
        }
        const loggsfolder = await loggs.create({
          // user_id: (demail && demail.email) || null,
          // guest_id: decodedToken.user.username || null,
          user_id: (demail && demail.email) || req.decodedToken.user.username,
          category: "Upload",
          action: ` File Uploaded : ${file_name} ${uploadedBy}`,
          timestamp: Date.now(),
          system_ip: clientIP,
        });

        return res
          .status(200)
          .json({ message: "File Upload Successfully", newFile });
      } else {
        // const fileData = req.files[0].buffer; // Assuming only one file is uploaded
        // const fileBlob = new Blob([fileData], { type: req.files[0].mimetype });
        //  const fileUrl = URL.createObjectURL(fileBlob);
        //  console.log(fileUrl,"_fileurl")

        const data1 = file[0].size;
        const newFile = await FileUpload.create({
          levels: 0,
          user_id: user_id,
          filemongo_id: obj_id,
          file_name: file_name,
          file_size: data1,
          file_type: extension,
          doc_type: doctype,
          time_stamp: Date.now(),
          folder_id: folder_id,
          policies_id: policies_id,
          workspace_name: workspace_name,
          workspace_id: workspace_id,
          file_description: fileDesc,
          workspace_type: workspace_type,
          user_type: user_type,
          is_recyclebin: "false",
        });
        const uploaddocmetadata = await uploadfiledoctype.create({
          user_id: user_id,
          doctype: doctype,
          file_name: file_name,
          file_id: newFile.id,
          field1: modifiedFields ? modifiedFields.field1 : null,
          field2: modifiedFields ? modifiedFields.field2 : null,
          field3: modifiedFields ? modifiedFields.field3 : null,
          field4: modifiedFields ? modifiedFields.field4 : null,
          field5: modifiedFields ? modifiedFields.field5 : null,
          field6: modifiedFields ? modifiedFields.field6 : null,
          field7: modifiedFields ? modifiedFields.field7 : null,
          field8: modifiedFields ? modifiedFields.field8 : null,
          field9: modifiedFields ? modifiedFields.field9 : null,
          field10: modifiedFields ? modifiedFields.field10 : null,
        });
        const loggsfolder = await loggs.create({
          user_id: demail.email,
          category: "Upload",
          action: `File Uploaded By User : ${file_name}`,
          timestamp: Date.now(),
          system_ip: clientIP,
        });
        return res
          .status(200)
          .json({ message: "File Upload Successfully", newFile });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message });
    }
  }
);

router.post("/createfolder", middleware, upload.none(), async (req, res) => {
  try {
    // const token = req.header("Authorization");
    // const decodedToken = jwt.verify(token, "acmedms");
    const clientIP = req.clientIP

    const email = req.decodedToken.user.username;
    let user_id;
    let guest_id;

    const user_details = await User.findOne({ where: { email: email } });
    // const user = await User.findOne({ where: { email: email } });
    if (user_details) {
      user_id = user_details.id;
    } else {
      guest_id = req.decodedToken.user.id;
    }

    // let user_id;
    // // let guest_id;
    // // if(id){
    //  user_id = id.id;
    // // }else{
    // //   guest_id = await Guestsignup.findOne({where: {id:decodedToken.user.id}})
    // // }

    // console.log(guest_id, "_________guestId")
    // const guest_id = await
    let {
      folder_name,
      folder_id,
      workspace_name,
      workspace_type,
      workspace_id,
      policies_id,
    } = req.body;

    let levels;

    if (folder_id) {
      // Find the folder with the provided folder_id
      const parentFolder = await Folder.findOne({ where: { id: folder_id } });
      if (!parentFolder) {
        return res.status(404).json({ message: "Parent folder not found." });
      }

      // Increment the level of the parent folder by 1
      levels = parentFolder.levels + 1;

      let folder_check = await Folder.findOne({
        where: {
          is_recycle: "false",
          levels: levels,
          workspace_name: workspace_name,
          folder_name: {
            [Op.iLike]: folder_name, // Use Op.iLike for case-insensitive search
          },
        },
      });

      if (folder_check) {
        return res.status(400).send({ message: "Folder Already Exists" });
      }

      const folder = await Folder.create({
        user_id: user_id || null,
        guest_id: guest_id || null,
        workspace_id: workspace_id,
        folder_name: folder_name,
        levels: levels,
        parent_id: folder_id,
        time_stamp: Date.now(),
        workspace_name: workspace_name,
        workspace_type: workspace_type,
        policies_id: policies_id,
        is_recycle: "false",
      });
      // logger.info(`sub-Folder created: ${folder_name}`);
      const loggsfolder = await loggs.create({
        user_id: email,
        category: "Create",
        action: `Folder Created : ${folder_name}`,
        timestamp: Date.now(),
        system_ip: clientIP,
      });
      return res
        .status(201)
        .send({ message: "SUB_Folder created successfully.", folder });
    } else {
      let folder_check = await Folder.findOne({
        where: {
          levels: 0,
          is_recycle: "false",
          workspace_name: workspace_name,
          folder_name: {
            [Op.iLike]: folder_name, // Use Op.iLike for case-insensitive search
          },
        },
      });

      if (folder_check) {
        return res.status(400).send({ message: "Folder Already Exists" });
      }

      const folder = await Folder.create({
        user_id: user_id,
        workspace_id: workspace_id,
        folder_name: folder_name,
        levels: 0,
        parent_id: 0,
        time_stamp: Date.now(),
        workspace_name: workspace_name,
        workspace_type: workspace_type,
        policies_id: policies_id,
        is_recycle: "false",
      });
    }

    const loggsfolder = await loggs.create({
      user_id: email,
      category: "Create",
      action: `Folder Created : ${folder_name}`,
      timestamp: Date.now(),
      system_ip: clientIP,
    });
    // console.log(loggsfolder,"loggs")
    return res
      .status(201)
      .json({ message: "Folder Created Successfully.", folder });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error creating folder:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});
router.post("/getfoldernames", middleware, async (req, res) => {
  try {
    const { workspace_name, workspace_id } = req.body;
    const clientIP = req.clientIP

    const workspace_type1 = await Workspace.findOne({
      where: { workspace_name: workspace_name },
    });
    if (!workspace_type1) {
      console.log("work_space not found");
    }
    let workspace_type = workspace_type1.workspace_type;

    const id = parseInt(req.body.parent_id);
    const levels = parseInt(req.body.levels);
    // const token = req.header("Authorization");
    // const decodedToken = jwt.verify(token, "acmedms");
    const user_id = req.decodedToken.user.id;

    async function FolderAndFilesSize(folders) {
      async function calculateFolderSize(folder, totalSize) {
        const files = await FileUpload.findAll({
          where: {
            is_recyclebin: "false",
            folder_id: folder.id,
          },
        });

        for (const file of files) {
          totalSize += parseInt(file.file_size);
        }

        const childFolders = await Folder.findAll({
          where: {
            is_recycle: "false",
            parent_id: folder.id,
          },
        });

        for (const childFolder of childFolders) {
          totalSize = await calculateFolderSize(childFolder, totalSize);
        }

        folder.dataValues.folder_size = totalSize;
        return totalSize;
      }

      for (let folder of folders) {
        let totalSize = 0;
        totalSize = await calculateFolderSize(folder, totalSize);
      }
    }

    // async function addSharedInfo(object, sharedData) {
    //   const find_user_data = await User.findOne({
    //     where: {
    //       id: object.dataValues.user_id,
    //     },
    //   });
    //   const user_type = find_user_data.user_type;
    //   object.dataValues.user_type = user_type;
    //   const user_email = find_user_data.email;
    //   object.dataValues.user_email = user_email;
    //   // console.log(object.dataValues,"______________find_user_data223")

    //   const sharedInfo = {
    //     shared_by: [],
    //     share_with: [],
    //   };

    //   // sharedData.forEach(async (data) => {
    //     for(let data of sharedData){
    //     let guest_approved = await Guest.findOne({
    //       where: {
    //         folder_id: data.folder_id,
    //       },
    //       attributes: ["is_approved1", "is_approved2"],
    //     });
    //     if(!guest_approved){
    //       break;
    //     }
    //     // console.log(guest_approved,"__________guest_approved")
    //     if (data.folder_id === object.id) {
    //       sharedInfo.shared_by.push(data.shared_by);
    //       if (
    //         guest_approved.is_approved1 === "true" &&
    //         guest_approved.is_approved2 === "true"
    //       ) {
    //         sharedInfo.share_with.push(data.guest_email || data.user_email);
    //       } else if (
    //         guest_approved.is_approved1 === "true" &&
    //         guest_approved.is_approved2 === "false"
    //       ) {
    //         sharedInfo.share_with.push("L1 has approved and L2 is pending");
    //       } else if (
    //         guest_approved.is_approved2 === "true" &&
    //         guest_approved.is_approved1 === "false"
    //       ) {
    //         sharedInfo.share_with.push("L2 has approved and L1 is pending ");
    //       } else {
    //         if (guest_approved.is_approved1 === "false") {
    //           sharedInfo.share_with.push("L1 is pending");
    //         } else if (guest_approved.is_approved1 === "denied") {
    //           sharedInfo.share_with.push("L1 has Declined");
    //         }

    //         if (guest_approved.is_approved2 === "false") {
    //           sharedInfo.share_with.push("L2 is pending");
    //         } else if (guest_approved.is_approved2 === "denied") {
    //           sharedInfo.share_with.push("L2 has Declined");
    //         }
    //       }
    //       object.dataValues.expiry_date = data.expiry_date;
    //     } else if (data.file_id === object.id) {
    //       sharedInfo.shared_by.push(data.shared_by);
    //       if (
    //         guest_approved.is_approved1 === "true" &&
    //         guest_approved.is_approved2 === "true"
    //       ) {
    //         sharedInfo.share_with.push(data.guest_email || data.user_email);
    //       } else if (
    //         guest_approved.is_approved1 === "true" &&
    //         guest_approved.is_approved2 === "false"
    //       ) {
    //         sharedInfo.share_with.push("L1 has approved and L2 is pending");
    //       } else if (
    //         guest_approved.is_approved2 === "true" &&
    //         guest_approved.is_approved1 === "false"
    //       ) {
    //         sharedInfo.share_with.push("L2 has approved and L1 is pending ");
    //       } else {
    //         if (guest_approved.is_approved1 === "false") {
    //           sharedInfo.share_with.push("L1 is pending");
    //         } else if (guest_approved.is_approved1 === "denied") {
    //           sharedInfo.share_with.push("L1 has Declined");
    //         }

    //         if (guest_approved.is_approved2 === "false") {
    //           sharedInfo.share_with.push("L2 is pending");
    //         } else if (guest_approved.is_approved2 === "denied") {
    //           sharedInfo.share_with.push("L2 has Declined");
    //         }
    //       }
    //       // sharedInfo.share_with.push(data.guest_email);
    //       object.dataValues.expiry_date = data.expiry_date;
    //     }
    //   // });
    // }

    //   // Assign the arrays to the object.dataValues
    //   object.dataValues.shared_by = sharedInfo.shared_by;
    //   object.dataValues.share_with = sharedInfo.share_with;
    // }

    // async function check_user_type(object) {
    //   const find_user_data = await User.findOne({
    //     where: {
    //       id: object.dataValues.user_id,
    //     },
    //   });
    //   const user_type = find_user_data.user_type;
    //   object.dataValues.user_type = user_type;
    //   const user_email = find_user_data.email;
    //   object.dataValues.user_email = user_email;
    // }

    if (id && levels) {
      const folder_name = await Folder.findOne({
        where: {
          id: id,
          workspace_name: workspace_name,
          [Op.or]: [
            { workspace_type: workspace_type },
            { workspace_type: "Guest" },
          ],
        },
        attributes: ["folder_name", "id"],
      });

      const folders = await Folder.findAll({
        where: {
          levels: levels,
          parent_id: id,
          // user_id:user_id,
          workspace_name: workspace_name,
          [Op.or]: [
            { workspace_type: workspace_type },
            { workspace_type: "Guest" },
          ],
          // workspace_id: workspace_id,
          // workspace_type: workspace_type,
          is_recycle: "false",
        },
      });

      // const find_user_data = await User.findOne({
      //   where: {
      //     id: user_id,
      //   },
      // });
      // const guest_data = await Guest.findAll();
      // Define a function to add sharedBy and shareWith to an object
      // async function addSharedInfo(object, sharedData) {
      //   const find_user_data = await User.findOne({
      //     where: {
      //       id: object.dataValues.user_id,
      //     },
      //   });
      //   const user_type = find_user_data.user_type;
      //   object.dataValues.user_type = user_type;
      //   const user_email = find_user_data.email;
      //   object.dataValues.user_email = user_email;
      //   // console.log(object.dataValues,"______________find_user_data223")

      //   const sharedInfo = {
      //     shared_by: [],
      //     share_with: [],
      //   };

      //   sharedData.forEach(async (data) => {
      //     let guest_approved = await Guest.findOne({
      //       where: {
      //         folder_id: data.folder_id,
      //       },
      //       attributes: ["is_approved1", "is_approved2"],
      //     });
      //     // console.log(guest_approved,"__________guest_approved")
      //     if (data.folder_id === object.id) {
      //       sharedInfo.shared_by.push(data.shared_by);
      //       if (
      //         guest_approved.is_approved1 === "true" &&
      //         guest_approved.is_approved2 === "true"
      //       ) {
      //         sharedInfo.share_with.push(data.guest_email || data.user_email);
      //       } else if (
      //         guest_approved.is_approved1 === "true" &&
      //         guest_approved.is_approved2 === "false"
      //       ) {
      //         sharedInfo.share_with.push("L1 has approved and L2 is pending");
      //       } else if (
      //         guest_approved.is_approved2 === "true" &&
      //         guest_approved.is_approved1 === "false"
      //       ) {
      //         sharedInfo.share_with.push("L2 has approved and L1 is pending ");
      //       } else {
      //         if (guest_approved.is_approved1 === "false") {
      //           sharedInfo.share_with.push("L1 is pending");
      //         } else if (guest_approved.is_approved1 === "denied") {
      //           sharedInfo.share_with.push("L1 has Declined");
      //         }

      //         if (guest_approved.is_approved2 === "false") {
      //           sharedInfo.share_with.push("L2 is pending");
      //         } else if (guest_approved.is_approved2 === "denied") {
      //           sharedInfo.share_with.push("L2 has Declined");
      //         }
      //       }
      //       object.dataValues.expiry_date = data.expiry_date;
      //     } else if (data.file_id === object.id) {
      //       sharedInfo.shared_by.push(data.shared_by);
      //       if (
      //         guest_approved.is_approved1 === "true" &&
      //         guest_approved.is_approved2 === "true"
      //       ) {
      //         sharedInfo.share_with.push(data.guest_email || data.user_email);
      //       } else if (
      //         guest_approved.is_approved1 === "true" &&
      //         guest_approved.is_approved2 === "false"
      //       ) {
      //         sharedInfo.share_with.push("L1 has approved and L2 is pending");
      //       } else if (
      //         guest_approved.is_approved2 === "true" &&
      //         guest_approved.is_approved1 === "false"
      //       ) {
      //         sharedInfo.share_with.push("L2 has approved and L1 is pending ");
      //       } else {
      //         if (guest_approved.is_approved1 === "false") {
      //           sharedInfo.share_with.push("L1 is pending");
      //         } else if (guest_approved.is_approved1 === "denied") {
      //           sharedInfo.share_with.push("L1 has Declined");
      //         }

      //         if (guest_approved.is_approved2 === "false") {
      //           sharedInfo.share_with.push("L2 is pending");
      //         } else if (guest_approved.is_approved2 === "denied") {
      //           sharedInfo.share_with.push("L2 has Declined");
      //         }
      //       }
      //       // sharedInfo.share_with.push(data.guest_email);
      //       object.dataValues.expiry_date = data.expiry_date;
      //     }
      //   });
      //   // Assign the arrays to the object.dataValues
      //   object.dataValues.shared_by = sharedInfo.shared_by;
      //   object.dataValues.share_with = sharedInfo.share_with;
      // }

      // async function addSharedInfo(object, sharedData) {
      //   const userId = object.dataValues.user_id;

      //   const findUserData = await User.findOne({
      //     where: {
      //       id: userId,
      //     },
      //   });

      //   const user_type = findUserData.user_type;
      //   object.dataValues.user_type = user_type;
      //   const user_email = findUserData.email;
      //   object.dataValues.user_email = user_email;

      //   const sharedInfo = {
      //     shared_by: [],
      //     share_with: [],
      //   };

      //   const sharedDataMap = new Map();

      //   await Promise.all(
      //     sharedData.map(async (data) => {
      //       const guestApproved = await Guest.findOne({
      //         where: {
      //           folder_id: data.folder_id,
      //         },
      //         attributes: ["is_approved1", "is_approved2"],
      //       });

      //       const sharedWith = [];

      //       if (data.folder_id === object.id || data.file_id === object.id) {
      //         sharedInfo.shared_by.push(data.shared_by);

      //         if (guestApproved.is_approved1 === "true" && guestApproved.is_approved2 === "true") {
      //           sharedWith.push(data.guest_email || data.user_email);
      //         } else if (guestApproved.is_approved1 === "true" && guestApproved.is_approved2 === "false") {
      //           sharedWith.push("L1 has approved and L2 is pending");
      //         } else if (guestApproved.is_approved2 === "true" && guestApproved.is_approved1 === "false") {
      //           sharedWith.push("L2 has approved and L1 is pending");
      //         } else {
      //           if (guestApproved.is_approved1 === "false") {
      //             sharedWith.push("L1 is pending");
      //           } else if (guestApproved.is_approved1 === "denied") {
      //             sharedWith.push("L1 has Declined");
      //           }

      //           if (guestApproved.is_approved2 === "false") {
      //             sharedWith.push("L2 is pending");
      //           } else if (guestApproved.is_approved2 === "denied") {
      //             sharedWith.push("L2 has Declined");
      //           }
      //         }

      //         object.dataValues.expiry_date = data.expiry_date;
      //       }

      //       sharedDataMap.set(data.shared_by, sharedWith);
      //     })
      //   );

      //   // Combine share_with arrays into a single array
      //   sharedDataMap.forEach((sharedWith) => {
      //     sharedInfo.share_with = sharedInfo.share_with.concat(sharedWith);
      //   });

      //   // Assign the arrays to the object.dataValues
      //   object.dataValues.shared_by = sharedInfo.shared_by;
      //   object.dataValues.share_with = sharedInfo.share_with;
      // }

      // Apply the function to folders
      // folders.forEach(async (folder) => {
      //   await addSharedInfo(folder, guest_data);
      // });

      const files = await FileUpload.findAll({
        where: {
          folder_id: folder_name.id,
          workspace_name: workspace_name,
          [Op.or]: [
            { workspace_type: workspace_type },
            { workspace_type: "Guest" },
          ],
          is_recyclebin: "false",
        },
        attributes: [
          "id",
          "user_id",
          "file_name",
          "file_type",
          "file_size",
          "updatedAt",
          "createdAt",
          "time_stamp",
          "levels",
          "filemongo_id",
          "user_type",
          "folder_id",
          "workspace_type",
          "workspace_name",
          "workspace_id",
          "doc_type",
        ],
      });

      let latestFiles = [];

      const filesByName = {};

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { file_name, time_stamp } = file;

        if (
          !filesByName[file_name] ||
          time_stamp > filesByName[file_name].time_stamp
        ) {
          filesByName[file_name] = file;
        }
      }

      // Extract the latest files from the object and push them to the `latestFiles` array
      // for (const fileName in filesByName) {
      //   const count = files.filter((f) => f.file_name === fileName).length;
      //   filesByName[fileName].dataValues.versions = count > 1;
      //   latestFiles.push(filesByName[fileName]);
      // }

      for (const fileName in filesByName) {
        const count = files.filter((f) => f.file_name === fileName).length;
        filesByName[fileName].dataValues.versions = count > 1;
        filesByName[fileName].dataValues.versionCount =
          count > 1 ? count - 1 : 0;
        latestFiles.push(filesByName[fileName]);
      }

      // Apply the function to files (assuming you have a 'files' array)
      // latestFiles.forEach(async (file) => {
      //   await addSharedInfo(file, guest_data);
      //   console.log(file,"___filefromloop11")
      // });
      // await Promise.all(
      //   latestFiles.map(async (file) => {
      //     await addSharedInfo(file, guest_data);
      //     // console.log(file, "___filefromloop11");
      //   })
      // );

      // latestFiles.map(async (file) => {
      //   await check_user_type(file);
      //   // console.log(file, "___filefromloop11");
      // });

      // folders.forEach(async (folder) => {
      //   await check_user_type(folder);
      // });

      // Create an array of user IDs to fetch
      const userIdsToFetch = [
        ...latestFiles.map((file) => file.user_id),
        ...folders.map((folder) => folder.user_id),
      ];

      // Use a single query to fetch user data for all user IDs
      const userMap = new Map();
      const users = await User.findAll({
        where: {
          id: userIdsToFetch,
        },
      });

      // Populate the userMap for quick access
      users.forEach((user) => {
        userMap.set(user.id, user);
      });

      // Now, you can update your objects with user data from the userMap
      // latestFiles.forEach(async (file) => {
      //   const user = userMap.get(file.user_id);
      //   if (user) {
      //     file.dataValues.user_type = user.user_type;
      //     file.dataValues.user_email = user.email;
      //   }
      // });

      for (const file of latestFiles) {
        const user = userMap.get(file.user_id);
        if (user) {
          file.dataValues.user_type = user.user_type;
          file.dataValues.user_email = user.email;
        }

        let doc_types = await uploadfiledoctype.findOne({
          where: {
            file_id: file.id,
          },
          attributes: [
            "doctype",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7",
            "field8",
            "field9",
            "field10",
          ],
        });

        if (doc_types) {
          file.dataValues.doc_details = doc_types.dataValues;
        } else {
          file.dataValues.doc_details = {};
        }

        const update_loggs = await loggs.findOne({
          where: {
            file_id: file.id,
          },
          attributes: ["user_id", "createdAt"],
          order: [["timestamp", "DESC"]],
        });
        let storedUpdateLoggs; // Variable to store the value

        if (update_loggs) {
          // Store a copy of update_loggs in the variable
          storedUpdateLoggs = { ...update_loggs.dataValues };
          file.dataValues.update_loggs = storedUpdateLoggs;
        } else {
          file.dataValues.update_loggs = {};
        }
      }

      folders.forEach(async (folder) => {
        const user = userMap.get(folder.user_id);
        if (user) {
          folder.dataValues.user_type = user.user_type;
          folder.dataValues.user_email = user.email;
        }
        const update_loggs = await loggs.findOne({
          where: {
            folder_id: folder.id,
          },
          attributes: ["user_id", "createdAt"],
          order: [["timestamp", "DESC"]],
        });
        let storedUpdateLoggs; // Variable to store the value

        if (update_loggs) {
          storedUpdateLoggs = { ...update_loggs.dataValues };
          folder.dataValues.update_loggs = storedUpdateLoggs;
        } else {
          folder.dataValues.update_loggs = {};
        }
      });

      await FolderAndFilesSize(folders);

      return res.status(200).json({ folders, files: latestFiles });
    } else {
      const files = await FileUpload.findAll({
        where: {
          levels: "0",
          workspace_name: workspace_name,
          workspace_id: workspace_id,
          workspace_type: workspace_type,
          is_recyclebin: "false",
        },
        attributes: [
          "id",
          "user_id",
          "file_name",
          "file_type",
          "file_size",
          "folder_id",
          "time_stamp",
          "levels",
          "updatedAt",
          "createdAt",
          "filemongo_id",
          "user_type",
          "workspace_type",
          "workspace_id",
          "workspace_name",
          "doc_type",
        ],
      });
      let folders = await Folder.findAll({
        where: {
          levels: "0",
          workspace_name: workspace_name,
          workspace_type: workspace_type,
          workspace_id: workspace_id,
          is_recycle: "false",
        },
      });

      // const guest_data = await Guest.findAll();

      // async function addSharedInfo(object, sharedData) {
      //   console.log(object, "____objectd");
      //   const find_user_data = await User.findOne({
      //     where: {
      //       id: object.dataValues.user_id,
      //     },
      //   });
      //   // console.log(find_user_data,"______________find_user_data1")

      //   const user_type = find_user_data.user_type;
      //   object.dataValues.user_type = user_type;
      //   const user_email = find_user_data.email;
      //   object.dataValues.user_email = user_email;

      //   const sharedInfo = {
      //     shared_by: [],
      //     share_with: [],
      //   };
      //   sharedData.forEach(async (data) => {
      //     let guest_approved = await Guest.findOne({
      //       where: {
      //         folder_id: data.folder_id,
      //       },
      //       attributes: ["is_approved1", "is_approved2"],
      //     });
      //     if (data.folder_id === object.id) {
      //       sharedInfo.shared_by.push(data.shared_by);
      //       // sharedInfo.share_with.push(data.guest_email);
      //       if (
      //         guest_approved.is_approved1 === "true" &&
      //         guest_approved.is_approved2 === "true"
      //       ) {
      //         sharedInfo.share_with.push(data.guest_email || data.user_email);
      //       } else if (
      //         guest_approved.is_approved1 === "true" &&
      //         guest_approved.is_approved2 === "false"
      //       ) {
      //         sharedInfo.share_with.push("L1 has approved and L2 is pending");
      //       } else if (
      //         guest_approved.is_approved2 === "true" &&
      //         guest_approved.is_approved1 === "false"
      //       ) {
      //         sharedInfo.share_with.push("L2 has approved and L1 is pending ");
      //       } else {
      //         if (guest_approved.is_approved1 === "false") {
      //           sharedInfo.share_with.push("L1 is pending");
      //         } else if (guest_approved.is_approved1 === "denied") {
      //           sharedInfo.share_with.push("L1 has Declined");
      //         }

      //         if (guest_approved.is_approved2 === "false") {
      //           sharedInfo.share_with.push("L2 is pending");
      //         } else if (guest_approved.is_approved2 === "denied") {
      //           sharedInfo.share_with.push("L2 has Declined");
      //         }
      //       }

      //       object.dataValues.expiry_date = data.expiry_date;
      //     } else if (data.file_id === object.id) {
      //       sharedInfo.shared_by.push(data.shared_by);
      //       // sharedInfo.share_with.push(data.guest_email);
      //       if (
      //         guest_approved.is_approved1 === "true" &&
      //         guest_approved.is_approved2 === "true"
      //       ) {
      //         sharedInfo.share_with.push(data.guest_email || data.user_email);
      //       } else if (
      //         guest_approved.is_approved1 === "true" &&
      //         guest_approved.is_approved2 === "false"
      //       ) {
      //         sharedInfo.share_with.push("L1 has approved and L2 is pending");
      //       } else if (
      //         guest_approved.is_approved2 === "true" &&
      //         guest_approved.is_approved1 === "false"
      //       ) {
      //         sharedInfo.share_with.push("L2 has approved and L1 is pending ");
      //       } else {
      //         if (guest_approved.is_approved1 === "false") {
      //           sharedInfo.share_with.push("L1 is pending");
      //         } else if (guest_approved.is_approved1 === "denied") {
      //           sharedInfo.share_with.push("L1 has Declined");
      //         }

      //         if (guest_approved.is_approved2 === "false") {
      //           sharedInfo.share_with.push("L2 is pending");
      //         } else if (guest_approved.is_approved2 === "denied") {
      //           sharedInfo.share_with.push("L2 has Declined");
      //         }
      //       }
      //       object.dataValues.expiry_date = data.expiry_date;
      //     }
      //   });
      //   // Assign the arrays to the object.dataValues
      //   object.dataValues.shared_by = sharedInfo.shared_by;
      //   object.dataValues.share_with = sharedInfo.share_with;
      // }

      let latestFiles = [];

      const filesByName = {};

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { file_name, time_stamp } = file;

        if (
          !filesByName[file_name] ||
          time_stamp > filesByName[file_name].time_stamp
        ) {
          filesByName[file_name] = file;
        }
      }

      // Extract the latest files from the object and push them to the `latestFiles` array
      // for (const fileName in filesByName) {
      //   const count = files.filter((f) => f.file_name === fileName).length;
      //   filesByName[fileName].dataValues.versions = count > 1;
      //   latestFiles.push(filesByName[fileName]);
      // }

      for (const fileName in filesByName) {
        const count = files.filter((f) => f.file_name === fileName).length;
        filesByName[fileName].dataValues.versions = count > 1;
        filesByName[fileName].dataValues.versionCount =
          count > 1 ? count - 1 : 0;
        latestFiles.push(filesByName[fileName]);
      }

      // latestFiles.forEach(async (file) => {
      //   await addSharedInfor(file, guest_data);
      // });

      // await Promise.all(
      //   latestFiles.map(async (file) => {
      //     await addSharedInfo(file, guest_data);
      //   })
      // );
      // latestFiles.map(async (file) => {
      //   await check_user_type(file);
      //   // console.log(file, "___filefromloop11");
      // });
      // folders.forEach(async (folder) => {
      //   await check_user_type(folder);
      // });

      // Create an array of user IDs to fetch
      const userIdsToFetch = [
        ...latestFiles.map((file) => file.user_id),
        ...folders.map((folder) => folder.user_id),
      ];

      // Use a single query to fetch user data for all user IDs
      const userMap = new Map();
      const users = await User.findAll({
        where: {
          id: userIdsToFetch,
        },
      });

      // Populate the userMap for quick access
      users.forEach((user) => {
        userMap.set(user.id, user);
      });

      // Now, you can update your objects with user data from the userMap
      // latestFiles.forEach((file) => {
      //   const user = userMap.get(file.user_id);
      //   if (user) {
      //     file.dataValues.user_type = user.user_type;
      //     file.dataValues.user_email = user.email;
      //   }
      // });

      for (let file of latestFiles) {
        const user = userMap.get(file.user_id);
        if (user) {
          file.dataValues.user_type = user.user_type;
          file.dataValues.user_email = user.email;
        }

        let doc_types = await uploadfiledoctype.findOne({
          where: {
            file_id: file.id,
          },
          attributes: [
            "doctype",
            "field1",
            "field2",
            "field3",
            "field4",
            "field5",
            "field6",
            "field7",
            "field8",
            "field9",
            "field10",
          ],
        });

        if (doc_types) {
          file.dataValues.doc_details = doc_types.dataValues;
        } else {
          file.dataValues.doc_details = {};
        }
        let update_loggs = await loggs.findOne({
          where: {
            file_id: file.id,
          },
          attributes: ["user_id", "createdAt"],
          order: [["timestamp", "DESC"]],
        });
        let storedUpdateLoggs; // Variable to store the value

        if (update_loggs) {
          // Store a copy of update_loggs in the variable
          storedUpdateLoggs = { ...update_loggs.dataValues };
          file.dataValues.update_loggs = storedUpdateLoggs;
        } else {
          file.dataValues.update_loggs = {};
        }
      }

      folders.forEach(async (folder) => {
        const user = userMap.get(folder.user_id);
        if (user) {
          folder.dataValues.user_type = user.user_type;
          folder.dataValues.user_email = user.email;
        }
        const update_loggs = await loggs.findOne({
          where: {
            folder_id: folder.id,
          },
          attributes: ["user_id", "createdAt"],
          order: [["timestamp", "DESC"]],
        });
        let storedUpdateLoggs; // Variable to store the value

        if (update_loggs) {
          // Store a copy of update_loggs in the variable
          storedUpdateLoggs = { ...update_loggs.dataValues };
          folder.dataValues.update_loggs = storedUpdateLoggs;
        } else {
          folder.dataValues.update_loggs = {};
        }
      });

      await FolderAndFilesSize(folders);
      return res.status(200).json({ folders, files: latestFiles });
    }
  } catch (error) {
    console.error("Error retrieving folder names:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.post("/getteamspace", middleware, async (req, res) => {
  try {
    const { workspace_name, workspace_id } = req.body;
    const workspace = await Workspace.findOne({
      where: { workspace_name: workspace_name },
    });
    if (!workspace) {
      console.log("work_space not found");
    }
    let workspace_type = workspace.workspace_type;
    const id = parseInt(req.body.parent_id);
    const levels = parseInt(req.body.levels);
    // const token = req.header("Authorization");
    // if (!token) {
    //   return res.status(400).send("enter token");
    // }
    // const decodedToken = jwt.verify(token, "acmedms");
    // console.log(decodedToken, "________decodedtoken");
    const userEmail = req.decodedToken.user.username;
    const user_id = req.decodedToken.user.id;

    let share_folder_and_files = await Guest.findAll({
      where: {
        user_email: userEmail,
        shared_workspace_name: workspace_name,
        is_approved1: "true",
        is_approved2: "true",
      },
    });
    let user_details = await User.findOne({
      where: {
        email: userEmail,
      },
    });
    let folders = [];
    let files = [];

    async function FolderAndFilesSize(folders) {
      async function calculateFolderSize(folder, totalSize) {
        const files = await FileUpload.findAll({
          where: {
            is_recyclebin: "false",
            folder_id: folder.id,
          },
        });

        for (const file of files) {
          totalSize += parseInt(file.file_size);
        }

        const childFolders = await Folder.findAll({
          where: {
            is_recycle: "false",
            parent_id: folder.id,
          },
        });

        for (const childFolder of childFolders) {
          totalSize = await calculateFolderSize(childFolder, totalSize);
        }

        folder.dataValues.folder_size = totalSize;
        return totalSize;
      }

      for (let folder of folders) {
        let totalSize = 0;
        totalSize = await calculateFolderSize(folder, totalSize);
      }
    }

    if (id && levels) {
      const folder_name = await Folder.findOne({
        where: {
          id: id,
          workspace_name: workspace_name,
        },
        attributes: ["folder_name"],
      });

      folders = await Folder.findAll({
        where: {
          levels: levels,
          parent_id: id,
          workspace_name: workspace_name,
          is_recycle: "false",
        },
      });

      files = await FileUpload.findAll({
        where: {
          folder_id: folder_name.id,
          workspace_name: workspace_name,
          is_recyclebin: "false",
        },
        attributes: [
          "id",
          "user_id",
          "file_name",
          "file_type",
          "file_size",
          "updatedAt",
          "filemongo_id",
          "user_type",
          "folder_name",
        ],
      });
    } else {
      if (
        workspace.selected_users.includes(userEmail) &&
        workspace.workspace_type === "TeamSpace" &&
        workspace.workspace_name == workspace_name
      ) {
        for (const item of share_folder_and_files) {
          let expiry_check;
          if (item.dataValues.expiry_date) {
            const dateFromDatabase = new Date(item.expiry_date);
            const timestampInMilliseconds = dateFromDatabase.getTime();
            expiry_check = timestampInMilliseconds > Date.now();
          }

          if (
            item.folder_id &&
            (expiry_check === true || item.dataValues.expiry_date === null)
          ) {
            const folderName = await Folder.findOne({
              where: {
                id: item.folder_id,
                // workspace_name:workspace_name,
                is_recycle: "false",
              },
            });
            if (folderName) {
              folderName.dataValues.expiry_date = item.expiry_date;
              folders.push(folderName);
            }
          }
          if (
            item.file_id &&
            (expiry_check === true || item.dataValues.expiry_date === null)
          ) {
            const fileName = await FileUpload.findOne({
              where: {
                id: item.file_id,
                // workspace_name:workspace_name,
                is_recyclebin: "false",
              },
            });

            if (fileName) {
              fileName.dataValues.expiry_date = item.expiry_date;
              files.push(fileName);
            }
          }
        }
      } else {
        if (user_details.dataValues.user_type === "Admin") {
          files = await FileUpload.findAll({
            where: {
              levels: "0",
              workspace_name: workspace_name,
              workspace_id: workspace_id,
              workspace_type: workspace_type,
              is_recyclebin: "false",
            },
            attributes: [
              "id",
              "file_name",
              "file_type",
              "file_size",
              "updatedAt",
              "filemongo_id",
              "user_type",
              "workspace_type",
            ],
          });
          folders = await Folder.findAll({
            where: {
              levels: "0",
              workspace_name: workspace_name,
              workspace_type: workspace_type,
              workspace_id: workspace_id,

              is_recycle: "false",
            },
          });
          let share_folder_and_files = await Guest.findAll({
            where: {
              shared_workspace_name: workspace_name,
            },
          });
          // console.log(share_folder_and_files,"____share_folder_and_files")
          for (const item of share_folder_and_files) {
            let expiry_check;
            if (item.dataValues.expiry_date) {
              const dateFromDatabase = new Date(item.expiry_date);
              const timestampInMilliseconds = dateFromDatabase.getTime();
              expiry_check = timestampInMilliseconds > Date.now();
            }

            if (
              item.folder_id &&
              (expiry_check === true || item.dataValues.expiry_date === null)
            ) {
              const folderName = await Folder.findOne({
                where: {
                  id: item.folder_id,
                  // workspace_name:workspace_name,
                  is_recycle: "false",
                },
              });
              if (folderName) {
                folderName.dataValues.expiry_date = item.expiry_date;
                folders.push(folderName);
              }
            }
            if (
              item.file_id &&
              (expiry_check === true || item.dataValues.expiry_date === null)
            ) {
              const fileName = await FileUpload.findOne({
                where: {
                  id: item.file_id,
                  // workspace_name:workspace_name,
                  is_recyclebin: "false",
                },
              });

              if (fileName) {
                fileName.dataValues.expiry_date = item.expiry_date;
                files.push(fileName);
              }
            }
          }
        }
      }

      if (user_details.dataValues.user_type === "User") {
        let user_files = await FileUpload.findAll({
          where: {
            levels: "0",
            user_id: user_id,
            workspace_name: workspace_name,
            workspace_id: workspace_id,
            is_recyclebin: "false",
          },
          attributes: [
            "id",
            "user_id",
            "file_name",
            "file_type",
            "file_size",
            "updatedAt",
            "filemongo_id",
            "user_type",
            "workspace_type",
          ],
        });
        let user_folders = await Folder.findAll({
          where: {
            levels: "0",
            user_id: user_id,
            workspace_name: workspace_name,
            workspace_id: workspace_id,
            is_recycle: "false",
          },
        });
        folders.push(...user_folders);
        files.push(...user_files);
      }
    }

    // const find_user_data = await User.findOne({
    //   where: {
    //     id: user_id,
    //   },
    // });

    async function addSharedInfo(object, sharedData) {
      const find_user_data = await User.findOne({
        where: {
          id: object.dataValues.user_id,
        },
      });
      const user_type = find_user_data.user_type;
      object.dataValues.user_type = user_type;
      const user_email = find_user_data.email;
      object.dataValues.user_email = user_email;

      const sharedInfo = {
        shared_by: [],
        share_with: [],
      };
      sharedData.forEach(async (data) => {
        let guest_approved = await Guest.findOne({
          where: {
            folder_id: data.folder_id,
          },
          attributes: ["is_approved1", "is_approved2"],
        });
        if (data.folder_id === object.id && data.shared_by === userEmail) {
          sharedInfo.shared_by.push(data.shared_by);
          if (
            guest_approved.is_approved1 === "true" &&
            guest_approved.is_approved2 === "true"
          ) {
            sharedInfo.share_with.push(data.guest_email || data.user_email);
          } else if (
            guest_approved.is_approved1 === "true" &&
            guest_approved.is_approved2 === "false"
          ) {
            sharedInfo.share_with.push("L1 has approved and L2 is pending");
          } else if (
            guest_approved.is_approved2 === "true" &&
            guest_approved.is_approved1 === "false"
          ) {
            sharedInfo.share_with.push("L2 has approved and L1 is pending ");
          } else {
            if (guest_approved.is_approved1 === "false") {
              sharedInfo.share_with.push("L1 is pending");
            } else if (guest_approved.is_approved1 === "denied") {
              sharedInfo.share_with.push("L1 has Declined");
            }

            if (guest_approved.is_approved2 === "false") {
              sharedInfo.share_with.push("L2 is pending");
            } else if (guest_approved.is_approved2 === "denied") {
              sharedInfo.share_with.push("L2 has Declined");
            }
          }
          // console.log(data,"___________________sharedData")
          object.dataValues.expiry_date = data.expiry_date;
        } else if (data.file_id === object.id && data.shared_by === userEmail) {
          sharedInfo.shared_by.push(data.shared_by);
          // sharedInfo.share_with.push(data.guest_email);
          if (
            guest_approved.is_approved1 === "true" &&
            guest_approved.is_approved2 === "true"
          ) {
            sharedInfo.share_with.push(data.guest_email || data.user_email);
          } else if (
            guest_approved.is_approved1 === "true" &&
            guest_approved.is_approved2 === "false"
          ) {
            sharedInfo.share_with.push("L1 has approved and L2 is pending");
          } else if (
            guest_approved.is_approved2 === "true" &&
            guest_approved.is_approved1 === "false"
          ) {
            sharedInfo.share_with.push("L2 has approved and L1 is pending ");
          } else {
            if (guest_approved.is_approved1 === "false") {
              sharedInfo.share_with.push("L1 is pending");
            } else if (guest_approved.is_approved1 === "denied") {
              sharedInfo.share_with.push("L1 has Declined");
            }

            if (guest_approved.is_approved2 === "false") {
              sharedInfo.share_with.push("L2 is pending");
            } else if (guest_approved.is_approved2 === "denied") {
              sharedInfo.share_with.push("L2 has Declined");
            }
          }
          object.dataValues.expiry_date = data.expiry_date;
        }
      });
      object.dataValues.shared_by = sharedInfo.shared_by;
      object.dataValues.share_with = sharedInfo.share_with;
    }
    const guest_data = await Guest.findAll();

    folders.forEach(async (folder) => {
      await addSharedInfo(folder, guest_data);
    });

    files.forEach(async (file) => {
      await addSharedInfo(file, guest_data);
    });

    await FolderAndFilesSize(folders);
    return res.status(200).json({ folders, files });
  } catch (error) {
    return res.status(500).send({ status: false, message: "Server Error" });
  }
});

router.post("/getallversions", middleware, async (req, res) => {
  try {
    let { file_name, folder_id } = req.body;
    let all_version_file;

    const excludeDocumentWithGreatestTimestamp = async (all_version_files) => {
      if (all_version_files.length > 1) {
        const documentWithGreatestTimestamp = all_version_files.reduce(
          (prev, current) => {
            return prev.timestamp > current.timestamp ? prev : current;
          }
        );

        const filteredFiles = all_version_files.filter(
          (file) => file !== documentWithGreatestTimestamp
        );

        return filteredFiles;
      }

      return all_version_files; // No need to exclude if there's only one document
    };

    // Usage

    if (folder_id) {
      let all_file = await FileUpload.findAll({
        where: {
          levels: "1",
          file_name: file_name,
          folder_id: folder_id,
          is_recyclebin: "false",
        },
      });
      all_version_file = await excludeDocumentWithGreatestTimestamp(all_file);
    } else {
      let all_file = await FileUpload.findAll({
        where: {
          levels: "0",
          file_name: file_name,
          is_recyclebin: "false",
        },
      });
      all_version_file = await excludeDocumentWithGreatestTimestamp(all_file);
    }

    for (let file of all_version_file) {
      let userDetails = null;

      if (file.dataValues.user_id) {
        userDetails = await User.findOne({
          where: {
            id: file.dataValues.user_id,
          },
        });
      } else if (file.dataValues.guest_id) {
        userDetails = await Guestsignup.findOne({
          where: {
            id: file.dataValues.guest_id,
          },
        });
      }

      if (userDetails) {
        file.dataValues.created_by = userDetails.dataValues.email;
      }
    }

    // for (let file of all_version_file) {
    //   let user_details = await User.findOne({
    //     where: {
    //       id: file.dataValues.user_id,
    //     },
    //   });
    //   if(user_details){
    //     file.dataValues.created_by = user_details.dataValues.email;
    //   }
    //   if(!user_details && file.dataValues.guest_id){
    //     let guest_details = await Guestsignup.findOne({
    //       where:{
    //         id:file.dataValues.guest_id
    //       }
    //     })
    //     if(guest_details){
    //     file.dataValues.created_by = guest_details.dataValues.email;
    //     }
    //   }
    // }
    return res.status(200).send({ status: true, all_version_file });
  } catch (error) {
    return res.status(500).send({ status: false, message: "Server Error" });
  }
});

router.post("/filedata", middleware, async (req, res) => {
  // console.log(id,"id__id_dd")
  try {
    // const token = req.header("Authorization");
    // const decodedToken = jwt.verify(token, "acmedms");
    const email = req.decodedToken.user.username;
    const file_id = req.body.filemongo_id;
    const clientIP = req.clientIP


    const filesCollection = conn.collection("fs.chunks");
    const file = await filesCollection.findOne({
      files_id: new ObjectId(file_id),
    });
    // console.log(file.data.buffer,"_____filesvds")
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    await FileUpload.findAll({
      where: {
        filemongo_id: file_id,
      },
      attributes: ["file_type", "user_id", "file_name"],
    })
      .then((files) => {
        const obj = {};
        if (files && files.length > 0) {
          // Extract data from the files array (assuming you want the first item)
          const fileData = files[0].dataValues;
          obj.newdata = fileData;
          const loggsfolder = loggs.create({
            user_id: email,
            category: "View",
            action: `View : ${fileData.file_name}`,
            timestamp: Date.now(),
            system_ip: clientIP,
          });
          // console.log(file.data.buffer);
          obj.file_data = file.data.buffer;
        }
        return res.status(200).json(obj);
      })
      .catch((err) => {
        return res
          .status(500)
          .json({ message: "An error occurred while retrieving file names." });
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while retrieving file names." });
  }
});

router.post("/deletefile", middleware, async (req, res) => {
  // const recycle = req.body.recycle
  // const noofdays = req.body.noofdays
  const chunksCollection = conn.collection("fs.chunks");
  const filesCollection = conn.collection("fs.files");
  const id = req.body.id;
  const clientIP = req.clientIP

  let fileq = await FileUpload.findOne({
    where: {
      id: id,
    },
  });
  try {
    // const token = req.header("Authorization");
    // // console.log(token,"____deletetoken")
    // const decodedToken = jwt.verify(token, "acmedms");
    const email = req.decodedToken.user.username;
    const user_id = req.decodedToken.user.id;
    // console.log(email,")************************email")
    // const id = await User.findOne({where:{email:email}})
    // const user_id = id.id

    const folderdata = await Folder.findOne({ where: { id: id } });
    const file = req.body.file;
    const user_type = await User.findOne({
      where: {
        id: user_id,
      },
      attributes: ["user_type"],
    });

    async function deleteFolderAndFiles(folder) {
      // Find and update files in the current folder
      const files = await FileUpload.findAll({
        where: {
          is_recyclebin: "false",
          user_id: folder.user_id,
          folder_id: folder.id,
        },
      });

      for (const file of files) {
        await file.update({
          is_recyclebin: "true",
          deleted_at: Math.floor(Date.now() / 1000),
        });
      }

      // Find and process child folders
      const childFolders = await Folder.findAll({
        where: {
          is_recycle: "false",
          user_id: folder.user_id,
          parent_id: folder.id,
        },
      });

      for (const childFolder of childFolders) {
        await deleteFolderAndFiles(childFolder);
      }

      // Update the current folder
      await folder.update({
        is_recycle: "true",
        deleted_at: Math.floor(Date.now() / 1000),
      });
    }

    async function updateFilesToDelete_all_versions(id) {
      const delete_file_by_id_check = await FileUpload.findOne({
        where: {
          id: id,
        },
      });

      if (delete_file_by_id_check) {
        const filesToUpdate = await FileUpload.findAll({
          where: {
            file_name: delete_file_by_id_check.file_name,
            levels: delete_file_by_id_check.levels,
            workspace_name: delete_file_by_id_check.workspace_name,
            folder_id: delete_file_by_id_check.folder_id,
          },
        });

        if (filesToUpdate && filesToUpdate.length > 0) {
          const updateData = {
            is_recyclebin: "true",
            deleted_at: Math.floor(Date.now() / 1000),
          };

          for (const fileToUpdate of filesToUpdate) {
            await fileToUpdate.update(updateData);
          }
        }
      }
    }

    // To use the function:
    // updateFilesToDelete_all_versions(yourIdValue);

    if (user_type.user_type === "Admin") {
      if (file) {
        // await FileUpload.update(
        //   // console.log("inside") STORING deleted_At in SECONDs
        //   { is_recyclebin: "true", deleted_at: Math.floor(Date.now() / 1000) },
        //   { where: { id: id } }
        // );

        await updateFilesToDelete_all_versions(id);

        const loggsfolder = await loggs.create({
          user_id: email,
          category: "Delete",
          action: `File Moved to RecycelBin : ${fileq.file_name}`,
          timestamp: Date.now(),
          system_ip: clientIP,
        });
        return res.status(200).json({ message: "file delete Successfully" });
      } else {
        // Update the folder to mark it as "recycle"
        const [no_of_rows] = await Folder.update(
          { is_recycle: "true", deleted_at: Math.floor(Date.now() / 1000) },
          { where: { id: id } }
        );

        if (no_of_rows === 0) {
          return res.status(404).json({ message: "Folder not found" });
        }

        // Find the initial folder
        const initial_updatedFolder = await Folder.findOne({
          where: { id: id },
        });
        // Example usage:
        await deleteFolderAndFiles(initial_updatedFolder);
        const loggsfolder = await loggs.create({
          user_id: email,
          category: "Delete",
          action: `Folder Moved to RecycelBin : ${initial_updatedFolder.folder_name}`,
          timestamp: Date.now(),
          system_ip: clientIP,
        });
      }
      return res.status(200).json({ message: "folder deleted successfully" });
    } else {
      // const recycle = await Policy.findOne({
      //   where: {
      //     selected_users: {
      //       [Op.contains]: [email],
      //     },
      //   },
      // });

      // const no_of_days = recycle.no_of_days;
      // if (recycle) {
      try {
        if (file) {
          await updateFilesToDelete_all_versions(id);

          const loggsfolder = await loggs.create({
            user_id: email,
            category: "Delete",
            action: `File Moved to RecycelBin : ${fileq.file_name}`,
            timestamp: Date.now(),
            system_ip: clientIP,
          });
          return res.status(200).json({ message: "file delete Successfully." });
        } else {
          const initial_updatedFolder = await Folder.findOne({
            where: { id: id },
          });
          await deleteFolderAndFiles(initial_updatedFolder);
          const loggsfolder = await loggs.create({
            user_id: email,
            category: "Delete",
            action: `Folder Moved to RecycelBin : ${initial_updatedFolder.folder_name}`,
            timestamp: Date.now(),
            system_ip: clientIP,
          });
          return res
            .status(200)
            .send({ message: " folder deleted Successfully." });
        }
      } catch (error) {
        return res.status(500).json({ message: "Server Error." });
      }
      // } else {
      //   if (file) {
      //     fileq = await FileUpload.findOne({
      //       where: {
      //         id: id,
      //       },
      //     });
      //     const file_id = fileq.filemongo_id;

      //     const deletedChunks = await chunksCollection.deleteMany({
      //       files_id: new ObjectId(file_id),
      //     });
      //     const deletedFile = await filesCollection.deleteOne({
      //       _id: new ObjectId(file_id),
      //     });
      //     if (
      //       deletedChunks.deletedCount === 0 &&
      //       deletedFile.deletedCount === 0
      //     ) {
      //       return res.status(404).json({ message: "File not found" });
      //     }
      //     await FileUpload.destroy({
      //       where: {
      //         id: id,
      //       },
      //     }).then(async () => {
      //       const loggsfolder = await loggs.create({
      //         user_id: email,
      //         category: "Delete",
      //         action: `File Deleted : ${fileq.file_name}`,
      //         timestamp: Date.now(),
      //         system_ip: "10.10.0.8",
      //       });
      //       return res
      //         .status(200)
      //         .json({ message: "File Delete Successfully" });
      //     });
      //   } else {
      //     await folder
      //       .destroy({
      //         where: {
      //           id: id,
      //         },
      //       })
      //       .then(() => {
      //         folder
      //           .destroy({
      //             where: {
      //               parent_id: id,
      //             },
      //           })
      //           .then(async () => {
      //             const loggsfolder = await loggs.create({
      //               user_id: email,
      //               category: "Delete",
      //               action: `Folder Deleted : ${folderdata.folder_name}`,
      //               timestamp: Date.now(),
      //               system_ip: "10.10.0.8",
      //             });
      //             return res
      //               .status(200)
      //               .json({ message: "Folder Delete Sucessfully" });
      //           });
      //       })
      //       .catch(() => {
      //         return res.status(500).json({ message: "server error" });
      //       });
      //   }
      // }
    }
  } catch (error) {
    return res.status(500).json({ message: "server error" });
  }
});

router.post("/getrecycle", middleware, async (req, res) => {
  // const token = req.header("Authorization");
  // const decodedToken = jwt.verify(token, "acmedms");
  const user_id = req.decodedToken.user.id;

  try {
    let data = [];
    const user_type = await User.findOne({
      where: {
        id: user_id,
      },
      attributes: ["user_type"],
    });

    function recycleData(recycle) {
      const idSet = new Set(recycle.map((item) => item.id));
      const result = [];

      for (let i = 0; i < recycle.length; i++) {
        const obj = recycle[i];

        if (!idSet.has(obj.parent_id)) {
          result.push(obj);
        }
      }
      return result;
    }

    async function FolderAndFilesSize(folders) {
      async function calculateFolderSize(folder, totalSize) {
        const files = await FileUpload.findAll({
          where: {
            is_recyclebin: "true",
            folder_id: folder.id,
          },
        });

        for (const file of files) {
          totalSize += parseInt(file.file_size);
        }

        const childFolders = await Folder.findAll({
          where: {
            is_recycle: "true",
            parent_id: folder.id,
          },
        });

        for (const childFolder of childFolders) {
          totalSize = await calculateFolderSize(childFolder, totalSize);
        }

        folder.dataValues.folder_size = totalSize;
        return totalSize;
      }

      for (let folder of folders) {
        let totalSize = 0;
        totalSize = await calculateFolderSize(folder, totalSize);
      }
    }

    if (user_type.user_type === "Admin") {
      let all_folder = await Folder.findAll({
        where: {
          is_recycle: "true",
        },
      });

      data = recycleData(all_folder);
      await FolderAndFilesSize(data);

      let fileCheck = await FileUpload.findAll({
        where: {
          is_recyclebin: "true",
        },
      });
      if (fileCheck.length > 0) {
        const folderNamesWithRecycle = new Set(
          all_folder.map((folder) => folder.id)
        );

        for (let i = 0; i < fileCheck.length; i++) {
          const file = fileCheck[i];
          if (!folderNamesWithRecycle.has(file.folder_id)) {
            const correspondingFolder = all_folder.find(
              (folder) => folder.id === file.folder_id
            );
            if (
              !correspondingFolder ||
              (correspondingFolder &&
                correspondingFolder.is_recycle === "false")
            ) {
              const isDuplicate = data.some(
                (existingFile) =>
                  existingFile.file_name === file.file_name &&
                  existingFile.folder_id === file.folder_id
              );
              if (!isDuplicate) {
                data.push(file);
              }
            }
          }
        }
      }
    } else {
      let all_folder = await Folder.findAll({
        where: {
          is_recycle: "true",
          user_id: user_id,
        },
      });
      data = recycleData(all_folder);
      await FolderAndFilesSize(data);

      let fileCheck = await FileUpload.findAll({
        where: {
          is_recyclebin: "true",
          user_id: user_id,
        },
      });
      if (fileCheck.length > 0) {
        const folderNamesWithRecycle = new Set(
          all_folder.map((folder) => folder.id)
        );

        for (let i = 0; i < fileCheck.length; i++) {
          const file = fileCheck[i];
          if (!folderNamesWithRecycle.has(file.folder_id)) {
            const correspondingFolder = all_folder.find(
              (folder) => folder.id === file.folder_id
            );
            if (
              !correspondingFolder ||
              (correspondingFolder &&
                correspondingFolder.is_recycle === "false")
            ) {
              const isDuplicate = data.some(
                (existingFile) =>
                  existingFile.file_name === file.file_name &&
                  existingFile.folder_id === file.folder_id
              );

              if (!isDuplicate) {
                data.push(file);
              }
            }
          }
        }
      }
    }

    return res.status(200).json({ message: "success", data });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
});

router.post("/restore", middleware, async (req, res) => {
  const {
    folder_id,
    file_id,
    workspace_name,
    folder_size,
    file_size,
    user_type,
    file_name,
  } = req.body;
  // const token = req.header("Authorization");
  // const decodedToken = jwt.verify(token, "acmedms");
  const id = req.decodedToken.user.id;
  const email = req.decodedToken.user.username;
  const clientIP = req.clientIP


  let current_size;
  if (folder_id && folder_size) {
    current_size = parseInt(folder_size);
  } else if (file_id && file_size) {
    current_size = parseInt(file_size) / 1024;
  }
  try {
    let work_space = await Workspace.findOne({
      where: { workspace_name: workspace_name },
    });

    let all_file_size = await FileUpload.findAll({
      where: {
        workspace_name: workspace_name,
      },
    });
    let total_file_size = 0;
    for (let i = 0; i < all_file_size.length; i++) {
      if (all_file_size[i].file_size) {
        total_file_size += parseInt(all_file_size[i].file_size) / 1024;
      }
    }
    if (work_space.quota <= total_file_size + current_size) {
      return res.status(400).send({
        message: `You Can Not Restore, ${workspace_name} Quota Is Full`,
      });
    }

    if (file_id) {
      if (user_type === "User") {
        const filesWithSameName = await FileUpload.findAll({
          where: {
            file_name: file_name,
            folder_id: folder_id || null,
            user_type: "User",
            is_recyclebin: "false",
          },
        });
        let users_policy = await Policy.findOne({
          where: {
            selected_users: {
              [Op.contains]: [email],
            },
          },
        });
        if (filesWithSameName.length > 0) {
          if (
            users_policy.versions === "false" &&
            filesWithSameName[0].file_name === file_name
          ) {
            return res
              .status(404)
              .send({ message: `${file_name}, Already Exist.` });
          }

          if (filesWithSameName.length >= users_policy.no_of_versions) {
            return res.status(400).send({
              message: `You have already ${users_policy.no_of_versions} versions.`,
            });
          }
        }
      }

      async function updateFilesToDelete_all_versions(id) {
        const delete_file_by_id_check = await FileUpload.findOne({
          where: {
            id: id,
          },
        });

        if (delete_file_by_id_check) {
          const filesToUpdate = await FileUpload.findAll({
            where: {
              file_name: delete_file_by_id_check.file_name,
              levels: delete_file_by_id_check.levels,
              workspace_name: delete_file_by_id_check.workspace_name,
              folder_id: delete_file_by_id_check.folder_id,
            },
          });

          if (filesToUpdate && filesToUpdate.length > 0) {
            const updateData = {
              is_recyclebin: "false",
              deleted_at: null,
            };

            for (const fileToUpdate of filesToUpdate) {
              await fileToUpdate.update(updateData);
            }
          }
        }
      }
      updateFilesToDelete_all_versions(file_id);
      // let fileRestore = await FileUpload.update(
      //   { is_recyclebin: "false", deleted_at: null },
      //   { where: { is_recyclebin: "true", id: file_id } }
      // );
      const loggsfolder = await loggs.create({
        user_id: email,
        category: "Restore",
        action: `File Restore : ${file_name}`,
        timestamp: Date.now(),
        system_ip: clientIP,
      });
      return res.status(200).json({ message: "file restore Successfully" });
    } else {
      const [no_of_rows] = await Folder.update(
        { is_recycle: "false", deleted_at: null },
        { where: { id: folder_id } }
      );

      if (no_of_rows === 0) {
        return res.status(404).json({ message: "Folder not found" });
      }

      const initial_restoredFolder = await Folder.findOne({
        where: { id: folder_id },
      });

      async function restoreFolderAndFiles(folder) {
        const files = await FileUpload.findAll({
          where: {
            is_recyclebin: "true",
            user_id: folder.user_id,
            folder_id: folder.id,
          },
        });

        for (const file of files) {
          if (user_type === "User") {
            let users_policy = await Policy.findOne({
              where: {
                selected_users: {
                  [Op.contains]: [email],
                },
              },
            });
            if (users_policy.recycle_bin == "false") {
              return res
                .status(400)
                .send({ message: "User do not have recyclebin policy" });
            }
          }
          await file.update({ is_recyclebin: "false", deleted_at: null });
        }

        const childFolders = await Folder.findAll({
          where: {
            is_recycle: "true",
            user_id: folder.user_id,
            parent_id: folder.id,
          },
        });

        for (const childFolder of childFolders) {
          await restoreFolderAndFiles(childFolder);
        }

        await folder.update({ is_recycle: "false", deleted_at: null });
      }

      await restoreFolderAndFiles(initial_restoredFolder);
      const loggsfolder = await loggs.create({
        user_id: email,
        category: "Restore",
        action: `Folder Restore : ${initial_restoredFolder.folder_name}`,
        timestamp: Date.now(),
        system_ip: clientIP,
      });

      return res.status(200).json({ message: "folder restore Successfully" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
});
// deleted restore

router.post("/deleterestore", middleware, async (req, res) => {
  // const token = req.header("Authorization");
  // // console.log(token,"____deletetoken")
  // const decodedToken = jwt.verify(token, "acmedms");
  // const  user_id = 340;
  const file = req.body.file;
  const id = req.body.id;
  const user_id = req.decodedToken.user.id;
  const email = req.decodedToken.user.username;
  const clientIP = req.clientIP

  try {
    if (file) {
      // const fileq = await FileUpload.findOne({
      //   where: {
      //     id: id,
      //   },
      // });
      // console.log(fileq,"_______________fileQ");
      let file_name;

      async function updateFilesToDelete_all_versions(id) {
        const delete_file_by_id_check = await FileUpload.findOne({
          where: {
            id: id,
          },
        });
        file_name = delete_file_by_id_check.file_name;
        if (delete_file_by_id_check) {
          const filesToUpdate = await FileUpload.findAll({
            where: {
              file_name: delete_file_by_id_check.file_name,
              levels: delete_file_by_id_check.levels,
              workspace_name: delete_file_by_id_check.workspace_name,
              folder_id: delete_file_by_id_check.folder_id,
            },
          });

          if (filesToUpdate && filesToUpdate.length > 0) {
            // const updateData = {
            //   is_recyclebin: "false",
            //   deleted_at: null,
            // };

            for (const fileToUpdate of filesToUpdate) {
              const file_id = fileToUpdate.filemongo_id;
              const deletedChunks = await chunksCollection.deleteMany({
                files_id: new ObjectId(file_id),
              });
              const deletedFile = await filesCollection.deleteOne({
                _id: new ObjectId(file_id),
              });
              if (
                deletedChunks.deletedCount === 0 &&
                deletedFile.deletedCount === 0
              ) {
                return res.status(404).json({ message: "File not found" });
              }
              await FileUpload.destroy({
                where: {
                  id: fileToUpdate.id,
                },
              });
              // await fileToUpdate.update(updateData);
            }
          }
        }
      }
      await updateFilesToDelete_all_versions(id);

      // const file_id = fileq.filemongo_id;
      // const deletedChunks = await chunksCollection.deleteMany({
      //   files_id: new ObjectId(file_id),
      // });
      // const deletedFile = await filesCollection.deleteOne({
      //   _id: new ObjectId(file_id),
      // });
      // if (deletedChunks.deletedCount === 0 && deletedFile.deletedCount === 0) {
      //   return res.status(404).json({ message: "File not found" });
      // }
      // await FileUpload.destroy({
      //   where: {
      //     id: id,
      //   },
      // })
      // .then(async () => {
      const loggsfolder = await loggs.create({
        user_id: email,
        category: "Delete",
        action: `File Deleted : ${file_name}`,
        timestamp: Date.now(),
        system_ip: clientIP,
      });
      return res.status(200).json({ message: "file delete Successfully" });
      // });
    } else {
      const initial_delete_folder = await Folder.findOne({
        where: { id: id },
      });
      async function permananet_delete_folder_and_files(folder) {
        const files = await FileUpload.findAll({
          where: {
            is_recyclebin: "true",
            user_id: folder.user_id,
            folder_id: folder.id,
          },
        });
        for (const file of files) {
          await file.destroy();
          let file_id = file.filemongo_id;
          const deletedFile = await filesCollection.deleteOne({
            _id: new ObjectId(file_id),
          });
          const logEntry = await loggs.create({
            user_id: email,
            category: "Delete",
            action: `File Deleted : ${file.file_name}`,
            timestamp: Date.now(),
            system_ip: clientIP,
          });
        }
        const child_folders = await Folder.findAll({
          where: {
            is_recycle: "true",
            user_id: folder.user_id,
            parent_id: folder.id,
          },
        });
        for (const childFolder of child_folders) {
          await permananet_delete_folder_and_files(childFolder);
        }
        await folder.destroy({ where: { id: id } });
      }
      await permananet_delete_folder_and_files(initial_delete_folder);
      await loggs.create({
        user_id: email,
        category: "Delete",
        action: `Folder Deleted : ${initial_delete_folder.folder_name}`,
        timestamp: Date.now(),
        system_ip: clientIP,
      });
      return res.status(200).json({ message: "folder deleted sucessfully" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/metagetproperties", async (req, res) => {
  const file_name = req.body.file_name;
  const doctype = req.body.doctype;
  const Fields_Name = req.body.fieldnames;
  const clientIP = req.clientIP

  const modifiedFields = {};
  Object.keys(Fields_Name).forEach((key, index) => {
    modifiedFields["field" + (index + 1)] = Fields_Name[key];
  });
  try {
    // Check if the record already exists
    const existingRecord = await uploadfiledoctype.findOne({
      where: {
        file_name: file_name,
        doctype: doctype,
      },
    });

    if (existingRecord) {
      return res.status(401).json({
        message:
          "This doctype is already used with this file. Please try another doctype.",
      });
    }

    // Record doesn't exist, create or update it
    const uploaddocmetadata = await uploadfiledoctype.create({
      user_id: 3,
      doctype: doctype,
      file_name: file_name,
      field1: modifiedFields ? modifiedFields.field1 : null,
      field2: modifiedFields ? modifiedFields.field2 : null,
      field3: modifiedFields ? modifiedFields.field3 : null,
      field4: modifiedFields ? modifiedFields.field4 : null,
      field5: modifiedFields ? modifiedFields.field5 : null,
      field6: modifiedFields ? modifiedFields.field6 : null,
      field7: modifiedFields ? modifiedFields.field7 : null,
      field8: modifiedFields ? modifiedFields.field8 : null,
      field9: modifiedFields ? modifiedFields.field9 : null,
      field10: modifiedFields ? modifiedFields.field10 : null,
    });

    return res.status(200).json({
      message: "Properties updated successfully.",
      uploaddocmetadata: uploaddocmetadata[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving properties_names.",
    });
  }
});

const chunksCollection = conn.collection("fs.chunks");
const filesCollection = conn.collection("fs.files");
// const { ThrottleGroup } = require("speed-limiter");
// const throttle = new ThrottleGroup({ rate: 20 * 1024 * 1024 });

// router.post("/downloadfile", middleware, async (req, res) => {
//   try {
//     // const downloadSpeedMbps = await getNetworkDownloadSpeed();

//     // console.log(downloadSpeedMbps, "__________downloadSpeedMbps");

//     // if (downloadSpeedMbps !== null && downloadSpeedMbps < 1) {
//     //   return res
//     //     .status(200)
//     //     .json({ message: "Download speed is less than 1 Mbps" });
//     // }

//     const file_id = req.body.filemongo_id;
//     // console.log(req.body, "___body");
//     // const token = req.header("Authorization");
//     // // console.log(token,"____token fileview")
//     // const decodedToken = jwt.verify(token, "acmedms");
//     const email = req.decodedToken.user.username;
//     // var conn = Mongoose.connection;
//     // let fileId = "mongo id"          // mongo object_id

//     // Require to create object_id
//     // let ObjectID = require("bson-objectid");

//     // javascript content-type utility
//     let mime = require("mime-types");
//     gfs = Grid(conn.db, mongoose.mongo);
//     // let gfs = Grid(conn.db);
//     // find file from fs.files collection
//     let file = await gfs.files.findOne({ _id: new ObjectId(file_id) });
//     if (!file) {
//       return res.status(404).send("File not found");
//     }

//     let contentType = mime.contentType(file.filename);

//     // gridfs connection
//     const gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db);
//     // Download stream data against fileId from fs.chunks collection
//     const downloadStream = gridFSBucket.openDownloadStream(
//       new ObjectId(file_id)
//     );
//     // const throttleStream = throttle.throttle(downloadStream); // Corrected
//     // Download the file as per your framework syntax.
//     // e.g for hapijs we can download like below
//     const loggsfolder = await loggs.create({
//       user_id: email,
//       category: "Download",
//       action: ` File Downloaded : ${file.filename}`,
//       timestamp: Date.now(),
//       system_ip: "10.10.0.8",
//     });
//     res.set({
//       "Content-Type": contentType,
//       "Content-Disposition": `attachment; filename=${file.filename}`,
//     });
//     // console.log( downloadStream.pipe(res,file),"____set")
//     downloadStream.pipe(res);
//     // return throttleStream.pipe(res);
//   } catch (error) {
//     console.log("serverError 1:",error)
//     return res.status(500).send("Server Error");
//   }
// });
const Throttle = require("stream-throttle");

router.post("/downloadfile", middleware, async (req, res) => {
  try {
    const file_id = req.body.filemongo_id;
    const email = req.decodedToken.user.username;
    const clientIP = req.clientIP

    const mime = require("mime-types");
    const gfs = Grid(conn.db, mongoose.mongo);

    const file = await gfs.files.findOne({ _id: new ObjectId(file_id) });
    if (!file) {
      return res.status(404).send("File not found");
    }

    const contentType = mime.contentType(file.filename);

    const gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db);
    const downloadStream = gridFSBucket.openDownloadStream(
      new ObjectId(file_id)
    );

    const loggsfolder = await loggs.create({
      user_id: email,
      category: "Download",
      action: `File Downloaded: ${file.filename}`,
      timestamp: Date.now(),
      system_ip: clientIP,
    });

    // Set response headers
    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename=${encodeURIComponent(
        file.filename
      )}`, // Use encodeURIComponent to handle special characters
    });

    // res.set({
    //   "Content-Type": contentType,
    //   "Content-Disposition": `attachment; filename="${decodeURIComponent(file.filename)}"`,
    // });

    // let policies =await Policy.findOne()
    // Set the desired download speed (e.g., 5 MB/s)
    const user_policy = await Policy.findOne({
      where: {
        selected_users: {
          [Op.contains]: [email],
        },
      },
    });
    if (user_policy) {
      const downloadSpeedMBps = parseInt(user_policy.Bandwidth_min_max[1]);
      const downloadSpeedBytesPerSecond = downloadSpeedMBps * 1024 * 1024;

      // Use the stream-throttle library to control the download speed
      const throttleStream = new Throttle.Throttle({
        rate: downloadSpeedBytesPerSecond,
      });

      // Pipe the throttled download stream to the response
      downloadStream.pipe(throttleStream).pipe(res);
    } else {
      // If no user policy found, download without throttling
      downloadStream.pipe(res);
    }
    // downloadStream.pipe(res);
  } catch (error) {
    console.log("serverError 1:", error);
    return res.status(500).send("Server Error");
  }
});

// router.post('/getdatar', async (req, res) => {
//   const file_id = req.body.id

//   const filesCollection = conn.collection('fs.chunks');
//   const file = await filesCollection.findOne({ files_id: new ObjectId(file_id) });
// console.log(file.data.buffer,"_____filesvds")
//   if (!file) {
//     return res.status(404).json({ message: 'File not found' });
//   }

//   // Send the binary data in the response
//   res.setHeader('Content-Type', file.contentType); // Set the content type of the response
//   res.send(file.data.buffer);
// });
const fs = require("fs");
// const path = require('path');

async function fetchFileContent(filemongo_id) {
  try {
    const filesCollection = conn.collection("fs.chunks");
    const file = await filesCollection.findOne({
      files_id: new ObjectId(filemongo_id),
    });

    if (!file || !file.data) {
      throw new Error(
        `File with ID ${filemongo_id} not found or missing data.`
      );
    }
    return file.data.buffer;
  } catch (error) {
    console.error("Error fetching file content:", error);
    throw error;
  }
}

async function createFoldersRecursively(parentId, basePath = ".") {
  const folder = await Folder.findOne({ where: { id: parentId } });

  if (!folder) {
    return;
  }

  const folderPath = path.join(basePath, folder.folder_name);

  fs.mkdirSync(path.join(folderPath), { recursive: true });

  const subfolders = await Folder.findAll({ where: { parent_id: parentId } });

  for (const subfolder of subfolders) {
    await createFoldersRecursively(subfolder.id, folderPath);
  }

  const folderFiles = await FileUpload.findAll({
    where: {
      folder_id: folder.id,
      workspace_name: folder.workspace_name,
    },
  });

  for (const file of folderFiles) {
    const filePath = path.join(
      folderPath,
      `file_${file.file_name}.${file.file_type}`
    );
    const fileContent = await fetchFileContent(file.filemongo_id);

    fs.writeFileSync(filePath, fileContent);
  }
}

router.post("/downloadfolders", middleware, async (req, res) => {
  const folder_id = req.body.folder_id;
  const folder_size = req.body.folder_size;

  try {
    // Wait for the createFoldersRecursively function to complete
    await createFoldersRecursively(folder_id);

    // Retrieve the folder information from the database
    const Foldername = await Folder.findOne({ where: { id: folder_id } });

    if (!Foldername) {
      console.error("Folder not found in the database.");
      return res.status(404).json({ message: "Folder not found." });
    }

    const folderToZip = path.join(
      `${process.env.DRIVE}`,
      `${process.env.FOLDER_NAME}`,
      `${Foldername.folder_name}`
    );

    // Dynamically set the zip file name based on the folder name
    // const zipFileName = `${Foldername.folder_name}.zip`;
    const zipFileName = "zipped-folder.zip";

    // Create a writable stream for the zip file
    const output = fs.createWriteStream(zipFileName);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Compression level (0 to 9)
    });

    // Listen for archive warnings or errors
    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("File not found:", err.path);
      } else {
        throw err;
      }
    });

    archive.on("error", (err) => {
      console.error("Error creating archive:", err);
      res.status(500).json({ error: "Failed to create the archive." });
    });

    archive.pipe(output);
    archive.directory(folderToZip, false);
    // archive.directory(folderToZip, false, { name: path.relative(baseDir, folderToZip) });

    archive.finalize();

    output.on("close", async () => {
      try {
        const zipFile = fs.readFileSync(zipFileName);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${zipFileName}`
        );

        // Check if there is a matching user policy
        const email = req.decodedToken.user.username;
        const user_policy = await Policy.findOne({
          where: {
            selected_users: {
              [Op.contains]: [email],
            },
          },
        });

        if (user_policy) {
          // Set the desired download speed based on user policy
          const downloadSpeedMBps = parseInt(user_policy.Bandwidth_min_max[1]);
          const downloadSpeedBytesPerSecond = downloadSpeedMBps * 1024 * 1024;
          // Use the stream-throttle library to control the download speed
          const throttleStream = new Throttle.Throttle({
            rate: downloadSpeedBytesPerSecond,
          });

          // Pipe the throttled download stream to the response
          throttleStream.pipe(res);
          throttleStream.end(zipFile);
        } else {
          // If no user policy found, download without throttling
          res.send(zipFile);
        }
        // Delete the folder after the download is complete

        fs.promises.rmdir(folderToZip, { recursive: true, force: true });
        fs.promises.rm(zipFileName);
      } catch (error) {
        console.error("Error sending zip file:", error);
        res
          .status(500)
          .json({ message: "Server error while sending the zip file." });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// router.post("/downloadfolders", async (req, res) => {
//   const folder_id = req.body.folder_id;
//   const Foldername = await Folder.findOne({ where: { id: folder_id } });
//   try {
//     await createFoldersRecursively(folder_id).then(() => {
//       const folderToZip = path.join(
//         "D:",
//         "dms-clone",
//         `${Foldername.folder_name}`
//       );
//       const zipFileName = "zipped-folder.zip";

//       // Create a writable stream for the zip file
//       const output = fs.createWriteStream(zipFileName);
//       // console.log(output,"_____******************")
//       const archive = archiver("zip", {
//         zlib: { level: 9 }, // Compression level (0 to 9)
//       });
//       // console.log(archive,"______archive")
//       // Listen for archive warnings or errors
//       archive.on("warning", (err) => {
//         if (err.code === "ENOENT") {
//           console.warn("File not found:", err.path);
//         } else {
//           throw err;
//         }
//       });

//       archive.on("error", (err) => {
//         res.status(500).send({ error: "Failed to create the archive." });
//       });
//       archive.pipe(output);
//       archive.directory(folderToZip, false);
//       archive.finalize();
//       output.on("close", () => {
//         const zipFile = fs.readFileSync(zipFileName);
//         res.setHeader("Content-Type", "application/zip");
//         res.setHeader(
//           "Content-Disposition",
//           `attachment; filename=${zipFileName}`
//         );
//         res.send(zipFile);
//       });
//     });

//     //   res.status(200).json({ message: 'Folders and files created successfully.' });
//   } catch (error) {
//     return res.status(500).json({ message: "Server error" });
//   }
// });

// const express = require('express');
// const express = require('express');
// const fs = require('fs');
const zlib = require("zlib");
// const path = require('path');

// const express = require('express');
const archiver = require("archiver");
// const fs = require('fs');
// const path = require('path');

router.post("/compress", (req, res) => {
  const folderToZip = path.join(`${process.env.DRIVE}`, `${process.env.FOLDER_NAME}`, "new_created");
  const zipFileName = "zipped-folder.zip";

  // Create a writable stream for the zip file
  const output = fs.createWriteStream(zipFileName);
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Compression level (0 to 9)
  });

  // Listen for archive warnings or errors
  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      console.warn("File not found:", err.path);
    } else {
      throw err;
    }
  });

  archive.on("error", (err) => {
    res.status(500).send({ error: "Failed to create the archive." });
  });
  archive.pipe(output);
  archive.directory(folderToZip, false);
  archive.finalize();
  output.on("close", () => {
    res.download(zipFileName, (err) => {
      if (err) {
        res.status(500).send({ error: "Failed to send the zip file." });
      }

      // Delete the temporary zip file
      // fs.unlinkSync(zipFileName);
    });
  });
});

// const file_ide =  getmongoid

router.post("/cancelfileupload", async (req, res) => {
  try {
    // const id = getmongoid
    // console.log(id,"-diid")
    // const file_id = obj_id
    // // console.log(file_id,"______mongo id")
    // const deletedChunks = await chunksCollection.deleteMany({ files_id: new ObjectId(file_id) });
    // const deletedFile = await filesCollection.deleteOne({ _id: new ObjectId(file_id) });
    // if (deletedChunks.deletedCount === 0 && deletedFile.deletedCount === 0) {
    //   return res.status(404).json({ message: 'File not found' });
    // }
    setTimeout(() => {
      return res.status(200).json({ message: "File Upload canceled" });
    }, 3000);
  } catch (error) {
    return res.status(400).json({ message: "file cancelling error" });
  }
});

router.post("/sharedfile", middleware, async (req, res) => {
  try {
    // console.log(req.body, "___body");
    // const token = req.header("Authorization");
    // const decodedToken = jwt.verify(token, "acmedms");
    const email = req.decodedToken.user.username;
    // const email = "dasf@gmail.com"
    let mergedData = [];

    const guestData = await Guest.findAll({ where: { guest_email: email } });
    if (guestData.length > 0) {
      for (const item of guestData) {
        if (item.file_id) {
          // console.log(item.file_id,"_id")
          const files = await FileUpload.findAll({
            where: { id: item.file_id },
          });
          const filese = files[0].dataValues;
          // console.log(files[0].dataValues,"__files")
          mergedData.push({ ...item.dataValues, filese });
        }
      }
    }
    return res.status(200).json({ mergedData });
  } catch (error) {
    return res.status(500).json({ message: "error in sending shared files" });
  }
});

router.post("/updatefolder", middleware, async (req, res) => {
  const clientIP = req.clientIP

  try {
    let {
      folder_id,
      file_id,
      workspace_name,
      workspace_id,
      new_folder_name,
      new_file_name,
      parent_id,
      levels,
      file_doctype,
    } = req.body;
    const email = req.decodedToken.user.username;

    async function createLog(user_id, category, action, id, type) {
      await loggs.create({
        user_id,
        category,
        action,
        file_id: type === "file" ? id : null,
        folder_id: type === "folder" ? id : null,
        timestamp: Date.now(),
        system_ip: clientIP,
      });
    }

    if (folder_id && !file_id) {
      // let current_folder ;
      Folder.findOne({
        where: {
          id: folder_id,
          is_recycle: "false",
        },
      })
        .then(async (foundRow) => {
          if (foundRow) {
            let current_folder = foundRow.folder_name;
            const updateData = {}; // Initialize an empty object

            if (new_folder_name) {
              updateData.folder_name = new_folder_name;
            }

            // if (levels || workspace_id) {
            //   updateData.levels = levels + 1;
            //   updateData.workspace_id = workspace_id;
            //   updateData.parent_id = parent_id;
            //   updateData.workspace_name = workspace_name;
            // }
            if (levels || workspace_id) {
              updateData.workspace_id = workspace_id;
              updateData.parent_id = parent_id;
              updateData.workspace_name = workspace_name;

              updateData.levels = parent_id !== 0 ? (levels || 0) + 1 : 0;
            }

            if (Object.keys(updateData).length > 0) {
              const updatedRow = await foundRow.update(updateData, {
                where: {
                  id: folder_id,
                },
                returning: true,
              });

              if (updateData.levels || updateData.workspace_id) {
                const updated_folder_parent_id =
                  updatedRow.dataValues.parent_id;
                let moved_folder = await Folder.findOne({
                  where: {
                    id: updated_folder_parent_id,
                  },
                });

                let moveAction_folder =
                  updated_folder_parent_id !== 0
                    ? `Folder Name: ${current_folder}, Moved Inside ${moved_folder.folder_name}`
                    : `Folder Name: ${current_folder}, Moved Outside.`;

                await createLog(
                  email,
                  "Update",
                  moveAction_folder,
                  folder_id,
                  "folder"
                );

                return res
                  .status(200)
                  .send({ message: `${current_folder}, Moved Successfully.` });
              }

              if (new_folder_name) {
                const renameAction_folder = `Folder Name: ${current_folder}, Rename To: ${new_folder_name}.`;
                await createLog(
                  email,
                  "Update",
                  renameAction_folder,
                  folder_id,
                  "folder"
                );
                return res.status(200).send({
                  message: `${current_folder}, Rename To: ${new_folder_name}.`,
                });
              }
            }
          } else {
            console.log("Row not found.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
    if (file_id) {
      FileUpload.findOne({
        where: {
          id: file_id,
        },
      })
        .then(async (foundRow) => {
          if (foundRow) {
            let current_name = foundRow.file_name;
            const current_folder_id = foundRow.folder_id;
            const updateData = {};
            const updateData2 = {};
            if (new_file_name) {
              updateData.file_name = new_file_name;
            }

            if (
              file_doctype &&
              (file_doctype.doctype || file_doctype.file_description)
            ) {
              updateData.doc_type = file_doctype.doctype;
              updateData.file_description = file_doctype.file_description;
            }
            if (levels || workspace_id) {
              updateData.levels = levels || "0";
              updateData.workspace_id = workspace_id;
              updateData.folder_id = folder_id || null;
              updateData.workspace_name = workspace_name;
            }
            if (Object.keys(updateData).length > 0) {
              const whereClause = {};

              if (new_file_name) {
                whereClause.id = file_id;
              } else if (Object.keys(updateData).length > 1) {
                whereClause.file_name = current_name;
                whereClause.folder_id = current_folder_id;
              }

              await FileUpload.update(updateData, {
                where: whereClause,
              });

              if (file_doctype && file_id) {
                let doc_type_data = await uploadfiledoctype.findOne({
                  where: {
                    file_id: file_id,
                  },
                });
                if (!doc_type_data) {
                  return res.status(404).send({ message: "No Doctype Found" });
                }

                if (file_doctype.doctype) {
                  updateData2.doctype = file_doctype.doctype || null;
                  updateData2.field1 = file_doctype.field1 || null;
                  updateData2.field2 = file_doctype.field2 || null;
                  updateData2.field3 = file_doctype.field3 || null;
                  updateData2.field4 = file_doctype.field4 || null;
                  updateData2.field5 = file_doctype.field5 || null;
                  updateData2.field6 = file_doctype.field6 || null;
                  updateData2.field7 = file_doctype.field7 || null;
                  updateData2.field8 = file_doctype.field8 || null;
                  updateData2.field9 = file_doctype.field9 || null;
                  updateData2.field10 = file_doctype.field10 || null;
                } else if (!file_doctype.doctype) {
                  if (file_doctype.field1) {
                    updateData2.field1 = file_doctype.field1;
                  }
                  if (file_doctype.field2) {
                    updateData2.field2 = file_doctype.field2;
                  }
                  if (file_doctype.field3) {
                    updateData2.field3 = file_doctype.field3;
                  }
                  if (file_doctype.field4) {
                    updateData2.field4 = file_doctype.field4;
                  }
                  if (file_doctype.field5) {
                    updateData2.field5 = file_doctype.field5;
                  }
                  if (file_doctype.field6) {
                    updateData2.field6 = file_doctype.field6;
                  }
                  if (file_doctype.field7) {
                    updateData2.field7 = file_doctype.field7;
                  }
                  if (file_doctype.field8) {
                    updateData2.field8 = file_doctype.field8;
                  }
                  if (file_doctype.field9) {
                    updateData2.field9 = file_doctype.field9;
                  }
                  if (file_doctype.field10) {
                    updateData2.field10 = file_doctype.field10;
                  }
                }
                await doc_type_data.update(updateData2, {
                  where: {
                    file_id: file_id,
                  },
                });
                // return res.status(200).send({ message: "Data updated successfully" });
              }

              let level_check = parseInt(updateData.levels);

              if (level_check != 0 && updateData.workspace_id) {
                const folder_details = await Folder.findOne({
                  where: {
                    id: folder_id,
                  },
                });

                const moveAction = `${current_name} Moved Inside ${folder_details.folder_name}.`;
                await createLog(email, "Update", moveAction, file_id, "file");
                if (current_name.length > 10) {
                  current_name = current_name.substring(0, 10) + "...";
                }
                return res
                  .status(200)
                  .send({ message: `${current_name} Moved Successfully.` });
              }

              if (new_file_name || file_doctype) {
                let renameAction;

                if (file_doctype) {
                  renameAction = `Doc Type change ${current_name}.`;
                } else {
                  renameAction = `${current_name} Rename To: ${new_file_name}.`;
                }

                await createLog(email, "Update", renameAction, file_id, "file");

                const message = file_doctype
                  ? `${current_name} Doc Type changed.`
                  : `${current_name} Rename Successfully.`;

                return res.status(200).send({ message });
              }
              if (level_check === 0) {
                const moveOutAction = `${current_name} Moved Outside.`;
                await createLog(
                  email,
                  "Update",
                  moveOutAction,
                  file_id,
                  "file"
                );
                return res
                  .status(200)
                  .send({ message: `${current_name} Moved Successfully.` });
              }
            }
          } else {
            console.log("Row not found.");
          }
        })
        .catch((err) => {
          console.log("Error :", err);
        });
    }
  } catch (error) {
    return res.status(500).send({ message: "Server Error" });
  }
});

const cron = require("node-cron");
const nodemailer = require("nodemailer");

const sendDailyEmail = async (recipients) => {
  try {
    const events = await loggs.findAll({
      where: {
        category: ["Create", "Delete", "Shared", "Auth", "Upload", "Update"],
        timestamp: {
          [Op.gte]: Date.now() - 24 * 60 * 60 * 1000,
        },
      },
    });

    if (events.length === 0) {
      console.log("No events to notify");
      return;
    }
    let emailContent =
      '<table border="1" cellpadding="2" cellspacing="0" style="border-collapse: collapse;">' +
      "<tr>" +
      '<th style="background-color: #FFFFCC;">User</th>' +
      '<th style="background-color: #FFFFCC;">Action</th>' +
      '<th style="background-color: #FFFFCC;">Timestamp</th>' +
      "</tr>";

    for (const event of events) {
      const noTime = parseInt(event.timestamp, 10);

      if (!isNaN(noTime)) {
        const formattedTimestamp = new Date(noTime).toLocaleString();
        emailContent += `
      <tr>
      <td style="padding-left: 5px; padding-right: 5px; font-size: 12.6px;">${event.user_id}</td>
      <td style="padding-left: 5px; padding-right: 5px; font-size: 12.6px;">${event.action}</td>
      <td style="padding-left: 5px; padding-right: 5px; font-size: 12.6px;">${formattedTimestamp}</td>
      </tr>

      `;
      }
    }
    emailContent += "</table>";

    const transporter = nodemailer.createTransport({
      host: `${process.env.HOST_SMTP}`,
      port:`${process.env.PORT_SMTP}`,
      secure: false,
      auth: {
        user: `${process.env.USER_SMTP}`,
        pass: `${process.env.PASS_SMTP}`,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const htmlContent = `
<html>    
<p>Dear Admin,</p>
<p>The following changes have been made in the last 24 hours:</p>
<p>${emailContent}</p>
<p>Regards,</p>
<p>ACME DocHub</p>
</html>`;

    for (const recipient of recipients) {
      const mailOptions = {
        from: "ACME DocHub <noreply.dochub@acmetelepower.in>",
        to: recipient.email,
        // to: "logimetrix13@gmail.com",
        subject: "Daily Event Summary",
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Daily Email sent:", info.response);
    }
  } catch (error) {
    console.error("Error sending daily email:", error);
  }
};

async function fetchDataFromUserDatabase() {
  try {
    const data = await User.findAll({ where: { user_type: "Admin" } });
    sendDailyEmail(data);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

cron.schedule("59 19 * * *", fetchDataFromUserDatabase);

const deactive_user_and_guest = async () => {
  try {
    const usersWithValidityDate = await User.findAll({
      where: {
        validity_date: {
          [Sequelize.Op.not]: null,
        },
      },
    });
    for (const item of usersWithValidityDate) {
      if (item.dataValues.validity_date) {
        const dateFromDatabase = new Date(item.validity_date);
        const timestampInMilliseconds = dateFromDatabase.getTime();
        let expiry_check = timestampInMilliseconds > Date.now();
        if (expiry_check == false && item.dataValues.user_status === "true") {
          await User.update(
            { user_status: "false" },
            {
              where: {
                id: item.dataValues.id,
              },
            }
          );
        }
      }
    }

    const all_guest_data = await Guest.findAll({
      where: {
        guest_email: {
          [Op.not]: null,
        },
      },
    });
    const emailDocumentMap = new Map();

    for (let item of all_guest_data) {
      const current_email = item.guest_email;
      if (!emailDocumentMap.has(current_email)) {
        emailDocumentMap.set(current_email, []);
      }

      const dateFromDatabase = new Date(item.expiry_date);
      const timestampInMilliseconds = dateFromDatabase.getTime();
      let time = Date.now();
      const expiry_check = timestampInMilliseconds > Date.now();
      if (expiry_check) {
        emailDocumentMap.get(current_email).push(item);
      }
    }
    const emailsWithExpiredDocuments = [];

    for (let [email, documents] of emailDocumentMap) {
      if (documents.length === 0) {
        emailsWithExpiredDocuments.push(email);
      }
    }
    for (let i = 0; i < emailsWithExpiredDocuments.length; i++) {
      await Guestsignup.destroy({
        where: {
          email: emailsWithExpiredDocuments[i],
        },
      });
    }
    const recycleBinPolicyMap = new Map();

    async function processDeletedFiles() {
      try {
        const allDeletedFiles = await FileUpload.findAll({
          where: {
            is_recyclebin: "true",
            policies_id: {
              [Op.not]: "",
            },
          },
        });
        console.log(allDeletedFiles.length, "_______allDeletedFiles");
        const deletedFolders = await Folder.findAll({
          where: {
            is_recycle: "true",
            policies_id: {
              [Op.not]: "",
            },
          },
        });

        allDeletedFiles.push(...deletedFolders);

        const currentTimeInSeconds = Math.floor(Date.now() / 1000);

        // Load policies for all files at once
        const fileIds = allDeletedFiles.map((file) =>
          parseInt(file.policies_id)
        );

        const filteredFileIds = fileIds.filter((id) => !isNaN(id));

        const policies = await Policy.findAll({
          where: {
            id: {
              [Op.in]: filteredFileIds,
            },
          },
        });
        // console.log(policies,"____________policies")
        // Populate the policy map
        policies.forEach((policy) => {
          recycleBinPolicyMap.set(policy.id, policy.no_of_days);
        });

        // Process each file
        for (const file of allDeletedFiles) {
          const recycleBinPolicyDays = recycleBinPolicyMap.get(
            parseInt(file.policies_id, 10)
          );

          if (!recycleBinPolicyDays) {
            // Policy not found, handle this error or skip the file
            continue;
          }

          const fileDeleteTime =
            parseInt(file.deleted_at) + recycleBinPolicyDays * 86400;

          if (fileDeleteTime <= currentTimeInSeconds) {
            const deletedFile = await filesCollection.deleteOne({
              _id: new ObjectId(file.id),
            });
            await chunksCollection.deleteMany({
              files_id: new ObjectId(file.id),
            });
            if (deletedFile) {
              console.log("file is deleted");
              await FileUpload.destroy({
                where: {
                  id: file.id,
                },
              });
            }
          }
        }
      } catch (error) {
        console.log("error while delete:", error);
      }
    }
    await processDeletedFiles();
  } catch (error) {
    return res.status(500).json({ message: "server error" });
  }
};
cron.schedule("35 18 * * *", deactive_user_and_guest);
// cron.schedule("12 11 * * *", deactive_user_and_guest);

const pm2 = require("pm2");

router.post("/startServer", (req, res) => {
  try {
    const processName = "dms"; // Replace with your process name

    pm2.connect((connectErr) => {
      if (connectErr) {
        console.error(`Error connecting to PM2: ${connectErr}`);
        res.status(500).send("Error connecting to PM2");
        return;
      }

      // Start the PM2 process
      pm2.start(
        {
          name: processName,
          script: "app.js", // Replace with your entry point script
          autorestart: false, // Set to false to prevent automatic restart
        },
        (startErr) => {
          pm2.disconnect(); // Disconnect from PM2 after starting the process

          if (startErr) {
            console.error(`Error starting process ${processName}: ${startErr}`);
            res.status(500).send(`Error starting process ${processName}`);
          } else {
            console.log(`Server Started Successfully`);
            return res
              .status(200)
              .send({ status: true, message: `Server Started Successfully` });
          }
        }
      );
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: "Server Error" });
  }
});

router.post("/stopServer", (req, res) => {
  try {
    pm2.connect((err) => {
      if (err) {
        console.error(`Error connecting to PM2: ${err}`);
        res.status(500).send("Error connecting to PM2");
        return;
      }

      // Stop the server using PM2
      pm2.stop("dms", (stopErr) => {
        pm2.disconnect(); // Disconnect from PM2 after stopping

        if (stopErr) {
          console.error(`Error stopping server: ${stopErr}`);
          res.status(500).send("Error stopping server");
        } else {
          console.log("Server stopped successfully");
          return res
            .status(200)
            .send({ status: true, message: "Server stopped successfully" });
        }
      });
    });
  } catch (error) {
    return res.status(500).send({ status: false, message: "Server Error" });
  }
});

const os = require("os");

// // Function to get memory usage
function getMemoryUsage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
  return memoryUsagePercentage.toFixed(2);
}



const diskusage = require("diskusage");

// Function to get hard disk space usage by the Node.js application
function getNodeDiskSpaceUsage() {
  const disk = diskusage.checkSync(__dirname); // Use the directory where your application is located
  return {
    total: disk.total, // Total disk space
    free: disk.free, // Free disk space
    used: disk.total - disk.free, // Used disk space
  };
}

// Function to get memory usage by the Node.js application
function getNodeMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss, // Resident Set Size
    heapTotal: usage.heapTotal, // Total size of the heap
    heapUsed: usage.heapUsed, // Heap actually used
  };
}

const si = require("systeminformation");
const SystemInfo = require("../models/system_info");

async function getNetworkUsage() {
  try {
    const networkStats = await si.networkStats();
    return networkStats;
  } catch (error) {
    console.error("Error fetching network usage:", error.message);
    throw error;
  }
}
const { exec } = require("child_process");

const getDriveDetails = (callback) => {
  exec("wmic logicaldisk get size,freespace,caption", (error, stdout) => {
    if (error) {
      console.error(`Error retrieving drive information: ${error.message}`);
      callback(error, null);
      return;
    }

    const driveInfoLines = stdout.split("\n").slice(1); // Skip the header line
    const driveDetails = [];

    driveInfoLines.forEach((line) => {
      const [drive, size, free] = line.trim().split(/\s+/);
      if (drive && size && free) {
        const totalGB = parseFloat(free) / 1024 ** 3;
        const freeGB = parseFloat(size) / 1024 ** 3;
        const driveInfo = {
          drive: `Disk ${drive}`,
          total: totalGB.toFixed(2),
          free: freeGB.toFixed(2),
        };
        driveDetails.push(driveInfo);
      }
    });

    callback(null, driveDetails);
  });
};
router.post("/systemInfo", async (req, res) => {
  try {
    const memoryUsage = getMemoryUsage();
    const nodeMemoryUsage = getNodeMemoryUsage();
    let networkUsage = await getNetworkUsage();

    const nodeDiskSpaceUsage = getNodeDiskSpaceUsage();
    

    getDriveDetails(async (error, driveDetails) => {
      if (error) {
        console.error('Error retrieving drive details:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const cpuDetails = os.cpus().map((core, index) => {
        const cpuNumber = Math.floor(index / os.cpus().length) + 1;
        const coreNumber = (index % os.cpus().length) + 1;

        const totalTime =
          core.times.user + core.times.sys + core.times.idle + core.times.irq;
        let cpuUsage =
          ((core.times.user + core.times.sys + core.times.irq) / totalTime) * 100;
        cpuUsage = parseFloat(cpuUsage.toFixed(2));

        return {
          core: `${cpuNumber}:${coreNumber}`,
          usage: cpuUsage,
          details: {
            user: core.times.user,
            sys: core.times.sys,
            idle: core.times.idle,
            irq: core.times.irq,
          },
        };
      });
    const systemInfo = {
      memoryUsage: `${memoryUsage}`,
      networkInfo: networkUsage,
      cpuUsagePercentage: cpuDetails,
      // nodeMemoryUsage,
      driveDetails,
    };
    let last_10_created = await SystemInfo.findAll({
      
      order: [['createdAt', 'DESC']], // Order by createdAt in descending order
      attributes:['networkInfo','createdAt','id'],
      limit: 10, 
    })
    systemInfo.last_10_doc = last_10_created

    return res.status(200).json(systemInfo);
  });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

cron.schedule("*/5 * * * *", async () => {
  try {
    const memoryUsage = getMemoryUsage();
    const nodeMemoryUsage = getNodeMemoryUsage();
    const networkUsage = await getNetworkUsage();

    getDriveDetails(async(error, driveDetails) => {
      if (error) {
        console.error('Error retrieving drive details:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      const cpuDetails = os.cpus().map((core, index) => {
        const cpuNumber = Math.floor(index / os.cpus().length) + 1;
        const coreNumber = (index % os.cpus().length) + 1;

        const totalTime =
          core.times.user + core.times.sys + core.times.idle + core.times.irq;
        let cpuUsage =
          ((core.times.user + core.times.sys + core.times.irq) / totalTime) * 100;
        cpuUsage = parseFloat(cpuUsage.toFixed(2));

        return {
          core: `${cpuNumber}:${coreNumber}`,
          usage: cpuUsage,
        };
      });
    const systemInfo = {
      memoryUsage: `${memoryUsage}`,
      networkInfo: networkUsage,
      cpuUsagePercentage: cpuDetails,
      // nodeMemoryUsage,
      driveDetails,
    };
    await SystemInfo.create(systemInfo);

  });
  } catch (error) {
    console.error("Error storing system information in the database:", error);
  }
});

module.exports = router;
