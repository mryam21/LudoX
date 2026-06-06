# 🎲 LudoX

> A real-time multiplayer Ludo game built with the MERN stack and Socket.io

![License](https://img.shields.io/badge/license-ISC-green)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black)

---

## 📌 Overview

**LudoX** is a full-stack multiplayer implementation of the classic Ludo board game. Players can sign up, join lobbies, play in real time against others, track their match history, and compete on a global leaderboard — all from the browser.

---

## ✨ Features

- 🔐 **Authentication** — Signup, login, and profile management
- 🏠 **Lobby System** — Create or join a game room with up to 4 players
- 🎮 **Real-Time Gameplay** — Live turn-based game powered by WebSockets
- 💬 **Live Chat** — In-game chat with quick emoji reactions
- 📜 **Game Log** — Move-by-move event history per match
- 🏆 **Leaderboard** — Global rankings by coins earned
- 📊 **Match History** — Review past games and results
- 👤 **Profile Update** — Change password and personal info
- 📱 **Responsive Design** — Works across desktop and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JS |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| Real-Time | Socket.io |
| Dev Tools | Nodemon, ts-node |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ludox.git
cd ludox

# Install dependencies
npm install
```

### Environment Setup

Create a `config.env` file in the root directory:

```env
MONGO_URI=your_mongodb_connection_string
PORT=8000
```

### Running the App

```bash
# Server Side
cd server
npm run dev

# Client Side
cd client
npm run dev
```

Then open your browser at `http://localhost:8000`

---

## 🎮 How to Play

1. **Sign up** and log in to your account
2. Navigate to **Play Game** from the dashboard
3. Wait in the **lobby** for other players to join (2–4 players)
4. **Roll the dice** on your turn and move your tokens
5. **Capture** opponents' tokens to send them back home
6. First player to get all **4 tokens to the finish** wins
7. Earn **coins** based on your finishing position

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

This project is licensed under the ISC License.

---

<p align="center">Built with ❤️ using the MERN stack</p>
