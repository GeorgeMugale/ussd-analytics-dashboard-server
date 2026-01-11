import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Replace these with your RDS values
const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST!,
    dialect: "postgres",
    port: 5432,
    // logging: console.log,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  }
);

// Import and initialize models
const moduleUrl = new URL("./models/init-models.js", import.meta.url);
const { initModels } = await import(moduleUrl.toString());

// Initialize all models with the sequelize instance
export const models = initModels(sequelize);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Sync models (only in development)
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("✅ Database models synchronized.");
    }
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
};

export default sequelize;
