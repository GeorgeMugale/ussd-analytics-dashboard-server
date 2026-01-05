import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Replace these with your RDS values
const sequelize = new Sequelize(process.env.DB_NAME!, process.env.DB_USER!, process.env.DB_PASSWORD!, {
  host: process.env.DB_HOST!,
  dialect: "postgres",
  port: 5432, 
  logging: console.log,
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false, 
    },
  },
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

testConnection();

export default sequelize;
