# Stakeholder Delivery — The Bottom (On)line

## Project
Digital multiplayer card game teaching economics concepts. Built for Maastricht University (Prof. Mark Sanders).

## Stack
- React + TypeScript + Vite + Tailwind CSS
- Supabase (Auth, Database, Realtime, Edge Functions)
- Hosted on Netlify (frontend) + Supabase Cloud EU (backend)

## Architecture
- **Frontend**: React SPA, pure renderer — no game logic on client
- **Game Logic**: Supabase Edge Functions (authoritative server)
- **Real-time**: Supabase Realtime channels (broadcast + presence)
- **Auth**: Supabase Auth (email login)
- **Database**: Supabase PostgreSQL (game state, scores, research data)

## Key Conventions
- All game rules enforced server-side (Edge Functions), never client-side
- Frontend receives state updates and renders them
- Players authenticate before joining games
- GDPR consent flow for research data opt-in
- Build check: `npm run build`

## Game Rules Summary
- 4-7 players per game
- Start with 1 gold, 2 unique assets, 2 liabilities
- Each turn: draw 3 cards (put back 1), buy 1 asset, issue 1 liability
- 8 characters with unique abilities (selected each turn)
- Market changes when someone buys their 1st, 2nd, 3rd, 4th, 5th, 7th, or 8th asset
- Game ends when someone reaches 6 assets
- Score sheet explains economic performance

## Characters
- Head of R&D: Draw 6 cards, put back 2
- CEO: Buy up to 3 assets
- CSO: Buy 2 red or green assets
- CFO: Issue 3 liabilities, can redeem liabilities for cash
- Shareholder: Fire another character (skip their turn)
- Stakeholder: Force divestment of an asset at market value -1
- Regulator: Swap hands with player, or swap cards with deck
- Banker: Terminate someone's credit line
