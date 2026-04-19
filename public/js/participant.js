const user = checkAuth('participant');
if (user) {
    document.getElementById('welcome-msg').textContent = `WELCOME, ${user.username.toUpperCase()}`;
    setupUserListener(user.username);
    const sessionId = localStorage.getItem('bv_sessionId');
    startSessionHeartbeat(user.username, sessionId);
}

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
    document.querySelectorAll('.pill-nav-link').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab || (tab === 'my-orders' && t.dataset.tab === 'orders')) {
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
        const canOrder = liveUser.orderingEnabled && item.availableQuantity > 0;
        const card = `
            <div class="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col p-8 h-full transition-all hover:shadow-xl hover:-translate-y-1 group">
                <div class="mb-6 rounded-2xl bg-stone-50 p-4 h-36 flex items-center justify-center overflow-hidden">
                     <img src="${item.imageUrl || `assets/components/${item.name.replace('/', ' ')}.jpg`}" onerror="this.parentElement.style.display='none'" class="max-h-full object-contain mix-blend-multiply transition-transform group-hover:scale-110" alt="${item.name}">
                </div>
                <div class="flex justify-between items-start mb-6">
                    <div class="flex flex-col">
                        <span class="text-[9px] font-black text-bvBlue uppercase tracking-widest mb-1 opacity-60">${item.category || 'RESOURCES'}</span>
                        <h3 class="font-black text-slate-800 text-xl leading-tight uppercase tracking-tight italic">${item.name}</h3>
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
                        <div class="h-full bg-bvYellow transition-all duration-700" style="width: ${(item.availableQuantity/item.totalQuantity)*100}%"></div>
                    </div>
                    
                    <button class="w-full py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all
                        ${canOrder ? 'bg-bvYellow text-bvRed shadow-xl shadow-yellow-100 hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}"
                        ${!canOrder ? 'disabled' : ''} 
                        onclick="openOrderModal('${item.id}', '${item.name}', ${item.price})">
                        ${liveUser.orderingEnabled ? (item.availableQuantity > 0 ? 'Acquire_Resource' : 'Depleted') : 'Locked'}
                    </button>
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

    const allPending = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(o => o.status === 'Pending');

    snapshot.docs.forEach((doc, index) => {
        const order = doc.data();
        if (order.username !== user.username) return;

        if (order.status === 'Pending') activeReqs++;
        if (order.status === 'Given') heldItemsCount += order.quantity;

        const row = `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="px-2 py-6">
                    <p class="font-black text-slate-800 text-lg uppercase tracking-tight italic">${order.componentName}</p>
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

    document.getElementById('stat-active-reqs').textContent = activeReqs;
    // document.getElementById('stat-held-items').textContent = heldItems;
});

// ----------------------------------------------------------------------------
// Modals & Acquisition
// ----------------------------------------------------------------------------
let selectedComp = null;

function openOrderModal(id, name, price) {
    selectedComp = { id, name, price };
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="space-y-8">
            <div class="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Resource</p>
                <p class="text-2xl font-black text-slate-800 uppercase tracking-tight italic">${name}</p>
            </div>
            
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Quantity Assessment</label>
                <div class="flex items-center gap-6 mb-8">
                    <input type="number" id="order-qty" value="1" min="1" class="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-black text-lg" oninput="updateCalculation()">
                    <div class="text-right">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Cost</p>
                        <p class="text-2xl font-black text-bvRed italic" id="calc-total">${price} PTS</p>
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Identity Verification (Representative Name)</label>
                    <input type="text" id="order-rep-verify" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" placeholder="Enter Team Representative Name">
                </div>
            </div>
        </div>
    `;

    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-backdrop').classList.add('flex');
}

function updateCalculation() {
    const qtyInput = document.getElementById('order-qty');
    if (!qtyInput) return;
    const qty = parseInt(qtyInput.value) || 0;
    document.getElementById('calc-total').textContent = (qty * selectedComp.price) + ' PTS';
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
    const qtyInput = document.getElementById('order-qty');
    const verifyInput = document.getElementById('order-rep-verify');
    if (!qtyInput || !verifyInput) return;
    
    const qty = parseInt(qtyInput.value);
    const verifyName = verifyInput.value.trim();
    
    try {
        const liveUser = JSON.parse(localStorage.getItem('bv_user_live') || '{}');
        if (verifyName.toLowerCase() !== liveUser.representativeName?.toLowerCase()) {
            alert('IDENTITY_ERROR: Verification Name does not match Registered Representative.');
            return;
        }

        await firestore.collection('orders').add({
            username: user.username,
            componentId: selectedComp.id,
            componentName: selectedComp.name,
            quantity: qty,
            pricePerUnit: selectedComp.price,
            totalCost: qty * selectedComp.price,
            status: 'Pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeModal();
    } catch (e) {
        alert('Error: ' + e.message);
    }
};
