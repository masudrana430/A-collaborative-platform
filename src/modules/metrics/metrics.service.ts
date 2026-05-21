import { pool } from "../../config/db";

interface CountRow {
  count: string;
}

interface MetricsData {
  users: {
    total: number;
    contributors: number;
    maintainers: number;
  };
  issues: {
    total: number;
    bugs: number;
    feature_requests: number;
    open: number;
    in_progress: number;
    resolved: number;
  };
}

const getCount = async (
  query: string,
  values: Array<string | number> = []
): Promise<number> => {
  const result = await pool.query<CountRow>(query, values);
  return Number(result.rows[0].count);
};

export const getMetricsService = async (): Promise<MetricsData> => {
  const [
    totalUsers,
    totalContributors,
    totalMaintainers,
    totalIssues,
    totalBugs,
    totalFeatureRequests,
    totalOpenIssues,
    totalInProgressIssues,
    totalResolvedIssues
  ] = await Promise.all([
    getCount("SELECT COUNT(*) FROM users"),
    getCount("SELECT COUNT(*) FROM users WHERE role = $1", ["contributor"]),
    getCount("SELECT COUNT(*) FROM users WHERE role = $1", ["maintainer"]),
    getCount("SELECT COUNT(*) FROM issues"),
    getCount("SELECT COUNT(*) FROM issues WHERE type = $1", ["bug"]),
    getCount("SELECT COUNT(*) FROM issues WHERE type = $1", ["feature_request"]),
    getCount("SELECT COUNT(*) FROM issues WHERE status = $1", ["open"]),
    getCount("SELECT COUNT(*) FROM issues WHERE status = $1", ["in_progress"]),
    getCount("SELECT COUNT(*) FROM issues WHERE status = $1", ["resolved"])
  ]);

  return {
    users: {
      total: totalUsers,
      contributors: totalContributors,
      maintainers: totalMaintainers
    },
    issues: {
      total: totalIssues,
      bugs: totalBugs,
      feature_requests: totalFeatureRequests,
      open: totalOpenIssues,
      in_progress: totalInProgressIssues,
      resolved: totalResolvedIssues
    }
  };
};