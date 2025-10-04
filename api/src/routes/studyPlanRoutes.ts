import { Router } from 'express';
import { generateStudyPlan } from '../controllers/studyPlanController';

const router = Router();

// POST /api/study-plan/generate
router.post('/generate', generateStudyPlan);

export default router;