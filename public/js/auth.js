// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMtnkq3Zmb7rDYTTz6x7WRzOJ8C5SJaLA",
  authDomain: "build-verse.firebaseapp.com",
  projectId: "build-verse",
  storageBucket: "build-verse.firebasestorage.app",
  messagingSenderId: "460428624693",
  appId: "1:460428624693:web:0f6887efe5bd825283027c",
  measurementId: "G-4XPC7CBLEH"
};

// Safe bcrypt detection
const getBcrypt = () => {
    return window.bcrypt || (window.dcodeIO && window.dcodeIO.bcrypt);
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

const loginForm = document.getElementById('login-form');
const errContainer = document.getElementById('error-message');
const errText = document.getElementById('error-text');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errContainer) errContainer.classList.add('hidden');
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // 1. Call Backend API for Authentication (SECURE)
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // 2. Authenticate with Firebase using Custom Token (Secure Firestore Access)
            if (data.firebaseToken) {
                await firebase.auth().signInWithCustomToken(data.firebaseToken);
            }

            const userData = data.user;
            
            // 3. SECURE SESSION CHECK (Concurrent Login Prevention)
            const userDoc = await firestore.collection('users').doc(username).get();
            const dbData = userDoc.data();
            const currentTime = Date.now();
            const lastHeartbeat = dbData.lastHeartbeat || 0;
            const existingSessionId = localStorage.getItem('bv_sessionId');
            
            // 45 second grace period
            if (currentTime - lastHeartbeat < 45000 && dbData.activeSessionId !== existingSessionId) {
                throw new Error('Concurrent Session: Account is already active on another device.');
            }

            // 4. Initialize Unique Session
            const sessionId = Math.random().toString(36).substring(2, 15);
            await firestore.collection('users').doc(username).update({
                activeSessionId: sessionId,
                lastHeartbeat: currentTime
            });

            // 5. Store local session
            localStorage.setItem('bv_token', data.token); // Store JWT
            localStorage.setItem('bv_sessionId', sessionId);
            localStorage.setItem('bv_user', JSON.stringify({
                username: userData.username,
                role: userData.role,
                points: userData.points,
                orderingEnabled: userData.orderingEnabled
            }));

            // 6. Redirect based on role
            if (userData.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'participant.html';
            }

        } catch (error) {
            console.error('Login Error:', error.message);
            if (errText && errContainer) {
                errText.textContent = error.message;
                errContainer.classList.remove('hidden');
                setTimeout(() => errContainer.classList.add('hidden'), 7000);
            }
        }
    });

    // Clear error on input
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('input', () => {
            if (errContainer) errContainer.classList.add('hidden');
        });
    });
}

// Helper to get token
function getAuthToken() {
    return localStorage.getItem('bv_token');
}

// Helper to logout
async function logout() {
    const user = JSON.parse(localStorage.getItem('bv_user'));
    if (user) {
        try {
            await firestore.collection('users').doc(user.username).update({
                activeSessionId: null,
                lastHeartbeat: 0
            });
        } catch (e) { console.warn('Logout cleanup failed:', e.message); }
    }
    localStorage.removeItem('bv_token');
    localStorage.removeItem('bv_sessionId');
    localStorage.removeItem('bv_user');
    window.location.href = 'index.html';
}

// Session Heartbeat System
function startSessionHeartbeat(username, sessionId) {
    if (!username || !sessionId) return;
    
    let failureCount = 0;

    const update = async () => {
        // Prevent heartbeat if page is unloading
        if (document.visibilityState === 'hidden' && !navigator.onLine) return;

        try {
            const doc = await firestore.collection('users').doc(username).get();
            const data = doc.data();
            
            // If session is officially invalid
            if (!data || data.activeSessionId !== sessionId) {
                failureCount++;
                // Only logout after 2 consecutive verified failures to account for rapid refreshes/latency
                if (failureCount >= 2) {
                    console.error('SESSION_COLLISION_DETECTED');
                    alert('ACCESS_TERMINATED: Account active on another device or session expired.');
                    localStorage.removeItem('bv_token');
                    localStorage.removeItem('bv_sessionId');
                    localStorage.removeItem('bv_user');
                    window.location.href = 'index.html';
                }
                return;
            }

            // Reset failure count on success
            failureCount = 0;

            await firestore.collection('users').doc(username).update({
                lastHeartbeat: Date.now()
            });
        } catch (e) { 
            console.warn('Heartbeat hiccup:', e.message);
            // Don't logout on network errors, just wait for the next interval
        }
    };

    update();
    setInterval(update, 15000);
}

// Check session
function checkAuth(roleRequired) {
    const user = JSON.parse(localStorage.getItem('bv_user') || 'null');
    const token = getAuthToken();

    if (!token || !user) {
        window.location.href = 'index.html';
        return null;
    }

    if (roleRequired && user.role.toLowerCase() !== roleRequired.toLowerCase()) {
        console.error('Role Mismatch:', user.role, 'expected', roleRequired);
        window.location.href = 'index.html';
        return null;
    }

    return user;
}
