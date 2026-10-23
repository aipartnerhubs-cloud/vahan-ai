# Vahan AI

This is a sandbox-ready MVP for vehicle RC verification built with Next.js.

## Features
- RC number verification form
- Vehicle summary and status cards
- External sandbox-ready API adapter
- Mock fallback for local testing when credentials are unavailable
- Clean, responsive UI

## Tech stack
- Next.js 14
- TypeScript
- React

## Setup

1. Install dependencies:
   npm install

2. Copy the example environment file:
   cp .env.example .env.local

3. Fill in your sandbox credentials in `.env.local`:
   VEHICLE_API_BASE_URL=https://sandbox.example.com
   VEHICLE_API_KEY=your_key
   VEHICLE_API_SECRET=your_secret
   VEHICLE_API_USERNAME=your_username
   VEHICLE_API_PASSWORD=your_password

4. Start the app:
   npm run dev

5. Open http://localhost:3000

## Notes
- If sandbox credentials are not configured, the app automatically falls back to a mock response so you can still demo and test flows.
- The API adapter is structured for easy swap-in with a real Vahan or partner endpoint.
