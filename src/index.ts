import express from "express";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { connectDB } from "./db.js";

connectDB();

const app = express();
app.use(express.json());
app.use("/api/analytics/", analyticsRoutes);

app.listen(3000, () => console.log("Server running on port 3000"));


