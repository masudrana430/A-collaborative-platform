import { StatusCodes } from "http-status-codes";
import { pool } from "../../config/db";
import { AppError } from "../../utils/appError";

type IssueType = "bug" | "feature_request";
type IssueStatus = "open" | "in_progress" | "resolved";
type SortOption = "newest" | "oldest";
type UserRole = "contributor" | "maintainer";

interface CreateIssueInput {
  title: string;
  description: string;
  type: IssueType;
}

interface UpdateIssueInput {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
}

interface CurrentUser {
  id: number;
  name: string;
  role: UserRole;
}

interface IssueRow {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

interface ReporterRow {
  id: number;
  name: string;
  role: UserRole;
}

interface IssueWithReporter {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter: ReporterRow | null;
  created_at: Date;
  updated_at: Date;
}

interface IssueQuery {
  sort?: SortOption;
  type?: IssueType;
  status?: IssueStatus;
}

const isValidIssueType = (type: string): type is IssueType => {
  return type === "bug" || type === "feature_request";
};

const isValidIssueStatus = (status: string): status is IssueStatus => {
  return status === "open" || status === "in_progress" || status === "resolved";
};

const validateCreateIssue = (payload: CreateIssueInput): void => {
  const { title, description, type } = payload;

  if (!title || !description || !type) {
    throw new AppError(
      "Title, description and type are required",
      StatusCodes.BAD_REQUEST
    );
  }

  if (title.length > 150) {
    throw new AppError(
      "Title must not exceed 150 characters",
      StatusCodes.BAD_REQUEST
    );
  }

  if (description.length < 20) {
    throw new AppError(
      "Description must be at least 20 characters",
      StatusCodes.BAD_REQUEST
    );
  }

  if (!isValidIssueType(type)) {
    throw new AppError(
      "Type must be either bug or feature_request",
      StatusCodes.BAD_REQUEST
    );
  }
};

const validateUpdateIssue = (
  payload: UpdateIssueInput,
  currentUser: CurrentUser
): void => {
  const { title, description, type, status } = payload;

  if (!title && !description && !type && !status) {
    throw new AppError(
      "At least one field is required for update",
      StatusCodes.BAD_REQUEST
    );
  }

  if (title && title.length > 150) {
    throw new AppError(
      "Title must not exceed 150 characters",
      StatusCodes.BAD_REQUEST
    );
  }

  if (description && description.length < 20) {
    throw new AppError(
      "Description must be at least 20 characters",
      StatusCodes.BAD_REQUEST
    );
  }

  if (type && !isValidIssueType(type)) {
    throw new AppError(
      "Type must be either bug or feature_request",
      StatusCodes.BAD_REQUEST
    );
  }

  if (status && !isValidIssueStatus(status)) {
    throw new AppError(
      "Status must be open, in_progress, or resolved",
      StatusCodes.BAD_REQUEST
    );
  }

  if (status && currentUser.role !== "maintainer") {
    throw new AppError(
      "Only maintainers can update issue status",
      StatusCodes.FORBIDDEN
    );
  }
};

const attachReporters = async (
  issues: IssueRow[]
): Promise<IssueWithReporter[]> => {
  if (issues.length === 0) {
    return [];
  }

  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];

  const reportersResult = await pool.query<ReporterRow>(
    `SELECT id, name, role
     FROM users
     WHERE id = ANY($1::int[])`,
    [reporterIds]
  );

  const reporterMap = new Map<number, ReporterRow>();

  reportersResult.rows.forEach((reporter) => {
    reporterMap.set(reporter.id, reporter);
  });

  return issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter: reporterMap.get(issue.reporter_id) ?? null,
    created_at: issue.created_at,
    updated_at: issue.updated_at
  }));
};

export const createIssueService = async (
  payload: CreateIssueInput,
  reporterId: number
): Promise<IssueRow> => {
  validateCreateIssue(payload);

  const reporterResult = await pool.query(
    "SELECT id FROM users WHERE id = $1",
    [reporterId]
  );

  if (reporterResult.rows.length === 0) {
    throw new AppError("Reporter does not exist", StatusCodes.BAD_REQUEST);
  }

  const result = await pool.query<IssueRow>(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
    [payload.title, payload.description, payload.type, reporterId]
  );

  return result.rows[0];
};

export const getAllIssuesService = async (
  query: IssueQuery
): Promise<IssueWithReporter[]> => {
  const sort = query.sort ?? "newest";
  const conditions: string[] = [];
  const values: string[] = [];

  if (sort !== "newest" && sort !== "oldest") {
    throw new AppError(
      "Sort must be either newest or oldest",
      StatusCodes.BAD_REQUEST
    );
  }

  if (query.type) {
    if (!isValidIssueType(query.type)) {
      throw new AppError(
        "Type must be either bug or feature_request",
        StatusCodes.BAD_REQUEST
      );
    }

    values.push(query.type);
    conditions.push(`type = $${values.length}`);
  }

  if (query.status) {
    if (!isValidIssueStatus(query.status)) {
      throw new AppError(
        "Status must be open, in_progress, or resolved",
        StatusCodes.BAD_REQUEST
      );
    }

    values.push(query.status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderDirection = sort === "oldest" ? "ASC" : "DESC";

  const issuesResult = await pool.query<IssueRow>(
    `SELECT id, title, description, type, status, reporter_id, created_at, updated_at
     FROM issues
     ${whereClause}
     ORDER BY created_at ${orderDirection}`,
    values
  );

  return attachReporters(issuesResult.rows);
};

export const getSingleIssueService = async (
  issueId: number
): Promise<IssueWithReporter> => {
  const issueResult = await pool.query<IssueRow>(
    `SELECT id, title, description, type, status, reporter_id, created_at, updated_at
     FROM issues
     WHERE id = $1`,
    [issueId]
  );

  if (issueResult.rows.length === 0) {
    throw new AppError("Issue not found", StatusCodes.NOT_FOUND);
  }

  const issuesWithReporters = await attachReporters(issueResult.rows);

  return issuesWithReporters[0];
};

export const updateIssueService = async (
  issueId: number,
  payload: UpdateIssueInput,
  currentUser: CurrentUser
): Promise<IssueRow> => {
  validateUpdateIssue(payload, currentUser);

  const existingIssueResult = await pool.query<IssueRow>(
    `SELECT id, title, description, type, status, reporter_id, created_at, updated_at
     FROM issues
     WHERE id = $1`,
    [issueId]
  );

  if (existingIssueResult.rows.length === 0) {
    throw new AppError("Issue not found", StatusCodes.NOT_FOUND);
  }

  const existingIssue = existingIssueResult.rows[0];

  if (currentUser.role === "contributor") {
    if (existingIssue.reporter_id !== currentUser.id) {
      throw new AppError(
        "You can only update your own issues",
        StatusCodes.FORBIDDEN
      );
    }

    if (existingIssue.status !== "open") {
      throw new AppError(
        "Contributors can only update issues while status is open",
        StatusCodes.CONFLICT
      );
    }
  }

  const fields: string[] = [];
  const values: Array<string | number> = [];

  if (payload.title) {
    values.push(payload.title);
    fields.push(`title = $${values.length}`);
  }

  if (payload.description) {
    values.push(payload.description);
    fields.push(`description = $${values.length}`);
  }

  if (payload.type) {
    values.push(payload.type);
    fields.push(`type = $${values.length}`);
  }

  if (payload.status && currentUser.role === "maintainer") {
    values.push(payload.status);
    fields.push(`status = $${values.length}`);
  }

  if (fields.length === 0) {
    throw new AppError(
      "No valid fields provided for update",
      StatusCodes.BAD_REQUEST
    );
  }

  values.push(issueId);

  const updatedIssueResult = await pool.query<IssueRow>(
    `UPDATE issues
     SET ${fields.join(", ")}
     WHERE id = $${values.length}
     RETURNING id, title, description, type, status, reporter_id, created_at, updated_at`,
    values
  );

  return updatedIssueResult.rows[0];
};

export const deleteIssueService = async (issueId: number): Promise<void> => {
  const result = await pool.query<IssueRow>(
    `DELETE FROM issues
     WHERE id = $1
     RETURNING id`,
    [issueId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Issue not found", StatusCodes.NOT_FOUND);
  }
};