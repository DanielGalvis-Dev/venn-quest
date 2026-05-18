/**
 * Capa de Base de Datos utilizando mysql2 con soporte para Promesas.
 * Utiliza un Pool de conexiones para manejar múltiples peticiones concurrentemente.
 */
import mysql, { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Exportamos el pool por si alguna ruta necesita acceso directo (ej. transacciones)
export let pool: Pool;

/**
 * Inicializa la conexión al pool de MySQL utilizando las variables de entorno.
 * @returns {Promise<void>}
 */
export async function initDb(): Promise<void> {
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vennquest_db",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10, // Límite de conexiones simultáneas
    queueLimit: 0,
  });

  console.log(
    `✅ Conectado a MySQL (${process.env.DB_NAME}) en el puerto ${process.env.DB_PORT || 3306}`,
  );
}

/**
 * Ejecuta una consulta SQL de lectura que retorna filas (SELECT).
 * @param {string} sql - La consulta SQL a ejecutar.
 * @param {(string | number | null)[]} params - Arreglo de parámetros para prevenir inyección SQL.
 * @returns {Promise<T[]>} Arreglo de objetos tipados.
 */
export async function query<T = any>(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<T[]> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

/**
 * Ejecuta una consulta SQL y retorna únicamente la primera fila encontrada.
 * Útil para búsquedas por ID o validaciones únicas.
 * @param {string} sql - La consulta SQL a ejecutar.
 * @param {(string | number | null)[]} params - Arreglo de parámetros.
 * @returns {Promise<T | undefined>} El objeto encontrado o undefined si no hay coincidencias.
 */
export async function get<T = any>(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

/**
 * Ejecuta una sentencia SQL de escritura (INSERT, UPDATE, DELETE).
 * @param {string} sql - La consulta SQL de escritura.
 * @param {(string | number | null)[]} params - Arreglo de parámetros.
 * @returns {Promise<void>}
 */
export async function run(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<void> {
  await pool.execute<ResultSetHeader>(sql, params);
}

/** * Función mantenida por retrocompatibilidad con tu código anterior de SQLite.
 * En MySQL los datos se persisten automáticamente en el disco del servidor,
 * por lo que no es necesario hacer un guardado manual de buffers.
 */
export async function persistDb(): Promise<void> {}
