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
