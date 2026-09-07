import { Router } from "express";
import { Login, Signup } from "../controller/userController.js";

const route = Router();

route.post("/signup",Signup);
route.post("/login",Login);

export default route;