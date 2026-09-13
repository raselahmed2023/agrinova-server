import { Router } from "express";
import authenticate from "../../middleware/authenticate";
import { NotificationController } from "./notification.controller";

const router = Router();
router.use(authenticate);
router.get("/", NotificationController.getMine);
router.patch("/read-all", NotificationController.markAllRead);
router.patch("/:notificationId/read", NotificationController.markRead);

export default router;