const express = require("express");
const router = express.Router();
const Alllogs = require("../../models/logsdetails/alllogs");
const User = require("../add_user");
const {extractClientIP} = require("../../middleware/clientIp")
router.use(extractClientIP);

const moment = require("moment");
const { Op, where } = require("sequelize");

router.post("/folderlogs", async (req, res) => {
  const { category, start_date, end_date } = req.body;

  let startDate = moment(start_date);
  let endDate = moment(end_date);

  try {
    // if (category == "Create") {
    //   const obj = await Alllogs.findAll({
    //     where: {
    //       category: category,
    //       createdAt: {
    //         [Op.between]: [startDate, endDate],
    //       },
    //     },
    //   });
    //   return res.status(200).json({ obj });
    // }
    // if (category == "Auth") {
    //   const obj = await Alllogs.findAll({
    //     where: {
    //       category: category,
    //       createdAt: {
    //         [Op.between]: [startDate, endDate],
    //       },
    //     },
    //   });
    //   return res.status(200).json({ obj });
    // }
    // if (category == "Downloads") {
    //   const obj = await Alllogs.findAll({
    //     where: {
    //       category: category,
    //       createdAt: {
    //         [Op.between]: [startDate, endDate],
    //       },
    //     },
    //   });
    //   return res.status(200).json({ obj });
    // }
    // if (category == "View") {
    //   const obj = await Alllogs.findAll({
    //     where: {
    //       category: category,
    //       createdAt: {
    //         [Op.between]: [startDate, endDate],
    //       },
    //     },
    //   });
    //   return res.status(200).json({ obj });
    // }
    // if (category == "Delete") {
    //   const obj = await Alllogs.findAll({
    //     where: {
    //       category: category,
    //       createdAt: {
    //         [Op.between]: [startDate, endDate],
    //       },
    //     },
    //   });
    //   return res.status(200).json({ obj });    }
    // if (category == "Upload") {
    //   const obj = await Alllogs.findAll({
    //     where: {
    //       category: category,
    //       createdAt: {
    //         [Op.between]: [startDate, endDate],
    //       },
    //     },
    //   });
    //   return res.status(200).json({ obj });
    // }
    if (!category) {
      return res
        .status(400)
        .json({ error: "category is mandatory parameters." });
    }
    // if (category === "All") {
    //   const obj = await Alllogs.findAll();
    //   return res.status(200).json({ obj });
    // }
    if (category === "All") {
      const obj = await Alllogs.findAll({
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      return res.status(200).json({ obj });
    } else if (
      category != "Create" &&
      category != "Auth" &&
      category != "Download" &&
      category != "View" &&
      category != "Delete" &&
      category != "Upload" &&
      category != "All" &&
      category != "Shared"&&
      category != "Update"
    ) {
      return res.status(400).json({ error: "Invalid category." });
    }

    let whereClause = {
      category: category,
    };

    if (endDate) {
      whereClause.createdAt = {
        [Op.between]: [startDate, endDate],
      };
    } else {
      whereClause.createdAt = {
        [Op.gte]: startDate,
      };
    }
    const obj = await Alllogs.findAll({
      where: whereClause,
    });
    return res.status(200).json({ obj });
  } catch (err) {
    return res.status(500).json("Server Error");
  }
});

router.post("/authview", async (req, res) => {
  try {
    const clientIP = req.clientIP

    const file_name = req.body.file_name;
    const id = req.body.id;
    const loggsfolder = await Alllogs.create({
      user_id: "admin-aman",
      category: "View",
      action: ` File has been view by Admin-user : ${file_name}`,
      timestamp: Date.now(),
      system_ip: clientIP,
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/getloggs", async (req, res) => {
  try {
    const currentDate = moment(); // Current date
    const oneMonthAgo = moment().subtract(1, "month"); // One month ago from the current date

    const logsData = await Alllogs.findAll({
      where: {
        createdAt: {
          [Op.between]: [oneMonthAgo, currentDate],
        },
      },
      order: [["createdAt", "DESC"]], // Optional: Sort the results by createdAt in descending order
    });

    return res.status(200).json({ success: true, data: logsData });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const clientIP = req.clientIP

    const token = req.body.email;
    // let usercheck = await User.findOne({where:{
    //   email : token
    // }})
    // let user_email
    // let guest_email
    // if(!usercheck){
    //   guest_email = token
    // }else{
    //   user_email = token
    // }
    const loggsfolder = await Alllogs.create({
      // user_id: user_email||null,
      // guest_id: guest_email||null,
      user_id: token,
      category: "Auth",
      action: `Log Out `,
      timestamp: Date.now(),
      system_ip: clientIP,
    });
    return res.status(200).json({ message: "true" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "server error" });
  }
});
module.exports = router;
