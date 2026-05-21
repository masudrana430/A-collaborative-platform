import { StatusCodes } from "http-status-codes";
import { pool } from "../../config/db";
import { AppError } from "../../utils/appError";

type IssueType = "bug" | "feature_request";
type IssueStatus = "open" | "in_progress" | "resolved";
type SortOption = "newest" | "oldest";

interface CreateIssueInput {
  title: string;
  description: string;
  type: IssueType;
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
  role: "contributor" | "maintainer";
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