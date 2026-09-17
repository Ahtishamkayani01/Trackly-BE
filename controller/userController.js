import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import user from "../model/userModel.js";
import sendEmail from "../utils/sendEmail.js";

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

export const ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send({
        message: "Email is required",
        success: false,
      });
    }

    const existingUser = await user.findOne({ email });
    if (!existingUser) {
      return res.send({
        message:
          "If an account exists with this email, a reset link has been sent.",
        success: true,
      });
    }

    //Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    //Store hash password in Db
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    existingUser.resetPasswordToken = hashedToken;
    //Token expires in 15 min
    existingUser.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await existingUser.save();
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const html = `
      <h2>Reset your Trackly password</h2>

      <p>You requested to reset your password.</p>

      <p>Click the button below to reset it:</p>

      <a
        href="${resetUrl}"
        style="
          display: inline-block;
          padding: 12px 20px;
          background: #000;
          color: #fff;
          text-decoration: none;
          border-radius: 6px;
        "
      >
        Reset Password
      </a>

      <p>This link will expire in 15 minutes.</p>

      <p>If you didn't request a password reset, you can ignore this email.</p>
    `;

    await sendEmail(existingUser.email, "Reset your Trackly password", html);

    return res.send({
      message:
        "If an account exists with this email, a reset link has been sent.",
      success: true,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).send({
      message: "Something went wrong",
      success: false,
    });
  }
};

export const ResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).send({
        message: "Token and password are required",
        success: false,
      });
    }

    if (password.length < 8) {
      return res.status(400).send({
        message: "Password must be at least 8 characters",
        success: false,
      });
    }

    // Hash the token received from frontend
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const existingUser = await user.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!existingUser) {
      return res.status(400).send({
        message: "Reset token is invalid or expired",
        success: false,
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    existingUser.password = hashedPassword;

    // Delete reset token after successful reset
    existingUser.resetPasswordToken = undefined;
    existingUser.resetPasswordExpires = undefined;

    await existingUser.save();

    return res.send({
      message: "Password reset successfully",
      success: true,
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).send({
      message: "Something went wrong",
      success: false,
    });
  }
};

export const Me = async (req, res) => {
  try {
    const existingUser = await user.findById(req.userId).select("-password");
    if (!existingUser) {
      return res
        .status(404)
        .send({ message: "User not found", success: false });
    }
    res.send({ success: true, user: existingUser });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};
