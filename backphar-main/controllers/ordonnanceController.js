import db from "../db.js";

export const getAllOrdonnances = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, doctor_id, id_doctor, pation_id, cin, nom, prenom, ordonnance, status, created_at
       FROM ordonnances
       ORDER BY created_at DESC`,
    );

    res.json(rows || []);
  } catch (error) {
    console.error("Erreur recuperation ordonnances:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateStatus = async (req, res) => {
  const ordonnanceId = Number(req.params.id);
  const status = String(req.body?.status || "").trim();

  if (!status) {
    return res.status(400).json({ error: "Le statut est obligatoire" });
  }

  try {
    const [existingRows] = await db.execute("SELECT id FROM ordonnances WHERE id = ?", [ordonnanceId]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Ordonnance non trouvee" });
    }

    await db.execute("UPDATE ordonnances SET status = ? WHERE id = ?", [status, ordonnanceId]);
    res.json({ message: "Statut mis a jour avec succes" });
  } catch (error) {
    console.error("Erreur mise a jour statut ordonnance:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createOrdonnance = async (req, res) => {
  const doctor_id = Number(req.body?.doctor_id || req.body?.id_doctor);
  const pation_id = req.body?.pation_id ? Number(req.body.pation_id) : null;
  const cin = String(req.body?.cin || "").trim();
  const nom = String(req.body?.nom || "").trim();
  const prenom = String(req.body?.prenom || "").trim();
  const ordonnance = String(req.body?.ordonnance || "").trim();

  if (!doctor_id || !cin || !nom || !prenom || !ordonnance) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent etre remplis" });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO ordonnances
       (doctor_id, id_doctor, pation_id, cin, nom, prenom, ordonnance, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'En attente', NOW())`,
      [doctor_id, doctor_id, pation_id, cin, nom, prenom, ordonnance],
    );

    res.status(201).json({ message: "Ordonnance creee", id: result.insertId });
  } catch (error) {
    console.error("Erreur creation ordonnance:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getOrdonnanceById = async (req, res) => {
  const ordonnanceId = Number(req.params.id);

  try {
    const [rows] = await db.execute(
      `SELECT id, doctor_id, id_doctor, pation_id, cin, nom, prenom, ordonnance, status, created_at
       FROM ordonnances WHERE id = ?`,
      [ordonnanceId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ordonnance non trouvee" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Erreur recuperation ordonnance:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateOrdonnance = async (req, res) => {
  const ordonnanceId = Number(req.params.id);
  const nom = String(req.body?.nom || "").trim();
  const prenom = String(req.body?.prenom || "").trim();
  const cin = String(req.body?.cin || "").trim();
  const ordonnance = String(req.body?.ordonnance || "").trim();

  if (!nom || !prenom || !cin || !ordonnance) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires" });
  }

  try {
    const [result] = await db.execute(
      "UPDATE ordonnances SET nom = ?, prenom = ?, cin = ?, ordonnance = ? WHERE id = ?",
      [nom, prenom, cin, ordonnance, ordonnanceId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ordonnance non trouvee" });
    }

    res.json({ message: "Ordonnance mise a jour avec succes" });
  } catch (error) {
    console.error("Erreur mise a jour ordonnance:", error);
    res.status(500).json({ error: "Erreur lors de la mise a jour" });
  }
};

export const deleteOrdonnance = async (req, res) => {
  const ordonnanceId = Number(req.params.id);

  try {
    const [result] = await db.execute("DELETE FROM ordonnances WHERE id = ?", [ordonnanceId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ordonnance non trouvee" });
    }

    res.json({ message: "Ordonnance supprimee avec succes" });
  } catch (error) {
    console.error("Erreur suppression ordonnance:", error);
    res.status(500).json({ error: error.message });
  }
};

export default {
  getAllOrdonnances,
  updateStatus,
  createOrdonnance,
  getOrdonnanceById,
  updateOrdonnance,
  deleteOrdonnance,
};
