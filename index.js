import "dotenv/config.js";
import express from "express";
import cookieParser from "cookie-parser";
import dns from "dns";
import { connectDB } from "./db/db.js";
import userRoute from "./routes/userRoutes.js";

// Custom DNS resolvers are only needed to work around some local ISP setups
// that fail to resolve mongodb+srv SRV records. On Vercel this can instead
// break DNS resolution, since outbound queries to arbitrary DNS servers may
// be restricted in the serverless sandbox.
if (!process.env.VERCEL) {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
}

const app = express();

///Important Middleware
app.use(express.json());
app.use(cookieParser());

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({ message: "Database connection failed", detail: error.message });
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
