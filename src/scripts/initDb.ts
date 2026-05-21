import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { pool } from "../config/db";

dotenv.config();

const initDb = async (): Promise<void> => {
  try {
    const schemaPath = path.join(process.cwd(), "sql", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    await pool.query(schema);

    console.log("Database tables created successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
  } finally {
    await pool.end();
  }
};

void initDb();