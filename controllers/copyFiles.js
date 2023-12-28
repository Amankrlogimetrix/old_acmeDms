const path = require("path");
const fs = require("fs");

const copyFiles = (sourceDir, destinationDir) => {
  fs.readdirSync(sourceDir).forEach((file) => {
    const sourceFilePath = path.join(sourceDir, file);
    const destinationFilePath = path.join(destinationDir, file);
    fs.copyFileSync(sourceFilePath, destinationFilePath);
  });
};
exports.copyFiles = copyFiles;
