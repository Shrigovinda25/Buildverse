require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// ----------------------------------------------------------------------------
// Firebase Initialization
// ----------------------------------------------------------------------------
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : require('./serviceAccountKey.json');

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

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
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
// Server Listen
// ----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
