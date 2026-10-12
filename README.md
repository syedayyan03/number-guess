# NumberVerse 🎯 Multiplayer Number Guessing Game

A modern, real-time multiplayer number guessing web game built with **Node.js, Express, Socket.IO, Tailwind CSS, Lucide Icons, Canvas Confetti, and the Web Audio API**.

---

## 🌟 Highlights & Features

1. **Real-time Multiplayer Architecture**:
   - **Custom Rooms**: Create a room, set rules, copy 1-click room invite link (e.g., `http://localhost:3000/?room=ABC12`).
   - **Quick Match**: Instant matchmaking into public rooms.
   - **Smart AI Bots**: Add or remove AI bots with different intelligence levels (Easy, Medium, Genius AI) to play solo or fill lobby slots.

2. **3 Engaging Game Modes**:
   - **⚡ Rapid Blitz**: Simultaneous race against the clock! Everyone guesses as fast as possible with hot/cold hints.
   - **⏳ Turn-Based Battle**: Alternating turns with shared bounded intellect.
   - **🐂 Codebreaker (Bulls & Cows)**: 4-digit secret code deduction with Bulls (exact match) and Cows (right digit, wrong position).

3. **Dynamic Visual Range Tracker**:
   - Shrinking visual range gauge (`[1 --- 42 ⬆ --- 78 ⬇ --- 100]`) dynamically adjusts as guesses roll in.
   - **💡 Midpoint Helper Button**: Built-in binary search recommendation.

4. **Rich Audio & Visual Polish**:
   - **100% Zero-Asset Synthesized SFX**: Sound effects generated entirely with the Web Audio API (countdown ticks, buzzer, warm chords, victory fanfare).
   - **Celebrations**: Confetti showers on wins, round winner cards, and an animated podium stand (1st, 2nd, 3rd) for game over.
   - **Live In-Game Chat & Reactions**: Express yourself with quick emoji stamps (`🔥`, `🚀`, `😱`, `🏆`, `🤔`, `👏`, `💀`) and chat.
   - **Touch Keypad & Keyboard Support**: Smooth play on both mobile devices and desktop keyboard (`Enter`, digits, backspace).

---

## 🚀 How to Run

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Game Server**:
   ```bash
   node server.js
   ```

3. **Open in Browser**:
   - Open [http://localhost:3000](http://localhost:3000)
   - Open multiple browser tabs or invite friends on your local network to test multiplayer in real-time!
