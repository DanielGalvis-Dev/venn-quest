# VennQuest 🎓⊙

Aplicación web educativa interactiva de matemáticas donde los usuarios aprenden **Teoría de Conjuntos** y **Diagramas de Venn** mediante drag & drop, con feedback pedagógico impulsado por IA.

---

## 🏗️ Arquitectura

```
venn-quest/
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── db/
│   │   │   └── database.ts     # Configuración y conexión MySQL
│   │   ├── routes/
│   │   │   ├── problem.ts      # GET /api/problem?userId=X
│   │   │   ├── evaluate.ts     # POST /api/evaluate (Gemini)
│   │   │   └── users.ts        # CRUD de usuarios
│   │   └── index.ts            # Express app entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/
│   │   │   │   ├── GameScreen.tsx
│   │   │   │   ├── DraggableChip.tsx
│   │   │   │   ├── DropZone.tsx
│   │   │   │   ├── VennDiagram2Set.tsx
│   │   │   │   ├── VennDiagram3Set.tsx
│   │   │   │   ├── VennDiagram4Set.tsx
│   │   │   │   └── FeedbackModal.tsx
│   │   │   └── ui/
│   │   │       ├── Header.tsx
│   │   │       ├── SignIn.tsx
│   │   │       ├── SignUp.tsx
│   │   │       ├── ChangeUsernameModal.tsx
│   │   │       ├── ChangePasswordModal.tsx
│   │   │       └── LoadingScreen.tsx
│   │   ├── hooks/
│   │   │   └── useVennGame.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── api.ts
│   │   │   └── alerts.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── package.json
└── README.md
```

---

## 🚀 Instalación

```bash
git clone https://github.com/tu-usuario/venn-quest.git
cd venn-quest
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

---

## ⚙️ Variables de entorno

Crea el archivo `backend/.env` con los siguientes valores:

```env
PORT=3001

DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=vennquest_db

GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

---

## ▶️ Arranque

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

---

## 🎮 Flujo de juego

1. Registro e inicio de sesión
2. El backend asigna un problema según el nivel del usuario
3. El estudiante arrastra fichas a las zonas del diagrama de Venn
4. Al evaluar, Gemini genera feedback pedagógico en español
5. Si es correcto se suman XP y se verifica subida de nivel

---

## 📊 Base de datos

### `users`
| Campo | Tipo |
|-------|------|
| id | INT PK |
| username | VARCHAR(50) UNIQUE |
| password_hash | VARCHAR(255) |
| email | VARCHAR(255) |
| current_level | INT |
| experience_points | INT |

### `problems`
| Campo | Descripción |
|-------|-------------|
| level | 1=2 conjuntos, 2=3 conjuntos, 3=4 conjuntos |
| title | Título del problema |
| statement | Enunciado |
| solution_json | Respuesta correcta por zona |
| hints_json | Preguntas guía por conjunto |
| xp_reward | XP al resolver correctamente |

### Sistema de niveles
| Nivel | Rango | XP |
|-------|-------|----|
| 1 | 🌱 Aprendiz | 0 |
| 2 | 🔮 Explorador | 500 |
| 3 | 👑 Maestro | 1700 |

---

## 🔌 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/problem?userId=X | Problema según nivel |
| POST | /api/evaluate | Evalúa respuesta con Gemini |
| POST | /api/users | Registro |
| POST | /api/users/login | Inicio de sesión |
| POST | /api/users/forgot-password | Recuperar contraseña |
| GET | /api/users/:id | Perfil de usuario |
| PUT | /api/users/update-username | Cambiar nombre |
| PUT | /api/users/update-password | Cambiar contraseña |

---

## 🛠️ Scripts

```bash
# Backend
npm run dev        # Desarrollo
npm run build      # Compilar
npm run start      # Producción

# Frontend
npm run dev        # Desarrollo
npm run build      # Build
npm run preview    # Vista previa
```

---

## 🎨 Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + SweetAlert2 |
| Drag & Drop | @dnd-kit/core |
| Backend | Node.js + Express + TypeScript |
| Base de datos | MySQL 8 |
| Autenticación | bcryptjs |
| Email | Nodemailer |
| IA | Google Gemini |
| Fuentes | Fredoka One + Nunito |

---

## 🚀 Despliegue

| Servicio | Plataforma |
|---------|-----------|
| Frontend | Vercel |
| Backend | Railway |
| Base de datos | Aiven |
