import app from "./app.js";
import sequelize from "./config/database.js";
import dotenv from "dotenv";
import { QuizCronService } from "./quiz-builder/quiz-cron.service.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () =>{
 try{
  await sequelize.authenticate();
  console.log("Postgres is connect");

  app.listen(PORT , () => {
    console.log(`Server is running on ${PORT}`);
    QuizCronService.startCronJob();
  });
 }
 catch (error) {
 console.error("❌ Database Connection Failed");
 console.error(error);
 }
};


startServer();