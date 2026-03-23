# Luke Jung - Personal Portfolio & Web Resume

A personal portfolio website and interactive web resume built with Next.js, React, and Tailwind CSS.

## 🚀 Recent Updates

* **Responsive Web Resume:** Translated a static LaTeX resume into a fully responsive, modern web page using Next.js App Router and Tailwind CSS, now serving as the main homepage.
* **Tailwind CSS Integration:** Configured Tailwind CSS v4 alongside the existing legacy CSS to allow for modern, utility-first styling without breaking older components.
* **Git Optimization:** Added Next.js build cache (`.next`) to `.gitignore` to keep the repository clean.

* **LoL Esports Section (`/esports`):** A high-fidelity, interactive dashboard featuring live tournament data, match history, and VOD integration using the LoL Esports GraphQL API.
* **Gen-AI Biography Service:** A secure, serverless Cloudflare Worker (`gen-ai-bio`) that proxies Google's **Gemini 3.1 Flash Lite Preview** to synthesize professional player and team biographies.
* **Specialized Edge Caching:** Implemented `caches.default` strategies at the Cloudflare Edge to persist AI responses for 7 days, providing sub-100ms load times and $0 token cost for repeat visits.
* **TFT Data Layer (`tft-proxy`):** A dedicated Riot API proxy with 30-minute Edge Caching to securely deliver Teamfight Tactics statistics while staying within rate limits.

## 💻 Tech Stack

* **Framework:** Next.js (App Router)
* **AI Engine:** Google Gemini 3.1 
* **Edge Platform:** Cloudflare Workers
* **Styling:** Tailwind CSS 4.0 & Bootstrap (Legacy)
* **Icons:** FontAwesome 6.0

## 🛠️ Getting Started

To run this project locally on your machine:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **View the application:**
   * Web Resume: http://localhost:3000

## 📫 Contact
* Email: lukethejung@gmail.com
* LinkedIn: linkedin.com/in/lukehjung
* GitHub: github.com/lukehjung