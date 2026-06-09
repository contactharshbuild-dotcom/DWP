import dotenv from "dotenv"
dotenv.config()
import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) =>{
    res.send("LMS Backend is running");
});

export default app;