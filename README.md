# BuildVerse 🌌

**BuildVerse** is a premium, high-end event management platform designed specifically for prototype-building competitions and hackathons. It digitizes the entire event lifecycle—from team registration and QR-based check-in to real-time inventory management and point-based shopping.

![BuildVerse Hero](public/pleiades%20logo%20white.png)

## ✨ Core Features

### 🛡️ Atomic Inventory Protocol
- **Race-Condition Proof**: Implements strict Firestore transactions to ensure that multiple teams cannot order the same "last item" simultaneously.
- **Immediate Reservation**: Stock and points are deducted at the moment of order placement, preventing over-spending and stockouts.
- **Refund Logic**: Automated refund of stock and points for rejected or partially approved orders.

### 👥 Multi-Role Ecosystem
- **Admin Portal**: 
  - Manage the component catalog with categorical sorting.
  - Review and authorize team requisitions.
  - Adjust team points and manage credentials.
  - Force logout and access control.
- **Participant Portal**:
  - Browse a beautiful, interactive component catalog.
  - Real-time point tracking and transaction history.
  - POSSESSION_LOCK status for approved items.
  - Personal requisition queue tracking.

### 💎 Premium Aesthetic
- **Glassmorphism Design**: A sleek, modern UI with vibrant gradients, blurred backdrops, and smooth micro-animations.
- **Dark Mode Optimized**: Built for professional, tech-focused environments.
- **Mobile Responsive**: Fully optimized for both desktop and on-the-go admin use.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Tailwind-inspired custom design system).
- **Backend**: Firebase / Google Cloud
  - **Firestore**: Real-time NoSQL database with atomic transaction support.
  - **Firebase Auth**: Secure, role-based authentication.
- **Security**: 
  - Client-side `bcrypt` hashing for secure credential management.
  - Session heartbeats to manage concurrent logins.

## 🚀 Getting Started

### 1. Firebase Configuration
Update the `firebaseConfig` in `public/js/auth.js` with your project credentials:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. Seeding the Database
Use the built-in seeder to initialize your inventory and admin accounts:
1. Open `public/seeder.html` in your browser.
2. Click **Initialize System** to populate the default component list and create the master admin account.

### 3. Deployment
The platform is ready for deployment to **Firebase Hosting** or any static web host.
```bash
# Example Firebase Deploy
firebase deploy
```

## 📋 Operational Workflow

1. **Setup**: Admins seed the database and customize the component list.
2. **Registration**: Admins register teams and provide them with secure credentials.
3. **Ordering**: Participants browse the catalog and submit requests. Points are deducted immediately.
4. **Validation**: Admins review "Pending" orders. They can approve, partially approve (with partial refund), or reject (with full refund).
5. **Handoff**: Once approved, participants collect their items, and admins mark them as "Given".

---

Developed with ❤️ by **Pleiades** for the BuildVerse Event.
