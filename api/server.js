require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'BuildVerse API is live' }));

// ----------------------------------------------------------------------------
// Firebase Initialization
// ----------------------------------------------------------------------------
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ----------------------------------------------------------------------------
// Auth Middleware
// ----------------------------------------------------------------------------
const SECRET_KEY = process.env.JWT_SECRET || 'buildverse-super-secret-key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('AUTH_FAIL: No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log('AUTH_FAIL: Invalid or expired token', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  // Emergency override: If username is shrigovinda, let them in.
  if (req.user && (req.user.username === 'shrigovinda' || req.user.username === 'Buildverse' || req.user.role === 'admin')) {
    return next();
  }
  
  console.log('AUTH_FAIL: User is not admin', req.user ? req.user.username : 'No User', 'Role:', req.user ? req.user.role : 'No Role');
  return res.status(403).json({ message: 'Admin access required' });
};

// ----------------------------------------------------------------------------
// Auth Routes
// ----------------------------------------------------------------------------

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const userDoc = await db.collection('users').doc(username).get();

    if (!userDoc.exists) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const userData = userDoc.data();
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { username: userData.username, role: userData.role },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    // Generate Firebase Custom Token for frontend Firestore listeners
    const firebaseToken = await admin.auth().createCustomToken(username);

    res.json({
      token,
      firebaseToken,
      user: {
        username: userData.username,
        role: userData.role,
        points: userData.points,
        orderingEnabled: userData.orderingEnabled
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// ----------------------------------------------------------------------------
// Component Routes
// ----------------------------------------------------------------------------

// GET /components (Shared)
app.get('/components', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('components').get();
    const components = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(components);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching components' });
  }
});

// POST /components (Admin only)
app.post('/components', authenticateToken, isAdmin, async (req, res) => {
  const { name, totalQuantity, price } = req.body;
  try {
    const docRef = await db.collection('components').add({
      name,
      totalQuantity: parseInt(totalQuantity),
      availableQuantity: parseInt(totalQuantity),
      price: parseFloat(price)
    });
    res.status(201).json({ id: docRef.id, message: 'Component added' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding component' });
  }
});

// PUT /components/:id (Admin only)
app.put('/components/:id', authenticateToken, isAdmin, async (req, res) => {
  const { name, totalQuantity, price } = req.body;
  try {
    await db.collection('components').doc(req.params.id).update({
      name,
      totalQuantity: parseInt(totalQuantity),
      availableQuantity: parseInt(totalQuantity), // Resetting available for simplicity or logic can be complex
      price: parseFloat(price)
    });
    res.json({ message: 'Component updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating component' });
  }
});

// DELETE /components/:id (Admin only)
app.delete('/components/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.collection('components').doc(req.params.id).delete();
    res.json({ message: 'Component deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting component' });
  }
});

// ----------------------------------------------------------------------------
// Order Routes
// ----------------------------------------------------------------------------

// POST /orders (Participant)
app.post('/orders', authenticateToken, async (req, res) => {
  const { componentId, quantity } = req.body;
  const username = req.user.username;

  try {
    // 1. Check if user is allowed to order
    const userDoc = await db.collection('users').doc(username).get();
    const userData = userDoc.data();

    if (!userData.orderingEnabled) {
      return res.status(403).json({ message: 'Ordering temporarily disabled by admin' });
    }

    // 2. Validate component existence and quantity
    const componentDoc = await db.collection('components').doc(componentId).get();
    if (!componentDoc.exists) {
      return res.status(404).json({ message: 'Component not found' });
    }

    const componentData = componentDoc.data();
    if (componentData.availableQuantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock available' });
    }

    // 3. Create order in "Pending" status
    const orderRef = await db.collection('orders').add({
      username,
      componentId,
      componentName: componentData.name,
      quantity: parseInt(quantity),
      status: 'Pending',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ id: orderRef.id, message: 'Order request submitted' });
  } catch (error) {
    res.status(500).json({ message: 'Order failed', error: error.message });
  }
});

// GET /orders (Shared)
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    let query = db.collection('orders').orderBy('timestamp', 'asc');
    
    // Non-admin can only see their own orders
    if (req.user.role !== 'admin') {
      query = query.where('username', '==', req.user.username);
    }

    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// ----------------------------------------------------------------------------
// Admin Operations (Approve, Reject, Return, etc.)
// ----------------------------------------------------------------------------

// PUT /orders/:id/approve (Admin)
app.put('/orders/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  const orderId = req.params.id;
  
  try {
    await db.runTransaction(async (t) => {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await t.get(orderRef);

      if (!orderDoc.exists) throw new Error('Order not found');
      const orderData = orderDoc.data();
      if (orderData.status !== 'Pending') throw new Error('Order is already processed');

      const componentRef = db.collection('components').doc(orderData.componentId);
      const componentDoc = await t.get(componentRef);
      const componentData = componentDoc.data();

      const userRef = db.collection('users').doc(orderData.username);
      const userDoc = await t.get(userRef);
      const userData = userDoc.data();

      const totalPrice = componentData.price * orderData.quantity;

      // Logic checks
      if (componentData.availableQuantity < orderData.quantity) throw new Error('Insufficient stock');
      if (userData.points < totalPrice) throw new Error('Participant has insufficient points');

      // 1. Deduct component quantity
      t.update(componentRef, {
        availableQuantity: componentData.availableQuantity - orderData.quantity
      });

      // 2. Deduct participant points
      t.update(userRef, {
        points: userData.points - totalPrice
      });

      // 3. Update order status
      t.update(orderRef, { status: 'Approved' });

      // 4. Record transaction
      const transRef = db.collection('transactions').doc();
      t.set(transRef, {
        username: orderData.username,
        type: 'debit',
        amount: totalPrice,
        reason: `Purchase: ${orderData.quantity}x ${componentData.name}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ message: 'Order approved successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Additional status: Mark as Given
app.put('/orders/:id/give', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.collection('orders').doc(req.params.id).update({ status: 'Given' });
    res.json({ message: 'Order marked as Given' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking as given' });
  }
});

// Reject Order
app.put('/orders/:id/reject', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.collection('orders').doc(req.params.id).update({ status: 'Rejected' });
    res.json({ message: 'Order rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting order' });
  }
});

// PUT /orders/:id/return (Admin)
app.put('/orders/:id/return', authenticateToken, isAdmin, async (req, res) => {
  const orderId = req.params.id;
  
  try {
    await db.runTransaction(async (t) => {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await t.get(orderRef);

      const orderData = orderDoc.data();
      if (orderData.status !== 'Given') throw new Error('Only items marked as "Given" can be returned');

      const componentRef = db.collection('components').doc(orderData.componentId);
      const componentDoc = await t.get(componentRef);
      const componentData = componentDoc.data();

      const userRef = db.collection('users').doc(orderData.username);
      const userDoc = await t.get(userRef);
      const userData = userDoc.data();

      // Refund 50%
      const refundAmount = (componentData.price * orderData.quantity) * 0.5;

      // 1. Add quantity back
      t.update(componentRef, {
        availableQuantity: componentData.availableQuantity + orderData.quantity
      });

      // 2. Refund points
      t.update(userRef, {
        points: userData.points + refundAmount
      });

      // 3. Mark returned
      t.update(orderRef, { status: 'Returned' });

      // 4. Transaction
      const transRef = db.collection('transactions').doc();
      t.set(transRef, {
        username: orderData.username,
        type: 'credit',
        amount: refundAmount,
        reason: `Refund (50%): Returned ${orderData.quantity}x ${componentData.name}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ message: 'Item returned successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ----------------------------------------------------------------------------
// Team Management (Admin only)
// ----------------------------------------------------------------------------

app.get('/teams', authenticateToken, isAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').where('role', '==', 'participant').get();
    const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teams' });
  }
});

app.post('/teams', authenticateToken, isAdmin, async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').doc(username).set({
      username,
      password: hashedPassword,
      role: 'participant',
      points: 500, // Fixed starting points
      orderingEnabled: true
    });
    res.status(201).json({ message: 'Team created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating team' });
  }
});

app.put('/teams/:username/toggle', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.params.username);
    const userDoc = await userRef.get();
    const newState = !userDoc.data().orderingEnabled;
    await userRef.update({ orderingEnabled: newState });
    res.json({ message: `Ordering ${newState ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling state' });
  }
});

// ----------------------------------------------------------------------------
// Email System
// ----------------------------------------------------------------------------

app.post('/api/send-team-email', async (req, res) => {
  const { toEmail, username, password } = req.body;

  if (!toEmail || !toEmail.endsWith('@gmail.com')) {
    return res.status(400).json({ message: 'A valid Gmail address is required.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 465,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const websiteLink = process.env.WEBSITE_LINK || 'https://buildverse-official.vercel.app';

    const mailOptions = {
      from: `"Buildverse Team" <${process.env.SMTP_USER}>`,
      to: toEmail,
      replyTo: process.env.SMTP_USER,
      subject: `Buildverse Event – Team Credentials & Website Access`,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Entity-Ref-ID': Date.now().toString()
      },
      text: `Dear Participant,

Greetings from the Buildverse Team!

We are excited to welcome you to the Buildverse Event at Pleadies 2026, hosted by KLE Technological University.

As part of the event setup, each team has been assigned unique login credentials. These credentials will be used to access the official Buildverse platform.

Your Team Credentials:
- Team Identity: ${username}
- Password: ${password}

Website Access:
You can access the Buildverse platform using the link below:
${websiteLink}

Through this website, your team will be able to browse components, place orders, and manage requirements.

Regards,
Buildverse Team
KLE Technological University`,
      html: `
        <div style="background-color: #f4f7f9; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;">
            
            <!-- Header Banner -->
            <div style="background-color: #C8102E; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; font-weight: 900;">BUILDVERSE <span style="font-weight: 300; opacity: 0.8;">2026</span></h1>
            </div>

            <!-- Content Body -->
            <div style="padding: 40px; color: #333;">
              <p style="font-size: 16px; margin-top: 0;">Dear Participant,</p>
              <p style="font-size: 15px;">Greetings from the <strong>Buildverse Team</strong>!</p>
              <p style="font-size: 15px;">
                We are excited to welcome you to the <strong>Buildverse Event</strong> at <strong>Pleiades 2026</strong>, hosted by KLE Technological University.
              </p>
              <p style="font-size: 15px;">
                As part of the event setup, each team has been assigned unique login credentials. These credentials will be used to access the official Buildverse platform.
              </p>

              <!-- Credentials Box -->
              <div style="margin: 30px 0; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 25px;">
                <h3 style="margin-top: 0; font-size: 14px; color: #C8102E; text-transform: uppercase; letter-spacing: 1px;">Your Team Credentials:</h3>
                <p style="margin: 10px 0; font-size: 16px;"><strong>Team Identity:</strong> <code style="background: #eee; padding: 3px 6px; border-radius: 4px;">${username}</code></p>
                <p style="margin: 10px 0; font-size: 16px;"><strong>Password:</strong> <code style="background: #eee; padding: 3px 6px; border-radius: 4px;">${password}</code></p>
                <p style="font-size: 12px; color: #666; margin-top: 15px; font-style: italic;">Please keep these details confidential and use them only for your team activities.</p>
              </div>

              <h3 style="font-size: 16px; color: #0047AB; text-transform: uppercase;">Website Access:</h3>
              <p style="font-size: 15px;">You can access the Buildverse platform using the link below:</p>
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${websiteLink}" style="display: inline-block; background-color: #0047AB; color: #ffffff; padding: 18px 45px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 14px; text-transform: uppercase; box-shadow: 0 5px 15px rgba(0,71,171,0.3);">Access Platform</a>
              </div>

              <p style="font-size: 15px;">Through this website, your team will be able to:</p>
              <ul style="font-size: 15px; color: #444;">
                <li>Browse and select required components</li>
                <li>Place orders for materials needed during the event</li>
                <li>Manage your build requirements efficiently</li>
              </ul>

              <p style="font-size: 15px;">
                We recommend that you log in at the earliest and familiarize yourself with the platform before the event begins.
              </p>
              
              <p style="font-size: 15px;">
                If you face any issues while accessing the website or using your credentials, feel free to reach out to us.
              </p>

              <p style="font-size: 15px; margin-bottom: 0;">
                We look forward to your active participation and wish you the best for the competition!
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #fcfdfe; padding: 30px; text-align: left; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 14px; color: #333;">Regards,</p>
              <p style="margin: 5px 0; font-weight: bold; color: #1e293b;">Buildverse Team</p>
              <p style="margin: 0; font-size: 13px; color: #64748b;">KLE Technological University</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});

// ----------------------------------------------------------------------------
// Server Listen
// ----------------------------------------------------------------------------
module.exports = app;
