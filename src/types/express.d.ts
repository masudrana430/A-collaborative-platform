export {};

declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      role: "contributor" | "maintainer";
    }

    interface Request {
      user?: User;
    }
  }
}