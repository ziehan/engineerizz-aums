const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const env = require("../config/env.config");

const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(150),
  password: z.string().min(8).max(128),
  role: z.enum(["CITIZEN"]).default("CITIZEN"),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

/**
 * Sanitizes a user database record into a safe public profile payload.
 *
 * @param {Object} user - User record from database.
 * @returns {Object} Publicly safe user profile object.
 */
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Controller handling user registration and authentication for AUMS.
 */
class AuthController {
  /**
   * @param {Object} options - Dependency options.
   * @param {import("@prisma/client").PrismaClient} options.prisma - Prisma client instance.
   */
  constructor({ prisma }) {
    this.prisma = prisma;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
  }

  /**
   * Registers a new user account with hashed password.
   *
   * @param {import("express").Request} req - Express request containing user credentials.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Created user record.
   */
  async register(req, res, next) {
    try {
      const input = registerSchema.parse(req.body || {});
      const password = await bcrypt.hash(input.password, 12);
      const user = await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          password,
          role: input.role,
        },
      });
      return res.status(201).json({ success: true, data: publicUser(user) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid registration payload",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      return next(error);
    }
  }

  /**
   * Authenticates user credentials and issues a signed JWT token.
   *
   * @param {import("express").Request} req - Express request with email and password.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} JWT token and user profile.
   */
  async login(req, res, next) {
    try {
      const input = loginSchema.parse(req.body || {});
      const user = await this.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      const passwordMatches = user
        ? await bcrypt.compare(input.password, user.password)
        : false;
      if (!user || !passwordMatches) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        env.jwtSecret,
        { expiresIn: "1h" },
      );
      return res.json({
        success: true,
        data: { token, user: publicUser(user) },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid login payload",
          errors: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      return next(error);
    }
  }
}

module.exports = AuthController;
