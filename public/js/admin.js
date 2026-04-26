const user = checkAuth('admin');
if (user) {
    const sessionId = localStorage.getItem('bv_sessionId');
    startSessionHeartbeat(user.username, sessionId);
    
    // Display admin name
    const adminNameDisplay = document.getElementById('admin-name-display');
    if (adminNameDisplay) {
        adminNameDisplay.textContent = user.username;
    }
}
// Basic auth check passed

// ----------------------------------------------------------------------------
// Tabs Logic (Pill Style)
// ----------------------------------------------------------------------------
function switchTab(tab) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    const targetSection = document.getElementById(`${tab}-tab`);
    if (targetSection) targetSection.classList.remove('hidden');

    // Update Sidebar Buttons
    document.querySelectorAll('.sidebar-btn[data-tab]').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab) t.classList.add('active');
    });

    // Update Floating Pill Nav (if exists)
    document.querySelectorAll('.pill-nav-link').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab) t.classList.add('active');
    });
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
    'Power': 8,
    'Miscellaneous': 9
};

function sortComponents(array) {
    return array.sort((a, b) => {
        const pA = CAT_PRIORITY[a.category] || 99;
        const pB = CAT_PRIORITY[b.category] || 99;
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name);
    });
}

const PREDEFINED_COMPONENTS = [
    { category: "Controller", name: "ESP32 Controller Plus USB Cable", totalQuantity: 25, price: 180 },
    { category: "Sensor", name: "Ultrasonic Sensor", totalQuantity: 30, price: 30 },
    { category: "Sensor", name: "IR Sensor", totalQuantity: 40, price: 20 },
    { category: "Sensor", name: "LDR Sensor", totalQuantity: 20, price: 15 },
    { category: "Sensor", name: "DHT11 Temp/Humid Sensor", totalQuantity: 20, price: 50 },
    { category: "Sensor", name: "MQ-2 Gas Sensor", totalQuantity: 10, price: 60 },
    { category: "Sensor", name: "Soil Moisture Sensor", totalQuantity: 10, price: 40 },
    { category: "Sensor", name: "PIR Motion Sensor", totalQuantity: 10, price: 50 },
    { category: "Actuator", name: "Servo Motor", totalQuantity: 20, price: 40 },
    { category: "Actuator", name: "Stepper Motor", totalQuantity: 20, price: 80 },
    { category: "Actuator", name: "ULN 2003 Driver", totalQuantity: 20, price: 30 },
    { category: "Actuator", name: "30 RPM Motor", totalQuantity: 15, price: 30 },
    { category: "Actuator", name: "45 RPM Motor", totalQuantity: 15, price: 30 },
    { category: "Actuator", name: "60 RPM Motor", totalQuantity: 10, price: 30 },
    { category: "Actuator", name: "L298N Motor Driver", totalQuantity: 10, price: 60 },
    { category: "Actuator", name: "Relay Module", totalQuantity: 20, price: 40 },
    { category: "Actuator", name: "Buzzer", totalQuantity: 20, price: 15 },
    { category: "Indicator", name: "LED Pack (Assorted)", totalQuantity: 100, price: 5 },
    { category: "Indicator", name: "RGB LED", totalQuantity: 20, price: 15 },
    { category: "Display", name: "7-Segment Display", totalQuantity: 20, price: 30 },
    { category: "Display", name: "LCD 16x2 Display", totalQuantity: 10, price: 80 },
    { category: "Input", name: "Push Buttons", totalQuantity: 60, price: 5 },
    { category: "Input", name: "Potentiometer", totalQuantity: 20, price: 15 },
    { category: "Hardware", name: "Breadboard (800 pts)", totalQuantity: 20, price: 40 },
    { category: "Hardware", name: "1in L Clamp", totalQuantity: 40, price: 5 },
    { category: "Hardware", name: "½in L Clamp", totalQuantity: 40, price: 10 },
    { category: "Hardware", name: "Female to Female Jumper wire", totalQuantity: 100, price: 1 },
    { category: "Hardware", name: "Male to Female Jumper wire", totalQuantity: 100, price: 1 },
    { category: "Hardware", name: "M3 Nut & Bolts", totalQuantity: 100, price: 5 },
    { category: "Hardware", name: "Resistor Pack", totalQuantity: 20, price: 10 },

    { category: "Power", name: "12V Power Adapter", totalQuantity: 20, price: 100 },
    { category: "Power", name: "5V Power Adapter", totalQuantity: 20, price: 80 },
    { category: "Power", name: "Male & Female Jack", totalQuantity: 20, price: 20 },
    { category: "Power", name: "Single Strand Wire (1m)", totalQuantity: 10, price: 5 },
    { category: "Miscellaneous", name: "5mm Foam Board", totalQuantity: 40, price: 60, maxPerTeam: 1 },
    { category: "Miscellaneous", name: "3mm Foam Board", totalQuantity: 40, price: 50, maxPerTeam: 1 },
    { category: "Miscellaneous", name: "Wire Stripper", totalQuantity: 10, price: 30 }
];

// ----------------------------------------------------------------------------
// Tabs Logic (Pill Style)
// ----------------------------------------------------------------------------
// (Consolidated switchTab logic at top of file)

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function getComponentImageUrl(item) {
    if (item.imageUrl) return item.imageUrl;
    let name = item.name || '';
    // Support legacy names with '+' by mapping to the 'Plus' filenames
    const sanitizedName = name.replace(/\+/g, 'Plus')
                              .replace(/\//g, ' ')
                              .replace(/&/g, '%26')
                              .replace(/ /g, '%20');
    return `assets/components/${sanitizedName}.jpg`;
}

// ----------------------------------------------------------------------------
// Real-time Listeners (Pill Style)
// ----------------------------------------------------------------------------

// 1. Listen for Components
firestore.collection('components').onSnapshot(snapshot => {
    const list = document.getElementById('inventory-list');
    let totalStock = 0;
    list.innerHTML = '';

    let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    items = sortComponents(items);

    items.forEach((item) => {
        totalStock += item.availableQuantity;

        const row = `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="px-2 py-6">
                    <div class="flex items-center gap-4">
                        <img src="${getComponentImageUrl(item)}" onerror="this.outerHTML='<div class=\\'w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[8px] text-slate-300 font-black\\'>N/A</div>'" class="w-12 h-12 object-contain rounded-xl border border-slate-100 bg-white shadow-sm mix-blend-multiply" alt="${item.name}">
                        <div class="flex flex-col">
                            <span class="text-[9px] font-black text-bvBlue uppercase tracking-widest mb-1 opacity-60">${item.category || 'RESOURCES'}</span>
                            <p class="font-black text-slate-800 text-lg uppercase tracking-tight leading-none">${item.name}</p>
                        </div>
                    </div>
                </td>
                <td class="px-2 py-6 text-bvRed font-black text-lg italic">
                    ${item.price} <span class="text-[10px] text-slate-400 not-italic uppercase ml-0.5">pts</span>
                </td>
                <td class="px-2 py-6">
                    <div class="flex items-center gap-4">
                        <div class="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-bvRed transition-all duration-700" style="width: ${(item.availableQuantity / item.totalQuantity) * 100}%"></div>
                        </div>
                        <span class="text-[10px] font-black text-slate-500 uppercase">${item.availableQuantity} / ${item.totalQuantity}</span>
                    </div>
                </td>
                <td class="px-2 py-6 text-right space-x-1">
                    <button class="p-2 hover:bg-slate-100 rounded-xl text-bvBlue transition-all shadow-sm border border-slate-100" title="Configure" onclick="editComponent('${item.id}', '${item.name}', ${item.totalQuantity}, ${item.price}, '${item.category}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </button>
                    <button class="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-all shadow-sm border border-red-100" title="Purge" onclick="deleteComponent('${item.id}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </td>
            </tr>
        `;
        list.insertAdjacentHTML('beforeend', row);
    });

    // document.getElementById('stat-total-items').textContent = totalStock;
});

// 2. Listen for Orders (Queue) (Grouped by Team)
let globalOrders = [];
let currentModalTeam = null;

firestore.collection('orders').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
    const list = document.getElementById('orders-list');
    let pendingCount = 0;
    list.innerHTML = '';

    globalOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const queueGroups = {};

    globalOrders.forEach(o => {
        if (o.status === 'Given') return;
        if (!queueGroups[o.username]) {
            queueGroups[o.username] = { username: o.username, timestamp: o.timestamp, pendingCount: 0, approvedCount: 0, otherCount: 0, total: 0 };
        }
        queueGroups[o.username].total++;
        if (o.status === 'Pending') { queueGroups[o.username].pendingCount++; pendingCount++; }
        else if (o.status === 'Approved') queueGroups[o.username].approvedCount++;
        else queueGroups[o.username].otherCount++;
    });

    const sortedGroups = Object.values(queueGroups).sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.seconds : 9999999999;
        const timeB = b.timestamp ? b.timestamp.seconds : 9999999999;
        return timeA - timeB;
    });

    sortedGroups.forEach((group, index) => {
        const pos = index + 1;
        const date = group.timestamp ? new Date(group.timestamp.seconds * 1000).toLocaleTimeString() : '...';

        let statusBadge = '';
        if (group.pendingCount > 0) statusBadge = `<span class="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm bg-orange-50 text-orange-600 border-orange-200">⟳ ${group.pendingCount} PENDING</span>`;
        else if (group.approvedCount > 0) statusBadge = `<span class="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-100">✓ READY</span>`;
        else statusBadge = `<span class="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm bg-slate-50 text-slate-500 border-slate-200">WAITING</span>`;

        const row = `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="px-2 py-6">
                    <div class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm transition-all group-hover:bg-bvRed group-hover:text-white group-hover:scale-110 italic shadow-sm">${pos}</div>
                </td>
                <td class="px-2 py-6">
                    <p class="font-black text-slate-800 text-lg italic uppercase tracking-tighter">${group.username}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">${date}</p>
                </td>
                <td class="px-2 py-6 font-black text-bvBlue text-xl italic">${group.total} <span class="text-[10px] uppercase text-slate-400 not-italic tracking-widest">items</span></td>
                <td class="px-2 py-6">${statusBadge}</td>
                <td class="px-2 py-6 text-right">
                    <button class="bg-bvBlue hover:bg-slate-800 text-white px-6 py-3 rounded-full font-black text-[11px] shadow-xl shadow-blue-100 transition-all active:scale-95 uppercase tracking-widest" onclick="openTeamReqModal('${group.username}')">Review Request</button>
                </td>
            </tr>
        `;
        list.insertAdjacentHTML('beforeend', row);
    });

    document.getElementById('stat-pending-orders').textContent = pendingCount;

    // Re-render modal silently if it's open for a team
    if (currentModalTeam && !document.getElementById('modal-backdrop').classList.contains('hidden')) {
        renderTeamReqModalContent(currentModalTeam);
    }
});

window.openTeamReqModal = (username) => {
    currentModalTeam = username;
    document.getElementById('modal-title').textContent = `${username} | REQUISITIONS`;

    // Check if there are pendings right now
    const pendings = globalOrders.filter(o => o.username === username && o.status === 'Pending');

    const ftr = document.querySelector('.modal-ftr');
    ftr.innerHTML = `
        <button class="btn btn-ghost" onclick="closeTeamModal()">Close</button>
        ${pendings.length > 0 ? `<button class="btn btn-yellow" id="approve-all-btn" onclick="approveAllPending('${username}')">Approve All Pending</button>` : ''}
    `;

    document.getElementById('modal-container').style.maxWidth = '800px';
    document.getElementById('modal-backdrop').classList.remove('hidden');

    renderTeamReqModalContent(username);
};

window.closeTeamModal = () => {
    currentModalTeam = null;
    document.getElementById('modal-container').style.maxWidth = '500px';
    closeModal();
};

window.renderTeamReqModalContent = (username) => {
    const content = document.getElementById('modal-content');
    const teamOrders = globalOrders.filter(o => o.username === username && o.status !== 'Given');
    if (teamOrders.length === 0) {
        content.innerHTML = `<p class="text-center font-black text-slate-400 uppercase tracking-widest py-10">NO ACTIVE REQUESTS</p>`;
        // Hide approve all btn if visible
        const btn = document.getElementById('approve-all-btn');
        if (btn) btn.style.display = 'none';
        return;
    }

    let rows = teamOrders.map((order, i) => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
            <td class="px-4 py-4 font-black text-slate-800 text-sm uppercase">${order.componentName}</td>
            <td class="px-4 py-4 font-black text-bvRed text-lg italic tracking-tighter">x${order.quantity}</td>
            <td class="px-4 py-4">
                <span class="inline-flex items-center px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] border status-${order.status}">${order.status}</span>
            </td>
            <td class="px-4 py-4 text-right space-x-1.5">
                ${order.status === 'Pending' ? `
                    <button class="bg-bvBlue hover:bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-100/50 transition-all active:scale-90 tooltip-src" title="Approve Item" onclick="processOrder('${order.id}', 'approve')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                    </button>
                    <button class="bg-red-50 hover:bg-red-500 text-slate-400 hover:text-white p-2.5 rounded-xl shadow-sm transition-all active:scale-90 tooltip-src" title="Reject Item" onclick="processOrder('${order.id}', 'reject')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                ` : ''}
                ${order.status === 'Approved' ? `
                    <button class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[9px] shadow-lg shadow-emerald-100 transition-all active:scale-95 uppercase tracking-widest" onclick="processOrder('${order.id}', 'give')">Validate Handoff</button>
                ` : ''}
            </td>
        </tr>
    `).join('');

    content.innerHTML = `
        <div class="table-scroll rounded-2xl border border-slate-100 max-h-[500px] overflow-y-auto">
            <table class="w-full text-left bg-white">
                <thead class="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</th>
                        <th class="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                        <th class="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th class="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
};

window.approveAllPending = async (username) => {
    const pendings = globalOrders.filter(o => o.username === username && o.status === 'Pending');
    if (pendings.length === 0) return;

    // Confirm with admin
    if (!confirm(`Are you sure you want to authorize all ${pendings.length} pending items for ${username} at once?`)) return;

    const btn = document.getElementById('approve-all-btn');
    if (btn) { btn.innerHTML = 'Processing...'; btn.disabled = true; }

    let failures = 0;
    for (let order of pendings) {
        try {
            await firestore.runTransaction(async (t) => {
                const orderRef = firestore.collection('orders').doc(order.id);
                const orderDoc = await t.get(orderRef);
                if (!orderDoc.exists) throw new Error('Order not found');
                const orderData = orderDoc.data();
                if (orderData.status !== 'Pending') return; // skip if already processed

                // Stock and Points already deducted at order time by participant.js
                // Just update status here.
                t.update(orderRef, { status: 'Approved' });
            });
        } catch (e) {
            console.error('Failed to approve', order.componentName, e);
            failures++;
        }
    }

    if (failures > 0) {
        alert(`${failures} items could not be approved (likely due to insufficient stock or points).`);
    }

    if (btn) { btn.innerHTML = 'Approve All Pending'; btn.disabled = false; }
};
// 3. Listen for Entities
firestore.collection('users').where('role', '==', 'participant').onSnapshot(snapshot => {
    const list = document.getElementById('teams-list');
    list.innerHTML = '';
    document.getElementById('stat-total-teams').textContent = snapshot.size;

    snapshot.forEach((doc, index) => {
        const team = doc.data();
        const row = `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-2 py-6">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 shadow-sm">
                        ${team.teamId || '-'}
                    </div>
                </td>
                <td class="px-2 py-6 cursor-pointer group/row" onclick="viewTeamDetails('${team.username}')">
                    <p class="font-black text-slate-800 text-lg italic uppercase tracking-tighter leading-none group-hover/row:text-bvBlue transition-colors underline decoration-slate-100 decoration-2 underline-offset-4">${team.username}</p>
                    ${team.representativeName ? `<p class="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest italic">${team.representativeName}</p>` : ''}
                </td>
                <td class="px-2 py-6 font-black text-bvBlue text-lg italic">
                    ${team.points} <span class="text-[10px] text-slate-400 not-italic uppercase ml-0.5">pts pool</span>
                </td>
                <td class="px-2 py-6">
                    <span class="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${team.orderingEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}">
                        ${team.orderingEnabled ? 'AUTHORIZED' : 'PROTOCOL_LOCK'}
                    </span>
                </td>
                <td class="px-2 py-6 text-right space-x-1">
                    <button class="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-bvBlue transition-all" title="Adjust Points" onclick="modifyPoints('${team.username}', ${team.points})">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </button>
                    <button class="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-bvRed transition-all" title="Toggle Access" onclick="toggleOrdering('${team.username}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </button>
                    <button class="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-emerald-500 transition-all" title="Manage Credentials" onclick="manageCredentials('${team.username}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                    </button>
                    <button class="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-orange-500 transition-all" title="Force Logout" onclick="forceLogout('${team.username}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    </button>
                    <button class="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all" title="Delete Team" onclick="deleteTeam('${team.username}')">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </td>
            </tr>
        `;
        list.insertAdjacentHTML('beforeend', row);
    });
});

// ----------------------------------------------------------------------------
// Modals & Identity
// ----------------------------------------------------------------------------
let activeId = null;

function openModal(type, data = {}) {
    activeId = data.id || null;
    const container = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    const title = document.getElementById('modal-title');
    const ftr = document.querySelector('.modal-ftr');

    // Restore default footer buttons if they were overwritten (e.g. by openTeamReqModal)
    if (ftr) {
        ftr.innerHTML = `
            <button class="btn btn-ghost" onclick="closeModal()">Dismiss</button>
            <button class="btn btn-yellow" id="modal-submit">Confirm Action</button>
        `;
    }

    const submitBtn = document.getElementById('modal-submit');

    // Reset width and buttons
    if (container) {
        container.className = 'bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden scale-in';
    }

    if (submitBtn) {
        submitBtn.classList.remove('hidden');
    }

    if (type === 'teamDetail') {
        container.classList.remove('max-w-xl');
        container.classList.add('max-w-5xl');
    } else if (type === 'addComponent' || type === 'editComponent') {

        const selectionHtml = type === 'addComponent' ? `
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Standard Template</label>
                <select id="comp-template" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" onchange="applyTemplate(this.value)">
                    <option value="">-- CUSTOM ENTRY --</option>
                    ${PREDEFINED_COMPONENTS.map((c, i) => `<option value="${i}">${c.name}</option>`).join('')}
                </select>
            </div>
        ` : '';

        content.innerHTML = `
            <div class="space-y-6">
                ${selectionHtml}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Resource Designation</label>
                        <input type="text" id="comp-name" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" value="${data.name || ''}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Resource Type (Category)</label>
                        <select id="comp-category" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700">
                            ${Object.keys(CAT_PRIORITY).map(c => `<option value="${c}" ${data.category === c ? 'selected' : ''}>${c.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Inventory Depth</label>
                        <input type="number" id="comp-qty" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" value="${data.qty || 10}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Credit Value</label>
                        <input type="number" id="comp-price" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" value="${data.price || 50}">
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modal-submit').onclick = saveComponent;
    } else if (type === 'modifyPoints') {
        title.textContent = 'CREDIT_ADJUSTMENT';
        content.innerHTML = `
            <div class="space-y-6 text-center">
                <div class="inline-block px-12 py-8 bg-slate-50 rounded-[40px] border border-slate-100 mb-4">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Entity</p>
                    <p class="text-3xl font-black text-bvBlue uppercase italic tracking-tighter">${data.username}</p>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Adjust Pool Balance</label>
                    <input type="number" id="new-points" class="w-full px-6 py-6 bg-slate-50 border border-slate-100 rounded-[32px] focus:ring-4 focus:ring-bvRed/10 outline-none transition-all font-black text-4xl text-center text-slate-800" value="${data.points}">
                </div>
            </div>
        `;
        document.getElementById('modal-submit').onclick = () => savePoints(data.username);
    } else if (type === 'addTeam') {
        title.textContent = 'RESTRICTED_REGISTRATION';
        content.innerHTML = `
            <div class="space-y-6 max-h-[60vh] overflow-y-auto px-1 pr-4 custom-scrollbar">
                <div class="grid grid-cols-3 gap-6">
                    <div class="col-span-1">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Team ID</label>
                        <input type="number" id="team-id" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" placeholder="00">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Identity (Username)</label>
                        <input type="text" id="team-user" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" placeholder="e.g. ALPHA_01">
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Secure Passcode</label>
                    <input type="password" id="team-pass" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" placeholder="••••••••">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Team Representative Name</label>
                    <input type="text" id="team-rep" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" placeholder="Full Name">
                </div>
                <div class="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Personnel Registry (Min 2, Max 3)</p>
                    <div class="space-y-4">
                        <input type="text" class="team-member-input w-full px-6 py-4 bg-white border border-slate-100 rounded-[20px] outline-none font-bold text-sm text-slate-700" placeholder="Member 1 Name">
                        <input type="text" class="team-member-input w-full px-6 py-4 bg-white border border-slate-100 rounded-[20px] outline-none font-bold text-sm text-slate-700" placeholder="Member 2 Name">
                        <input type="text" class="team-member-input w-full px-6 py-4 bg-white border border-slate-100 rounded-[20px] outline-none font-bold text-sm text-slate-700" placeholder="Member 3 Name (Optional)">
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modal-submit').onclick = saveTeam;
    } else if (type === 'editTeam') {
        title.textContent = 'ACCOUNT_MANAGEMENT';
        content.innerHTML = `
            <div class="space-y-6">
                <div class="p-6 bg-slate-50 rounded-[32px] border border-slate-100 mb-4">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Entity Identity</p>
                    <p class="text-3xl font-black text-bvBlue uppercase italic tracking-tighter text-center">${data.username}</p>
                </div>
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Team ID</label>
                        <input type="number" id="edit-team-id" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" value="${data.teamId || ''}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">Rep Name</label>
                        <input type="text" id="edit-team-rep" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" value="${data.representativeName || ''}">
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-2">New Password (Leave blank to keep current)</label>
                    <input type="password" id="edit-team-pass" class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[24px] focus:ring-4 focus:ring-bvRed/10 focus:border-bvRed outline-none transition-all font-bold text-slate-700" placeholder="••••••••">
                </div>
                <div class="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p class="text-[9px] font-bold text-amber-700 uppercase tracking-widest text-center">Passwords are encrypted. For security, you can only reset them, not view them.</p>
                </div>
            </div>
        `;
        document.getElementById('modal-submit').onclick = () => updateTeamCredentials(data.username);
    }

    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-backdrop').classList.add('flex');
}

function closeModal() {
    document.getElementById('modal-backdrop').classList.remove('flex');
    document.getElementById('modal-backdrop').classList.add('hidden');
    // Reset width on close
    document.getElementById('modal-container').className = 'bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden scale-in';
}

function applyTemplate(index) {
    if (index === "") return;
    const item = PREDEFINED_COMPONENTS[index];
    document.getElementById('comp-name').value = item.name;
    document.getElementById('comp-category').value = item.category;
    document.getElementById('comp-qty').value = item.totalQuantity;
    document.getElementById('comp-price').value = item.price;
}

async function saveComponent() {
    const name = document.getElementById('comp-name').value.trim();
    const category = document.getElementById('comp-category').value;
    const totalQuantity = parseInt(document.getElementById('comp-qty').value);
    const price = parseFloat(document.getElementById('comp-price').value);

    try {
        if (!name) {
            alert('Resource name is required.');
            return;
        }
        if (!activeId) {
            // Check for duplicate name
            const existing = await firestore.collection('components').where('name', '==', name).get();
            if (!existing.empty) {
                alert('A component with this name already exists.');
                return;
            }
        }

        if (activeId) {
            await firestore.collection('components').doc(activeId).update({
                name, category, totalQuantity, availableQuantity: totalQuantity, price
            });
        } else {
            await firestore.collection('components').add({
                name, category, totalQuantity, availableQuantity: totalQuantity, price
            });
        }
        closeModal();
    } catch (e) { alert(e.message); }
}

async function saveTeam() {
    const teamId = document.getElementById('team-id').value;
    const username = document.getElementById('team-user').value;
    const password = document.getElementById('team-pass').value;
    const representativeName = document.getElementById('team-rep').value;

    const members = Array.from(document.querySelectorAll('.team-member-input'))
        .map(input => input.value.trim())
        .filter(val => val !== "");

    if (!username || !password || !representativeName || !teamId) {
        alert('Team ID, Identity, Passcode and Representative Name are required.');
        return;
    }
    if (members.length < 2) {
        alert('At least 2 team members are required.');
        return;
    }

    try {
        const bcrypt = getBcrypt();
        if (!bcrypt) {
            alert('Encryption library not loaded. Please ensure you have an active internet connection or refresh the page.');
            return;
        }
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        await firestore.collection('users').doc(username).set({
            teamId,
            username,
            password: hashedPassword,
            representativeName,
            members,
            role: 'participant',
            points: 1000,
            orderingEnabled: true
        });

        // Add Copy Option for Credentials
        showCredentialsPrompt(username, password);
        closeModal();
    } catch (e) { alert(e.message); }
}

async function manageCredentials(username) {
    try {
        const doc = await firestore.collection('users').doc(username).get();
        if (!doc.exists) return alert('Entity not found.');
        openModal('editTeam', { username, ...doc.data() });
    } catch (e) { alert(e.message); }
}

async function updateTeamCredentials(username) {
    const teamId = document.getElementById('edit-team-id').value;
    const representativeName = document.getElementById('edit-team-rep').value;
    const password = document.getElementById('edit-team-pass').value;

    if (!teamId || !representativeName) {
        alert('Team ID and Representative Name are required.');
        return;
    }

    try {
        const updates = { teamId, representativeName };

        if (password) {
            const bcrypt = getBcrypt();
            if (!bcrypt) {
                alert('Encryption library error.');
                return;
            }
            const salt = bcrypt.genSaltSync(10);
            updates.password = bcrypt.hashSync(password, salt);
        }

        await firestore.collection('users').doc(username).update(updates);
        alert('Account updated successfully.');
        closeModal();
    } catch (e) { alert(e.message); }
}

function showCredentialsPrompt(user, pass) {
    const msg = `ENTITY REGISTERED\n\nIdentity: ${user}\nPasskey: ${pass}\n\nPlease copy and share these credentials with the team. They will not be shown again in plain text.`;
    if (confirm(msg + '\n\nCopy to clipboard?')) {
        navigator.clipboard.writeText(`BuildVerse Credentials\nIdentity: ${user}\nPasskey: ${pass}`)
            .catch(() => alert('Manual copy required:\n' + user + ' / ' + pass));
    }
}

async function processOrder(orderId, action) {
    try {
        let approvedQty = null;

        if (action === 'approve') {
            const docRef = await firestore.collection('orders').doc(orderId).get();
            if (!docRef.exists) return alert("Order not found");
            const data = docRef.data();
            if (data.status !== 'Pending') return alert("Order already processed");

            const qtyStr = prompt(`Approve how many ${data.componentName}? (Requested: ${data.quantity})`, data.quantity);
            if (qtyStr === null) return;
            approvedQty = parseInt(qtyStr, 10);
            if (isNaN(approvedQty) || approvedQty < 1 || approvedQty > data.quantity) {
                return alert("Invalid quantity. Must be between 1 and " + data.quantity);
            }
        }

        let returnQty = null;
        if (action === 'return') {
            const docRef = await firestore.collection('orders').doc(orderId).get();
            if (!docRef.exists) return alert("Order not found");
            const data = docRef.data();
            
            if (data.quantity > 1) {
                const qtyStr = prompt(`How many ${data.componentName} are being returned? (Held: ${data.quantity})`, data.quantity);
                if (qtyStr === null) return;
                returnQty = parseInt(qtyStr, 10);
                if (isNaN(returnQty) || returnQty < 1 || returnQty > data.quantity) {
                    return alert("Invalid quantity. Must be between 1 and " + data.quantity);
                }
            } else {
                returnQty = 1;
            }
        }

        await firestore.runTransaction(async (t) => {
            const orderRef = firestore.collection('orders').doc(orderId);
            const orderDoc = await t.get(orderRef);
            if (!orderDoc.exists) throw new Error('Order not found');
            const orderData = orderDoc.data();

            if (action === 'approve') {
                if (orderData.status !== 'Pending') throw new Error('Order already processed');

                const diff = Number(orderData.quantity) - Number(approvedQty);
                if (diff > 0) {
                    // Refund the difference if admin approved less than requested
                    const compRef = firestore.collection('components').doc(orderData.componentId);
                    const userRef = firestore.collection('users').doc(orderData.username);
                    const compDoc = await t.get(compRef);
                    const userDoc = await t.get(userRef);

                    const compData = compDoc.data();
                    const userData = userDoc.data();
                    const refundAmount = diff * Number(orderData.pricePerUnit || 0);

                    t.update(compRef, { availableQuantity: Number(compData.availableQuantity || 0) + diff });
                    t.update(userRef, { points: Number(userData.points || 0) + refundAmount });

                    const transRef = firestore.collection('transactions').doc();
                    t.set(transRef, {
                        username: orderData.username,
                        type: 'credit',
                        amount: refundAmount,
                        reason: `Refund: Partial approval of ${orderData.componentName} (Requested ${orderData.quantity}, Approved ${approvedQty})`,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                t.update(orderRef, { status: 'Approved', quantity: approvedQty });

            } else if (action === 'reject') {
                if (orderData.status !== 'Pending') throw new Error('Order already processed');
                
                // Full Refund
                const compRef = firestore.collection('components').doc(orderData.componentId);
                const userRef = firestore.collection('users').doc(orderData.username);
                const compDoc = await t.get(compRef);
                const userDoc = await t.get(userRef);

                const compData = compDoc.data();
                const userData = userDoc.data();
                const refundAmount = Number(orderData.quantity) * Number(orderData.pricePerUnit || 0);

                t.update(compRef, { availableQuantity: Number(compData.availableQuantity || 0) + Number(orderData.quantity) });
                t.update(userRef, { points: Number(userData.points || 0) + refundAmount });
                t.update(orderRef, { status: 'Rejected' });

                const transRef = firestore.collection('transactions').doc();
                t.set(transRef, {
                    username: orderData.username,
                    type: 'credit',
                    amount: refundAmount,
                    reason: `Refund: Rejected order for ${orderData.quantity}x ${orderData.componentName}`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

            } else if (action === 'give') {
                t.update(orderRef, { status: 'Given' });
            } else if (action === 'return') {
                const compRef = firestore.collection('components').doc(orderData.componentId);
                const userRef = firestore.collection('users').doc(orderData.username);

                const compDoc = await t.get(compRef);
                const userDoc = await t.get(userRef);

                const compData = compDoc.data();
                const userData = userDoc.data();
                
                // Calculate refund for returnQty (50% of buying price)
                const refund = (orderData.pricePerUnit * returnQty) * 0.5;

                t.update(compRef, { availableQuantity: Number(compData.availableQuantity || 0) + returnQty });
                t.update(userRef, { points: Number(userData.points || 0) + refund });
                
                if (returnQty === orderData.quantity) {
                    // Full return
                    t.update(orderRef, { status: 'Returned' });
                } else {
                    // Partial return
                    t.update(orderRef, { quantity: orderData.quantity - returnQty });
                    
                    // Create new record for returned units
                    const newOrderRef = firestore.collection('orders').doc();
                    t.set(newOrderRef, {
                        ...orderData,
                        quantity: returnQty,
                        status: 'Returned',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                const transRef = firestore.collection('transactions').doc();
                t.set(transRef, {
                    username: orderData.username,
                    type: 'credit',
                    amount: refund,
                    reason: `Refund: ${returnQty}x ${compData.name} returned`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    } catch (e) { alert('Error: ' + e.message); }
}

async function toggleOrdering(username) {
    try {
        const userRef = firestore.collection('users').doc(username);
        const doc = await userRef.get();
        await userRef.update({ orderingEnabled: !doc.data().orderingEnabled });
    } catch (e) { alert(e.message); }
}

async function deleteComponent(id) {
    if (!confirm('Delete this component?')) return;
    try {
        await firestore.collection('components').doc(id).delete();
    } catch (e) { alert(e.message); }
}

function editComponent(id, name, qty, price, category) {
    openModal('editComponent', { id, name, qty, price, category });
}

function modifyPoints(username, points) {
    openModal('modifyPoints', { username, points });
}

async function savePoints(username) {
    const newPoints = parseInt(document.getElementById('new-points').value);
    try {
        await firestore.collection('users').doc(username).update({ points: newPoints });
        closeModal();
    } catch (e) { alert(e.message); }
}

async function clearProcessedOrders() {
    if (!confirm('Reset Queue: This will permanently delete all Rejected and Returned orders. Continue?')) return;
    try {
        const snap1 = await firestore.collection('orders').where('status', '==', 'Rejected').get();
        const snap2 = await firestore.collection('orders').where('status', '==', 'Returned').get();
        const batch = firestore.batch();
        snap1.forEach(doc => batch.delete(doc.ref));
        snap2.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch (e) { alert(e.message); }
}

async function deleteTeam(username) {
    if (!confirm(`Permanently terminate Entity [${username}]?`)) return;
    try {
        await firestore.collection('users').doc(username).delete();
    } catch (e) { alert(e.message); }
}

async function forceLogout(username) {
    if (!confirm(`Force logout participant [${username}] from all devices?`)) return;
    try {
        await firestore.collection('users').doc(username).update({
            activeSessionId: null,
            lastHeartbeat: 0
        });
    } catch (e) { alert(e.message); }
}

function getComponentImageUrl(item) {
    if (item.imageUrl) return item.imageUrl;
    let name = item.name || '';
    const sanitizedName = name.replace(/\+/g, 'Plus')
                              .replace(/\//g, ' ')
                              .replace(/&/g, '%26')
                              .replace(/ /g, '%20');
    return `assets/components/${sanitizedName}.jpg`;
}

async function seedResources() {
    if (!confirm('This will synchronize the inventory with the predefined resource matrix. Existing stock for these items will be reset. Continue?')) return;
    
    try {
        const batch = firestore.batch();
        PREDEFINED_COMPONENTS.forEach(item => {
            const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const ref = firestore.collection('components').doc(slug);
            batch.set(ref, {
                ...item,
                availableQuantity: item.totalQuantity
            });
        });

        await batch.commit();
        alert(`SUCCESS: ${PREDEFINED_COMPONENTS.length} resources synchronized.`);
    } catch (e) { alert('ERR: ' + e.message); }
}

async function deduplicateComponents() {
    if (!confirm('This tool will automatically remove duplicate components with identical names. Continue?')) return;

    try {
        const snap = await firestore.collection('components').get();
        const seen = new Set();
        const batch = firestore.batch();
        let dupCount = 0;

        snap.forEach(doc => {
            const data = doc.data();
            const name = (data.name || "").trim().toLowerCase();
            if (seen.has(name)) {
                batch.delete(doc.ref);
                dupCount++;
            } else {
                seen.add(name);
            }
        });

        if (dupCount > 0) {
            await batch.commit();
            alert(`SUCCESS: Removed ${dupCount} duplicate entries.`);
        } else {
            alert('No duplicates found.');
        }
    } catch (e) { alert(e.message); }
}

async function purgeComponents() {
    const code = Math.floor(1000 + Math.random() * 9000);
    const entry = prompt(`WARNING: This will permanently delete ALL resources in the repository.\nEnter verification code [${code}] to confirm:`);
    if (entry !== code.toString()) return;

    try {
        const snap = await firestore.collection('components').get();
        const batch = firestore.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert('Repository purged successfully.');
    } catch (e) { alert(e.message); }
}

async function viewTeamDetails(username) {
    openModal('teamDetail');
    const content = document.getElementById('modal-content');
    const title = document.getElementById('modal-title');
    title.textContent = `ENTITY_PROFILE: ${username.toUpperCase()}`;

    content.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-4 border-bvRed border-t-transparent"></div></div>`;

    try {
        const userDoc = await firestore.collection('users').doc(username).get();
        const ordersSnap = await firestore.collection('orders').where('username', '==', username).get();
        const userData = userDoc.data();
        const allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Financial Calculations
        let pointsUsed = 0;
        let pointsLoss = 0;

        allOrders.forEach(o => {
            const cost = o.totalCost || (o.pricePerUnit * o.quantity) || 0;
            if (o.status === 'Given' || o.status === 'Approved') {
                pointsUsed += cost;
            }
            if (o.status === 'Returned') {
                // Return penalty is 50% of buying price
                pointsLoss += (cost * 0.5);
            }
        });

        const heldList = allOrders.filter(o => o.status === 'Given');
        const historyList = allOrders;
        const returnedList = allOrders.filter(o => o.status === 'Returned');

        content.innerHTML = `
            <div class="space-y-12 max-h-[70vh] overflow-y-auto px-2 pr-6 custom-scrollbar">
                <!-- Data Matrix -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Pool</p>
                        <p class="text-3xl font-black text-bvBlue italic">${userData.points} <span class="text-xs not-italic">PTS</span></p>
                    </div>
                    <div class="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Investment</p>
                        <p class="text-3xl font-black text-slate-800 italic">${pointsUsed} <span class="text-xs not-italic">PTS</span></p>
                    </div>
                    <div class="p-6 bg-red-50 rounded-[32px] border border-red-100">
                        <p class="text-[10px] font-black text-bvRed uppercase tracking-widest mb-1">Financial Loss (Returns)</p>
                        <p class="text-3xl font-black text-bvRed italic">-${pointsLoss.toFixed(0)} <span class="text-xs not-italic">PTS</span></p>
                    </div>
                </div>

                <!-- Entity Stats -->
                <div class="flex gap-12 border-b border-slate-100 pb-8">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Representative</p>
                        <p class="font-black text-slate-800 text-lg uppercase">${userData.representativeName || 'NOT_SET'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deployment Team</p>
                        <p class="text-xs font-bold text-slate-500">${userData.members?.join(' • ') || 'SOLO'}</p>
                    </div>
                </div>

                <!-- Resource Logs -->
                <div class="space-y-10">
                    <div>
                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Held Hardware (${heldList.length})
                        </h4>
                        ${renderDetailTable(heldList, ['Name', 'Qty', 'Cost', 'Manage'])}
                    </div>

                    <div>
                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <span class="w-2 h-2 rounded-full bg-bvBlue"></span>
                            Protocol History (${historyList.length})
                        </h4>
                        ${renderDetailTable(historyList, ['Name', 'Qty', 'Status'])}
                    </div>

                    <div>
                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <span class="w-2 h-2 rounded-full bg-bvRed"></span>
                            Reclamation Log (${returnedList.length})
                        </h4>
                        ${renderDetailTable(returnedList, ['Name', 'Qty', 'Loss (50%)'])}
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modal-submit').classList.add('hidden');
    } catch (e) {
        content.innerHTML = `<p class="text-red-500 font-bold">Error loading details: ${e.message}</p>`;
    }
}

function renderDetailTable(items, headers) {
    if (items.length === 0) return `<p class="text-[10px] font-bold text-slate-300 uppercase italic">No records found for this protocol.</p>`;

    return `
        <div class="bg-white border border-slate-100 rounded-[24px] overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase">
                    <tr>
                        ${headers.map(h => `<th class="px-6 py-4 ${h === 'Manage' ? 'text-right' : ''}">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 text-[11px] font-bold text-slate-700">
                    ${items.map(item => `
                        <tr>
                            <td class="px-6 py-4 font-black uppercase text-slate-800">${item.componentName}</td>
                            <td class="px-6 py-4">x${item.quantity}</td>
                            <td class="px-6 py-4">
                                ${headers[2] === 'Cost' ? (item.totalCost || (item.pricePerUnit * item.quantity)) + ' PTS' :
            headers[2] === 'Loss (50%)' ? ((item.totalCost || (item.pricePerUnit * item.quantity)) * 0.5) + ' PTS' :
                `<span class="status-${item.status} px-3 py-1 rounded-full text-[9px] uppercase tracking-tighter">${item.status}</span>`}
                            </td>
                            ${headers[3] === 'Manage' ? `<td class="px-6 py-4 text-right"><button class="bg-bvYellow text-bvRed px-5 py-2 rounded-full font-black text-[10px] shadow-sm hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest inline-flex items-center gap-2" onclick="processOrder('${item.id}', 'return'); closeModal(); setTimeout(() => viewTeamDetails('${item.username}'), 400)">Process Return</button></td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function forceLogoutOtherAdmins() {
    const currentUser = JSON.parse(localStorage.getItem('bv_user') || '{}');
    if (!confirm('SECURITY_PROTOCOL: This will immediately terminate all other active admin sessions across the network. Proceed?')) return;

    try {
        const snapshot = await firestore.collection('users').where('role', '==', 'admin').get();
        const batch = firestore.batch();
        let count = 0;

        snapshot.forEach(doc => {
            // Terminate session if it's NOT the current admin user
            if (doc.id !== currentUser.username) {
                batch.update(doc.ref, {
                    activeSessionId: null,
                    lastHeartbeat: 0
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            alert(`SUCCESS: ${count} other admin sessions have been scheduled for termination.`);
        } else {
            alert('No other active admin sessions detected.');
        }
    } catch (e) {
        alert('ERR: ' + e.message);
    }
}

function logout() {
    localStorage.removeItem('bv_user');
    window.location.href = 'index.html';
}
