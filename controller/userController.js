import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import user from "../model/userModel.js";

const cookieOptions = {
  httpOnly: true,
  secure: !!process.env.VERCEL,
  sameSite: process.env.VERCEL ? "none" : "lax",
};

export const Login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.send({ message: "Please fill all the fields" });
    }
    const existingUser = await user.findOne({ email });
    if (!existingUser) {
      return res.send({ message: "User not found" });
    }
    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password,
    );
    if (!isPasswordCorrect) {
      return res.send({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    if (!token) {
      return res.send({ message: "Error in generating token" });
    }
    res.cookie("token", token, cookieOptions).send({
      message: "Login successful",
      success: true,
    });
  } catch (error) {
    res.send({ message: error.message });
  }
};

export const Signup = async (req, res) => {
  console.log(req.body);
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.send({
        message: "Please fill all the fields",
        success: false,
      });
    }
    const existingUser = await user.findOne({ email });
    if (existingUser) {
      return res.send({
        message: "User already exists",
        success: false,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new user({ name, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    if (!token) {
      return res.send({
        message: "Error in generating token",
        success: false,
      });
    }
    return res.cookie("token", token, cookieOptions).send({
      message: "User created successfully",
      success: true,
    });
  } catch (error) {
    res.send({ message: error.message, success: false });
  }
};

export const Logout = (_req, res) => {
  res.clearCookie("token", cookieOptions).send({
    message: "Logged out successfully",
    success: true,
  });
};

export const Me = async (req, res) => {
  try {
    const existingUser = await user.findById(req.userId).select("-password");
    if (!existingUser) {
      return res.status(404).send({ message: "User not found", success: false });
    }
    res.send({ success: true, user: existingUser });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};
