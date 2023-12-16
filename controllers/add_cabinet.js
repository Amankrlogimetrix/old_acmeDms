const Cabinet = require('../models/add_cabinet')
const fs = require('fs');
const path = require('path');
const base64 = require('base-64');
const iconv = require('iconv-lite');
exports.add_cabinet = async (req, res) =>{
  try {
    const { cabinet_name, selected_groups, selected_users, id } = req.body;
    // const cabinetPath = path.join(path_name, 'ACMECMS', cabinet_name);
    // const pathBytes = Buffer.from(cabinetPath, 'utf-8');
    // const base64EncodedPath = base64.encode(pathBytes);
    let cabinet;
    if (id){
      cabinet = await Cabinet.findOne({ where: { id: id } });
      if (!cabinet) {
        return res.status(404).json({
          message: 'Cabinet not found'
        });
      }
      await Cabinet.update({
          cabinet_name: cabinet_name,
          selected_groups: Array.isArray(selected_groups) ? selected_groups : [selected_groups],
          selected_users: Array.isArray(selected_users) ? selected_users : [selected_users]
        },
        { where: { id: id } }
      );
    } else {
      // Create a new cabinet
      const existingCabinet = await Cabinet.findOne({
        where: { cabinet_name: cabinet_name }
      });
      if (existingCabinet) {
        return res.status(409).json({
          message: 'Cabinet name already exists'
        });
      }
      // if (!fs.existsSync(cabinetPath)) {
      //   fs.mkdirSync(cabinetPath, { recursive: true });
      // }
      cabinet = await Cabinet.create({
        cabinet_name: cabinet_name,
        selected_groups: Array.isArray(selected_groups) ? selected_groups : [selected_groups],
        selected_users: Array.isArray(selected_users) ? selected_users : [selected_users]
      });
    }
    return res.status(200).json({
      message: 'Cabinet updated/created successfully',
      cabinet: cabinet
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Error updating/creating cabinet'
    });
  }
};


exports.deletecabinet=async(req,res)=>{
    try {
      const { id } = req.body;
  
      const cabinet = await Cabinet.findOne({ where: { id: id } });
      if (!cabinet) {
        return res.status(404).json({
          message: 'Cabinet not found'
        });
      }
  
      await Cabinet.destroy({ where: { id: id } });
  
      return res.status(200).json({
        message: 'Cabinet deleted successfully'
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Error deleting cabinet'
      });
    }
  };
  


  exports.cabinet_dropdown = async (req, res) => {
    try {
      const data = await Cabinet.findAll();
      // // Modify select_cabinet column to base64-encoded path
      // data.forEach((row) => {
      //   const decodedData = iconv.decode(Buffer.from(row.path, 'base64'), 'win1252');
      //   const normalForm = decodedData.replace(/\\/g, '\\');
      //   // console.log(normalForm, "__");
      //   row.path = normalForm;
      // });
      if(data.length == 0){
        return res.status(404).send({message:"Cabinet not found"})
      }
      return res.status(200).json({ message: "success", data });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  };
  
  // // pagination 
  // exports.get_cabinet = (req, res) => {
  //   // const page = parseInt(req.body.pageNumber) || 1; // set default page to 1
  //   // const limit =  parseInt(req.body.pageSize) || 5 
  //   // const offset = (page - 1) * limit;
  
  //   Cabinet.findAndCountAll({
  //     // offset,
  //     // limit,
  //     order: [['createdAt', 'DESC']] 
  //   })
  //     .then((result) => {
  //       const totalPages = Math.ceil(result.count / limit);
  //       const response = {
  //         message: "success",
  //         // data: result.rows,
  //         // currentPage: page,
  //         count:result.count,
  //         // totalPages
  //       };
  
  //       res.status(200).json(response);
  //     })
  //     .catch(() => {
  //       res.status(500).send("An error occurred while trying to fetch WORKSPACE from the database.");
  //     });
  // };


  exports.get_cabinet = async (req, res) => {
    try {
      let all_cabinets = await Cabinet.findAll({
        order: [['createdAt', 'DESC']],
      });
  
      let response = {
        data: all_cabinets,
        count: all_cabinets.length,
      };
  
      return res.status(200).send({ status: true, response });
    } catch (error) {
      return res.status(500).send({ message: "Server Error" });
    }
  };
  
  