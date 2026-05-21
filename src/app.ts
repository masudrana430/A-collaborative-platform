import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DevPulse API is running"
  });
});

app.use("/api/auth", authRoutes);

app.use(errorMiddleware);

export default app;