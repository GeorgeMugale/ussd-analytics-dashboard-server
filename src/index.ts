import express from "express";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { connectDB } from "./db.js";
import cors from "cors";


connectDB();

const app = express();
app.use(express.json());
app.use(
      cors({
        origin: "http://localhost:3001",
        credentials: true,
      })
    );
app.use("/api/analytics/", analyticsRoutes);

app.listen(3000, () => console.log("Server running on port 3000"));


