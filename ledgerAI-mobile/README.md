# LedgerAI Mobile Application

The frontend client for LedgerAI, built with **React Native**, **Expo SDK 54+**, and **Expo Router**. Provides expense tracking, category budgeting, Plaid bank synchronization, and conversational financial assistance on iOS, Android, and Web.

## Features

- **Authentication:** Secure signup, login, and bearer token storage using `expo-secure-store`.
- **Dashboard & Spending Feed:** View recent activity, net worth cards, and combined manual/Plaid transactions.
- **Budget Tracking:** Category budget progress bars, category breakdown summaries, and custom category management.
- **Plaid Link:** Connect bank accounts securely in sandbox mode via `react-native-plaid-link-sdk`.
- **Marty (AI Advisor):** Direct tab access to the AI financial assistant.

## Quick start

From the `ledgerAI-mobile` directory:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment:

   Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to your backend base URL:

   ```bash
   cp .env.example .env
   ```

   - **Web / iOS Simulator:** `http://localhost:8000`
   - **Android Emulator:** `http://10.0.2.2:8000`
   - **Physical Device:** `http://<YOUR_COMPUTER_LAN_IP>:8000` (e.g. `http://192.168.1.50:8000`)

3. Start the development server:

   ```bash
   npx expo start
   ```

## Development and builds

### Running in Expo Go vs. Native Development Builds

- Standard screens and features run in **Expo Go**.
- **Plaid Link** requires native code (`react-native-plaid-link-sdk`) and **cannot run inside Expo Go**. To test bank linking, use an Expo development build:

```bash
# Prebuild native directories
npx expo prebuild

# Run locally on iOS (macOS with Xcode required)
npx expo run:ios

# Run locally on Android (Android Studio / SDK required)
npx expo run:android
```

Or build with EAS:

```bash
npx eas-cli build --profile development --platform android
```

### Plaid sandbox credentials

When linking a bank in sandbox mode:
- **Username:** `user_good`
- **Password:** `pass_good`

## Available scripts

- `npm run start` - Start Expo development server (`npx expo start`)
- `npm run android` - Start and target Android device/emulator
- `npm run ios` - Start and target iOS simulator
- `npm run web` - Start web development preview
- `npm run lint` - Run ESLint checks (`npx expo lint`)
- `npx tsc --noEmit` - Type-check TypeScript files

## Project structure

```text
ledgerAI-mobile/
├── src/
│   ├── app/                  # Expo Router file-based screens
│   │   ├── _layout.tsx       # Root layout & providers
│   │   ├── (auth)/           # Authentication screens (login, signup)
│   │   └── (app)/            # Authenticated tab navigation
│   │       ├── (home)/       # Home dashboard, expense feeds & edit screen
│   │       ├── (budgets)/    # Budget overview & category management
│   │       ├── (marty)/      # AI Advisor tab
│   │       └── add-expense.tsx # Modal / screen for manual expense entry
│   ├── components/           # Reusable UI cards, forms & themed widgets
│   ├── constants/            # Theme tokens, spacing, colors & typography
│   ├── context/              # Authentication context & secure token storage
│   ├── hooks/                # Custom React hooks (theme, color scheme)
│   ├── services/             # Typed API clients (auth, expenses, budgets, categories, plaid)
│   └── types/                # Global type definitions
├── assets/                   # App icons, splash screens, logos & graphics
├── app.json                  # Expo application configuration & plugins
├── eas.json                  # EAS Build & Submit configuration
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript compiler settings
```

