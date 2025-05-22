import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";
import userModel from "./models/user.js";
import roleModel from "./models/role.js";
import userRoleModel from "./models/userRole.js";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
  }
);

// Models laden
const user = userModel(sequelize, DataTypes);
const role = roleModel(sequelize, DataTypes);
const userRole = userRoleModel(sequelize);

// Beziehungen definieren
user.associate({ role, userRole });
role.associate?.({ user, userRole }); // optional chaining, falls nicht vorhanden

// Export
const db = { sequelize, Sequelize, user, role, userRole };
export default db;
