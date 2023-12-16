const User = require("../models/add_user");
const bcrypt = require("bcrypt");
const jwtgenerator = require("../util/jwtGenerator");
const jwt = require("jsonwebtoken");
const workspace = require("../models/add_workspace");
const { Op } = require("sequelize");
const logintime = require("../models/lastlogin");
const loggs = require("../models/logsdetails/alllogs");
const FileUpload = require("../models/fileupload");
const Permission = require("../models/policies/policy");
const Guest = require("../models/link_sharing/linksharing");

// exports.register_new  = ( async (req, res) => {
//     console.log("api hit")
//     const { user_type, display_name, emp_code, email, max_quota, add_group,validity_date,user_role } = req.body;
//     User.findAll({where:{email:email}})
//        .then(users=>{
//            const user=users[0]
//            if(user)
//            res.json({success:false,message:'this email already exist'})
//            else
//            {
//                User.create({
//                    user_type:user_type,
//                    display_name:display_name,
//                    emp_code:emp_code,
//                    email:email,
//                    max_quota:max_quota,
//                    add_group:add_group,
//                    user_status:"active",
//                    user_role:user_role,
//                    validity_date:validity_date,
//                })
//                .then(()=>{
//                    res.status(200).json({success:true,message:'Successfully user added,Login now'})
//                })
//                .catch(err=>{
//                    console.log(err)
//                    res.json({success:false,message:'error while registering'})
//                })

//            }
//        })
//     //     res.status(201).send(`User with emp_code ${emp_code} has been added to the database!`);
//     // } catch (err) {
//     //     console.error(err);
//     //     res.status(500).send('An error occurred while trying to add the user to the database.');
//     // }
// });

// getuser

//  get all user with pagination

// console.log(workspace_name3,"_____________-worksapceane")

exports.register_new = async (req, res) => {
  const {
    id,
    user_type,
    display_name,
    emp_code,
    email,
    max_quota,
    add_group,
    userValidity,
    user_role,
    password,
    level_1,
    level_2,
  } = req.body;
  const max_quota1 = max_quota * 1024 * 1024;
  // console.log(req.body,"____body")

  if (id) {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const existingUser = await User.findOne({
        where: {
          emp_code: emp_code,
        },
      });

      if (existingUser && existingUser.email != email ) {
        return res.status(409).json({
          message: "This employee code already exists.",
        });
      }

      bcrypt.hash(password, 10, (err, hash) => {
        user.update({
          user_type: user_type,
          display_name: display_name,
          emp_code: emp_code,
          email: email,
          emp_password: password,
          hash_password: hash,
          max_quota: max_quota1,
          add_group: add_group,
          user_status: "true",
          user_role: user_role,
          validity_date: userValidity,
          level_1: level_1,
          level_2: level_2,
        });
      });
      return res
        .status(200)
        .json({ status: true, message: "User details updated successfully" });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: "Error while updating user details" });
    }
  } else {
    try {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ emp_code: emp_code }, { email: email }],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return res
            .status(409)
            .json({ message: "This email already exists." });
        } else {
          return res.status(409).json({
            message: "This employee code already exists.",
          });
        }
      }

      bcrypt.hash(password, 10, (err, hash) => {
        User.create({
          user_type: user_type,
          display_name: display_name,
          emp_code: emp_code,
          emp_password: password,
          hash_password: hash,
          email: email,
          max_quota: max_quota1,
          add_group: add_group,
          user_status: "true",
          user_role: user_role,
          validity_date: userValidity,
          level_1: level_1,
          level_2: level_2,
        });
      });

      return res.status(201).json({
        success: true,
        message: "Successfully created new user, login now",
      });
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ success: false, message: "Error while registering new user" });
    }
  }
};
// LOGIN user

exports.loginUser = async (req, res, next) => {
  const userMail_body = req.body.email;
  const userPassword = req.body.password;
  const clientIp = req.clientIP
  const user_email = await User.findOne({
    where: {
      [Op.or]: [{ emp_code: userMail_body }, { email: userMail_body }],
    },
  });
  if (!user_email) {
    return res.status(404).send({ message: "User not found" });
  }
  let userMail = user_email.dataValues.email;

  const ip_add = req.body.ip_add;

  try {
    const Permission1 = await Permission.findAll({
      where: {
        selected_users: {
          [Op.contains]: [userMail],
        },
      },
    });
    const res2 = await User.findOne({
      where: {
        email: userMail,
      },
    });
    if (res2.user_status === "false") {
      return res
        .status(401)
        .json({ status: false, message: "your account has been disabled" });
    }

    loggs
      .findOne({
        where: {
          email: userMail,
        },
      })
      .then((result) => {
        const lastLoginDate = moment(result.last_login); // Assuming you have a column named 'last_login' in the User model
        const currentDate = moment();

        if (currentDate.diff(lastLoginDate, "days") > 10) {
          // If the user has not logged in the last 10 days
          User.update({ user_status: "false" }, { where: { email: userMail } });
          return res.status(404).json({
            success: false,
            message:
              "your account has been disabled , because you have not login from last 10 days",
          });
        }
      });

    let workspaceNamesArray = [];
    let team_space1 = [];
    const user_type = await User.findOne({
      where: {
        email: userMail,
      },
      attributes: ["user_type"],
    });

    if (user_type.user_type === "Admin") {
      const allWorkspaceNames = await workspace.findAll({
        attributes: ["workspace_name", "workspace_type"],
        where: {
          workspace_type: "My Workspace",
        },
      });
      const allWor = await workspace.findAll({
        attributes: ["workspace_name", "workspace_type"],
        where: {
          workspace_type: "TeamSpace",
        },
      });
      team_space1 = allWor.map((workspace) => workspace.workspace_name);
      workspaceNamesArray = allWorkspaceNames.map(
        (workspace) => workspace.workspace_name
      );
    } else {
      const my_work = await workspace.findAll({
        attributes: ["workspace_name", "workspace_type"],
        where: {
          workspace_type: "My Workspace",
          selected_users: {
            [Op.contains]: [userMail],
          },
        },
      });
      const team_space = await workspace.findAll({
        attributes: ["workspace_name", "workspace_type"],
        where: {
          workspace_type: "TeamSpace",
          selected_users: {
            [Op.contains]: [userMail],
          },
        },
      });
      //
      // console.log(my_work,"___mywork")

      // console.log(workspaceNames,'___names araaray')
      workspaceNamesArray = my_work.map(
        (workspace) => workspace.workspace_name
      );
      team_space1 = team_space.map((workspace) => workspace.workspace_name);
      // workspace_type1= workspaceNames.map(workspace => workspace.workspace_type);
    }
    // const uniqueArray = [...new Set(workspace_type1)];
    // console.log(uniqueArray,"____******")

    let work1 = null;
    if (workspaceNamesArray !== null) {
      work1 = workspaceNamesArray;
    }

    User.findOne({
      where: {
        email: userMail,
      },
    })
      .then((result) => {
        // console.log(result.display_name,"___svs")
        const NAME = result.display_name;
        const user_id = result.id;
        bcrypt
          .compare(userPassword, result.hash_password)
          .then(async function (Cresult) {
            if (Cresult == true) {
              const loggsfolder = loggs.create({
                user_id: userMail,
                category: "Auth",
                action: ` User Login `,
                timestamp: Date.now(),
                system_ip: clientIp,
              });
              // let mergedData = [];

              // const guestData = await Guest.findAll({ where: { guest_email: userMail } });

              // if (guestData.length > 0) {
              //   for (const item of guestData) {
              //     if (item.file_id) {
              //       // console.log(item.file_id,"_id")
              //       const files = await FileUpload.findAll({ where: { id: item.file_id } });
              //       const filese = files[0].dataValues
              //       // console.log(files[0].dataValues,"__files")
              //       mergedData.push({ ...item.dataValues, filese });
              //     }
              //   }
              //   // console.log(mergedData,"____mergedata");
              // }

              // console.log(mergedObject,"___mrgeobjetc")
              // console.log(sharing_permission,"___ds")
              // console.log(sharing_permission[0].dataValues,"permission")
              res.status(200).json({
                success: true,
                user_id: user_id,
                email: userMail,
                message: "User Log in Successful",
                name: NAME,
                user_type: user_type.user_type,
                teamspace: team_space1,
                my_workspace: workspaceNamesArray,
                token: jwtgenerator(
                  result.dataValues.id,
                  result.dataValues.email
                ),
                username: result.dataValues.username,
                Permission: Permission1,
              });
            } else {
              res
                .status(401)
                .json({ success: false, message: "User Not Authorized" });
            }
          });
      })
      .catch((err) => {
        return res
          .status(404)
          .json({ success: false, message: "User Not Found" });
      });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Error." });
  }
};

// get all _user with pagination

exports.getalluser = (req, res) => {
  const page = parseInt(req.body.pageNumber) || 1; // set default page to 1

  const limit = parseInt(req.body.pageSize) || 5;
  const offset = (page - 1) * limit;

  User.findAndCountAll({
    offset,
    limit,
    order: [["createdAt", "DESC"]],
  })
    .then((result) => {
      const totalPages = Math.ceil(result.count / limit);
      const response = {
        message: "success",
        data: result.rows,
        currentPage: page,
        count: result.count,
        totalPages,
      };

      res.status(200).json(response);
    })
    .catch(() => {
      res
        .status(500)
        .send(
          "An error occurred while trying to fetch users from the database."
        );
    });
};

//  edit user_details

// exports.getalluser = async (req, res) => {
//   const page = parseInt(req.body.page) || 1; // set default page to 1
//   const limit = 5; // set default limit to 10
//   const offset = (page - 1) * limit;
// try{
//   const data  = await User.findAll()
//   res.status(200).json(data);
// }
// catch (err) {
//   console.log(err)
//   res.status(500).json({ success: false, message: 'An error occurred while trying to fetch users from the database' });
// }
// };
exports.edituser = (req, res) => {
  const id = req.params.userId;
  User.findOne({
    where: {
      id: id,
    },
  })
    .then((res) => {
      res.status(200).json({ success: true, message: res.dataValues });
      // console.log(res,"edituser_")
    })
    .catch(() => {
      return res
        .status(500)
        .json({ success: false, message: "user not found" });
    });
};
//  delete user
exports.deleteuser = async (req, res) => {
  try {
 const clientIP = req.clientIP
    const id = parseInt(req.body.id);
    const email1 = await User.findOne({ where: { id: id } });
    const email = email1.email;
    User.destroy({
      where: {
        id: id,
      },
    }).then(async () => {
      await FileUpload.destroy({
        where: {
          user_id: id,
        },
      });
      res.status(200).json({ success: true, message: "delete successfully" });
    });
    const loggsfolder = await loggs.create({
      user_id: email,
      category: "Delete",
      action: `User Deleted`,
      timestamp: Date.now(),
      system_ip: clientIP,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "user not found" });
  }
};

//  blocked user api

exports.blockeduser = async (req, res) => {
  try {
    const id = parseInt(req.body.id);
    console.log(req.body, "_____________++");

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.user_status = req.body.user_status.toString();
    await user.save();
    return res.status(200).json({
      message: `User has been ${
        user.user_status === "true" ? "enabled" : "disabled"
      }`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//

exports.user_list = (req, res) => {
  const user_grp = req.body.group_name;
  User.findAll({
    where: {
      add_group: user_grp,
      user_status: "true",
    },
  })
    .then((data) => {
      return res.status(200).json({ message: "success", data });
    })
    .catch(() => {
      res.status(500).json({ success: false, message: "user not found" });
    });
};
//  user_drop_down
exports.user_dropdown = (req, res) => {
  User.findAll({
    where: {
      user_type: "User",
    },
  })
    .then((data) => {
      return res.status(200).json({ message: "success", data });
    })
    .catch(() => {
      return res
        .status(500)
        .json({ success: false, message: "user not found" });
    });
};

// user_roles dropdown
// routes/user.js
exports.get_roles = async (req, res) => {
  try {
    const userRoles = ["admin", "moderator", "contributor", "viewer"];
    res.json({
      success: true,
      message: "User roles retrieved successfully",
      userRoles,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Error while getting user roles" });
  }
};

exports.guest_login = async (req, res) => {
  const payload = {
    userId: "email",
    username: "",
  };

  const secretKey = process.env.jwtSecret; // Replace with your own secret key
  const expirationTime = "60m"; // 1 minute expiration time
  const token = jwt.sign(payload, secretKey, { expiresIn: expirationTime });
};

// function generateTimeBasedToken() {

//   return token;
// }

// Example usage
// const token = generateTimeBasedToken();
// console.log(token);
