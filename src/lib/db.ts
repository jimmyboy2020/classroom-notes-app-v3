import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_NgqBfSV73ZWz@ep-still-silence-a8dlmd5t.eastus2.azure.neon.tech/neondb?sslmode=require",
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;