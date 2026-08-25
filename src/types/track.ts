export type UserRole = "admin" | "user" | "guest" | string;

export interface LogTrack {
    userId: string;
    role?: UserRole;
    ip?: string;
    userAgent?: string;
    geo?: string;
}