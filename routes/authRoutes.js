// 📦 Importiere Express und die notwendigen Controller- und Middleware-Funktionen
import express from "express";
import {
  login,
  logout,
  register,
  me,
  requestPasswordReset,
  resetPassword
} from "../controllers/authController.js";
import authMiddleware from "../middleware/auth/authMiddleware.js";
import requireRole from "../middleware/auth/roleMiddleware.js";

// 🚏 Erstelle einen neuen Express-Router
const router = express.Router();

/**
 * @route   POST /login
 * @desc    Führt den Login durch und gibt ein JWT zurück
 * @access  Öffentlich – benötigt keinen Token
 */
router.post("/login", login);

/**
 * @route   POST /logout
 * @desc    Optional: Logout – Token wird clientseitig gelöscht
 * @access  Öffentlich oder geschützt (je nach Design)
 */
router.post("/logout", logout);

/**
 * @route   GET /me
 * @desc    Gibt aktuelle Benutzerinformationen basierend auf dem JWT zurück
 * @access  Geschützt – benötigt gültigen Token
 */
router.get("/me", authMiddleware, me);

/**
 * @route   POST /register
 * @desc    Registriert einen neuen Benutzer (z. B. durch Admin)
 * @access  Geschützt – nur mit gültigem Token UND entsprechender Rolle
 */
router.post(
  "/register",
  authMiddleware,         // JWT-Authentifizierung prüfen
  requireRole(["Backoffice"]), // Zugriff nur für bestimmte Rollen
  register
);

/**
 * @route   POST /request-reset
 * @desc    Startet den Passwort-zurücksetzen-Prozess (Token per Mail)
 * @access  Öffentlich – Benutzer muss nicht eingeloggt sein
 */
router.post('/request-reset', requestPasswordReset);

/**
 * @route   POST /reset-password
 * @desc    Setzt das Passwort mit gültigem Token zurück
 * @access  Öffentlich – Token in der Anfrage notwendig
 */
router.post('/reset-password', resetPassword);

// 🚀 Exportiere den Router zur Verwendung in der Haupt-App
export default router;
