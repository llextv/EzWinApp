import express from 'express';
import buildController from '../controllers/build.controller';

const router = express.Router();

router.post('/', buildController.createBuild); // Create new build
router.get("/:id/download", buildController.downloadBuild); // Download .exe file
router.get("/:id/status", buildController.getBuildStatus); // Get status of BUILD from an ID

export default router;