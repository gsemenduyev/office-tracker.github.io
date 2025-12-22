# Office Attendance Tracker

A Progressive Web App (PWA) designed to help employees track their office attendance, monitor quarterly goals, and synchronize data across devices.

## 🚀 Features

- **Calendar Management**: Intuitive monthly view to track attendance status.
- **Status Types**: Mark days as "In Office", "Not in Office", or "PTO".
- **Cloud Sync**: Seamless synchronization between Desktop and Mobile using **Firebase Firestore** and **Google Authentication**.
- **Quarterly Goals**: Set custom targets (e.g., 24 days/quarter) and track progress.
- **Pace Tracker**: Smart calculation showing if you are ahead or behind schedule based on remaining business days.
- **Offline First**: Works offline using LocalStorage and Service Workers, syncing when online.
- **Push Notifications**: Subscribe to daily reminders (Mon-Fri) to log your status.
- **CSV Export**: Download quarterly reports for expense or HR reporting.
- **Notes**: Add specific notes to any date.

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/) (v18)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google Provider)
- **Hosting & Serverless**: Netlify (Hosting + Scheduled Functions)
- **PWA**: Custom Service Worker for caching and push notifications

## 💻 Development

### Prerequisites
- Node.js installed
- Firebase Project set up with Firestore and Google Auth enabled
- Netlify account for deployment

### Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Firebase configuration keys.
4. Start the development server:
   ```bash
   npm run dev
   ```

### Scripts

- `npm run dev`: Start the local development server.
- `npm run build`: Build the application for production.
- `npm run preview`: Preview the production build locally.
- `npm run netlify-deploy`: Build and deploy to Netlify (includes SSL bypass for specific network environments).
