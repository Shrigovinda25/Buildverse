const user = checkAuth('admin');
if (user) {
    const sessionId = localStorage.getItem('bv_sessionId');
    startSessionHeartbeat(user.username, sessionId);
}
// Basic auth check passed

// ----------------------------------------------------------------------------
// Tabs Logic (Pill Style)
// ----------------------------------------------------------------------------
function switchTab(tab) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${tab}-tab`).classList.remove('hidden');
    
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

const PREDEFINED_COMPONENTS = [
    { category: "Controller", name: "ESP32 Controller", totalQuantity: 20, price: 150 },
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
    { category: "Actuator", name: "DC Motor", totalQuantity: 40, price: 30 },
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
    { category: "Hardware", name: "Jumper Wires (set)", totalQuantity: 20, price: 30 },
    { category: "Hardware", name: "Resistor Pack", totalQuantity: 20, price: 10 },
    { category: "Power", name: "USB Cable", totalQuantity: 20, price: 25 },
    { category: "Power", name: "12V Power Adapter", totalQuantity: 20, price: 100 },
    { category: "Power", name: "5V Power Adapter", totalQuantity: 20, price: 80 },
    { category: "Power", name: "Power Jack", totalQuantity: 20, price: 15 },
    { category: "Power", name: "Single Strand Wire (1m)", totalQuantity: 10, price: 5 }
];

// ----------------------------------------------------------------------------
// Tabs Logic (Pill Style)
// ----------------------------------------------------------------------------
function switchTab(tab) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${tab}-tab`).classList.remove('hidden');
    
    // Update Floating Pill Nav
    document.querySelectorAll('.pill-nav-link').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab) {
            t.classList.add('active');
        }
    });
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
                        <img src="${item.imageUrl || `assets/components/${item.name.replace('/', ' ')}.jpg`}" onerror="this.outerHTML='<div class=\\'w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[8px] text-slate-300 font-black\\'>N/A</div>'" class="w-12 h-12 object-contain rounded-xl border border-slate-100 bg-white shadow-sm mix-blend-multiply" alt="${item.name}">
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
                            <div class="h-full bg-bvRed transition-all duration-700" style="width: ${(item.availableQuantity/item.totalQuantity)*100}%"></div>
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

// 2. Listen for Orders (Queue)
firestore.collection('orders').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
    const list = document.getElementById('orders-list');
    let pendingCount = 0;
    list.innerHTML = '';
    
    const pendingOrders = snapshot.docs
        .map(doc => ({id: doc.id, ...doc.data()}))
        .filter(o => o.status === 'Pending');

    snapshot.forEach((doc, index) => {
        const order = doc.data();
        if (order.status === 'Given') return;
        let pos = '-';
        if (order.status === 'Pending') {
            const idx = pendingOrders.findIndex(p => p.id === doc.id);
            pos = idx + 1;
            pendingCount++;
        }

        const date = order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleTimeString() : '...';
        
        const row = `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="px-2 py-6">
                    ${order.status === 'Pending' ? `<div class="w-10 h-10 rounded-2xl bg-bvRed text-white flex items-center justify-center font-black text-sm shadow-xl shadow-red-100 italic transition-transform group-hover:scale-110">${pos}</div>` : `<span class="text-slate-300 ml-4">-</span>`}
                </td>
                <td class="px-2 py-6">
                    <p class="font-black text-slate-800 text-sm italic uppercase tracking-tighter">${order.username}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">${date}</p>
                </td>
                <td class="px-2 py-6 font-black text-slate-600 text-sm uppercase">${order.componentName}</td>
                <td class="px-2 py-6 font-black text-bvRed text-lg italic">x${order.quantity}</td>
                <td class="px-2 py-6">
                    <span class="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm status-${order.status}">${order.status}</span>
                </td>
                <td class="px-2 py-6 text-right space-x-2">
                    ${order.status === 'Pending' ? `
                        <button class="bg-bvBlue hover:bg-emerald-600 text-white p-2.5 rounded-2xl shadow-xl shadow-blue-100/50 transition-all active:scale-90" onclick="processOrder('${doc.id}', 'approve')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </button>
                        <button class="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-2xl shadow-xl shadow-red-100/50 transition-all active:scale-90" onclick="processOrder('${doc.id}', 'reject')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    ` : ''}
                    ${order.status === 'Approved' ? `
                        <button class="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full font-black text-[10px] shadow-xl shadow-emerald-100 transition-all active:scale-95 uppercase tracking-widest" onclick="processOrder('${doc.id}', 'give')">Validate_Handoff</button>
                    ` : ''}
                </td>
            </tr>
        `;
        list.insertAdjacentHTML('beforeend', row);
    });

    document.getElementById('stat-pending-orders').textContent = pendingCount;
});

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
    const submitBtn = document.getElementById('modal-submit');
    
    // Reset width and buttons
    container.className = 'bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden scale-in';
    submitBtn.classList.remove('hidden');
    
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

function showCredentialsPrompt(user, pass) {
    const msg = `ENTITY REGISTERED\n\nIdentity: ${user}\nPasskey: ${pass}\n\nPlease copy and share these credentials with the team. They will not be shown again in plain text.`;
    if (confirm(msg + '\n\nCopy to clipboard?')) {
        navigator.clipboard.writeText(`BuildVerse Credentials\nIdentity: ${user}\nPasskey: ${pass}`)
            .then(() => alert('Credentials copied to clipboard.'))
            .catch(() => alert('Manual copy required:\n' + user + ' / ' + pass));
    }
}

async function processOrder(orderId, action) {
    try {
        await firestore.runTransaction(async (t) => {
            const orderRef = firestore.collection('orders').doc(orderId);
            const orderDoc = await t.get(orderRef);
            if (!orderDoc.exists) throw new Error('Order not found');
            const orderData = orderDoc.data();

            if (action === 'approve') {
                if (orderData.status !== 'Pending') throw new Error('Order already processed');

                const compRef = firestore.collection('components').doc(orderData.componentId);
                const userRef = firestore.collection('users').doc(orderData.username);
                
                const compDoc = await t.get(compRef);
                const userDoc = await t.get(userRef);
                
                const compData = compDoc.data();
                const userData = userDoc.data();
                const totalCost = compData.price * orderData.quantity;

                if (compData.availableQuantity < orderData.quantity) throw new Error('Insufficient stock');
                if (userData.points < totalCost) throw new Error('Insufficient user points');

                t.update(compRef, { availableQuantity: compData.availableQuantity - orderData.quantity });
                t.update(userRef, { points: userData.points - totalCost });
                t.update(orderRef, { status: 'Approved' });

                const transRef = firestore.collection('transactions').doc();
                t.set(transRef, {
                    username: orderData.username,
                    type: 'debit',
                    amount: totalCost,
                    reason: `Purchase: ${orderData.quantity}x ${compData.name}`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

            } else if (action === 'reject') {
                t.update(orderRef, { status: 'Rejected' });
            } else if (action === 'give') {
                t.update(orderRef, { status: 'Given' });
            } else if (action === 'return') {
                const compRef = firestore.collection('components').doc(orderData.componentId);
                const userRef = firestore.collection('users').doc(orderData.username);
                
                const compDoc = await t.get(compRef);
                const userDoc = await t.get(userRef);

                const compData = compDoc.data();
                const userData = userDoc.data();
                const refund = (compData.price * orderData.quantity) * 0.5;

                t.update(compRef, { availableQuantity: compData.availableQuantity + orderData.quantity });
                t.update(userRef, { points: userData.points + refund });
                t.update(orderRef, { status: 'Returned' });

                const transRef = firestore.collection('transactions').doc();
                t.set(transRef, {
                    username: orderData.username,
                    type: 'credit',
                    amount: refund,
                    reason: `Refund: ${orderData.quantity}x ${compData.name} returned`,
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

function logout() {
    localStorage.removeItem('bv_user');
    window.location.href = 'index.html';
}
