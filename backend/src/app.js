import dotenv from "dotenv"
dotenv.config()
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import inviteRoutes from "./routes/invite.routes.js";
import classroomRoutes from "./routes/classroom.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import mcqRoutes from "./routes/mcq.routes.js";
import practicalRoutes from "./routes/practical.routes.js";
import masteradminRoutes from "./routes/masteradmin.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import quizBuilderRoutes from "./quiz-builder/quiz-builder.routes.js";

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
app.use("/api/mcq", mcqRoutes);
app.use("/api/practical", practicalRoutes);
app.use("/api/masteradmin", masteradminRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/quiz-builder", quizBuilderRoutes);

app.get("/", (req, res) =>{
    res.send("LMS Backend is running");
});

export default app;