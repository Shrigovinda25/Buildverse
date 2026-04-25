const user = checkAuth('participant');
if (user) {
    document.getElementById('welcome-msg').textContent = `WELCOME, ${user.username.toUpperCase()}`;
    setupUserListener(user.username);
    const sessionId = localStorage.getItem('bv_sessionId');
    startSessionHeartbeat(user.username, sessionId);
}

let cart = {};
let orderedCounts = {}; // Track items already ordered/held by the team


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

// 1. Listen for User Profile
function setupUserListener(username) {
    firestore.collection('users').doc(username).onSnapshot(doc => {
        const data = doc.data();
        if (!data) return;

        document.getElementById('user-points-val').textContent = data.points;

        const banner = document.getElementById('ordering-status-banner');
        if (!data.orderingEnabled) {
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }

        // document.getElementById('stat-held-items').textContent = heldItems;

        localStorage.setItem('bv_user_live', JSON.stringify(data));
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

    components.forEach((item, index) => {
        const alreadyCount = orderedCounts[item.id] || 0;
        const cartCount = cart[item.id]?.qty || 0;
        const totalTeamCount = alreadyCount + cartCount;
        const limitReached = item.maxPerTeam && totalTeamCount >= item.maxPerTeam;

        const canOrder = liveUser.orderingEnabled && item.availableQuantity > 0 && !limitReached;

        const card = `
            <div class="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col p-8 h-full transition-all hover:shadow-xl hover:-translate-y-1 group">
                <div class="mb-6 rounded-2xl bg-stone-50 p-4 h-36 flex items-center justify-center overflow-hidden">
                     <img src="${item.imageUrl || `assets/components/${item.name.replace(/\//g, ' ').replace(/\+/g, '%2B').replace(/&/g, '%26')}.jpg`}" onerror="this.parentElement.style.display='none'" class="max-h-full object-contain mix-blend-multiply transition-transform group-hover:scale-110" alt="${item.name}">
                </div>
                <div class="flex justify-between items-start mb-6">
                    <div class="flex flex-col">
                        <span class="text-[9px] font-black text-bvBlue uppercase tracking-widest mb-1 opacity-60">${item.category || 'RESOURCES'}</span>
                        <h3 class="font-black text-slate-800 text-xl leading-tight uppercase tracking-tight italic">${item.name}</h3>
                        ${item.maxPerTeam ? `<p class="text-[9px] font-bold text-bvRed uppercase tracking-widest mt-1 opacity-80">LIMIT: ${item.maxPerTeam} PER TEAM</p>` : ''}
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
                    
                    ${(liveUser.orderingEnabled && item.availableQuantity > 0) ? `
                        <div class="flex items-center justify-between w-full mt-2 bg-slate-50 rounded-[20px] p-1.5 border border-slate-100">
                            <button class="w-10 h-10 rounded-[14px] bg-white text-slate-400 hover:text-bvRed shadow-sm transition-all flex items-center justify-center" onclick="updateCartItem('${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.price}, -1)">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                            </button>
                            <span class="font-black text-lg italic w-10 text-center text-slate-700" id="cart-qty-${item.id}">${cartCount}</span>
                            <button class="w-10 h-10 rounded-[14px] ${limitReached ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-bvYellow text-bvRed shadow-yellow-100/50 hover:scale-105'} shadow-sm transition-all active:scale-95 flex items-center justify-center" 
                                    ${limitReached ? 'disabled' : ''}
                                    onclick="updateCartItem('${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.price}, 1)">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            </button>
                        </div>
                        ${limitReached ? `<p class="text-center text-[8px] font-black text-bvRed uppercase mt-3 tracking-widest animate-pulse">Team quota reached</p>` : ''}
                    ` : `
                        <button class="w-full py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all bg-slate-100 text-slate-300 cursor-not-allowed" disabled>
                            ${!liveUser.orderingEnabled ? 'Locked' : 'Depleted'}
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

        // Track items for limits (count Pending, Approved, and Given)
        if (['Pending', 'Approved', 'Given'].includes(order.status)) {
            newOrderedCounts[order.componentId] = (newOrderedCounts[order.componentId] || 0) + order.quantity;
        }

        if (order.status === 'Pending') activeReqs++;
        if (order.status === 'Given') heldItemsCount += order.quantity;

        const row = `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="px-2 py-6">
                    <p class="font-black text-slate-800 text-lg uppercase tracking-tight italic">${order.componentName}</p>
                    ${order.status === 'Rejected' ? `<p class="text-[8px] text-red-500 font-bold mt-1 uppercase tracking-widest animate-pulse">This component is rejected</p>` : ''}
                </td>
                <td class="px-2 py-6">
                    <span class="font-black text-bvRed text-xl italic">x${order.quantity}</span>
                </td>
                <td class="px-2 py-6">
                    <span class="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm status-${order.status}">${order.status}</span>
                </td>
                <td class="px-2 py-6 text-right">
                    ${order.status === 'Pending' ? (() => {
                const idx = allPending.findIndex(o => o.id === doc.id);
                const pos = idx + 1;
                return `<div class="w-10 h-10 rounded-2xl bg-bvRed text-white flex items-center justify-center font-black text-sm shadow-xl shadow-red-100 ml-auto italic transition-transform group-hover:scale-110">${pos}</div>`;
            })() : '-'}
                </td>
            </tr>
        `;

        if (order.status === 'Given') {
            const heldRow = `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-2 py-6">
                        <p class="font-black text-slate-800 text-lg uppercase tracking-tight italic">${order.componentName}</p>
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

// ----------------------------------------------------------------------------
// Cart & Checkout
// ----------------------------------------------------------------------------
function updateCartItem(id, name, price, delta) {
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
        itemsHtml += `
            <div class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                    <p class="font-black text-slate-800 text-sm italic uppercase">${item.name}</p>
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
            let totalCartCost = 0;
            const componentDataMap = {};

            // 1. Fetch all component docs and check stock
            for (const id of Object.keys(cart)) {
                const compRef = firestore.collection('components').doc(id);
                const compDoc = await transaction.get(compRef);
                if (!compDoc.exists) throw new Error(`Component ${cart[id].name} no longer exists.`);
                
                const compData = compDoc.data();
                if (compData.availableQuantity < cart[id].qty) {
                    throw new Error(`Insufficient stock for ${cart[id].name}. Available: ${compData.availableQuantity}`);
                }
                
                totalCartCost += cart[id].qty * cart[id].price;
                componentDataMap[id] = compData;
            }

            // 2. Check points
            if (userData.points < totalCartCost) {
                throw new Error(`Insufficient points. Required: ${totalCartCost}, Available: ${userData.points}`);
            }

            // 3. Apply updates
            transaction.update(userRef, { points: userData.points - totalCartCost });

            for (const [id, item] of Object.entries(cart)) {
                const compRef = firestore.collection('components').doc(id);
                const currentQty = Number(componentDataMap[id].availableQuantity || 0);
                const orderQty = Number(item.qty || 0);

                transaction.update(compRef, { 
                    availableQuantity: currentQty - orderQty 
                });

                const newOrderRef = firestore.collection('orders').doc();
                transaction.set(newOrderRef, {
                    username: user.username,
                    componentId: id,
                    componentName: item.name,
                    quantity: orderQty,
                    pricePerUnit: Number(item.price),
                    totalCost: orderQty * Number(item.price),
                    status: 'Pending',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // 4. Log transaction
            const transRef = firestore.collection('transactions').doc();
            transaction.set(transRef, {
                username: user.username,
                type: 'debit',
                amount: totalCartCost,
                reason: `Order Placement: ${Object.values(cart).map(i => `${i.qty}x ${i.name}`).join(', ')}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        cart = {};
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
