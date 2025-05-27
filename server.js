import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import db from './db/index.js';
import authRoutes from './routes/authRoutes.js';
//import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';


dotenv.config();

db.sequelize.sync({ alter: true })  // oder force: true beim Entwickeln
  .then(() => console.log('Database synced'))
  .catch(console.error);

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // JSON-Daten verarbeiten

// API-Routen einbinden
app.use("/api/auth", authRoutes);
//app.use("/api/user", userRoutes);
app.use("/api/role", roleRoutes);


app.listen(5000, () => {
  console.log("Backend läuft auf http://localhost:5000");
});