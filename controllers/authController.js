import db from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import crypto from "crypto";
import nodemailer from "nodemailer";

const { user, role } = db;

// 🔑 Login
export const login = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
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
      include: [role],
    });

    if (!existingUser) {
      return res.status(401).json({ message: "Ungültige Anmeldedaten" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.passwordHash
    );
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Ungültige Anmeldedaten" });
    }

    const token = jwt.sign(
      {
        id: existingUser.id,
        email: existingUser.email,
        roles: existingUser.roles.map((r) => r.name),
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

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

// 🧾 Wer bin ich?
export const me = async (req, res) => {
  try {
    const currentUser = await user.findByPk(req.user.id, {
      include: [role],
      attributes: { exclude: ["passwordHash"] },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

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

// ✅ Registrierung (nur durch berechtigte Rollen)
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
    const existing = await user.findOne({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Benutzer mit dieser E-Mail existiert bereits" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

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

// 🚪 Logout (optional, da token clientseitig gelöscht wird)
export const logout = async (req, res) => {
  // Token wird nicht gespeichert -> Logout passiert clientseitig durch Token-Löschung
  res.json({ message: "Logout erfolgreich (Client-seitig Token entfernen)" });
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const existingUser = await user.findOne({
      where: { email, deleted: false },
    });
    // Auch wenn kein Benutzer existiert, antworte gleich aus Sicherheitsgründen
    if (!existingUser) {
      return res
        .status(200)
        .json({
          message: "Wenn deine E-Mail registriert ist, erhältst du einen Link.",
        });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde gültig

    await existingUser.update({
      resetToken,
      resetTokenExpires: expires,
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Mail-Transporter (z. B. Gmail oder Mailtrap)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: existingUser.email,
      subject: "Passwort zurücksetzen",
      html: `<p>Hier kannst du dein Passwort zurücksetzen:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    });

    res.json({
      message: "Wenn deine E-Mail registriert ist, erhältst du einen Link.",
    });
  } catch (err) {
    console.error("Reset-Passwort Fehler:", err);
    res.status(500).json({ message: "Fehler beim Versenden der E-Mail" });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const existingUser = await user.findOne({
      where: {
        resetToken: token,
        resetTokenExpires: { [Op.gt]: new Date() }
      }
    });

    if (!existingUser) {
      return res.status(400).json({ message: "Token ist ungültig oder abgelaufen" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await existingUser.update({
      passwordHash,
      resetToken: null,
      resetTokenExpires: null
    });

    res.json({ message: "Passwort erfolgreich zurückgesetzt" });
  } catch (err) {
    console.error("Passwort-Reset-Fehler:", err);
    res.status(500).json({ message: "Fehler beim Zurücksetzen" });
  }
};

