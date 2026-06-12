import dotenv from "dotenv"
dotenv.config()
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import inviteRoutes from "./routes/invite.routes.js";
import classroomRoutes from "./routes/classroom.routes.js";
import resourceRoutes from "./routes/resource.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Serve local uploads statically for Google Drive mock fallback
app.use("/uploads", express.static("public/uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/invitations", inviteRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/resources", resourceRoutes);

app.get("/", (req, res) =>{
    res.send("LMS Backend is running");
});

export default app;