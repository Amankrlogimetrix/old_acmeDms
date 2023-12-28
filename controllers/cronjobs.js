const cron = require("node-cron");
const nodemailer = require("nodemailer");
const loggs = require("../models/logsdetails/alllogs");
const User = require("../models/add_user");
const Guest = require("../models/link_sharing/linksharing");
const Guestsignup = require("../models/link_sharing/guestsignup");
const FileUpload = require("../models/fileupload");
const Folder = require("../models/folder");
const Policy = require("../models/policies/policy");
const mongoose = require("mongoose");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const { exec } = require("child_process");
require("dotenv").config();
const Client = require("basic-ftp").Client;
const client = new Client();

mongoose
  .connect(`${process.env.URI}`, {
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

const chunksCollection = conn.collection("fs.chunks");
const filesCollection = conn.collection("fs.files");

const os = require("os");

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
      port: `${process.env.PORT_SMTP}`,
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

// cron.schedule("59 19 * * *", fetchDataFromUserDatabase);

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
// cron.schedule("35 18 * * *", deactive_user_and_guest);

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

const isWindows = process.platform === "win32";

const getDriveDetails = (callback) => {
  const command =
    process.platform === "win32"
      ? "wmic logicaldisk where drivetype=3 get size,freespace,caption"
      : "df -h /";
  exec(command, (error, stdout) => {
    if (error) {
      console.error(`Error retrieving drive information: ${error.message}`);
      callback(error, null);
      return;
    }

    const driveInfoLines =
      process.platform === "win32"
        ? stdout.split("\n").slice(1)
        : stdout
            .split("\n")
            .slice(1)
            .filter((line) => line !== "");

    const driveDetails = [];

    if (process.platform === "win32") {
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
    } else {
      driveInfoLines.forEach((line) => {
        const values = line.trim().split(/\s+/);
        if (values.length >= 6) {
          const drive = isWindows ? values[0] : values[5];
          const size = isWindows ? values[1] : values[1];
          const used = isWindows ? values[2] : values[2];
          const available = isWindows ? values[3] : values[3];
          const percentUsed = isWindows ? values[4] : values[4];

          const totalGB = parseFloat(size);
          const freeGB = parseFloat(available);

          const driveInfo = {
            drive: `Disk ${drive}`,
            total: totalGB.toFixed(2),
            free: freeGB.toFixed(2),
          };
          driveDetails.push(driveInfo);
        }
      });
      callback(null, driveDetails);
    }
  });
};

const system_info = async () => {
  try {
    const memoryUsage = getMemoryUsage();
    // const nodeMemoryUsage = getNodeMemoryUsage();
    const networkUsage = await getNetworkUsage();

    getDriveDetails(async (error, driveDetails) => {
      if (error) {
        console.error("Error retrieving drive details:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      const cpuDetails = os.cpus().map((core, index) => {
        const cpuNumber = Math.floor(index / os.cpus().length) + 1;
        const coreNumber = (index % os.cpus().length) + 1;

        const totalTime =
          core.times.user + core.times.sys + core.times.idle + core.times.irq;
        let cpuUsage =
          ((core.times.user + core.times.sys + core.times.irq) / totalTime) *
          100;
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
        createdAt: Date.now(),
      };
      await SystemInfo.create(systemInfo);
    });
  } catch (error) {
    console.error("Error storing system information in the database:", error);
  }
};
// cron.schedule("*/2 * * * *",system_info)

const cleanUpBackups = (backupDir, maxBackups, prefix, backupType) => {
  const specificBackupDir = path.join(backupDir, backupType);

  fs.readdir(specificBackupDir, (err, files) => {
    if (err) {
      console.error(`Error reading ${backupType} backup directory: ${err}`);
      return;
    }

    const backupFiles = files.filter((file) => file.startsWith(prefix));

    backupFiles.sort((a, b) => {
      const pathA = path.join(specificBackupDir, a);
      const pathB = path.join(specificBackupDir, b);
      return (
        fs.statSync(pathA).mtime.getTime() - fs.statSync(pathB).mtime.getTime()
      );
    });

    const filesToRemove = backupFiles.slice(
      0,
      Math.max(0, backupFiles.length - maxBackups)
    );

    filesToRemove.forEach((file) => {
      const filePath = path.join(specificBackupDir, file);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(
            `Error deleting ${backupType} backup file ${file}: ${unlinkErr}`
          );
        } else {
          console.log(
            `${backupType} backup file ${file} deleted successfully.`
          );
        }
      });
    });
  });
};

const backupDir = path.join("/home", "dmsadmin", "Desktop", "backup");

// Function to execute PostgreSQL backup
const executePostgresBackup = (backupDir) => {
  const timestamp = moment().format("YYYY-MM-DD_HH-mm");
  const backupFileName = `${process.env.POSTGRES_DB}_backup_${timestamp}`;
  const backupFilePath = path.join(backupDir, "postgresBackup", backupFileName);

  //   const pgDumpCommand = `PGPASSWORD=${process.env.POSTGRES_PASSWORD} pg_dump --username=${process.env.POSTGRES_USER} --host=${process.env.POSTGRES_HOST} --port=${process.env.POSTGRES_PORT} --format=plain --file=${backupFilePath} ${process.env.POSTGRES_DB}`;
  const pgDumpCommand = `PGPASSWORD=Dms@1234 pg_dumpall --username=dmsadminsql --host=10.10.0.60 --port=5432 --file=${backupFilePath}.sql`;

  exec(pgDumpCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`PostgreSQL backup failed: ${stderr}`);
    } else {
      console.log(
        `PostgreSQL backup completed successfully: ${backupFileName}`
      );
      cleanUpBackups(backupDir, 4, "postgres_backup_", "postgresBackup");
    }
  });
};

// Function to execute MongoDB backup
const executeMongoBackup = (backupDir) => {
  const timestamp = moment().format("YYYY-MM-DD_HH-mm");
  const backupDirectoryName = `mongo_backup_${timestamp}`;
  const backupDirectoryPath = path.join(
    backupDir,
    "mongoDbBackup",
    backupDirectoryName
  );

  const mongoDumpCommand = `mongodump --uri "${process.env.URI}" --out ${backupDirectoryPath}`;

  exec(mongoDumpCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`MongoDB backup failed: ${stderr}`);
    } else {
      console.log(
        `MongoDB backup completed successfully: ${backupDirectoryName}`
      );

      cleanUpBackups(backupDir, 4, "mongodb_backup_", "mongoDbBackup");
    }
  });
};

const uploadToFTP = (localFilePath, remoteFilePath) => {
  client
    .uploadFrom(localFilePath, remoteFilePath)
    .then(() => {
      console.log(`File uploaded to FTP: ${remoteFilePath}`);
    })
    .catch((err) => {
      console.error(`FTP upload failed: ${err}`);
    });
};

const zipDirectory = (destination, entries, callback) => {
  const output = fs.createWriteStream(destination);
  const archive = archiver("zip", { zlib: { level: 9 } });
console.log(destination,"destination")
  archive.on("error", (err) => {
    throw err;
  });

  output.on("close", callback);

  archive.pipe(output);

  // Iterate over each entry in the array and add it to the archive
  entries.forEach((entry) => {
    if (fs.statSync(entry.path).isDirectory()) {
      // If it's a directory, add its contents to the archive
      archive.directory(entry.path, entry.name);
    } else {
      // If it's a file, add it directly to the archive
      archive.file(entry.path, { name: entry.name });
    }
  });

  archive.finalize();
};

const databaseBakup = (backupDir) => {
  try {
    console.log("Running daily backups...");

    const timestamp = moment().format("YYYY-MM-DD_HH-mm");
    //   const postgresBackupFileName = `postgres_backup_${timestamp}.sql`;
    //   const postgresBackupPath = path.join(
    //     backupDir,
    //     "postgresBackup",
    //     postgresBackupFileName
    //   );

    //   const mongoBackupDirectoryName = `mongo_backup_${timestamp}`;
    //   const mongoBackupPath = path.join(
    //     backupDir,
    //     "mongoDbBackup",
    //     mongoBackupDirectoryName
    //   );

    executePostgresBackup(backupDir);
    executeMongoBackup(backupDir);

    setTimeout(() => {
      const zipFileName = `DB_backups_${timestamp}.zip`;
      const zipFilePath = path.join(backupDir, zipFileName);

      zipDirectory(
        zipFilePath,
        [
          {
            name: "PostgresBackup",
            path: getLatestBackupDirectory(backupDir, "postgres"),
          },
          {
            name: "MongoDBBackup",
            path: getLatestBackupDirectory(backupDir, "Mongo"),
          },
        ],
        () => {
          console.log("Zip is completed sucessfully.");
          // Upload the zip file to FTP after it's created
          // uploadToFTP(zipFilePath, `${process.env.PATH_ON_FTP}${zipFileName}`);
        }
      );
    }, 5000);
  } catch (error) {
    console.log("error:", error.message);
  }
};

const getLatestBackupDirectory = (backupPath, backupType) => {
  try {
    const backupTypeDir =
      backupType.toLowerCase() === "postgres"
        ? "postgresBackup"
        : "mongoDbBackup";

    const fullBackupPath = path.join(backupPath, backupTypeDir);
    console.log(fullBackupPath, "fullBackupPath");

    const allEntries = fs.readdirSync(fullBackupPath, { withFileTypes: true });
    console.log(allEntries, "allEntries");

    const relevantEntries = allEntries
      .filter(
        (entry) =>
          entry.isDirectory() || (entry.isFile() && entry.name.endsWith(".sql"))
      )
      .map((entry) => entry.name);

    console.log(relevantEntries, "relevantEntries");

    if (relevantEntries.length === 0) {
      // No relevant directories found
      return null;
    }

    try {
      const latestEntry = relevantEntries.reduce((latest, current) => {
        const isSqlFile = current.endsWith(".sql");
        const dateCurrent = parseTimestamp(current, isSqlFile);
        const dateLatest = parseTimestamp(latest, isSqlFile);
        return dateCurrent.isAfter(dateLatest) ? current : latest;
      });

      if (latestEntry) {
        return path.join(fullBackupPath, latestEntry);
      } else {
        console.log("No valid entries found.");
        return null;
      }
    } catch (error) {
      console.error(
        `Error parsing date in backup directories: ${error.message}`
      );
      return null;
    }
  } catch (error) {
    console.log("error:", error.message);
  }
};

function parseTimestamp(entry, isSqlFile) {
  try {
    const timestampRegex = /(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})/;
    const timestampMatch = entry.match(timestampRegex);

    if (timestampMatch) {
      const timestamp = timestampMatch[1];
      const format = isSqlFile ? "YYYY-MM-DD_HH-mm" : "YYYY-MM-DD_HH-mm";
      return moment(timestamp, format, true);
    } else {
      console.error(`Timestamp not found in entry: ${entry}`);
      return moment(0); // Return a default date in case of an error
    }
  } catch (error) {
    console.log("error:", error.message);
  }
}
const copyFiles = (sourceDir, destinationDir) => {
  const files = fs.readdirSync(sourceDir);

  files.forEach((file) => {
    const sourceFilePath = path.join(sourceDir, file);
    const destinationFilePath = path.join(destinationDir, file);

    const stat = fs.statSync(sourceFilePath);

    if (stat.isFile()) {
      // Read file content
      const content = fs.readFileSync(sourceFilePath);

      // Write file content to destination
      fs.writeFileSync(destinationFilePath, content);
    } else if (stat.isDirectory()) {
      // If it's a directory, create the corresponding directory in the destination
      fs.mkdirSync(destinationFilePath, { recursive: true });

      // Recursively copy files inside the directory
      copyFiles(sourceFilePath, destinationFilePath);
    }
  });
};

// const backupCode = (backupDir) => {
//   try {
//     const timestamp = moment().format("YYYY-MM-DD_HH-mm");
//     const backupDirectoryName = `code_backup_${timestamp}`;
//     const backupDirectoryPath = path.join(
//       backupDir,
//       "codeBackup",
//       backupDirectoryName
//     );
//     console.log(backupDirectoryPath, "backupDirectoryPath");
//     // Create backup directories
//     fs.mkdirSync(backupDirectoryPath);

//     // Copy frontend code
//     const frontendBackupDir = path.join(backupDirectoryPath, "frontend");
//     fs.mkdirSync(frontendBackupDir);
//     copyFiles(process.env.SOURCE_FRONT_DIR, frontendBackupDir);

//     // Copy backend code
//     const backendBackupDir = path.join(backupDirectoryPath, "backend");
//     fs.mkdirSync(backendBackupDir);
//     copyFiles(process.env.SOURCE_BACKEND_DIR, backendBackupDir);

//     // Create a zip file for frontend
//     const frontendZipFilePath = path.join(
//       backupDirectoryPath,
//       `frontend_backup_${timestamp}.zip`
//     );
//     zipDirectory(frontendBackupDir, frontendZipFilePath, () => {
//       console.log("Frontend code backup completed successfully.");
//     });

//     // Create a zip file for backend
//     const backendZipFilePath = path.join(
//       backupDirectoryPath,
//       `backend_backup_${timestamp}.zip`
//     );
//     zipDirectory(backendBackupDir, backendZipFilePath, () => {
//       console.log("Backend code backup completed successfully.");
//     });

//     console.log("Code backup completed successfully.");
//   } catch (error) {
//     console.log("Error:", error.message);
//   }
// };
const backupCode = (backupDir) => {
  try {
    const timestamp = moment().format("YYYY-MM-DD_HH-mm");
    const zipFileName = `code_backup_${timestamp}.zip`;
    const zipFilePath = path.join(backupDir, "codeBackup", zipFileName);

    // Create a zip file for frontend
    const frontendBackupDir = path.join(backupDir, "frontend");
    zipDirectory(process.env.SOURCE_FRONT_DIR, frontendBackupDir, () => {
      console.log("Frontend code backup completed successfully.");

      // Create a zip file for backend
      const backendBackupDir = path.join(backupDir, "backend");
      zipDirectory(process.env.SOURCE_BACKEND_DIR, backendBackupDir, () => {
        console.log("Backend code backup completed successfully.");

        // Combine frontend and backend zip files into a single zip file
        zipDirectory(backupDir, zipFilePath, () => {
          console.log("Code backup completed successfully.");

          // Remove temporary frontend and backend zip files and directories
          fs.rmdirSync(frontendBackupDir, { recursive: true });
          fs.rmdirSync(backendBackupDir, { recursive: true });
        });
      });
    });
  } catch (error) {
    console.log("Error:", error.message);
  }
};

cron.schedule("59 19 * * *", fetchDataFromUserDatabase);
cron.schedule("35 18 * * *", deactive_user_and_guest);
cron.schedule("*/5 * * * *", system_info);
cron.schedule("42 16 * * *", () => databaseBakup(backupDir));
// cron.schedule("0 0 * * 0", () => backupCode(backupDir));
cron.schedule("58 17 * * *", () => backupCode(backupDir));

const cornFunctionExecute = () => {
  const backupDir = path.join("/home", "dmsadmin", "Desktop", "backup");

  fetchDataFromUserDatabase;
  deactive_user_and_guest;
  system_info;
  databaseBakup(backupDir);
  backupCode(backupDir);
};

module.exports = { cornFunctionExecute };
