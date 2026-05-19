/**
 * Punto de entrada del servidor Backend para VennQuest.
 * Configura Express, middlewares, rutas y levanta la conexión a DB.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDb } from "./db/database";

// Importación de las rutas modulares
import problemRouter from "./routes/problem";
import evaluateRouter from "./routes/evaluate";
import usersRouter from "./routes/users";

// Cargar variables de entorno (DB, API Keys, Puerto)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Middlewares de Seguridad y Parseo
// Habilitar CORS para permitir peticiones desde el frontend (Vite/React usualmente en puerto 5173 o 3000)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  }),
);
// Parsear body JSON limitando el tamaño para prevenir ataques
app.use(express.json({ limit: "1mb" }));

// 2. Middleware de Registro (Logging) simple para desarrollo
// app.use((req, _res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
//   next();
// });

// 3. Montaje de Rutas de la API
app.use("/api/problem", problemRouter);
app.use("/api/evaluate", evaluateRouter);
app.use("/api/users", usersRouter);

// Ruta de "Salud" para verificar que el servidor está vivo
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// 4. Manejo de Errores Globales
// Catch-all para rutas que no existen
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// Middleware capturador de errores no controlados
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: err.message });
  },
);

// 5. Inicialización de Base de Datos y Arranque del Servidor
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 VennQuest API lista → http://localhost:${PORT}`);
      console.log(
        `📊 Health check        → http://localhost:${PORT}/api/health\n`,
      );
    });
  })
  .catch((err) => {
    console.error("Fallo al arrancar la base de datos:", err);
    process.exit(1);
  });

export default app;
