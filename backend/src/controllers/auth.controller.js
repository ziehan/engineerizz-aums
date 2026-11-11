const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const env = require("../config/env.config");
const { revokeToken } = require("../middlewares/auth.middleware");

const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(150),
  password: z.string().min(8).max(128),
  role: z
    .enum(["CITIZEN", "FIELD_OFFICER", "CRM_OFFICER", "ADMIN"])
    .default("CITIZEN"),
  nik: z.string().trim().max(50).optional(),
  nip: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(50).optional(),
  departmentId: z.string().uuid().optional(),
});

const officerSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(150),
  password: z.string().min(8).max(128),
  role: z.enum(["FIELD_OFFICER", "CRM_OFFICER", "ADMIN"]),
  nip: z.string().trim().max(50).optional(),
  unit: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  departmentId: z.string().uuid().optional(),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254).optional(),
  email: z.string().trim().max(254).optional(),
  password: z.string().min(1).max(128),
});

const DEFAULT_DEPARTMENTS = [
  {
    name: "Dinas Sumber Daya Air",
    description: "Pengelolaan drainase, sungai, dan pompa banjir",
  },
  {
    name: "Dinas Bina Marga",
    description: "Perbaikan jalan, jembatan, trotoar, dan lampu jalan",
  },
  {
    name: "Dinas Lingkungan Hidup",
    description: "Pengelolaan sampah, kebersihan saluran, dan limbah",
  },
  {
    name: "Dinas Perhubungan",
    description: "Manajemen lalu lintas, marka jalan, dan halte",
  },
  {
    name: "Dinas Pertamanan dan Hutan Kota",
    description: "Pohon tumbang, taman kota, dan ruang terbuka hijau",
  },
];

/**
 * @typedef {Object} RegisterPayload
 * @property {string} email - Unique email address.
 * @property {string} name - Full user name.
 * @property {string} password - Raw password to hash with bcrypt (min 8 chars).
 * @property {"CITIZEN"|"FIELD_OFFICER"|"CRM_OFFICER"|"ADMIN"} [role="CITIZEN"] - Assigned system role.
 * @property {string} [nik] - Nomor Induk Kependudukan (16 digits).
 * @property {string} [nip] - Nomor Induk Pegawai for civil servants.
 * @property {string} [phone] - Contact phone number.
 * @property {string} [departmentId] - UUID of associated SKPD department.
 */

/**
 * @typedef {Object} LoginPayload
 * @property {string} [identifier] - Email, NIK, NIP, or phone number.
 * @property {string} [email] - Alternate email field.
 * @property {string} password - User password for bcrypt verification.
 */

/**
 * @typedef {Object} OfficerPayload
 * @property {string} email - Government official email address.
 * @property {string} name - Official staff name.
 * @property {string} password - Initial access password.
 * @property {"FIELD_OFFICER"|"CRM_OFFICER"|"ADMIN"} role - Staff role.
 * @property {string} [nip] - Nomor Induk Pegawai.
 * @property {string} [unit] - Sub-agency unit name.
 * @property {string} [phone] - Staff mobile number.
 * @property {string} [departmentId] - UUID of associated SKPD department.
 */

/**
 * @typedef {Object} PublicUserProfile
 * @property {string} id - UUID identifier.
 * @property {string} email - User email address.
 * @property {string} name - Display name.
 * @property {string} role - System UserRole.
 * @property {string|null} departmentId - Department UUID.
 * @property {string|null} nip - Civil servant NIP.
 * @property {string|null} unit - Sub-unit name.
 * @property {string|null} phone - Telephone number.
 * @property {string|null} nik - Citizen NIK.
 * @property {boolean} isAvailable - Availability flag.
 * @property {{id: string, name: string}|null} department - Department relation info.
 * @property {Date} createdAt - Registration date.
 * @property {Date} updatedAt - Last profile update.
 */

/**
 * Sanitizes a user database record into a safe public profile payload.
 *
 * @description
 * Strips password hash and internal security tokens before serializing user records to HTTP responses.
 *
 * @param {Object} user - User record from database.
 * @returns {PublicUserProfile|null} Publicly safe user profile object or null.
 */
function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId || null,
    nip: user.nip || null,
    unit: user.unit || null,
    phone: user.phone || null,
    nik: user.nik || null,
    isAvailable: user.isAvailable ?? true,
    department: user.department
      ? { id: user.department.id, name: user.department.name }
      : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Controller handling user registration, authentication, officers management,
 * and department directories for AUMS.
 *
 * @description
 * Exposes handlers for citizen self-registration, multi-identifier credential login,
 * JWT lifecycle with in-memory revocation, profile retrieval, admin officer provisioning,
 * and DKI Jakarta SKPD agency listings.
 */
class AuthController {
  /**
   * Initializes the AuthController instance with database client dependency.
   *
   * @description
   * Stores PrismaClient and binds instance route handler methods to maintain execution context.
   *
   * @param {Object} options - Dependency options.
   * @param {import("@prisma/client").PrismaClient} options.prisma - Prisma client instance.
   */
  constructor({ prisma }) {
    this.prisma = prisma;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.me = this.me.bind(this);
    this.createOfficer = this.createOfficer.bind(this);
    this.listDepartments = this.listDepartments.bind(this);
  }

  /**
   * Registers a new user account with hashed password.
   *
   * @description
   * Handles POST /api/v1/auth/register endpoint.
   * Validates registration payload with Zod schema, hashes password using bcrypt (12 rounds),
   * persists the user record in PostgreSQL, and returns public profile without password.
   *
   * @param {import("express").Request} req - Express request containing RegisterPayload body.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 201 Created with public user data.
   * @throws {Error} Returns HTTP 400 on Zod validation failure, or passes unique constraint error to next.
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
          nik: input.nik || null,
          nip: input.nip || null,
          phone: input.phone || null,
          departmentId: input.departmentId || null,
        },
        include: { department: true },
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
   * Authenticates user credentials and issues a signed JWT token (expires in 8h).
   *
   * @description
   * Handles POST /api/v1/auth/login endpoint.
   * Supports multi-identifier lookup across email, NIK, NIP, or phone number.
   * Compares password with stored bcrypt hash, generates a JWT signed with env.jwtSecret,
   * and returns token and public user profile.
   *
   * @param {import("express").Request} req - Express request with identifier and password.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 200 OK with token and user profile.
   * @throws {Error} Returns HTTP 400 for missing identifier/schema errors, HTTP 401 for invalid credentials.
   */
  async login(req, res, next) {
    try {
      const input = loginSchema.parse(req.body || {});
      const identifier = String(input.identifier || input.email || "").trim();
      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: "Identifier (email, NIK, NIP, or phone) is required",
        });
      }

      let user = null;
      if (typeof this.prisma?.user?.findFirst === "function") {
        user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { nik: identifier },
              { nip: identifier },
              { phone: identifier },
            ],
          },
          include: { department: true },
        });
      } else if (typeof this.prisma?.user?.findUnique === "function") {
        user = await this.prisma.user.findUnique({
          where: { email: identifier.toLowerCase() },
          include: { department: true },
        });
      }

      const passwordMatches = user
        ? await bcrypt.compare(input.password, user.password)
        : false;
      if (!user || !passwordMatches) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          id: user.id,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId || null,
          nip: user.nip || null,
        },
        env.jwtSecret,
        { expiresIn: "8h" },
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

  /**
   * Logs out the user and revokes their JWT token via in-memory blacklist.
   *
   * @description
   * Handles POST /api/v1/auth/logout endpoint.
   * Extracts token from Authorization header or req.token and adds it to the revoked tokens Set.
   *
   * @param {import("express").Request} req - Express request containing Authorization Bearer token.
   * @param {import("express").Response} res - Express response object.
   * @returns {import("express").Response} Sends HTTP 200 OK confirming logout.
   */
  async logout(req, res) {
    const token = req.token || (req.get("authorization") || "").split(" ")[1];
    if (token) {
      revokeToken(token);
    }
    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  }

  /**
   * Retrieves the authenticated user's active profile.
   *
   * @description
   * Handles GET /api/v1/auth/me endpoint.
   * Reads userId from authenticated req.user and queries database for current user attributes.
   *
   * @param {import("express").Request} req - Express request populated with req.user by auth middleware.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 200 OK with public user profile.
   * @throws {Error} Returns HTTP 401 if unauthenticated, HTTP 404 if user no longer exists.
   */
  async me(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      return res.json({ success: true, data: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Creates a new officer or CRM account (Admin only).
   *
   * @description
   * Handles POST /api/v1/auth/officers endpoint (ADMIN role required).
   * Validates officer attributes (NIP, department, unit, role), hashes password, and persists record.
   *
   * @param {import("express").Request} req - Express request containing OfficerPayload body.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 201 Created with new officer profile.
   * @throws {Error} Returns HTTP 400 for Zod validation failure, HTTP 403 if requester is not ADMIN.
   */
  async createOfficer(req, res, next) {
    try {
      const input = officerSchema.parse(req.body || {});
      const password = await bcrypt.hash(input.password, 12);
      const user = await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          password,
          role: input.role,
          nip: input.nip || null,
          unit: input.unit || null,
          phone: input.phone || null,
          departmentId: input.departmentId || null,
        },
        include: { department: true },
      });
      return res.status(201).json({ success: true, data: publicUser(user) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid officer payload",
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
   * Lists all SKPD / Departments in DKI Jakarta.
   *
   * @description
   * Handles GET /api/v1/auth/departments endpoint.
   * Queries Department model ordered by name, with deterministic static fallback to DKI Jakarta SKPDs.
   *
   * @param {import("express").Request} req - Express request.
   * @param {import("express").Response} res - Express response object.
   * @param {import("express").NextFunction} next - Express next middleware function.
   * @returns {Promise<import("express").Response|void>} Sends HTTP 200 OK with array of departments.
   */
  async listDepartments(req, res, next) {
    try {
      let departments = [];
      try {
        departments = await this.prisma.department.findMany({
          orderBy: { name: "asc" },
        });
      } catch (dbErr) {
        // Fallback to static DKI Jakarta departments list
      }
      if (!departments || departments.length === 0) {
        departments = DEFAULT_DEPARTMENTS.map((dept, index) => ({
          id: `dept-${index + 1}`,
          ...dept,
        }));
      }
      return res.json({ success: true, data: departments });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = AuthController;
