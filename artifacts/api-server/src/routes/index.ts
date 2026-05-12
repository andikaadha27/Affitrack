import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import revenuesRouter from "./revenues";
import adsRouter from "./ads";
import expensesRouter from "./expenses";
import employeesRouter from "./employees";
import schedulesRouter from "./schedules";
import attendanceRouter from "./attendance";
import salariesRouter from "./salaries";
import activityRouter from "./activity";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(revenuesRouter);
router.use(adsRouter);
router.use(expensesRouter);
router.use(employeesRouter);
router.use(schedulesRouter);
router.use(attendanceRouter);
router.use(salariesRouter);
router.use(activityRouter);

export default router;
