import dotenv from "dotenv"
dotenv.config()
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import inviteRoutes from "./routes/invite.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/invitations", inviteRoutes);

app.get("/", (req, res) =>{
    res.send("LMS Backend is running");
});

export default app;