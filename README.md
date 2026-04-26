# 🛡️ Just Post – AI-Moderated Social Media Platform

A full-stack Instagram-like social media app with integrated AI-based cyberbullying detection and real-time moderation.

---

## 🏗️ Architecture Overview

```
just post/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Node.js + Express + Socket.io
└── ai_service/        # Python FastAPI microservice (BERT + OCR)
```

The three services run **independently** and communicate via HTTP and WebSockets:

```
[Browser] ←→ [React :5173] ←→ [Express API :5000] ←→ [FastAPI AI :8000]
                                       ↕
                                  [MongoDB :27017]
```

---

## ✅ Features Implemented

| Feature | Status |
|---|---|
| JWT Register / Login / Logout | ✅ |
| User Profile + Bio Edit | ✅ |
| Follow / Unfollow | ✅ |
| Image Post Upload | ✅ |
| Feed (followed users only) | ✅ |
| Like / Unlike posts | ✅ |
| Comments (add, delete, reply) | ✅ |
| **AI Text Moderation** | ✅ |
| **3-Level Moderation System** | ✅ |
| **Blurred comments UI** | ✅ |
| **Hidden comments indicator** | ✅ |
| **Multilingual detection (BERT)** | ✅ |
| **Image OCR + toxicity** | ✅ |
| **Dynamic toxic word learning** | ✅ |
| Real-time Chat (Socket.io) | ✅ |
| Anti-spam (5-msg limit) | ✅ |
| User search / Explore page | ✅ |
| Settings page (moderation level) | ✅ |

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18+ — https://nodejs.org/
- **Python** 3.9+ — https://python.org/
- **MongoDB** — https://www.mongodb.com/try/download/community (or use MongoDB Atlas)
- **Tesseract OCR** — https://github.com/UB-Mannheim/tesseract/wiki  
  *(Windows: Download installer, add to PATH)*

---

### Step 1 — Configure Backend

Create `backend/.env` (already created, update if needed):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/justpost
JWT_SECRET=your_super_secret_jwt_key_change_in_production
AI_SERVICE_URL=http://127.0.0.1:8000
```

---

### Step 2 — Start AI Moderation Service

Open a terminal and run:
```bat
start_ai_service.bat
```
Or manually:
```bash
cd ai_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> ⚠️ First launch downloads ~500MB of BERT model weights. This takes a few minutes.  
> The service starts at **http://localhost:8000**  
> API docs at **http://localhost:8000/docs**

---

### Step 3 — Start Backend

Open a **new** terminal:
```bat
start_backend.bat
```
Or manually:
```bash
cd backend
npm install
npm run dev
```

Runs at **http://localhost:5000**

---

### Step 4 — Start Frontend

Open a **third** terminal:
```bat
start_frontend.bat
```
Or manually:
```bash
cd frontend
npm install
npm run dev
```

Opens at **http://localhost:5173**

---

## 🤖 AI Moderation System

### Models Used

| Model | Purpose |
|---|---|
| `unitary/toxic-bert` | English toxicity detection |
| `unitary/multilingual-toxic-xlm-roberta` | Hindi/Kannada/mixed language detection |
| Tesseract OCR | Extract text from uploaded images |

### 3-Level Moderation

| Level | Score > 0.8 | Score > 0.5 | Score > 0.3 |
|---|---|---|---|
| 🟢 **Beginner** | Hidden | Allowed | Allowed |
| 🟡 **Intermediate** | Hidden | Blurred | Allowed |
| 🔴 **Strict** | Blocked | Blocked | Blocked |

- **Hidden** — Comment exists but shows "hidden by moderation" placeholder
- **Blurred** — Text is blurred with CSS; user can click to peek
- **Blocked** — Comment is rejected entirely; never saved to DB

### Dynamic Toxic Word Learning

1. Users flag words via the ⚑ report button on comments
2. Words are stored in `ToxicWord` collection with a report count
3. When a word reaches **10 reports**, it's promoted to the global block list
4. The AI service is automatically synced and starts blocking that word immediately

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update bio/moderation level |
| POST | `/api/auth/follow/:id` | Follow/Unfollow user |
| GET | `/api/auth/user/:id` | Get any user's profile |
| GET | `/api/auth/search?q=` | Search users |

### Posts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/posts/create` | Upload post (multipart) |
| GET | `/api/posts/feed` | Get followed users' posts |
| GET | `/api/posts/user/:id` | Get posts by user |
| POST | `/api/posts/:id/like` | Like/Unlike |
| DELETE | `/api/posts/:id` | Delete post |

### Comments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/comments/add` | Add comment (AI moderated) |
| GET | `/api/comments/:postId` | Get comments |
| DELETE | `/api/comments/:id` | Delete comment |
| POST | `/api/comments/report-word` | Report toxic word |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chat/conversations` | Get all conversations |
| GET | `/api/chat/history/:userId` | Message history |
| GET | `/api/chat/can-message/:userId` | Check spam restrictions |

### AI Service (FastAPI — port 8000)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/check-text` | Check text toxicity |
| POST | `/check-image` | OCR + toxicity check |
| POST | `/update-toxic-words` | Sync dynamic word list |

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express, Socket.io, Multer, JWT |
| Database | MongoDB + Mongoose |
| AI Service | Python, FastAPI, HuggingFace Transformers, Tesseract |
| Real-time | Socket.io (WebSockets) |
| Auth | JWT (7-day tokens) |

---

## 📁 Folder Structure

```
just post/
├── README.md
├── start_ai_service.bat
├── start_backend.bat
├── start_frontend.bat
│
├── ai_service/
│   ├── main.py              # FastAPI app with all AI endpoints
│   ├── requirements.txt
│   └── venv/                # (created on first run)
│
├── backend/
│   ├── server.js            # Express + Socket.io entry point
│   ├── .env                 # Environment config
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Message.js
│   │   └── ToxicWord.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── posts.js
│   │   ├── comments.js
│   │   └── chat.js
│   └── uploads/             # Uploaded images stored here
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── api/
        │   └── client.js    # Axios with JWT interceptor
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Layout.jsx   # Sidebar + mobile nav
        │   ├── PostCard.jsx
        │   └── CommentSection.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── FeedPage.jsx
            ├── CreatePostPage.jsx
            ├── ProfilePage.jsx
            ├── ChatPage.jsx
            ├── SettingsPage.jsx
            └── ExplorePage.jsx
```

---

## 🔒 Security Notes

- Change `JWT_SECRET` in `.env` before deploying
- Never commit `.env` files (`.gitignore` is already set up)
- For production: use HTTPS, rate limiting, and move to cloud storage (AWS S3)
