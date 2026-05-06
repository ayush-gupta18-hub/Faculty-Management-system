#  LNMIIT Faculty Management System

A full-stack web application for managing faculty members, departments, and course allocations at **The LNM Institute of Information Technology (LNMIIT)**. Built with vanilla HTML/CSS/JS on the frontend and Node.js + Express + MongoDB on the backend.

---

##  Features

- **All Faculty** — View all registered faculty in a card grid with search by name or department
- **Add Faculty** — Register new faculty with auto-generated Employee IDs and full validation
- **Allocate Course** — Assign courses to faculty members; view and remove allocations
- **Retrieve Details** — View a faculty member's complete profile and allocated courses
- **Persistent Storage** — All data is stored in MongoDB; survives page refreshes and server restarts
- **Real-time Stats** — Live counts of total faculty, departments, and courses assigned

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas or Local) |
| ODM | Mongoose |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts — Inter |

---

##  Project Structure

```
Faculty-Management/
├── index.html              # Main frontend UI
├── style.css               # All styles
├── app.js                  # Frontend logic (fetch-based API calls)
├── lnmiit_logo.png         # LNMIIT brand logo
└── server/
    ├── server.js           # Express server + REST API routes
    ├── package.json        # Backend dependencies
    ├── .env                # Environment variables (MongoDB URI, Port)
    ├── .gitignore
    └── models/
        └── Faculty.js      # Mongoose schema for Faculty
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A MongoDB database — either:
  - **MongoDB Atlas** (free cloud tier): [cloud.mongodb.com](https://cloud.mongodb.com)
  - **Local MongoDB**: [Install MongoDB Community](https://www.mongodb.com/try/download/community)

---

### 1. Clone the Repository

```bash
git clone https://github.com/ayush-gupta18-hub/Faculty-Management-system.git
cd Faculty-Management
```

---

### 2. Configure the Database

Open `server/.env` and set your MongoDB connection string:

```env

# Local MongoDB
MONGO_URI=mongodb://localhost:27017/faculty_management

PORT=5000
```

> **Getting an Atlas URI:**
> 1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create a free cluster
> 2. Click **Connect** → **Drivers**
> 3. Copy the connection string and replace `<password>` with your DB user password

---

### 3. Add JWT_SECRET

# MongoDB
MONGO_URI=mongodb://localhost:27017/faculty_management

# Server
PORT=5000

# JWT Secret (REQUIRED for authentication)
JWT_SECRET=your_super_secret_key_here
### 4. Install Dependencies

```bash
cd server
npm install
```

---

### 5. Start the Server

```bash
node server.js
```

You should see:

```
✅  Connected to MongoDB
🚀  Server running at http://localhost:5000
  API base:        http://localhost:5000/api/faculty
```

---

### 6. Open the App

Visit **[http://localhost:5000](http://localhost:5000)** in your browser.

> ⚠️ Do **not** open `index.html` directly as a file — always use the server URL so the API calls work correctly.

---

##  REST API Reference

All endpoints are prefixed with `/api/faculty`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/faculty` | Fetch all faculty members |
| `POST` | `/api/faculty` | Add a new faculty member |
| `DELETE` | `/api/faculty/:id` | Delete a faculty member (and their courses) |
| `POST` | `/api/faculty/:id/courses` | Allocate a course to a faculty member |
| `DELETE` | `/api/faculty/:id/courses/:code` | Remove a course allocation |

### Example — Add Faculty

```http
POST /api/faculty
Content-Type: application/json

{
  "firstName": "Ravi",
  "lastName": "Kumar",
  "empId": "EMP005",
  "department": "CSE",
  "designation": "Assistant Professor",
  "joiningYear": 2022,
  "email": "ravi.kumar@lnmiit.ac.in",
  "phone": "9876543214",
  "specialization": "Machine Learning"
}
```

### Example — Allocate a Course

```http
POST /api/faculty/<faculty_id>/courses
Content-Type: application/json

{
  "code": "CSE501",
  "name": "Machine Learning"
}
```

---

##  Data Model

```js
Faculty {
  firstName:      String   (required)
  lastName:       String   (required)
  empId:          String   (required, unique)
  department:     String   (required)
  designation:    String   (required)
  joiningYear:    Number   (required)
  email:          String   (required, unique)
  phone:          String
  specialization: String
  courses: [{
    code: String,
    name: String
  }]
  color:          String   (avatar color, auto-assigned)
  createdAt:      Date     (auto)
  updatedAt:      Date     (auto)
}
```

---

##  Validation Rules

| Field | Rule |
|---|---|
| Employee ID | Auto-generated; must be unique |
| Email | Valid format; must be unique |
| Phone | Exactly 10 digits (optional) |
| Joining Year | Between 1990 and current year |
| Course Code | Unique per faculty member |

---

##  Development

To run with **auto-restart** on file changes, use `nodemon`:

```bash
cd server
npm run dev
```

---

##  License

This project is built for academic purposes at LNMIIT.

---

*Built for LNMIIT — The LNM Institute of Information Technology*
