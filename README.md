# PiggyBank — Virtual Allowance Tracker

A virtual allowance app for teaching kids financial literacy. Parent deposits virtual money, kid manages their wallet. No real money.

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   iOS App (SwiftUI) │────▶│   API (Node.js)     │
│   iPad + iPhone     │     │   Fastify + TypeScript│
│   Dark mode first   │     │   Raw SQL via `pg`  │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                              ┌────────▼──────────┐
                              │  PostgreSQL 16     │
                              │  Azure Flexible   │
                              │  Server (B1ms)    │
                              └───────────────────┘
```

## Backend

**Location:** `~/PiggyBank/piggybank-api/`
**Live URL:** https://piggybank-api.azurewebsites.net
**GitHub:** https://github.com/OctoberCoder/piggybank-api
**Stack:** Node.js 22, TypeScript, Fastify, PostgreSQL 16
**Hosting:** Azure App Service (B1, ~$13/mo)
**Database:** Azure PostgreSQL Flexible Server (B1ms, ~$17/mo)

### API Endpoints

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/pin/verify` `POST /auth/magic-link` |
| Families | `GET /families` `POST /families` `GET /families/:id` `PUT /families/:id` `DELETE /families/:id` |
| Members | `GET /families/:id/children` `POST /families/:id/members` `POST /families/:id/members/:memberId/pin` |
| Parents | `GET /families/:id/parents` `POST /families/:id/parents` `DELETE /families/:id/parents/:userId` `POST /families/parents/accept` |
| Wallets | `GET /wallets/:id` `GET /families/:familyId/wallets` |
| Transactions | `GET /wallets/:walletId/transactions` `POST /wallets/:walletId/transactions` |
| Allowance | `GET /wallets/:walletId/allowance` `POST /wallets/:walletId/allowance` `DELETE /wallets/:walletId/allowance` `POST /allowance/run` |
| Loans | `GET /wallets/:walletId/loans` `POST /wallets/:walletId/loans` `POST /loans/:id/approve` `POST /loans/:id/deny` `POST /loans/:id/pay` |
| Goals | `GET /wallets/:walletId/goals` `POST /wallets/:walletId/goals` `PUT /goals/:id` `DELETE /goals/:id` |
| Requests | `GET /families/:familyId/requests` `POST /wallets/:walletId/requests` `PUT /requests/:id/approve` `PUT /requests/:id/deny` |
| Categories | `GET /families/:familyId/categories` `POST /families/:familyId/categories` `DELETE /families/:familyId/categories/:categoryId` |
| Insights | `GET /wallets/:walletId/insights/spending` `GET /families/:familyId/insights/monthly` |
| Lessons | `GET /families/:familyId/lessons` `POST /lessons/:id/complete` |
| Notifications | `GET /notifications` `PUT /notifications/:id/read` `POST /notifications/register` |
| Backup | `GET /families/:familyId/backup` `POST /families/:familyId/restore` |
| Seed | `POST /seed/demo` |

### Database (16 tables)

`users`, `families`, `family_parents`, `family_invitations`, `wallets`, `transactions`, `spending_categories`, `allowance_rules`, `loans`, `loan_payments`, `savings_goals`, `lessons`, `spending_requests`, `notifications`, `refresh_tokens`, `magic_links`

### Key Design Decisions

- **No ORM** — raw SQL via `pg`. TypeScript interfaces for type safety.
- **Optimistic locking** — `version` field on `wallets` and `savings_goals`. 409 Conflict on mismatch.
- **Immutable ledger** — transactions are append-only. No updates, no deletes.
- **Idempotent crons** — allowance and interest jobs check for existing transactions before processing. Safe to run multiple times.
- **Soft-delete** — families are soft-deleted (30-day retention), child PIN blocked immediately.
- **System user** — a single global system user handles cron-driven actions (interest, allowance).

### Services (16 files)

`auth`, `family`, `invitation`, `child`, `wallet`, `transaction`, `allowance`, `loan`, `goal`, `request`, `category`, `insight`, `lesson`, `notification`, `backup`, `interest`

---

## iOS App

**Location:** `~/PiggyBank/PiggyBank/`
**GitHub:** https://github.com/OctoberCoder/piggybank-ios
**Stack:** Swift 5.9, SwiftUI, SwiftData, URLSession, iOS 17+
**Build:** `xcodebuild -project PiggyBank.xcodeproj -scheme PiggyBank -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5),OS=latest' build`

### Screens

| Screen | File | Status |
|--------|------|--------|
| Login | `LoginView.swift` | Working — connects to live API |
| Register | `RegisterView.swift` | Working |
| Family Setup | `FamilySetupView.swift` | Working |
| Parent Dashboard | `FamilyDashboardView.swift` | Working — kids list, action buttons, navigation |
| Child Wallet | `ChildWalletView.swift` | Working — hero card, savings pots, transaction feed |
| Savings Goals | `GoalsListView.swift` | Working — progress rings, active/completed |
| Loans | `InterestExplanationView.swift` | Working — rate display |
| Deposit | `DepositView.swift` | Working — amount input, API call |
| Requests | `RequestsView.swift` | Working — pending requests list |
| Allowance Rules | `AllowanceRulesView.swift` | Built — UI complete |
| Insights | `InsightsView.swift` | Built — mock data |
| Lessons | `LessonsListView.swift` | Built — mock data |
| PIN Entry | `PinEntryView.swift` | Built — numpad, lockout |
| Parent Management | `ParentManagementView.swift` | Built — invite flow |
| Notifications | `NotificationsView.swift` | Stub |
| Goal Celebration | `GoalCelebrationView.swift` | Built — confetti animation |

### Components (5 reusable)

`GradientCard`, `SavingsPot`, `TransactionRow`, `AvatarCircle`, `ConfettiView`

### Design System

- **Colors:** `surface #0a0a0a`, `card #141414`, `primary #494fdf`, `coral #FF3464`, `success #2FCB8F`, `gold #FFBF00`, `teal #00a87e`
- **Typography:** SF Pro Display, balance 40px bold, heading 16px semibold, body 14px, caption 12px, small 10px
- **Dark mode** first, WCAG AA contrast compliance

### Tests (26 tests, 4 files)

`APIClientTests`, `ColorTests`, `DTOTests`, `ComponentsTests`

---

## Known Issues

### Critical
- **`GET /families` returns empty in iOS app** — the API works (verified via curl) but the Swift actor-based APIClient doesn't receive the family list. Currently bypassed by auto-creating a family on every login. Root cause unknown.
- **Many screens are UI-only** — `AllowanceRulesView`, `InsightsView`, `LessonsListView`, `ParentManagementView` have mock data, not real API integration.

### Moderate
- **No mode switching** — Parent/child mode toggle (PIN-based) exists as `PinEntryView` but isn't wired into navigation.
- **Family/children endpoint routing** — `GET /families/:id/children` may conflict with `GET /families/:id` in Fastify route ordering on some requests.
- **XcodeGen project staleness** — Adding new Swift files requires re-running `xcodegen generate` in the project directory.

### Minor
- **No push notifications** — APNs table exists in the database but no push service is integrated.
- **No CI/CD running** — GitHub Actions workflow exists but Azure secrets aren't configured for auto-deploy.
- **TestFlight not set up** — requires Apple Developer Program ($99/yr).

---

## Deployment

### Backend Deploy

```bash
cd ~/PiggyBank/piggybank-api
npm run build
zip -r /tmp/deploy.zip . -x ".git/*" "tests/*" "node_modules/.cache/*"
az webapp deploy --resource-group rg-piggybank --name piggybank-api --src-path /tmp/deploy.zip --type zip --restart true
```

### iOS Simulator

```bash
cd ~/PiggyBank/PiggyBank
xcodegen generate  # only needed after adding new files
xcodebuild -project PiggyBank.xcodeproj -scheme PiggyBank -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5),OS=latest' build install
xcrun simctl install booted ~/Library/Developer/Xcode/DerivedData/*/Build/Products/Debug-iphonesimulator/PiggyBank.app
xcrun simctl launch booted com.piggybank.app
```

---

## Demo Credentials

| Account | Email | Password | State |
|---------|-------|----------|-------|
| Fresh | `you@demo.com` | `demo1234` | New account |
| Existing | `sim@test.com` | `sim123` | Has family + kid + ₦10,000 |
| Parent | `parent@demo.app` | `demo123` | Has family |

---

## Azure Resources

| Resource | Name | Cost |
|----------|------|------|
| Resource Group | `rg-piggybank` | Free |
| App Service Plan | `plan-piggybank` (B1) | ~$13/mo |
| App Service | `piggybank-api` | Included |
| PostgreSQL | `pg-piggybank` (B1ms) | ~$17/mo |

---

## Files

```
~/PiggyBank/
├── piggybank-api/          # Node.js + Fastify backend
│   ├── src/                # TypeScript source
│   │   ├── routes/         # 13 route files
│   │   ├── services/       # 16 service files
│   │   ├── middleware/     # auth, error handler
│   │   ├── db/             # client, migrations, seeds
│   │   └── jobs/           # cron jobs (interest)
│   ├── tests/              # Vitest tests
│   └── scripts/            # demo seed
│
└── PiggyBank/              # SwiftUI iOS app
    ├── Sources/
    │   ├── PiggyBankApp.swift
    │   ├── Router.swift
    │   ├── ContentView.swift
    │   ├── Features/       # Auth, Wallet, Family, Goals, etc.
    │   ├── Core/           # Network, Storage, Components
    │   └── Design/         # Colors, Typography, Theme
    └── Tests/              # XCTest unit tests

~/docs/superpowers/
├── specs/2026-07-28-piggybank-design.md    # Full design spec
└── plans/2026-07-28-piggybank-backend.md   # Backend impl plan
   └── 2026-07-28-piggybank-ios.md          # iOS impl plan
```
