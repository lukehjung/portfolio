# Luke Jung - Personal Portfolio & Web Resume

A personal portfolio website and interactive web resume built with Next.js, React, and Tailwind CSS.

* **MSI 2026 Pick'em Dashboard (`/pickems`):** An interactive prediction dashboard showing live match listings, participant points, and pick comparisons. Includes a view-only toggle (`?viewonly=true`) to share public-facing standings securely.
* **Passcode-Secured Scraper Trigger:** Updated the Cloudflare Edge Worker (`msi-proxy`) to support secure, passcode-authorized trigger requests directly from the client, initiating the scraper workflow without exposing GitHub Personal Access Tokens.
* **Tiered Points & Placements:** Integrated automated leaderboard mapping and scoring rules (50/20/10 points for 1st/2nd/3rd places) showing exact placements and points badges in a visual, responsive grid.
* **Expandable Match Stats:** Matches list now supports clickable, responsive dropdown grids that expand to display detailed side-by-side team player stats tables (KDA, CS, Damage, Champion icons).

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