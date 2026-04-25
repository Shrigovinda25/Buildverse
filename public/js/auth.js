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
            // 1. Query Firestore for the user
            const userDoc = await firestore.collection('users').doc(username).get();

            if (!userDoc.exists) {
                throw new Error('Invalid username or password');
            }

            const userData = userDoc.data();
            
            // 3. SECURE SESSION CHECK (Concurrent Login Prevention)
            const currentTime = Date.now();
            const lastHeartbeat = userData.lastHeartbeat || 0;
            const existingSessionId = localStorage.getItem('bv_sessionId');
            
            // 45 second grace period, bypass if they are the SAME browser reclaiming their session
            if (currentTime - lastHeartbeat < 45000 && userData.activeSessionId !== existingSessionId) {
                throw new Error('Concurrent Session: Account is already active on another device. Please wait 60s or log out elsewhere.');
            }

            // 4. Verify Password using bcrypt (Browser version)
            const bcrypt = getBcrypt();
            if (!bcrypt) throw new Error('Encryption library not loaded. Please refresh.');
            
            const isMatch = bcrypt.compareSync(password, userData.password);

            if (!isMatch) {
                throw new Error('Invalid username or password');
            }

            // 5. Initialize Unique Session
            const sessionId = Math.random().toString(36).substring(2, 15);
            await firestore.collection('users').doc(username).update({
                activeSessionId: sessionId,
                lastHeartbeat: currentTime
            });

            // 6. Store local session
            const fakeToken = btoa(JSON.stringify({ username, role: userData.role, exp: Date.now() + 86400000 }));
            localStorage.setItem('bv_token', fakeToken);
            localStorage.setItem('bv_sessionId', sessionId);
            localStorage.setItem('bv_user', JSON.stringify({
                username: userData.username,
                role: userData.role,
                points: userData.points,
                orderingEnabled: userData.orderingEnabled
            }));

            // 4. Redirect based on role
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
                
                // Re-hide after 7 seconds
                setTimeout(() => {
                    errContainer.classList.add('hidden');
                }, 7000);
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
    
    // Update immediately and then every 15s
    const update = async () => {
        try {
            const doc = await firestore.collection('users').doc(username).get();
            const data = doc.data();
            
            // If someone else logged in or session was cleared
            if (!data || data.activeSessionId !== sessionId) {
                console.error('SESSION_COLLISION_DETECTED');
                alert('ACCESS_TERMINATED: Account active on another device.');
                localStorage.clear();
                window.location.href = 'index.html';
                return;
            }

            await firestore.collection('users').doc(username).update({
                lastHeartbeat: Date.now()
            });
        } catch (e) { console.error('Heartbeat failure:', e.message); }
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
