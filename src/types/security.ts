import { AuthStatus } from "./index.js";

export interface LogSecurity {
    authStatus?: AuthStatus;
    suspicious?: boolean;
    tags?: string[];
}