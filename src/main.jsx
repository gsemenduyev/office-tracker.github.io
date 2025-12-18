
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { requestNotificationPermission, onMessageListener } from './firebase.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* ✅ Register Service Worker for PWA (after render) */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

        // Request notification permission after SW registration
        requestNotificationPermission();

        // Handle foreground messages
        onMessageListener().then((payload) => {
          console.log('Foreground message:', payload);
          // Show notification if needed
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/vite.svg'
          });
        });
      })
      .catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
  });
}
