import db from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import crypto from "crypto";
import nodemailer from "nodemailer";

const { user, role } = db;

// 🔑 Login: Authentifiziert Nutzer anhand E-Mail/Username und Passwort
export const login = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    // Suche Nutzer anhand E-Mail oder Username, der nicht gelöscht ist
    const existingUser = await user.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { email: emailOrUsername },
              { username: emailOrUsername },
            ],
          },
          { deleted: false },
        ],
      },
      include: [role], // Rollen mitladen
    });

    // Falls Nutzer nicht gefunden, 401 Unauthorized zurückgeben
    if (!existingUser) {
      return res.status(401).json({ message: "Ungültige Anmeldedaten" });
    }

    // Passwort prüfen (Hashvergleich)
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.passwordHash
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Ungültige Anmeldedaten" });
    }

    // JWT Token erzeugen mit Nutzerinfos und Rollen, 2 Stunden gültig
    const token = jwt.sign(
      {
        id: existingUser.id,
        email: existingUser.email,
        roles: existingUser.roles.map((r) => r.name),
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Token und Nutzerinfos als Antwort zurückgeben
    res.json({
      token,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        firstname: existingUser.firstname,
        lastname: existingUser.lastname,
        roles: existingUser.roles.map((r) => r.name),
      },
    });
  } catch (err) {
    console.error("Login-Fehler:", err);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

// 🧾 Wer bin ich?: Liefert das Profil des angemeldeten Nutzers zurück
export const me = async (req, res) => {
  try {
    // Suche Nutzer anhand der ID aus dem Auth-Middleware-Token
    const currentUser = await user.findByPk(req.user.id, {
      include: [role], // Rollen mitladen
      attributes: { exclude: ["passwordHash"] }, // Passworthash nicht zurückgeben
    });

    if (!currentUser) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    // Nutzerinfos inkl. Rollen zurückgeben
    res.json({
      user: {
        ...currentUser.toJSON(),
        roles: currentUser.roles.map((r) => r.name),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Fehler beim Laden des Profils" });
  }
};

// ✅ Registrierung: Neuer Nutzer anlegen (meist nur durch Admins möglich)
export const register = async (req, res) => {
  const {
    email,
    username,
    password,
    salutation,
    title,
    firstname,
    lastname,
    start_date,
    holiday_days,
    roles = [],
  } = req.body;

  try {
    // Prüfen, ob E-Mail schon vergeben ist
    const existing = await user.findOne({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Benutzer mit dieser E-Mail existiert bereits" });
    }

    // Passwort hashen für sichere Speicherung
    const passwordHash = await bcrypt.hash(password, 10);

    // Neuen Nutzer erstellen (ohne Rollen)
    const newUser = await user.create({
      email,
      username,
      passwordHash,
      salutation,
      title,
      firstname,
      lastname,
      start_date,
      holiday_days,
    });

    // Falls Rollen angegeben, diese zuweisen
    if (roles.length > 0) {
      const foundRoles = await role.findAll({
        where: { name: roles },
      });
      await newUser.setRoles(foundRoles);
    }

    res.status(201).json({ message: "Benutzer erfolgreich erstellt" });
  } catch (err) {
    console.error("Fehler bei Registrierung:", err);
    res.status(500).json({ message: "Registrierung fehlgeschlagen" });
  }
};

// 🚪 Logout: Einfacher Endpoint, da Token clientseitig gelöscht wird
export const logout = async (req, res) => {
  // Server-seitig keine Aktion notwendig, da JWT stateless
  res.json({ message: "Logout erfolgreich (Client-seitig Token entfernen)" });
};

// 🔑 Passwort zurücksetzen anfordern: Sendet Reset-Link per E-Mail
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    // Nutzer mit gegebener E-Mail suchen (nur nicht gelöschte)
    const existingUser = await user.findOne({
      where: { email, deleted: false },
    });

    // Aus Sicherheitsgründen immer Erfolg zurückgeben, auch wenn kein Nutzer existiert
    if (!existingUser) {
      return res.status(200).json({
        message: "Wenn deine E-Mail registriert ist, erhältst du einen Link.",
      });
    }

    // Zufälligen Token für Zurücksetzen generieren und Ablaufzeit setzen (1 Stunde)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Token und Ablauf in DB speichern
    await existingUser.update({
      resetToken,
      resetTokenExpires: expires,
    });

    // Link zum Frontend mit Token zusammenbauen
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // E-Mail-Transporter konfigurieren (z.B. Gmail, SMTP)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Reset-Mail mit Link versenden
    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: existingUser.email,
      subject: "Passwort zurücksetzen",
      html: `<p>Hier kannst du dein Passwort zurücksetzen:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    });

    // Erfolgsmeldung zurückgeben
    res.json({
      message: "Wenn deine E-Mail registriert ist, erhältst du einen Link.",
    });
  } catch (err) {
    console.error("Reset-Passwort Fehler:", err);
    res.status(500).json({ message: "Fehler beim Versenden der E-Mail" });
  }
};

// 🔑 Passwort zurücksetzen: Token prüfen, neues Passwort setzen
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Nutzer mit gültigem Token und Ablaufzeit in der Zukunft suchen
    const existingUser = await user.findOne({
      where: {
        resetToken: token,
        resetTokenExpires: { [Op.gt]: new Date() },
      },
    });

    // Falls Token ungültig oder abgelaufen, Fehler zurückgeben
    if (!existingUser) {
      return res
        .status(400)
        .json({ message: "Token ist ungültig oder abgelaufen" });
    }

    // Neues Passwort hashen
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Passwort speichern, Token löschen
    await existingUser.update({
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
    });

    res.json({ message: "Passwort erfolgreich zurückgesetzt" });
  } catch (err) {
    console.error("Passwort-Reset-Fehler:", err);
    res.status(500).json({ message: "Fehler beim Zurücksetzen" });
  }
};