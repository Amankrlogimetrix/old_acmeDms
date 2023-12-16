const express = require('express');
const router = express.Router();
const file_notes  = require('../models/notes');
const middleware = require('../middleware/authorization') 
router.post('/savenotes',middleware ,async(req,res)=>{
    try {
        const {id,notes} = req.body;
        const email = req.decodedToken.user.username;
        
        const details = await file_notes.create({
             file_id:id,
             notes_description:notes ,
             created_by: email
        })
        return res.status(200).json({message:true,details})
    } catch (error) {
        return res.status(500).json({message:"server error"})
    }
})

router.post('/getnotes',async(req,res)=>{
    try {
        const id = req.body.id.toString();
    
        const details = await file_notes.findAll({
            where:{
             file_id:id,
        }})
        return res.status(200).json({message:true,details})
    } catch (error) {
        return res.status(500).json({message:"server error"})
    }
})
router.post('/deletenotes',async(req,res)=>{
    try {
        const {id} = req.body;
        
        const details = await file_notes.destroy({
            where:{
            id:id
          }
        })
        return res.status(200).json({message:" notes  delete sucessfully ",})
    } catch (error) {
        return res.status(500).json({message:"server error"})
    }
})


module.exports = router;
