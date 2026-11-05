import mysql from "mysql2/promise";

export function createPool(settings) {
  const pool = mysql.createPool(settings);
  // Keep TIMESTAMP reads aligned with the driver's UTC Date conversion,
  // regardless of the MySQL host's local timezone.
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'", (error) => {
      if (error) connection.destroy();
    });
  });
  return pool;
}
