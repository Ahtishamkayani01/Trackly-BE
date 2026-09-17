import { Router } from "express";
import {
  Login,
  Signup,
  Logout,
  Me,
  ForgotPassword,
  ResetPassword,
} from "../controller/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const route = Router();

route.post("/signup", Signup);
route.post("/login", Login);
route.post("/logout", Logout);
route.get("/me", requireAuth, Me);
route.post("/forgot-password", ForgotPassword);
route.post("/reset-password/:token", ResetPassword);

export default route;
