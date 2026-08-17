export interface Env {
    MY_BUCKET: R2Bucket;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    MSG_ACCESS_CODE: string; 
    OWNER_PASSWORD: string;
    OWNER_SESSION_SECRET: string;
    LOG_LEVEL?: string;
}
