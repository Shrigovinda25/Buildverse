const user = checkAuth('participant');
if (user) {
    document.getElementById('welcome-msg').textContent = `WELCOME, ${user.username.toUpperCase()}`;
    setupUserListener(user.username);
    const sessionId = localStorage.getItem('bv_sessionId');
    startSessionHeartbeat(user.username, sessionId);
}

// Load cart from localStorage if exists
let cart = JSON.parse(localStorage.getItem('bv_cart') || '{}');
let orderedCounts = {}; // Track items already ordered/held by the team (for UI)


// ----------------------------------------------------------------------------
// Categorical Sorting Logic
// ----------------------------------------------------------------------------
const CAT_PRIORITY = {
    'Controller': 1,
    'Sensor': 2,
    'Actuator': 3,
    'Indicator': 4,
    'Display': 5,
    'Input': 6,
    'Hardware': 7,
    'Power': 8
};

function sortComponents(array) {
    return array.sort((a, b) => {
        const pA = CAT_PRIORITY[a.category] || 99;
        const pB = CAT_PRIORITY[b.category] || 99;
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name);
    });
}

function getComponentImageUrl(item) {
    if (item.imageUrl) return item.imageUrl;
    let name = item.name || '';

    // Use the specific ESP32 default image for all ESP32 variants
    if (name.toUpperCase().includes('ESP32')) {
        return 'assets/components/ESP32_Default.jpg';
    }

    // Support names with special characters by mapping to sanitized filenames
    const sanitizedName = name.replace(/\+/g, 'Plus')
                              .replace(/½/g, 'Half ')
                              .replace(/\//g, ' ')
                              .replace(/&/g, '%26')
                              .replace(/ /g, '%20');
    return `assets/components/${sanitizedName}.jpg`;
}

// ----------------------------------------------------------------------------
// Tabs Logic (Pill Style)
// ----------------------------------------------------------------------------
function switchTab(tab) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${tab}-tab`).classList.remove('hidden');

    // Update Floating Pill Nav
    document.querySelectorAll('.sidebar-btn[data-tab]').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab) {
            t.classList.add('active');
        }
    });
}

// ----------------------------------------------------------------------------
// Real-time Listeners (Pill Style)
// ----------------------------------------------------------------------------

let isGlobalPaused = false;
let areImagesHidden = false;
firestore.collection('settings').doc('system').onSnapshot(doc => {
    if (doc.exists) {
        const data = doc.data();
        isGlobalPaused = data.orderingPaused || false;
        areImagesHidden = data.hideComponentImages || false;
        
        // Handle global image visibility
        if (areImagesHidden) {
            document.body.classList.add('hide-component-images');
        } else {
            document.body.classList.remove('hide-component-images');
        }

        updateBannerState();
        renderCatalog();
    }
});

function updateBannerState() {
    const banner = document.getElementById('ordering-status-banner');
    const liveUser = JSON.parse(localStorage.getItem('bv_user_live') || '{}');
    
    if (isGlobalPaused) {
        banner.innerHTML = 'Global Event Paused by Organizers';
        banner.classList.remove('hidden');
    } else if (liveUser.orderingEnabled === false) {
        banner.innerHTML = 'Operation Suspended by Admin Control';
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

// 1. Listen for User Profile
function setupUserListener(username) {
    firestore.collection('users').doc(username).onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;

        document.getElementById('user-points-val').textContent = data.points;

        localStorage.setItem('bv_user_live', JSON.stringify(data));
        updateBannerState();
        renderCatalog();
    });
}

// 2. Listen for Components (Catalog)
let components = [];
firestore.collection('components').onSnapshot(snapshot => {
    components = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    components = sortComponents(components);
    renderCatalog();
});

function renderCatalog() {
    const list = document.getElementById('catalog-list');
    const liveUser = JSON.parse(localStorage.getItem('bv_user_live') || '{}');
    list.innerHTML = '';

    const searchTerm = (document.getElementById('catalog-search')?.value || '').toLowerCase();
    const categoryFilter = document.getElementById('catalog-category')?.value || 'ALL';

    const filteredComponents = components.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (filteredComponents.length === 0) {
        list.innerHTML = '<div class="col-span-full py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No resources found matching criteria</div>';
        return;
    }

    filteredComponents.forEach((item, index) => {
        const alreadyCount = orderedCounts[item.id] || 0;
        const cartCount = cart[item.id]?.qty || 0;
        const totalTeamCount = alreadyCount + cartCount;
        const limitReached = item.maxPerTeam && totalTeamCount >= item.maxPerTeam;

        const canOrder = !isGlobalPaused && liveUser.orderingEnabled && item.availableQuantity > 0 && !limitReached;

        const card = `
            <div class="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col p-8 h-full transition-all hover:shadow-xl hover:-translate-y-1 group">
                <div class="mb-6 rounded-2xl bg-stone-50 p-4 h-36 flex items-center justify-center overflow-hidden">
                     <div class="comp-number">${index + 1}</div>
                     <img src="${getComponentImageUrl(item)}" onerror="this.outerHTML='<div class=\\'w-full h-full rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] text-slate-300 font-black uppercase tracking-widest text-center p-4\\'>Resource Image Not Found</div>'" class="max-h-full object-contain mix-blend-multiply transition-transform group-hover:scale-110" alt="${item.name}">
                </div>
                <div class="flex justify-between items-start mb-6">
                    <div class="flex flex-col">
                        <span class="text-[9px] font-black text-bvBlue uppercase tracking-widest mb-1 opacity-60">${areImagesHidden ? 'HIDDEN_PROTOCOL' : (item.category || 'RESOURCES')}</span>
                        <h3 class="font-black text-slate-800 text-xl leading-tight uppercase tracking-tight italic">${areImagesHidden ? `Resource #${index + 1}` : item.name}</h3>
                        ${item.maxPerTeam ? `<p class="text-[9px] font-bold text-bvRed uppercase tracking-widest mt-1 opacity-80">LIMIT: ${item.maxPerTeam} PER TEAM</p>` : ''}
                        ${(item.description && !areImagesHidden) ? `<p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 bg-slate-100/50 p-2 rounded-xl border border-slate-200/50 italic">${item.description}</p>` : ''}
                    </div>
                    <div class="bg-red-50 text-bvRed px-3 py-1.5 rounded-2xl text-xs font-black italic shadow-sm">
                        ${item.price} <span class="not-italic text-[10px] opacity-60">PTS</span>
                    </div>
                </div>
                
                <div class="mt-auto pt-8 border-t border-slate-50">
                    <div class="flex justify-between items-end mb-3 text-[10px] font-black tracking-widest text-slate-400">
                        <span>STOCK PROTOCOL</span>
                        <span class="${item.availableQuantity < 5 ? 'text-bvRed' : 'text-slate-500'} italic font-black">${item.availableQuantity} UNITS</span>
                    </div>
                    <div class="h-1.5 bg-slate-50 rounded-full overflow-hidden mb-8">
                        <div class="h-full bg-bvYellow transition-all duration-700" style="width: ${(item.availableQuantity / item.totalQuantity) * 100}%"></div>
                    </div>
                    
                    ${(!isGlobalPaused && liveUser.orderingEnabled && item.availableQuantity > 0) ? `
                        <div class="flex items-center justify-between w-full mt-2 bg-slate-50 rounded-[20px] p-1.5 border border-slate-100">
                            <button class="w-10 h-10 rounded-[14px] bg-white text-slate-400 hover:text-bvRed shadow-sm transition-all flex items-center justify-center" onclick="updateCartItem(event, '${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.price}, -1)">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/></svg>
                            </button>
                            <span class="font-black text-lg italic w-10 text-center text-slate-700" id="cart-qty-${item.id}">${cartCount}</span>
                            <button class="w-10 h-10 rounded-[14px] ${limitReached ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-bvYellow text-bvRed shadow-yellow-100/50 hover:scale-105'} shadow-sm transition-all active:scale-95 flex items-center justify-center" 
                                    ${limitReached ? 'disabled' : ''}
                                    onclick="updateCartItem(event, '${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.price}, 1)">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            </button>
                        </div>
                        ${limitReached ? `<p class="text-center text-[8px] font-black text-bvRed uppercase mt-3 tracking-widest animate-pulse">Team quota reached</p>` : ''}
                    ` : `
                        <button class="w-full py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all bg-slate-100 text-slate-300 cursor-not-allowed" disabled>
                            ${isGlobalPaused ? 'Paused' : (!liveUser.orderingEnabled ? 'Locked' : 'Depleted')}
                        </button>
                    `}
                </div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', card);
    });
}

// 3. Listen for Order Queue (My Orders)
firestore.collection('orders').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
    // Check for status changes to show toasts
    snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
            const order = change.doc.data();
            if (order.username === user.username) {
                const isHidden = document.body.classList.contains('hide-component-images');
                const maskedName = isHidden ? `Resource #${components.findIndex(c => c.id === order.componentId) + 1}` : order.componentName;
                
                if (order.status === 'Approved') showToast('success', 'Order Approved', `Admin approved ${order.quantity}x ${maskedName}`);
                else if (order.status === 'Rejected') showToast('error', 'Order Rejected', `Admin rejected ${order.quantity}x ${maskedName}`);
                else if (order.status === 'Given') showToast('info', 'Items Received', `You received ${order.quantity}x ${maskedName}`);
            }
        }
    });

    const list = document.getElementById('my-orders-list');
    const heldList = document.getElementById('held-components-list');
    list.innerHTML = '';
    heldList.innerHTML = '';

    let activeReqs = 0;
    let heldItemsCount = 0;
    const newOrderedCounts = {};

    const allPending = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(o => o.status === 'Pending');

    snapshot.docs.forEach((doc, index) => {
        const order = doc.data();
        if (order.username !== user.username) return;

        const isHidden = document.body.classList.contains('hide-component-images');
        const displayName = isHidden ? `Resource #${components.findIndex(c => c.id === order.componentId) + 1}` : order.componentName;

        // Track items for limits (count Pending, Approved, and Given)
        if (['Pending', 'Approved', 'Given'].includes(order.status)) {
            newOrderedCounts[order.componentId] = (newOrderedCounts[order.componentId] || 0) + order.quantity;
        }

        if (order.status === 'Pending') activeReqs++;
        if (order.status === 'Given') heldItemsCount += order.quantity;

        const row = `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="px-2 py-6">
                    <p class="font-black text-slate-800 text-lg uppercase tracking-tight italic">${displayName}</p>
                    ${order.status === 'Rejected' ? `<p class="text-[8px] text-red-500 font-bold mt-1 uppercase tracking-widest animate-pulse">This component is rejected</p>` : ''}
                </td>
                <td class="px-2 py-6">
                    <span class="font-black text-bvRed text-xl italic">x${order.quantity}</span>
                </td>
                <td class="px-2 py-6">
                    <span class="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm status-${order.status}">${order.status}</span>
                </td>
                <td class="px-2 py-6">
                    <div class="flex items-center justify-end gap-3">
                        ${order.status === 'Pending' ? (() => {
                    const idx = allPending.findIndex(o => o.id === doc.id);
                    const pos = idx + 1;
                    return `
                            <button onclick="cancelOrder('${doc.id}', '${order.componentId}', ${order.quantity}, ${order.totalCost})" class="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all">Cancel</button>
                            <div class="w-10 h-10 rounded-2xl bg-bvRed text-white flex items-center justify-center font-black text-sm shadow-xl shadow-red-100 italic transition-transform group-hover:scale-110">${pos}</div>
                        `;
                })() : '-'}
                    </div>
                </td>
            </tr>
        `;

        if (order.status === 'Given') {
            const heldRow = `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-2 py-6">
                        <p class="font-black text-slate-800 text-lg uppercase tracking-tight italic">${displayName}</p>
                    </td>
                    <td class="px-2 py-6">
                        <span class="font-black text-bvBlue text-xl italic">x${order.quantity}</span>
                    </td>
                    <td class="px-2 py-6">
                        <span class="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">POSSESSION_LOCK</span>
                    </td>
                </tr>
            `;
            heldList.insertAdjacentHTML('beforeend', heldRow);
        } else {
            list.insertAdjacentHTML('beforeend', row);
        }
    });

    orderedCounts = newOrderedCounts;
    renderCatalog();

    document.getElementById('stat-active-reqs').textContent = activeReqs;
    // document.getElementById('stat-held-items').textContent = heldItems;
});

// 4. Listen for Leaderboard
firestore.collection('users').where('role', '==', 'participant').onSnapshot(snapshot => {
    const list = document.getElementById('participant-leaderboard-list');
    if (!list) return;
    list.innerHTML = '';
    
    let users = snapshot.docs.map(doc => doc.data());
    // Sort by points descending
    users.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    users.forEach((team, index) => {
        const row = `
            <tr class="hover:bg-slate-50 transition-colors group ${team.username === user.username ? 'bg-blue-50/30' : ''}">
                <td class="px-2 py-6 text-center">
                    <div class="w-10 h-10 mx-auto rounded-2xl ${index === 0 ? 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-200' : index === 1 ? 'bg-slate-300 text-slate-800 shadow-lg shadow-slate-200' : index === 2 ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 text-slate-500'} flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110">
                        ${index + 1}
                    </div>
                </td>
                <td class="px-2 py-6">
                    <p class="font-black text-slate-800 text-lg uppercase tracking-tight italic">${team.username} ${team.username === user.username ? '<span class="text-[10px] text-bvBlue ml-2 not-italic">(YOU)</span>' : ''}</p>
                </td>
                <td class="px-2 py-6 text-right">
                    <span class="font-black text-bvBlue text-xl italic">${team.points}</span>
                    <span class="text-[10px] text-slate-400 not-italic uppercase ml-0.5">pts</span>
                </td>
            </tr>
        `;
        list.insertAdjacentHTML('beforeend', row);
    });
});

// ----------------------------------------------------------------------------
// Cart & Checkout
// ----------------------------------------------------------------------------
function updateCartItem(event, id, name, price, delta) {
    if (!cart[id]) cart[id] = { name, price, qty: 0 };

    // Check per-team limit
    if (delta > 0) {
        const component = components.find(c => c.id === id);
        if (component && component.maxPerTeam) {
            const alreadyCount = orderedCounts[id] || 0;
            const currentCartQty = cart[id].qty;
            if (alreadyCount + currentCartQty + delta > component.maxPerTeam) {
                // Limit exceeded
                return;
            }
        }
        
        // --- Fly-to-Cart Animation ---
        if (event) {
            try {
                const btn = event.currentTarget;
                const rect = btn.getBoundingClientRect();
                const cartBtn = document.getElementById('floating-cart-btn');
                
                if (cartBtn && !cartBtn.classList.contains('hidden')) {
                    const cartRect = cartBtn.getBoundingClientRect();
                    
                    // Create flying element
                    const flyEl = document.createElement('div');
                    flyEl.className = 'fly-item bg-bvBlue w-8 h-8 flex items-center justify-center rounded-full shadow-lg';
                    flyEl.innerHTML = '<span class="text-white text-xs">📦</span>';
                    
                    // Set initial position
                    flyEl.style.left = `${rect.left + rect.width / 2 - 16}px`;
                    flyEl.style.top = `${rect.top + rect.height / 2 - 16}px`;
                    
                    document.body.appendChild(flyEl);
                    
                    // Trigger animation
                    requestAnimationFrame(() => {
                        flyEl.style.left = `${cartRect.left + cartRect.width / 2 - 16}px`;
                        flyEl.style.top = `${cartRect.top + cartRect.height / 2 - 16}px`;
                        flyEl.style.transform = 'scale(0.1)';
                        flyEl.style.opacity = '0';
                    });
                    
                    // Cleanup
                    setTimeout(() => {
                        flyEl.remove();
                        // Give cart button a little bounce
                        cartBtn.classList.add('scale-110');
                        setTimeout(() => cartBtn.classList.remove('scale-110'), 150);
                    }, 600);
                }
            } catch(e) {}
        }
    }

    cart[id].qty += delta;
    if (cart[id].qty <= 0) {
        delete cart[id];
        const el = document.getElementById(`cart-qty-${id}`);
        if (el) el.textContent = '0';
    } else {
        const el = document.getElementById(`cart-qty-${id}`);
        if (el) el.textContent = cart[id].qty;
    }

    // Sync with localStorage
    localStorage.setItem('bv_cart', JSON.stringify(cart));

    updateCartUI();
    renderCatalog(); // Re-render to update add button state
}

function updateCartUI() {
    const totalItems = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    const floatBtn = document.getElementById('floating-cart-btn');
    if (!floatBtn) return;

    if (totalItems > 0) {
        const totalPts = Object.values(cart).reduce((sum, item) => sum + (item.price * item.qty), 0);
        floatBtn.classList.remove('hidden');
        floatBtn.innerHTML = `🛒 View Cart (${totalItems}) &nbsp;•&nbsp; ${totalPts} PTS`;
    } else {
        floatBtn.classList.add('hidden');
        closeModal();
    }
}

function openCartModal() {
    const content = document.getElementById('modal-content');
    if (Object.keys(cart).length === 0) return;

    let itemsHtml = '';
    let totalPts = 0;

    Object.keys(cart).forEach(id => {
        const item = cart[id];
        totalPts += item.qty * item.price;
        const isHidden = document.body.classList.contains('hide-component-images');
        const displayName = isHidden ? `Resource #${components.findIndex(c => c.id === id) + 1}` : item.name;
        itemsHtml += `
            <div class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                    <p class="font-black text-slate-800 text-sm italic uppercase">${displayName}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">${item.price} PTS / EA</p>
                </div>
                <div class="font-black text-bvRed text-lg italic tracking-tighter">x${item.qty}</div>
            </div>
        `;
    });

    content.innerHTML = `
        <div class="space-y-6">
            <div class="max-h-[30vh] overflow-y-auto space-y-3 pr-2">
                ${itemsHtml}
            </div>
            
            <div class="flex justify-between items-center p-6 bg-red-50 rounded-[24px] border border-red-100 shadow-sm">
                <p class="text-[10px] font-black text-bvRed uppercase tracking-widest">Protocol Cost</p>
                <p class="text-3xl font-black text-bvRed italic" id="calc-total">${totalPts} PTS</p>
            </div>
        </div>
    `;

    document.getElementById('modal-title').textContent = 'Review Processing Queue';
    document.getElementById('modal-submit').textContent = 'Confirm Order';

    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-backdrop').classList.add('flex');
}

function closeModal() {
    document.getElementById('modal-backdrop').classList.remove('flex');
    document.getElementById('modal-backdrop').classList.add('hidden');
}

function logout() {
    localStorage.removeItem('bv_user');
    window.location.href = 'index.html';
}

document.getElementById('modal-submit').onclick = async () => {
    if (Object.keys(cart).length === 0) return;

    try {
        document.getElementById('modal-submit').textContent = 'Processing...';
        document.getElementById('modal-submit').disabled = true;

        await firestore.runTransaction(async (transaction) => {
            const userRef = firestore.collection('users').doc(user.username);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("User document not found");
            
            const userData = userDoc.data();
            const currentInventory = userData.inventory || {}; // Map of compId -> count (Pending/Approved/Given)
            
            let totalCartCost = 0;
            const componentDataMap = {};

            // 1. Fetch all component docs and check stock & limits
            for (const id of Object.keys(cart)) {
                const compRef = firestore.collection('components').doc(id);
                const compDoc = await transaction.get(compRef);
                if (!compDoc.exists) throw new Error(`Component no longer exists.`);
                
                const compData = compDoc.data();
                
                // --- SECURITY FIX: Use DB price, not client price ---
                const dbPrice = Number(compData.price || 0);
                totalCartCost += cart[id].qty * dbPrice;

                // --- STOCK CHECK ---
                if (compData.availableQuantity < cart[id].qty) {
                    throw new Error(`Insufficient stock for ${compData.name}. Available: ${compData.availableQuantity}`);
                }

                // --- LIMIT CHECK (maxPerTeam) ---
                if (compData.maxPerTeam) {
                    const alreadyOwned = Number(currentInventory[id] || 0);
                    if (alreadyOwned + cart[id].qty > compData.maxPerTeam) {
                        throw new Error(`Limit exceeded for ${compData.name}. Max allowed: ${compData.maxPerTeam}. You already have ${alreadyOwned} in queue/possession.`);
                    }
                }
                
                componentDataMap[id] = { ...compData, dbPrice };
            }

            // 2. Check points
            if (userData.points < totalCartCost) {
                throw new Error(`Insufficient points. Required: ${totalCartCost}, Available: ${userData.points}`);
            }

            // 3. Apply updates
            const newInventory = { ...currentInventory };
            
            for (const [id, item] of Object.entries(cart)) {
                const compRef = firestore.collection('components').doc(id);
                const currentQty = Number(componentDataMap[id].availableQuantity || 0);
                const orderQty = Number(item.qty || 0);

                transaction.update(compRef, { 
                    availableQuantity: currentQty - orderQty 
                });

                // Update team inventory map for limit tracking
                newInventory[id] = (newInventory[id] || 0) + orderQty;

                const newOrderRef = firestore.collection('orders').doc();
                transaction.set(newOrderRef, {
                    username: user.username,
                    componentId: id,
                    componentName: componentDataMap[id].name, // Use DB name
                    quantity: orderQty,
                    pricePerUnit: componentDataMap[id].dbPrice, // Use DB price
                    totalCost: orderQty * componentDataMap[id].dbPrice,
                    status: 'Pending',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            transaction.update(userRef, { 
                points: userData.points - totalCartCost,
                inventory: newInventory
            });

            // 4. Log transaction
            const isHidden = document.body.classList.contains('hide-component-images');
            const transRef = firestore.collection('transactions').doc();
            transaction.set(transRef, {
                username: user.username,
                type: 'debit',
                amount: totalCartCost,
                reason: `Order Placement: ${Object.entries(cart).map(([id, i]) => {
                    const displayName = isHidden ? `Resource #${components.findIndex(c => c.id === id) + 1}` : i.name;
                    return `${i.qty}x ${displayName}`;
                }).join(', ')}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        cart = {};
        localStorage.removeItem('bv_cart');
        updateCartUI();
        document.querySelectorAll('[id^="cart-qty-"]').forEach(el => el.textContent = '0');
        closeModal();

    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        document.getElementById('modal-submit').textContent = 'Confirm Order';
        document.getElementById('modal-submit').disabled = false;
    }
};

window.openCartModal = openCartModal;

async function cancelOrder(orderId, componentId, quantity, totalCost) {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    try {
        await firestore.runTransaction(async (transaction) => {
            const orderRef = firestore.collection('orders').doc(orderId);
            const orderDoc = await transaction.get(orderRef);
            
            if (!orderDoc.exists || orderDoc.data().status !== 'Pending') {
                throw new Error('Order is no longer pending or does not exist.');
            }
            
            const userRef = firestore.collection('users').doc(user.username);
            const userDoc = await transaction.get(userRef);
            
            const compRef = firestore.collection('components').doc(componentId);
            const compDoc = await transaction.get(compRef);
            
            if (userDoc.exists && compDoc.exists) {
                const userData = userDoc.data();
                const compData = compDoc.data();
                const currentInventory = userData.inventory || {};
                
                // Update points and stock
                transaction.update(userRef, { 
                    points: Number(userData.points) + Number(totalCost),
                    inventory: {
                        ...currentInventory,
                        [componentId]: Math.max(0, (currentInventory[componentId] || 0) - Number(quantity))
                    }
                });
                transaction.update(compRef, { availableQuantity: Number(compData.availableQuantity) + Number(quantity) });
                transaction.update(orderRef, { status: 'Cancelled' });
                
                const isHidden = document.body.classList.contains('hide-component-images');
                const displayName = isHidden ? `Resource #${components.findIndex(c => c.id === componentId) + 1}` : compData.name;
                const transRef = firestore.collection('transactions').doc();
                transaction.set(transRef, {
                    username: user.username,
                    type: 'credit',
                    amount: totalCost,
                    reason: `Refund: Cancelled order for ${quantity}x ${displayName}`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    } catch (e) {
        alert('Error cancelling order: ' + e.message);
    }
}

function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    let bgColor = 'bg-white';
    let icon = '';
    let textColor = 'text-slate-800';
    
    if (type === 'success') {
        icon = '<span class="text-green-500">✅</span>';
        textColor = 'text-green-800';
    } else if (type === 'error') {
        icon = '<span class="text-red-500">❌</span>';
        textColor = 'text-red-800';
    } else if (type === 'info') {
        icon = '<span class="text-bvBlue">ℹ️</span>';
    }
    
    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 ${bgColor} p-4 rounded-2xl shadow-xl border border-slate-100 transform transition-all duration-300 translate-y-10 opacity-0 pointer-events-auto max-w-sm`;
    toast.innerHTML = `
        <div class="text-xl">${icon}</div>
        <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">${title}</p>
            <p class="text-sm font-bold ${textColor} leading-tight">${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-10');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

