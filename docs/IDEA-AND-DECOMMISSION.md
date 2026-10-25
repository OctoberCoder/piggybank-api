# PiggyBank: the idea, what was built, and how it was shut down

## The idea
A **virtual allowance app that teaches kids financial literacy**. A parent deposits *virtual* money (no real money ever moves) and the child manages a wallet: saving into goals, requesting spends, borrowing with parent-approved loans that charge interest, and completing short money lessons. Parents see the family dashboard; children get a dark-mode, game-like wallet with savings pots and confetti when a goal is reached.

Why it was interesting: no payments licence or bank integration is needed, the loop (allowance -> save -> spend -> loan -> lesson) is easy to explain to parents, and it can grow into a subscription for families or a school/classroom edition.

## What exists (all in git)
- **API** (this repo): Node.js 22, TypeScript, Fastify, raw SQL (`pg`), PostgreSQL 16, 16 tables, 16 service files. Auth (register, login, refresh, PIN, magic link), families, members, parents and invitations, wallets, transactions (append-only ledger), allowance rules with idempotent cron, loans with approval and interest, savings goals, spending categories, requests, insights, lessons, notifications (APNs table only), family backup and restore, demo seed. Optimistic locking on wallets and goals; soft-deleted families (30-day retention).
- **iOS app**: repo `OctoberCoder/piggybank-ios` (SwiftUI, SwiftData, iOS 17+): login, register, family setup, parent dashboard, child wallet, goals, deposit, requests working; allowance rules, insights, lessons, PIN entry and parent management built with mock data.
- Design system and screen inventory are in README.md.

## Known gaps when it was parked
- iOS `GET /families` returned an empty list although the API worked (worked around).
- Several screens use mock data; parent/child PIN mode switch not wired; no push notifications (APNs not integrated); CI exists but no deploy secrets; no TestFlight (needs the $99/yr Apple Developer Program).

## Infrastructure that was deleted on 2026-10-25 (to save about $28 a month; idle: ~0.05 requests/hour)
- Resource group `rg-piggybank` (East US): App Service plan `plan-piggybank` (B1, about $13/mo), web app `piggybank-api` (https://piggybank-api.azurewebsites.net), PostgreSQL Flexible Server `pg-piggybank` (Burstable B1ms, 32 GB, about $17/mo).
- **The database contents were deleted with the server** (owner decision: test data only). The schema is recreated from the SQL in this repo and the demo data from `POST /seed/demo`.
- No DNS records pointed at it (it used the default azurewebsites.net host), so nothing is left dangling.

## How to bring it back (about 30 minutes)
1. Create a PostgreSQL 16 flexible server (B1ms is enough) and run the schema SQL from this repo.
2. Create a Linux App Service (Node 22), set the database connection and JWT settings as app settings (never in git), deploy from this repo (GitHub Actions workflow exists; add the Azure secrets).
3. Point the iOS app's base URL at the new host, run `POST /seed/demo`.
Cheaper options: a container on a shared host (Coolify) with the database on the same box, or Azure Container Apps scaled to zero.

## Ideas to pick up next
- Fix the iOS family list bug, wire the PIN mode switch, replace mock screens with real API calls.
- Push notifications for allowance day, loan requests and goal reached.
- A classroom mode (teacher creates a class of virtual wallets) and a family subscription.
