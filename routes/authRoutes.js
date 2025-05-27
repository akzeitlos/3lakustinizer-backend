// Importiere express und benötigte Controller- und Middleware-Funktionen
import express from "express";
import { login, logout, register, me } from "../controllers/authController.js";
import authMiddleware from "../middleware/auth/authMiddleware.js";
import requireRole from "../middleware/auth/roleMiddleware.js";

// Erstelle einen neuen Express-Router
const router = express.Router();

/**
 * @route   POST /login
 * @desc    Nutzer-Login, gibt JWT zurück
 * @access  Öffentlich
 */
router.post("/login", login);

/**
 * @route   POST /logout
 * @desc    (Optional) Logout – auf Client-Seite sinnvoller
 * @access  Öffentlich oder geschützt (je nach Design)
 */
router.post("/logout", logout);

/**
 * @route   GET /me
 * @desc    Liefert aktuelle Benutzerdaten basierend auf JWT
 * @access  Geschützt
 */
router.get("/me", authMiddleware, me);

/**
 * @route   POST /register
 * @desc    Erstellt neuen Benutzer (z. B. durch Admin)
 * @access  Geschützt, nur bestimmte Rollen dürfen
 */
router.post(
  "/register",
  authMiddleware, // Nur mit gültigem JWT
  requireRole(["backoffice"]), // Nur wenn Rolle erlaubt
  register
);

// Exportiere den Router für die Verwendung in der App
export default router;
