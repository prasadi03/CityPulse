# 🏙️ CityPulse Bengaluru

> **One city. One pulse.**

CityPulse Bengaluru is a unified urban-intelligence platform that brings together electricity, water, roads, traffic and transport information for Bengaluru in one clean, easy-to-navigate app. Citizens can explore consumption heatmaps, view information from every department and report issues. Municipal workers manage and resolve issues for their own department. **NagaraAI**, a floating multilingual assistant, keeps everyone updated in real time.

## ✨ Features

### 🔐 Role-based access
- **Citizen portal:** view data from all departments, report issues and track them (Waiting → Ongoing → Solved)
- **Municipal worker portal:** department-restricted access (Electricity, Water, Roads, Traffic, Transport) to view, reply to, schedule and update issues
- Access is enforced in the service layer, not just hidden in the UI

### 🔥 Consumption heatmaps (not a geographic map)
- **Area tile grid** and **time matrix** views for Electricity and Water across 30 Bengaluru areas
- Toggle between Now / 24h / 7d, with sortable rows and zone filters
- Light, accessible color scale with icons and labels

### 🧾 Issue reporting and resolution
- 3-step reporting with photo upload
- Worker replies, status changes and scheduling reflected instantly in the citizen's tracker
- Internal notes visible only to workers

### 🤖 NagaraAI assistant
- Floating chat icon on every post-login screen
- Live "What's new" digest mirroring app updates, scoped by role and department
- Tool-calling agent (Mistral) with weather (OpenWeather), news (Tavily) and app-data tools
- Human-approval step before external tool calls
- Replies in the selected language

### 🌐 Multilingual
- English, ಕನ್ನಡ (Kannada) and हिन्दी (Hindi)
- Curated locale files and a civic glossary for natural translations
- AI translation for dynamic content, labelled "AI-translated" with "Show original"

### 🛡️ Data integrity
- No fabricated values: every figure carries source, period, URL and a verification status
- Missing data appears as "Data not available" or grey "No data" tiles
- A strict ingestion pipeline for BESCOM, BWSSB, GBA/BBMP, KSNDMC, CPCB, Open City and data.gov.in files, with validation reports

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend | Node.js / Express (NagaraAI API proxy) |
| AI | Mistral (`mistral-small-2506`), Gemini (translation), LangChain-style tool calling |
| Tools and APIs | OpenWeather, Tavily |
| i18n | react-i18next |
| Prototyping | Google AI Studio, Google Stitch (UI design) |

## 📁 Project Structure

```
/components      UI components (incl. NagaraAI widget)
/screens         Citizen and Worker screens
/services        dataService, ingestion adapters, health score
/server          Express backend for NagaraAI
/data            Real datasets (with provenance) and demo data
/locales         en.json, kn.json, hi.json, glossary, area names
/hooks           Custom React hooks
```

## 🚀 Getting Started

```bash
git clone https://github.com/<your-username>/citypulse-bengaluru.git
cd citypulse-bengaluru
npm install
cp server/.env.example server/.env   # add your API keys
npm run dev
```

### Environment variables

> ⚠️ Keys stay on the server. Never commit your `.env` file.

## 🔑 Demo access
Demo credentials are listed in the collapsible "Demo access" box on the login page. Demo data is bannered and hidden in Official mode.

## 📊 Data sources
BESCOM, BWSSB, GBA/BBMP, KSNDMC, CPCB, Open City Bengaluru, Karnataka Open Data and data.gov.in. See the in-app **Data Sources** page for coverage and freshness. Public data is often monthly or zone-level, so the app shows only what the source provides.

## 🗺️ Roadmap
- [ ] Live utility APIs and IoT sensor feeds
- [ ] Demand forecasting and predictive maintenance
- [ ] WhatsApp/SMS channel and voice assistant (Kannada, Hindi, English)
- [ ] Photo-based issue recognition and duplicate detection
- [ ] Transparency scorecards by ward and department
- [ ] Multi-city rollout and more languages

## ⚠️ Disclaimer
This is an academic/prototype project and is not an official BESCOM, BWSSB or GBA/BBMP product. Figures shown are only as accurate as the loaded source datasets.

## 🤝 Contributing
Issues and pull requests are welcome. Please open an issue first to discuss major changes.

## 📄 License
MIT License (change if needed)
