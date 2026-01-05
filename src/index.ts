import "reflect-metadata";
import express from "express";
import analyticsRoutes from "./routes/analyticsRoutes";

const app = express();
app.use(express.json());
app.use("/users", analyticsRoutes);

app.listen(3000, () => console.log("Server running on port 3000"));
