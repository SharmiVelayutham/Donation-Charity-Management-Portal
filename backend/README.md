# Donation & Charity Management Portal (Backend)

Backend service for managing NGOs, donations, and donor contributions. Production-ready, container-friendly, and deployable to Render/Railway/AWS/Docker.

## Stack
- Node.js, TypeScript, Express.js
- MongoDB with Mongoose
- JWT auth, bcrypt password hashing
- Multer for optional image uploads
- CORS, dotenv, helmet, morgan

## Getting Started
1) Install dependencies
```bash
npm install
```
2) Copy environment variables
```bash
cp .env.example .env
```
3) Run locally (dev)
```bash
npm run dev
```
4) Build & start (production)
```bash
npm run build
npm start
```

## Environment Variables
- `PORT` (e.g., 4000)
- `MONGO_URI` (connection string)
- `JWT_SECRET` (strong secret)

## Deployment
- Set env vars on the platform (Render/Railway/AWS/Docker).
- Ensure MongoDB is reachable from the service.
- Start command: `npm run start`

## API Overview
- Auth: `POST /api/auth/register`, `POST /api/auth/login`
- Donations (NGO only for write): CRUD under `/api/donations`
- Contributions (Donor only for create/history): `/api/contributions`

## Notes
- Role-based access enforced via middleware (`DONOR`, `NGO`, `ADMIN`).
- Input validation in controllers; centralized error handling middleware.

