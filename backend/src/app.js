import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import multer from "multer";
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
import organizationRoutes from "./routes/organization.routes.js";
import materialBankRoutes from "./routes/material-bank.routes.js";
import subscriptionPlanRoutes from "./routes/subscription-plan.routes.js";

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
app.use("/api/subscription-plans", subscriptionPlanRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/quiz-builder", quizBuilderRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/material-bank", materialBankRoutes);

app.get("/", (req, res) => {
    res.send("LMS Backend is running");
});

// Express Error Handling Middleware (Handles Multer LIMIT_FILE_SIZE & 5MB Upload errors cleanly)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds the 5MB limit. Please select a smaller file (under 5MB).'
    });
  }
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.message?.includes('LIMIT_FILE_SIZE') || err.message?.includes('exceeds the maximum server-side limit of 5MB'))) {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds the 5MB limit. Please select a smaller file (under 5MB).'
    });
  }
  if (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'An unexpected error occurred during file processing.'
    });
  }
  next();
});

export default app;