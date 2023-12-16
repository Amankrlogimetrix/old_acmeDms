const Workspace_auth = require('../models/Workspace_auth');

exports.auth_worksapce = async (req, res) => {
  const {
    workspace_id,
    permission_upload,
    permission_view,
    permission_createfolder,
    permission_delete,
    permission_download,
    permission_share,
    permission_rename
  } = req.body;

  
  try {
    // Check if workspace_id already exists
    const existing_permission = await Workspace_auth.findOne({ where: { workspace_id: workspace_id } });
    if (existing_permission) {
      return res.status(200).json({ message: 'Permission already applied for this workspace', permission: existing_permission });
    }
    
    // Create new permission if workspace_id not found
    const new_permission = await Workspace_auth.create({
      workspace_id,
      permission_upload,
      permission_view,
      permission_createfolder,
      permission_delete,
      permission_download,
      permission_share,
      permission_rename
    });
    return res.status(201).json(new_permission);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}

    
    
exports.get_permission= async (req, res) => {
        try{
          const workspace_permissions = await Workspace_auth.findAll();
          return res.status(200).json(workspace_permissions);
        }catch (err) {
         return res.status(500).json({ message: "Server error" });
        }
}






// const Workspace_auth = require('../models/Workspace_auth'); edit  workspace

exports.edit_workspace_permission = async (req, res) => {
  const {
    workspace_id,
    permission_upload,
    permission_view,
    permission_createfolder,
    permission_delete,
    permission_download,
    permission_share,
    permission_rename
  } = req.body;

  try {
    // Check if workspace_id already exists
    const existing_permission = await Workspace_auth.findOne({ workspace_id: workspace_id });
    if (!existing_permission) {
      return res.status(404).json({ message: 'Permission not found for this workspace' });
    }

    // Update the permission if it exists
    existing_permission.permission_upload = permission_upload;
    existing_permission.permission_view = permission_view;
    existing_permission.permission_createfolder = permission_createfolder;
    existing_permission.permission_delete = permission_delete;
    existing_permission.permission_download = permission_download;
    existing_permission.permission_share = permission_share;
    existing_permission.permission_rename = permission_rename;

    const updated_permission = await existing_permission.save();

    return res.status(200).json(updated_permission);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
}
