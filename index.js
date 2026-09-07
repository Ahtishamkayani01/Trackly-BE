import "dotenv/config.js";
import express from "express";
import cookieParser from "cookie-parser";
import dns from "dns";
import { connectDB } from "./db/db.js";
import userRoute from "./routes/userRoutes.js";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

///Important Middleware
app.use(express.json());

app.use("/api/user", userRoute);
app.use(cookieParser());
const PORT = process.env.PORT || 8000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(`Error connecting to the database: ${error.message}`);
    process.exit(1);
  });
