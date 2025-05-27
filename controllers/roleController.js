import db from "../db/index.js";
const { role } = db;

async function getAllRoles(req, res) {
  try {
    const roles = await role.findAll();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Laden der Rollen." });
  }
}

async function getRoleById(req, res) {
  try {
    const foundRole = await role.findByPk(req.params.id);
    if (!foundRole) return res.status(404).json({ error: "Rolle nicht gefunden." });
    res.json(foundRole);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Abrufen der Rolle." });
  }
}

async function createRole(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name ist erforderlich." });

    const existing = await role.findOne({ where: { name } });
    if (existing) return res.status(409).json({ error: "Rolle existiert bereits." });

    const newRole = await role.create({ name, description });
    res.status(201).json(newRole);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Erstellen der Rolle." });
  }
}

async function updateRole(req, res) {
  try {
    const foundRole = await role.findByPk(req.params.id);
    if (!foundRole) return res.status(404).json({ error: "Rolle nicht gefunden." });

    const { name, description } = req.body;
    if (name) foundRole.name = name;
    if (description !== undefined) foundRole.description = description;

    await foundRole.save();
    res.json(foundRole);
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Aktualisieren der Rolle." });
  }
}

async function deleteRole(req, res) {
  try {
    const foundRole = await role.findByPk(req.params.id);
    if (!foundRole) return res.status(404).json({ error: "Rolle nicht gefunden." });

    await foundRole.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Fehler beim Löschen der Rolle." });
  }
}

export {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};
