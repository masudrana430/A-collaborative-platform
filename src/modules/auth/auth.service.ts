import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { pool } from "../../config/db";
import { AppError } from "../../utils/appError";

type UserRole = "contributor" | "maintainer";

interface SignupInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface LoginInput {
  email: string;
  password: string;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

const removePassword = (user: UserRow): SafeUser => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidRole = (role: string): role is UserRole => {
  return role === "contributor" || role === "maintainer";
};

export const signupService = async (payload: SignupInput): Promise<SafeUser> => {
  const { name, email, password } = payload;
  const role = payload.role ?? "contributor";

  if (!name || !email || !password) {
    throw new AppError(
      "Name, email and password are required",
      StatusCodes.BAD_REQUEST
    );
  }

  if (!isValidEmail(email)) {
    throw new AppError("Invalid email address", StatusCodes.BAD_REQUEST);
  }

  if (!isValidRole(role)) {
    throw new AppError(
      "Role must be either contributor or maintainer",
      StatusCodes.BAD_REQUEST
    );
  }

  const existingUser = await pool.query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError("Email already exists", StatusCodes.BAD_REQUEST);
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, password, role, created_at, updated_at`,
    [name, email, hashedPassword, role]
  );

  return removePassword(result.rows[0]);
};

export const loginService = async (
  payload: LoginInput
): Promise<{ token: string; user: SafeUser }> => {
  const { email, password } = payload;

  if (!email || !password) {
    throw new AppError(
      "Email and password are required",
      StatusCodes.BAD_REQUEST
    );
  }

  const result = await pool.query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);
  }

  const user = result.rows[0];

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", StatusCodes.UNAUTHORIZED);
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AppError(
      "JWT secret is missing",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1d") as SignOptions["expiresIn"];

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      role: user.role
    },
    jwtSecret,
    { expiresIn }
  );

  return {
    token,
    user: removePassword(user)
  };
};