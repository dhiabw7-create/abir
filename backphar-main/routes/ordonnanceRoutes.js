import express from 'express';
import ordonnanceController from '../controllers/ordonnanceController.js';

const router = express.Router();

// ✅ Toutes les routes nécessaires
router.get('/', ordonnanceController.getAllOrdonnances);
router.get('/:id', ordonnanceController.getOrdonnanceById);
router.post('/', ordonnanceController.createOrdonnance);
router.put('/:id/status', ordonnanceController.updateStatus);
router.put('/:id', ordonnanceController.updateOrdonnance); // ✅ corrigé ici
router.delete('/:id', ordonnanceController.deleteOrdonnance); // optionnel

export default router;
