const express = require("express");
const router = express.Router();
const Policy = require("../models/policies/policy");

// router.post('/addpolicies',async(req,res)=>{
// try {
//   console.log(req.body,"______polices")

//  const {policy_name,selected_user,selected_group,policy_type,minimum_characters,minimum_numeric,minimum_alphabet,
//   minimum_special,incorrect_password,minimum_days,maximum_days,subject,
//   message,minimum_upload,maximum_download,view,share,rename,
//   upload_folder,create_folder,upload_file, file_extension} = req.body
//   const delete_per = req.body.delete
//   const download_per = req.body.download

//   const mini_maxi_bandwidth = [minimum_upload,maximum_download]
//   const mini_maxi_days = [minimum_days,maximum_days]
//    const policies = await Policy.create({
//     policy_name:policy_name,
//     selected_users:selected_user,
//     selected_group:selected_group,
//     policy_type:policy_type,
//     minimum_character:minimum_characters,
//     minimum_numeric:minimum_numeric,
//     minimum_Alphabets:minimum_alphabet,
//     minimum_special_character:minimum_special,
//     inncorrect_password_attend:incorrect_password,
//    subject:subject,
//    message:message,
//    view:view,
//    share:share,
//    rename:rename,
//    upload_folder:upload_folder,
//    create_folder:create_folder,
//    upload_file:upload_file,
//    delete_per:delete_per,
//    download_per:download_per,
//    Bandwidth_min_max:mini_maxi_bandwidth,
//    minimum_maximum_days:mini_maxi_days,
//    properties_name: file_extension
//    })
//    return res.status(200).json({message:" policy created sucessfully",policies})
// } catch (error) {
//   console.log(error)
//  return res.status(500).json({message:"server error"})
// }
// })

router.post("/addpolicies", async (req, res) => {
  try {
    // const alreadyper = await Policy.finOne({where:{
    //   selected_users: {
    //     [Op.contains]: array of emails
    //   }
    // }})
    let {
      id,
      policy_name,
      selected_user,
      selected_group,
      policy_type,
      minimum_characters,
      minimum_numeric,
      minimum_alphabet,
      minimum_special,
      incorrect_password,
      minimum_days,
      maximum_days,
      subject,
      message,
      minimum_upload,
      minimum_download,
      view,
      share,
      rename,
      upload_folder,
      create_folder,
      upload_file,
      file_extension,
      move,
      properties,
      comment,
      rights,
      recycle_bin,
      no_of_days,
      versions,
      no_of_versions,
    } = req.body;
    const delete_per = req.body.delete;
    const download_per = req.body.download;
    const mini_maxi_bandwidth = [minimum_upload, minimum_download];
    const mini_maxi_days = [minimum_days, maximum_days];

    let policy;

      // const currentTimestamp = Date.now();
      // const no_of_days_LaterTimestamp = currentTimestamp + parseInt(no_of_days) * 24 * 60 * 60 * 1000; 

      // no_of_days = no_of_days_LaterTimestamp

    if (id) {
      // If id is provided, update the existing policy
      policy = await Policy.findByPk(id);
      if (!policy) {
        return res.status(404).json({ message: "Policy not found" });
      }

      policy.policy_name = policy_name;
      policy.selected_users = selected_user;
      policy.selected_group = selected_group;
      policy.policy_type = policy_type;
      policy.minimum_character = minimum_characters;
      policy.minimum_numeric = minimum_numeric;
      policy.minimum_Alphabets = minimum_alphabet;
      policy.minimum_special_character = minimum_special;
      policy.inncorrect_password_attend = incorrect_password;
      policy.subject = subject;
      policy.message = message;
      policy.view = view;
      policy.share = share;
      policy.rename = rename;
      policy.upload_folder = upload_folder;
      policy.create_folder = create_folder;
      policy.upload_file = upload_file;
      policy.delete_per = delete_per;
      policy.download_per = download_per;
      policy.Bandwidth_min_max = mini_maxi_bandwidth;
      policy.minimum_maximum_days = mini_maxi_days;
      policy.properties_name = file_extension;
      policy.move = move;
      policy.properties = properties;
      policy.comments = comment;
      policy.rights = rights;
      (policy.recycle_bin = recycle_bin), (policy.no_of_days = no_of_days);
      (policy.versions = versions), (policy.no_of_versions = no_of_versions);
      await policy.save();
    } else {
      // If id is not provided, create a new policy
      policy = await Policy.create({
        policy_name: policy_name,
        selected_users: selected_user,
        selected_group: selected_group,
        policy_type: policy_type,
        minimum_character: minimum_characters,
        minimum_numeric: minimum_numeric,
        minimum_Alphabets: minimum_alphabet,
        minimum_special_character: minimum_special,
        inncorrect_password_attend: incorrect_password,
        subject: subject,
        message: message,

        view: view,
        share: share,
        rename: rename,
        upload_folder: upload_folder,
        create_folder: create_folder,
        upload_file: upload_file,
        delete_per: delete_per,
        download_per: download_per,
        Bandwidth_min_max: mini_maxi_bandwidth,
        minimum_maximum_days: mini_maxi_days,
        properties_name: file_extension,
        move: move,
        properties: properties,
        comments: comment,
        rights: rights,
        recycle_bin: recycle_bin,
        no_of_days: no_of_days,
        versions: versions,
        no_of_versions: no_of_versions,
      });
    }

    return res
      .status(200)
      .json({ message: "Policy created/updated successfully", policy });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;



function calculateDaysLeft(timestamp) {
  timestamp = parseInt(timestamp);
  const targetDate = new Date(timestamp);
  const currentDate = new Date();
  const timeDifference = targetDate - currentDate;
  const daysLeft = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  return daysLeft;
}

router.post("/getpolicy", async (req, res) => {
  try {
    const data2 = await Policy.findAll();

    return res.status(200).json({ message: "success", data2 });
  } catch (error) {
    console.log(error);
  }
});

router.post("/deletepolicy", async (req, res) => {
  try {
    const id = req.body.id;
    await Policy.destroy({ where: { id: id } });
    return res.status(200).json({ message: "Policy delete successfully" });
  } catch (error) {
    return res.status(500).json({ message: "server error" });
  }
});



module.exports = router;
