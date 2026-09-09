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
app.use(cookieParser());

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.use("/api/user", userRoute);

const PORT = process.env.PORT || 8000;

// On Vercel the app is imported as a serverless handler, not run directly —
// only start a listening server for local/traditional hosting.
if (!process.env.VERCEL) {
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
}

export default app;
