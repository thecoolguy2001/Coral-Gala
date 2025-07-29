Coral Gala: Proposed Tech Stack & Development Plan

⸻

1. Introduction

Coral Gala is a 24/7 live virtual aquarium where thousands of users can watch, feed, pet, and buy fish in real time. Built for viral potential and massive scale, the MVP will be fully functional on zero-dollar tiers, with a clear upgrade path as demand grows.

2. Tech Stack

Layer	Technology	Role
Frontend Framework	React	SPA framework for UI/UX
3D Rendering	react-three-fiber (Three.js)	High-performance fish simulation & rendering
Real-time Data	Firestore (Firebase Spark)	Real-time state sync (no connection cap)
Serverless Functions	Vercel Functions (Node.js)	Stripe webhooks, interaction endpoint
Payments	Stripe Checkout	Secure micro-transactions (buy fish)
Authentication	Firebase Auth	Anonymous or email/password login
Hosting & CDN	Vercel (Hobby, Free)	Global asset distribution, custom domain, SSL
Monitoring & Analytics	Google Analytics / Plausible	Usage tracking, quota monitoring

3. Architecture Overview
	1.	Client
	•	Boots React app, connects to Firestore via onSnapshot listener on /events and /fish collections.
	•	Runs a 60 fps flocking simulation loop based on initial snapshot.
	•	Renders fish via react-three-fiber, updates positions locally.
	•	Sends user actions (feed/pet) directly to Firestore or via Vercel interaction function.
	2.	Serverless
	•	Stripe Checkout Flow:
	1.	Client calls Stripe SDK to create checkout.session → redirect to Stripe.
	2.	Stripe fires event to /api/stripe-webhook on Vercel.
	3.	Vercel function verifies event → writes spawn event to Firestore.
	•	Interaction Endpoint (optional):
	•	/api/interact on Vercel accepts feed/pet requests → server writes to Firestore.
	3.	Database
	•	Collections:
	•	fish: static definitions (species, assets).
	•	events: real-time actions (spawn, feed, pet, minigame), ordered by timestamp.
	•	Listeners:
	•	Clients subscribe to events via onSnapshot for live updates.
	4.	Hosting/Deployment
	•	Frontend code in GitHub → auto-deploy on Vercel.
	•	Custom domain coralgala.live configured in Vercel Dashboard.
	•	SSL auto-provisioned; HTTP/2 served from edge.

4. Development Phases & Milestones

Phase	Tasks	Timeline
Phase 1: Scaffolding	- Initialize React app (Vite or CRA)	

	•	Install dependencies (react-three-fiber, Firebase SDK)    | Day 1 (hours 0–2) |
| Phase 2: DB & Simulation | - Firestore schema design
	•	Implement onSnapshot listener
	•	Flocking algorithm & fish rendering                         | Day 1 (hours 2–6) |
| Phase 3: Interactions  | - Feed/Pet UI controls
	•	Write feed/pet events to Firestore
	•	Reflect interactions in other clients                       | Day 1 (hours 6–9) |
| Phase 4: Payments      | - Stripe Checkout integration on client
	•	Vercel /api/stripe-webhook function
	•	Spawn new fish via webhook                                   | Day 1 (hours 9–12) |
| Phase 5: Fallback UX   | - Detect quota errors (RESOURCE_EXHAUSTED)
	•	Implement periodic polling for extra users
	•	Display banners & disable buttons gracefully                | Day 1 (hours 12–14) |
| Phase 6: Testing & QA  | - Cross-browser / mobile tests
	•	Two-window real-time test
	•	Load test up to ~150 clients locally                        | Day 1 (hours 14–16) |
| Phase 7: Deployment    | - Final Vercel deploy
	•	Domain DNS & SSL setup
	•	Analytics integration                                      | Day 1 (hours 16–18) |

5. Free-Tier Caveats & Mitigations
	•	Firestore Quotas (Spark): 20 000 writes/day, 50 000 reads/day, 1 GB storage
	•	Mitigation: Batch reads, prune events older than 24 h.
	•	Vercel Functions: 125 000 free invocations/month, 100 GB bandwidth
	•	Mitigation: Debounce non-critical endpoints, cache static assets aggressively.
	•	Fallback Plan: Polling snapshot every 10 s for extra viewers; queue failed writes.

6. UX Fallback Strategy
	•	Banner Notification: “Live updates paused—reconnecting…”.
	•	Disabled Buttons: Greyed-out “Feed/Pet/Buy” with tooltips.
	•	Polling Loop: OnSnapshot error → client polls /api/snapshot or Firestore REST.
	•	Retry Queue: Store failed interactions in local queue → replay on next success.

7. Next Steps & Upgrade Path
	1.	Production Hardening
	•	Move Firestore to Blaze to remove read/write caps.
	•	Secure Stripe live keys & move webhook to production endpoint.
	2.	Enhanced Features
	•	Mini-games scheduling (via GitHub Actions or Vercel Cron)
	•	Leaderboards & user profiles
	•	Subscription tiers for premium species
	3.	Performance & Scaling
	•	Introduce CDN for fish assets
	•	Use Cloudflare in front of Vercel for DDoS protection
	•	Optimize three-fiber scene performance with instancing

⸻

This document outlines the complete zero-dollar MVP architecture and development plan for Coral Gala. Let me know if you’d like to adjust any details or add more sections!