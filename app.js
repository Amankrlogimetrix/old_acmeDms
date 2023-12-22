const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
// const userRoutes=require('./routes/user')

const sequelize = require("./util/database");
const new_user = require("./routes/add_user");
const add_group = require("./routes/add_group");
const add_cabinet = require("./routes/cabinet");
const workspace = require("./routes/workspace");
const W_auth = require("./routes/auth_workspace");
const User_auth = require("./controllers/user_auth");
const fileupload = require("./controllers/uploadfile");
const doctype = require("./controllers/doctype");
const meta_properties = require("./controllers/meta_properties");
const logs = require("./controllers/logsdetails/folder");
const filenotes = require("./controllers/filenotes");
const forget = require("./controllers/forgetpass");
const {cornFunctionExecute} = require("./controllers/cronjobs");
const expressFileUpload = require("express-fileupload");
const app = express();
// const db  = require('./util/mongodb')
const link_sharing = require("./controllers/link_sharing/guest");

// const mongoapi = require('./controllers/mongoose')
const smtp = require("./controllers/adminSMTP");
const policies = require("./controllers/polices");
const work_flow = require("./controllers/work_flow");
const dashboard = require("./controllers/dashboard");
app.use(cors());
// app.use((req, res, next) => {
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
//     res.setHeader("Access-Control-Allow-Headers", "Content-Type");
//     next();
//   });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(check)
app.use(logs);
// app.use(userRoutes)
app.use(new_user);
app.use(add_group);
app.use(add_cabinet);
app.use(workspace);
// app.use(Folder)
app.use(W_auth);
app.use(User_auth);
app.use(fileupload);
app.use(doctype);
app.use(meta_properties);
app.use(filenotes);
app.use(smtp);
app.use(link_sharing);
app.use(policies);
app.use(work_flow);
app.use(forget);
// app.use(mongoapi)
app.use(dashboard);

app.use(cornFunctionExecute);

app.use(expressFileUpload());

sequelize
  .sync()
  .then((response) => {
    app.listen(process.env.PORT || 3000, () =>
      console.log(`Server started running on Port: ${process.env.PORT}`)
    );
  })
  .catch((err) => console.log(err));
