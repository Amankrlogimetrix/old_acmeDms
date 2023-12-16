const express =require('express')
const router =express.Router()
const meta_property =require('../models/meta_property')

router.post('/metaproperty', async (req, res) => {
    const id = req.body.id;
    const fieldname = req.body.fieldname;
    const fieldtype = req.body.fieldtype;
    const doctype = req.body.doctype;
    const docmetaid = req.body.meta_id;
    const metadata_name = req.body.metadata_name;
    const metaproperties = req.body.metaproperties;
  
    if (id) {
      try {
        const property = await meta_property.findByPk(id);
        if (!property) {
          return res.status(404).json({ message: 'Property not found' });
        }
  
        await meta_property.update(
          {
            fieldname: fieldname,
            fieldtype: fieldtype
          },
          {
            where: {
              id: id
            }
          }
        );
  
        return res.status(200).json({ message: 'Property updated successfully' });
      } catch (error) {
        return res.status(500).json({ message: 'Server Error: MetaProperty update' });
      }
    } else {
      try {
        const response = await meta_property.create({
          meta_id: docmetaid,
          doctype: doctype,
          metadata_name: metadata_name,
          fieldname: fieldname,
          fieldtype: fieldtype,
          metaproperties: Array.isArray(metaproperties) ? metaproperties : [metaproperties],
          meta_status: 'true'
        });
  
        return res.status(201).json(response);
      } catch (error) {
        return res.status(500).json({ message: 'Server Error: MetaProperty' });
      }
    }
  });
  


router.post('metaproperties',async(req,res)=>{
    try {
const id=req.body.id        
const fieldname=req.body.fieldname;
const fieldtype=req.body.fieldtype;   
const propertiesname=req.body.propertiesname
const response = await meta_property.create({
    fieldname:fieldname,
    fieldtype:fieldtype,
    propertiesname:propertiesname,
    
})

 return res.status(201).json(response)  
    } catch (error) {
     return res.status(500).json({message:"Server Error metaProperty"}) 
    }
})


router.post('/getmetaproperties',async(req,res)=>{
try {
const doctype=req.body.doctype
const  response =await meta_property.findAll({
where:{
    doctype:doctype,
    meta_status:"true"
},
 })
return res.status(201).json(response)
// console.log(response,"___")
} catch (error) {
return res.status(500).json({message:"Server Error metaPropertyget"}) 
}
})


// router.post('/getproperties',async(req,res)=>{
//     const response = await 
// })

router.post('/getproperties', async (req, res) => {
    const doctype = req.body.doctype;
    try {
      const response = await meta_property.findAll({
        attributes: ['fieldtype', 'fieldname','id','metaproperties','meta_status'], // Specify the attributes you want to retrieve
        where: {
          doctype: doctype
        }
      });
      return res.status(200).json(response);
    } catch (err) {
      return res.status(500).json({ message: 'Server Error' });
    }
  });
  

  router.post('/deleteproperties', async (req, res) => {
    try {
      const propertyId = req.body.id;
  
      await meta_property.destroy({
        where: {
          id: propertyId
        }
      });
      return res.status(200).json({ message: 'Property deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Delete failed' });
    }
  });
  router.post('/metastatus', async (req, res) => {
    try {
      const id = parseInt(req.body.id);
      const meta = await meta_property.findByPk(id);
      if (!meta) {
        return res.status(404).json({ message: "doctype not found" });
      }
      const status = req.body.status;
      if (status === "true" || status === "false") {
        meta.meta_status = status;
        await meta.save();
        return res.status(200).json({ message: `Properties have been ${status}` });
      } else {
        return res.status(400).json({ message: "Invalid status provided" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
 
module.exports=router       