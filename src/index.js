// import dotenv from "dotenv";
// dotenv.config({ path: "./.env" });
// dotenv.config();

import connectDB from "./db/index.js";
import app from "./app.js";


const PORT = process.env.PORT || 8080;

connectDB()
  .then(() => {
    app.on("error", (err) => {
      console.log("MONGO connection failed ", err);
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO DB connection failed ", err);
  });


// there was an error coming due to env variables as they are not been loaded in some file properly, so after debugging a lot, a solution worked, which is to load env varibales directly through script in package.json file. so if sometimes you have error in env variables, you can try that.