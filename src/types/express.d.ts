export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        role:
          | "FARMER"
          | "EXPERT"
          | "ADMIN";
        status?: string;
      };
    }
  }
}