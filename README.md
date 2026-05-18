# VennQuest 🎓⊙

Aplicación web educativa interactiva de matemáticas donde los usuarios aprenden **Teoría de Conjuntos** y **Diagramas de Venn** mediante drag & drop, con feedback pedagógico impulsado por IA (Gemini).

---

## 🏗️ Arquitectura

```
venn-quest/
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── db/
│   │   │   └── init.ts         # SQLite schema + seed data
│   │   ├── routes/
│   │   │   ├── problem.ts      # GET /api/problem?userId=X
│   │   │   ├── evaluate.ts     # POST /api/evaluate (Gemini integration)
│   │   │   └── users.ts        # CRUD de usuarios
│   │   ├── types.ts            # Tipos compartidos del backend
│   │   └── index.ts            # Express app entry point
│   ├── .env                    # Variables de entorno (Gemini API key)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/
│   │   │   │   ├── GameScreen.tsx       # Pantalla principal con DnD Context
│   │   │   │   ├── DraggableChip.tsx    # Ficha arrastrable (@dnd-kit)
│   │   │   │   ├── DropZone.tsx         # Zona de caída droppable
│   │   │   │   ├── VennDiagram2Set.tsx  # Diagrama 2 conjuntos
│   │   │   │   ├── VennDiagram3Set.tsx  # Diagrama 3 conjuntos
│   │   │   │   └── FeedbackModal.tsx    # Modal con respuesta de IA
│   │   │   └── ui/
│   │   │       ├── Header.tsx           # Barra de nivel + XP
│   │   │       ├── WelcomeScreen.tsx    # Login / creación de usuario
│   │   │       └── LoadingScreen.tsx    # Estados de carga y error
│   │   ├── hooks/
│   │   │   └── useVennGame.ts           # Estado del diagrama
│   │   ├── types/
│   │   │   └── index.ts                 # Tipos TypeScript compartidos
│   │   ├── utils/
│   │   │   └── api.ts                   # Llamadas al backend
│   │   ├── App.tsx                      # Orquestador principal
│   │   ├── main.tsx
│   │   └── index.css                    # Tailwind + estilos globales
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── package.json                # Scripts raíz (monorepo)
└── README.md
```

---

## 🚀 Instalación y Arranque

### Prerrequisitos
- Node.js 18+
- npm 9+

### Paso 1 — Instalar dependencias

```bash
# Desde la raíz del proyecto
cd venn-quest

# Instalar dependencias del backend
cd backend && npm install && cd ..

# Instalar dependencias del frontend
cd frontend && npm install && cd ..
```

### Paso 2 — Configurar variables de entorno (backend)

El archivo `backend/.env` ya está incluido con:

```env
PORT=3001
GEMINI_API_KEY=AIzaSyC_a-h4geKeyWrfn1DmCHCOe-6CDKjnKRk
GEMINI_MODEL=gemini-flash-latest
DB_PATH=./vennquest.db
```

> ⚠️ En producción, **nunca** subas `.env` a un repositorio público.

### Paso 3 — Levantar el backend

```bash
cd backend
npm run dev
# ✅ API corriendo en http://localhost:3001
# ✅ SQLite inicializado con problemas y usuario de prueba
```

### Paso 4 — Levantar el frontend (otra terminal)

```bash
cd frontend
npm run dev
# ✅ Vite corriendo en http://localhost:5173
```

### Acceder a la app

Abre **http://localhost:5173** en tu navegador.

- Haz clic en **"🚀 Jugar Ahora"** para usar el usuario de prueba (`estudiante1`, id=1)
- O crea un nuevo usuario con tu nombre

---

## 🎮 Flujo de Juego

1. **Pantalla de Bienvenida** → selecciona/crea usuario
2. **El backend** consulta el nivel del usuario en SQLite y devuelve un problema apropiado
3. **Pantalla de Juego** → arrastra las fichas a las zonas del diagrama de Venn
4. **"✨ Completar y Evaluar"** → envía la distribución al backend
5. **El backend** envía un prompt a la API de Gemini con el enunciado y la respuesta del alumno
6. **Gemini** devuelve feedback pedagógico en español
7. Si es **correcto**: se suman XP, se verifica si sube de nivel, y se actualiza SQLite
8. El **Modal** muestra el feedback de la IA, barra de XP actualizada, y opción de "Siguiente Problema"

---

## 📊 Base de Datos (SQLite)

### Tabla `users`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER PK | Auto-incremento |
| username | TEXT UNIQUE | Nombre del estudiante |
| current_level | INTEGER | Nivel actual (1-3) |
| experience_points | INTEGER | XP acumulados |

### Tabla `problems`
| Campo | Descripción |
|-------|-------------|
| level | 1=fácil, 2=intermedio, 3=avanzado (3 conjuntos) |
| statement | Enunciado del problema |
| universe | Elementos del universo separados por coma |
| set_a_label, set_b_label, set_c_label | Etiquetas de los conjuntos |
| correct_only_a/b/c | Respuestas correctas por zona |
| correct_intersection_ab/ac/bc/abc | Intersecciones correctas |
| correct_none | Elementos fuera de todos los conjuntos |

### Tabla `user_progress`
Registra qué problemas ha resuelto cada usuario y cuántos intentos tomó.

### Sistema de Niveles
| Nivel | XP requerido | Tipo de problemas |
|-------|-------------|-------------------|
| 1 – Aprendiz | 0 XP | 2 conjuntos, fáciles |
| 2 – Explorador | 400 XP | 2 conjuntos, intermedios |
| 3 – Maestro | 900 XP | 3 conjuntos, avanzados |

---

## 🔌 Endpoints de la API

### `GET /api/problem?userId=1`
Devuelve un problema adecuado al nivel del usuario.

```json
{
  "problem": {
    "id": 1,
    "level": 1,
    "title": "Números Pares e Impares",
    "statement": "Del conjunto universo...",
    "universe": ["1","2","3","4","5","6","7","8","9","10"],
    "setALabel": "Pares (A)",
    "setBLabel": "Menores que 6 (B)",
    "isThreeSet": false,
    "xpReward": 120
  },
  "user": { "id": 1, "username": "estudiante1", "current_level": 1, "experience_points": 0 }
}
```

### `POST /api/evaluate`
Evalúa la respuesta del usuario y consulta a Gemini.

**Body:**
```json
{
  "userId": 1,
  "problemId": 1,
  "distribution": {
    "onlyA": ["6","8","10"],
    "onlyB": ["1","3","5"],
    "intersectionAB": ["2","4"],
    "none": ["7","9"]
  }
}
```

**Response:**
```json
{
  "feedback": "🎉 ¡Excelente trabajo! Has identificado correctamente...",
  "isCorrect": true,
  "user": {
    "current_level": 1,
    "experience_points": 120,
    "leveledUp": false,
    "xpForNextLevel": 400
  }
}
```

### `GET /api/users` — Lista todos los usuarios
### `GET /api/users/:id` — Perfil de un usuario
### `POST /api/users` — Crea un usuario `{ username: "nombre" }`

---

## 🛠️ Scripts disponibles

```bash
# Backend
cd backend
npm run dev        # Desarrollo con hot-reload
npm run build      # Compilar TypeScript
npm run start      # Producción
npm run db:init    # Re-inicializar base de datos

# Frontend
cd frontend
npm run dev        # Servidor de desarrollo Vite
npm run build      # Build de producción
npm run preview    # Vista previa del build
```

---

## 🎨 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS 3 |
| Drag & Drop | @dnd-kit/core |
| Backend | Node.js + Express + TypeScript |
| Base de Datos | SQLite (better-sqlite3) |
| IA | Google Gemini (@google/generative-ai) |
| Fuentes | Fredoka One + Nunito (Google Fonts) |
