import mysql from "mysql2/promise";
import { databaseSettings } from "./settings.js";
export const pool = mysql.createPool({
  ...databaseSettings(),
  connectionLimit: 10,
  decimalNumbers: true,
  dateStrings: true,
});
export async function transaction(fn) {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const result = await fn(c);
    await c.commit();
    return result;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
