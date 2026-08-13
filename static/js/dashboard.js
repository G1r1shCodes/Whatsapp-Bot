// Global state
let currentTab = 'analytics-tab';
let leadsData = [];
let catalogData = [];
let selectedLead = null;
let productChart = null;
let statusChart = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPanels = document.querySelectorAll('.tab-panel');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const refreshBtn = document.getElementById('refresh-data-btn');

// Toast Helper
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    toastMessage.textContent = message;
    
    if (isError) {
        toast.classList.add('error');
        toastIcon.className = 'fa-solid fa-circle-xmark toast-icon';
    } else {
        toast.classList.remove('error');
        toastIcon.className = 'fa-solid fa-circle-check toast-icon';
    }
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Format datetime helper
function formatDateTime(isoString) {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return isoString;
    }
}

// -------------------------------------------------------------
// Tab Navigation
// -------------------------------------------------------------
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        if (currentTab === targetTab) return;
        
        if (!document.startViewTransition) {
            switchTab(targetTab, item);
        } else {
            document.startViewTransition(() => {
                switchTab(targetTab, item);
            });
        }
    });
});

function switchTab(targetTab, activeItem) {
    // Update active class
    navItems.forEach(btn => btn.classList.remove('active'));
    activeItem.classList.add('active');
    
    // Show panel
    tabPanels.forEach(panel => {
        if (panel.id === targetTab) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
    
    currentTab = targetTab;
    updateHeaderMetadata();
    
    // Tab specific actions
    if (targetTab === 'analytics-tab') {
        loadAnalyticsData();
    } else if (targetTab === 'leads-tab') {
        loadLeadsData();
    } else if (targetTab === 'visitors-tab') {
        loadVisitorData();
    } else if (targetTab === 'outbound-tab') {
        loadOutboundData();
    } else if (targetTab === 'catalog-tab') {
        loadCatalogData();
    } else if (targetTab === 'settings-tab') {
        loadSettingsData();
    }
}

function updateHeaderMetadata() {
    switch (currentTab) {
        case 'analytics-tab':
            pageTitle.textContent = 'Analytics Overview';
            pageSubtitle.textContent = 'Real-time performance and insights';
            break;
        case 'leads-tab':
            pageTitle.textContent = 'Leads Inbox';
            pageSubtitle.textContent = 'Monitor customer inquiries and live chats';
            break;
        case 'visitors-tab':
            pageTitle.textContent = 'Visitor Chats (Non-Leads)';
            pageSubtitle.textContent = 'Conversations with visitors who did not request a quote';
            break;
        case 'outbound-tab':
            pageTitle.textContent = 'Outbound Direct Messaging';
            pageSubtitle.textContent = 'Send text, images, or PDF documents directly to any WhatsApp contact';
            break;
        case 'catalog-tab':
            pageTitle.textContent = 'Cables Catalog Manager';
            pageSubtitle.textContent = 'Adjust prices and toggle cable stock availability';
            break;
        case 'settings-tab':
            pageTitle.textContent = 'Bot Configuration';
            pageSubtitle.textContent = 'Configure greeting messages, categories, and catalogue PDF';
            break;
    }
}

// -------------------------------------------------------------
// 1. Analytics & Charts
// -------------------------------------------------------------
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // easeOutQuart
        const ease = 1 - Math.pow(1 - progress, 4);
        obj.innerHTML = Math.floor(ease * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

async function loadAnalyticsData() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        
        // Update Stats Counters with Animation
        animateValue(document.getElementById('stat-total-leads'), 0, data.total_leads || 0, 400);
        animateValue(document.getElementById('stat-new-leads'), 0, data.new_leads || 0, 400);
        animateValue(document.getElementById('stat-quoted-leads'), 0, data.quoted_leads || 0, 400);
        animateValue(document.getElementById('stat-won-leads'), 0, data.won_leads || 0, 400);
        
        // Load Charts
        renderProductChart(data.category_distribution || {});
        renderStatusChart(data);
    } catch (e) {
        console.error('Error fetching analytics stats:', e);
        showToast('Failed to load analytics statistics', true);
    }
}

function renderProductChart(distribution) {
    const ctx = document.getElementById('productChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (productChart) {
        productChart.destroy();
    }
    
    const labels = Object.keys(distribution);
    const data = Object.values(distribution);
    
    if (labels.length === 0) {
        labels.push('No Data');
        data.push(1);
    }
    
    productChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#06b6d4', // Cyan
                    '#6366f1', // Indigo
                    '#10b981', // Emerald
                    '#a855f7', // Purple
                    '#f59e0b', // Amber
                    '#f43f5e', // Rose
                    '#3b82f6', // Blue
                    '#ec4899', // Pink
                    '#14b8a6', // Teal
                    '#84cc16', // Lime
                    '#f97316', // Orange
                    '#6b7280'  // Gray
                ],
                borderWidth: 2,
                borderColor: '#111827'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter', size: 11, weight: '500' },
                        padding: 15
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function renderStatusChart(stats) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChart) {
        statusChart.destroy();
    }
    
    const counts = {
        'New': stats.new_leads || 0,
        'Contacted': stats.contacted_leads || 0,
        'Quoted': stats.quoted_leads || 0,
        'Won': stats.won_leads || 0,
        'Lost': stats.lost_leads || 0
    };
    
    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['New', 'Contacted', 'Quoted', 'Won', 'Lost'],
            datasets: [{
                label: 'Inquiries',
                data: [counts['New'], counts['Contacted'], counts['Quoted'], counts['Won'], counts['Lost']],
                backgroundColor: [
                    'rgba(245, 158, 11, 0.4)',  // Amber
                    'rgba(99, 102, 241, 0.4)',   // Indigo
                    'rgba(168, 85, 247, 0.4)',  // Purple
                    'rgba(16, 185, 129, 0.4)',  // Emerald
                    'rgba(244, 63, 94, 0.4)'    // Rose
                ],
                borderColor: [
                    '#f59e0b',
                    '#6366f1',
                    '#a855f7',
                    '#10b981',
                    '#f43f5e'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter' }, stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', weight: '600' } }
                }
            }
        }
    });
}

// -------------------------------------------------------------
// 2. Leads Inbox & Chats
// -------------------------------------------------------------
let statusFilter = 'All';
let searchQuery = '';
let searchTimeout = null;

const searchInput = document.getElementById('lead-search-input');
const filterButtons = document.querySelectorAll('.filter-btn');

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchQuery = e.target.value;
    searchTimeout = setTimeout(() => {
        loadLeadsData();
    }, 450);
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        statusFilter = btn.getAttribute('data-filter');
        loadLeadsData();
    });
});

async function loadLeadsData() {
    const listContainer = document.getElementById('leads-list-container');
    const loadingEl = document.getElementById('leads-list-loading');
    
    loadingEl.style.display = 'block';
    
    try {
        let url = '/api/leads';
        const params = [];
        if (statusFilter !== 'All') params.push(`status=${statusFilter}`);
        if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        const res = await fetch(url);
        leadsData = await res.json();
        
        loadingEl.style.display = 'none';
        listContainer.innerHTML = '';
        
        if (leadsData.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center text-muted" style="padding: 2rem 0;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
                    No leads found
                </div>
            `;
            return;
        }
        
        leadsData.forEach(lead => {
            const dateStr = formatDateTime(lead.created_at);
            const statusClass = lead.status.toLowerCase();
            const isActive = selectedLead && selectedLead.id === lead.id ? 'active' : '';
            
            const cardHtml = `
                <div class="lead-item ${isActive}" data-id="${lead.id}">
                    <div class="lead-item-header">
                        <span class="lead-item-name">${lead.name}</span>
                        <span class="status-badge ${statusClass}">${lead.status}</span>
                    </div>
                    <div class="lead-item-body">
                        <span><strong>Company:</strong> ${lead.company || 'Individual'}</span>
                        <span><strong>Product:</strong> ${lead.product_interest}</span>
                    </div>
                    <div class="lead-item-meta">
                        <span><i class="fa-solid fa-phone"></i> +${lead.phone}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', cardHtml);
        });
        
        // Add click events to items
        document.querySelectorAll('.lead-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id'), 10);
                const lead = leadsData.find(l => l.id === id);
                selectLead(lead);
            });
        });
        
        // Re-highlight if the selected lead is in the list
        if (selectedLead) {
            const currentItem = document.querySelector(`.lead-item[data-id="${selectedLead.id}"]`);
            if (currentItem) currentItem.classList.add('active');
        }
    } catch (e) {
        console.error('Error loading leads:', e);
        loadingEl.style.display = 'none';
        showToast('Failed to load leads list', true);
    }
}

function selectLead(lead) {
    selectedLead = lead;
    
    // Highlight active card
    document.querySelectorAll('.lead-item').forEach(item => item.classList.remove('active'));
    const activeCard = document.querySelector(`.lead-item[data-id="${lead.id}"]`);
    if (activeCard) activeCard.classList.add('active');
    
    // Toggle UI panels
    document.getElementById('detail-empty-state').classList.add('hidden');
    document.getElementById('detail-content-area').classList.remove('hidden');
    
    // Populate details
    document.getElementById('detail-name').textContent = lead.name;
    document.getElementById('detail-company').textContent = lead.company || 'Individual/Personal Use';
    document.getElementById('detail-phone').textContent = lead.phone ? (lead.phone.startsWith('+') ? lead.phone : `+${lead.phone}`) : '-';
    const cleanDigits = (lead.phone || '').replace(/[^\d]/g, '');
    const waBtn = document.getElementById('detail-wa-btn');
    if (waBtn) waBtn.href = `https://wa.me/${cleanDigits}`;
    const emailEl = document.getElementById('detail-email');
    if (emailEl) emailEl.textContent = lead.email || '-';
    document.getElementById('detail-location').textContent = lead.location || '-';
    document.getElementById('detail-product').textContent = lead.product_interest;
    document.getElementById('detail-qty').textContent = lead.quantity || '-';
    document.getElementById('detail-date').textContent = formatDateTime(lead.created_at);
    
    // Setup Avatar Initials
    const initials = lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('detail-avatar').textContent = initials;
    
    // Setup status dropdown
    const statusSelect = document.getElementById('lead-status-select');
    statusSelect.value = lead.status;
    
    // Fetch and load chat history
    loadChatHistory(lead.phone);
}

// Update lead status
document.getElementById('lead-status-select').addEventListener('change', async (e) => {
    if (!selectedLead) return;
    
    const newStatus = e.target.value;
    try {
        const res = await fetch(`/api/leads/${selectedLead.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (res.ok) {
            showToast(`Lead status updated to "${newStatus}"`);
            selectedLead.status = newStatus;
            
            // Reload list and status chart
            loadLeadsData();
            loadAnalyticsData();
        } else {
            showToast('Failed to update lead status', true);
        }
    } catch (err) {
        console.error('Error updating status:', err);
        showToast('Error updating lead status', true);
    }
});

async function loadChatHistory(phone) {
    const chatContainer = document.getElementById('chat-bubbles-container');
    chatContainer.innerHTML = '<div class="text-center text-muted" style="padding: 2rem 0;"><i class="fa-solid fa-spinner fa-spin"></i> Loading messages...</div>';
    
    try {
        const res = await fetch(`/api/leads/${phone}/history`);
        const chats = await res.json();
        
        chatContainer.innerHTML = '';
        
        if (chats.length === 0) {
            chatContainer.innerHTML = '<div class="text-center text-muted" style="padding: 2rem 0;">No chat history found.</div>';
            return;
        }
        
        chats.forEach(chat => {
            const isUser = chat.direction === 'inbound';
            const rowClass = isUser ? 'inbound' : 'outbound';
            const timeStr = new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Clean text formatting for WhatsApp formatting: *bold* -> <strong>
            let formattedBody = chat.body
                .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
                
            const bubbleHtml = `
                <div class="chat-bubble-row ${rowClass}">
                    <div class="chat-bubble">
                        <div class="chat-bubble-body">${formattedBody}</div>
                        <span class="chat-bubble-time">${timeStr}</span>
                    </div>
                </div>
            `;
            chatContainer.insertAdjacentHTML('beforeend', bubbleHtml);
        });
        
        // Auto scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (e) {
        console.error('Error loading chats:', e);
        chatContainer.innerHTML = '<div class="text-center text-rose-500" style="padding: 2rem 0;">Failed to load chat history.</div>';
    }
}

// -------------------------------------------------------------
// Manager WhatsApp Reply Handler
// -------------------------------------------------------------
const managerSendBtn = document.getElementById('manager-send-btn');
const managerChatInput = document.getElementById('manager-chat-input');

let isSendingManagerMessage = false;

async function handleManagerSendMessage() {
    if (isSendingManagerMessage) return;

    if (!selectedLead) {
        showToast('Please select a lead first from the inbox', true);
        return;
    }
    
    const chatInput = document.getElementById('manager-chat-input');
    const sendBtn = document.getElementById('manager-send-btn');
    
    if (!chatInput) return;
    
    const messageText = chatInput.value.trim();
    if (!messageText) return;

    const targetPhone = String(selectedLead.phone || selectedLead.phone_number || selectedLead.mobile || '').trim();
    if (!targetPhone) {
        showToast('Selected lead has no valid phone number', true);
        return;
    }

    isSendingManagerMessage = true;
    if (sendBtn) sendBtn.disabled = true;
    chatInput.disabled = true;
    
    try {
        const res = await fetch('/api/leads/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: targetPhone,
                message: messageText
            })
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('Message sent via WhatsApp!');
            chatInput.value = '';
            
            // Append message bubble to chat container
            const chatContainer = document.getElementById('chat-bubbles-container');
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formattedBody = `👤 <strong>Marketing Manager:</strong> ${messageText.replace(/\n/g, '<br>')}`;
            
            const bubbleHtml = `
                <div class="chat-bubble-row outbound">
                    <div class="chat-bubble" style="border-left: 3px solid #10b981;">
                        <div class="chat-bubble-body">${formattedBody}</div>
                        <span class="chat-bubble-time">${timeStr}</span>
                    </div>
                </div>
            `;
            if (chatContainer) {
                chatContainer.insertAdjacentHTML('beforeend', bubbleHtml);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
            
            // If lead status was New or Partial, auto-update to Contacted
            if (selectedLead.status === 'New' || selectedLead.status === 'Partial') {
                selectedLead.status = 'Contacted';
                const statusSelect = document.getElementById('lead-status-select');
                if (statusSelect) statusSelect.value = 'Contacted';
                loadLeadsData();
            }
        } else {
            let errorMsg = 'Failed to send WhatsApp message';
            if (typeof data.detail === 'string') {
                errorMsg = data.detail;
            } else if (Array.isArray(data.detail) && data.detail.length > 0) {
                errorMsg = data.detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
            }
            showToast(errorMsg, true);
        }
    } catch (err) {
        console.error('Error sending message:', err);
        showToast('Error sending message via WhatsApp', true);
    } finally {
        isSendingManagerMessage = false;
        if (sendBtn) sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// Expose handleManagerSendMessage globally
window.handleManagerSendMessage = handleManagerSendMessage;

async function clearAllLeads() {
    if (!confirm("⚠️ ARE YOU SURE?\n\nThis will permanently delete ALL leads and chat history from the database. This action cannot be undone!")) {
        return;
    }
    
    try {
        const res = await fetch('/api/leads/clear-all', { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('All leads and chat history cleared!');
            selectedLead = null;
            const emptyState = document.getElementById('detail-empty-state');
            const contentArea = document.getElementById('detail-content-area');
            if (emptyState) emptyState.classList.remove('hidden');
            if (contentArea) contentArea.classList.add('hidden');
            loadLeadsData();
            loadAnalyticsData();
        } else {
            showToast(data.detail || 'Failed to clear leads', true);
        }
    } catch (e) {
        console.error('Error clearing leads:', e);
        showToast('Error clearing leads database', true);
    }
}

window.clearAllLeads = clearAllLeads;

async function deleteSelectedLead() {
    if (!selectedLead) {
        showToast('Please select a lead to delete', true);
        return;
    }

    const name = selectedLead.name || 'this lead';
    if (!confirm(`Are you sure you want to delete lead for "${name}"?\n\nThis will remove their inquiry record and chat history.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/leads/${selectedLead.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(`Lead "${name}" deleted successfully.`);
            selectedLead = null;
            const emptyState = document.getElementById('detail-empty-state');
            const contentArea = document.getElementById('detail-content-area');
            if (emptyState) emptyState.classList.remove('hidden');
            if (contentArea) contentArea.classList.add('hidden');
            loadLeadsData();
            loadAnalyticsData();
        } else {
            showToast(data.detail || 'Failed to delete lead', true);
        }
    } catch (e) {
        console.error('Error deleting lead:', e);
        showToast('Error deleting lead', true);
    }
}

window.deleteSelectedLead = deleteSelectedLead;

// Global Event Delegation for Send Button & Enter Key
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#manager-send-btn');
    if (btn) {
        e.preventDefault();
        handleManagerSendMessage();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'manager-chat-input' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleManagerSendMessage();
    }
});

// -------------------------------------------------------------
// 3. Cables Catalog
// -------------------------------------------------------------
const categorySelect = document.getElementById('category-select');

categorySelect.addEventListener('change', () => {
    loadCatalogData();
});

async function loadCatalogData() {
    const tableBody = document.getElementById('catalog-table-body');
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center" style="padding: 3rem 0;">
                <i class="fa-solid fa-spinner fa-spin"></i> Loading catalog...
            </td>
        </tr>
    `;
    
    try {
        const res = await fetch('/api/products');
        catalogData = await res.json();
        
        // Rebuild category filter dropdown with only categories present in actual product data
        const dataCategories = [...new Set(catalogData.map(p => p.category).filter(Boolean))].sort();
        const allCategories = ['All', ...dataCategories];
        const currentSelected = categorySelect.value;
        categorySelect.innerHTML = allCategories.map(cat => {
            const label = cat === 'All' ? 'All Categories' : cat;
            const selected = cat === currentSelected ? 'selected' : '';
            return `<option value="${cat}" ${selected}>${label}</option>`;
        }).join('');
        
        const filter = categorySelect.value;
        const filteredProducts = filter === 'All' 
            ? catalogData 
            : catalogData.filter(p => p.category === filter);
            
        tableBody.innerHTML = '';
        
        if (filteredProducts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted" style="padding: 3rem 0;">
                        No products found
                    </td>
                </tr>
            `;
            return;
        }
        
        filteredProducts.forEach(product => {
            const stockOptions = ['In Stock', 'Out of Stock', 'Custom Only'].map(opt => {
                const selected = product.stock_status === opt ? 'selected' : '';
                return `<option value="${opt}" ${selected}>${opt}</option>`;
            }).join('');
            
            let stockClass = 'stock-in';
            if (product.stock_status === 'Out of Stock') stockClass = 'stock-out';
            else if (product.stock_status === 'Custom Only') stockClass = 'stock-custom';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="text-secondary">${product.category}</span></td>
                <td><strong>${product.name}</strong></td>
                <td>${product.conductor}</td>
                <td>${product.size}</td>
                <td>${product.core} core</td>
                <td>
                    <span class="editable-price" data-name="${product.name}">
                        ${product.price_per_meter !== null ? 'INR ' + product.price_per_meter.toFixed(2) : 'N/A'} <i class="fa-solid fa-pen" style="font-size: 0.65rem; opacity: 0.4; margin-left: 4px;"></i>
                    </span>
                </td>
                <td>
                    <select class="catalog-status-select ${stockClass}" data-name="${product.name}">
                        ${stockOptions}
                    </select>
                </td>
                <td>
                    <button class="btn-delete-product" data-name="${product.name}" title="Delete this product">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        
        // Add double click & click edit event to price cells
        document.querySelectorAll('.editable-price').forEach(cell => {
            cell.addEventListener('click', function() {
                startEditingPrice(this);
            });
        });
        
        // Add change event to stock selectors
        document.querySelectorAll('.catalog-status-select').forEach(select => {
            select.addEventListener('change', function() {
                updateProductStock(this.getAttribute('data-name'), this.value, this);
            });
        });
        
        // Add click event to delete buttons
        document.querySelectorAll('.btn-delete-product').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteProduct(this.getAttribute('data-name'));
            });
        });
    } catch (e) {
        console.error('Error loading catalog:', e);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-rose-500" style="padding: 3rem 0;">
                    Failed to load catalog products
                </td>
            </tr>
        `;
    }
}

function startEditingPrice(element) {
    // If already editing, ignore
    if (element.querySelector('input')) return;
    
    const productName = element.getAttribute('data-name');
    const currentPriceText = element.textContent.trim().replace('INR ', '');
    const currentPrice = parseFloat(currentPriceText);
    
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.className = 'editable-price-input';
    input.value = isNaN(currentPrice) ? '' : currentPrice;
    
    element.textContent = '';
    element.appendChild(input);
    input.focus();
    input.select();
    
    // Save function
    const savePrice = async () => {
        const newPrice = parseFloat(input.value);
        if (isNaN(newPrice) || newPrice < 0) {
            showToast('Please enter a valid price', true);
            element.textContent = isNaN(currentPrice) ? 'N/A' : `INR ${currentPrice.toFixed(2)}`;
            return;
        }
        
        // Get sibling select value for stock status
        const tr = element.closest('tr');
        const select = tr.querySelector('.catalog-status-select');
        const stockStatus = select.value;
        
        try {
            const res = await fetch(`/api/products/${encodeURIComponent(productName)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: newPrice, stock_status: stockStatus })
            });
            
            if (res.ok) {
                showToast(`Updated price for ${productName} to INR ${newPrice.toFixed(2)}/m`);
                element.textContent = `INR ${newPrice.toFixed(2)}`;
                // Update local model
                const localProd = catalogData.find(p => p.name === productName);
                if (localProd) localProd.price_per_meter = newPrice;
            } else {
                showToast('Failed to update price', true);
                element.textContent = `INR ${currentPrice.toFixed(2)}`;
            }
        } catch (err) {
            console.error('Error updating price:', err);
            showToast('Error saving price change', true);
            element.textContent = `INR ${currentPrice.toFixed(2)}`;
        }
    };
    
    input.addEventListener('blur', savePrice);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            savePrice();
        } else if (e.key === 'Escape') {
            input.removeEventListener('blur', savePrice);
            element.textContent = `INR ${currentPrice.toFixed(2)}`;
        }
    });
}

async function updateProductStock(productName, stockStatus, selectElement) {
    // Keep local reference for optimistic updates / error revert
    const localProd = catalogData.find(p => p.name === productName);
    
    try {
        // Stock-only update — never send a cached price that could overwrite a newer one
        const res = await fetch(`/api/products/${encodeURIComponent(productName)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock_status: stockStatus })
        });
        
        if (res.ok) {
            showToast(`Updated stock status for ${productName} to "${stockStatus}"`);
            if (localProd) localProd.stock_status = stockStatus;
            
            // Dynamically update background class color coding
            selectElement.className = 'catalog-status-select';
            if (stockStatus === 'In Stock') selectElement.classList.add('stock-in');
            else if (stockStatus === 'Out of Stock') selectElement.classList.add('stock-out');
            else if (stockStatus === 'Custom Only') selectElement.classList.add('stock-custom');
        } else {
            showToast('Failed to update stock status', true);
            // Revert value
            if (localProd) selectElement.value = localProd.stock_status;
        }
    } catch (err) {
        console.error('Error updating stock:', err);
        showToast('Error saving stock change', true);
        if (localProd) selectElement.value = localProd.stock_status;
    }
}

// Delete a product from the catalog
async function deleteProduct(productName) {
    if (!confirm(`Are you sure you want to delete "${productName}" from the catalog?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const res = await fetch(`/api/products/${encodeURIComponent(productName)}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            showToast(`"${productName}" removed from catalog`);
            loadCatalogData();
        } else {
            const data = await res.json();
            showToast(data.detail || 'Failed to delete product', true);
        }
    } catch (err) {
        console.error('Error deleting product:', err);
        showToast('Error deleting product', true);
    }
}

// -------------------------------------------------------------
// Add Cable Modal Logic
// -------------------------------------------------------------
const addCableBtn = document.getElementById('add-cable-btn');
const addCableModal = document.getElementById('add-cable-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');

function openAddCableModal() {
    // Dynamically populate category dropdown from current catalog data
    const catSelect = document.getElementById('new-cable-category');
    if (catSelect && catalogData.length > 0) {
        const existingCategories = [...new Set(catalogData.map(p => p.category).filter(Boolean))].sort();
        // Rebuild options preserving any custom categories
        const defaultOpts = ['Power Cables', 'House Wires', 'Control Cables', 'Rubber Cable', 'Aerial Bunched Cable', 'Instrumentation Wires'];
        const allCats = [...new Set([...defaultOpts, ...existingCategories])].sort();
        catSelect.innerHTML = '<option value="">Select category...</option>' + allCats.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    addCableModal.classList.remove('hidden');
}

function closeAddCableModal() {
    addCableModal.classList.add('hidden');
    // Reset form
    document.getElementById('new-cable-name').value = '';
    document.getElementById('new-cable-category').value = '';
    document.getElementById('new-cable-conductor').value = 'Aluminium';
    document.getElementById('new-cable-size').value = '';
    document.getElementById('new-cable-core').value = '1';
    document.getElementById('new-cable-insulation').value = 'XLPE';
    document.getElementById('new-cable-price').value = '';
    document.getElementById('new-cable-stock').value = 'In Stock';
    document.getElementById('new-cable-specs').value = '';
}

if (addCableBtn) addCableBtn.addEventListener('click', openAddCableModal);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAddCableModal);
if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeAddCableModal);

// Close modal on overlay click (but not on card click)
if (addCableModal) {
    addCableModal.addEventListener('click', (e) => {
        if (e.target === addCableModal) closeAddCableModal();
    });
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && addCableModal && !addCableModal.classList.contains('hidden')) {
        closeAddCableModal();
    }
});

// Save new cable
if (modalSaveBtn) {
    modalSaveBtn.addEventListener('click', async () => {
        const name = document.getElementById('new-cable-name').value.trim();
        const category = document.getElementById('new-cable-category').value;
        const conductor = document.getElementById('new-cable-conductor').value;
        const size = document.getElementById('new-cable-size').value.trim();
        const core = parseFloat(document.getElementById('new-cable-core').value);
        const insulation = document.getElementById('new-cable-insulation').value;
        const price = parseFloat(document.getElementById('new-cable-price').value);
        const stockStatus = document.getElementById('new-cable-stock').value;
        const specs = document.getElementById('new-cable-specs').value.trim();
        
        // Validate
        if (!name) { showToast('Product name is required', true); return; }
        if (!category) { showToast('Please select a category', true); return; }
        if (!size) { showToast('Size is required', true); return; }
        if (isNaN(core) || core < 0.5) { showToast('Cores must be at least 0.5', true); return; }
        if (isNaN(price) || price < 0) { showToast('Please enter a valid price', true); return; }
        
        modalSaveBtn.disabled = true;
        modalSaveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
        
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    category,
                    conductor,
                    size,
                    core,
                    insulation,
                    price_per_meter: price,
                    stock_status: stockStatus,
                    specifications: specs
                })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                showToast(`"${name}" added to catalog successfully!`);
                closeAddCableModal();
                loadCatalogData();
            } else {
                let errorMsg = 'Failed to add product';
                if (typeof data.detail === 'string') {
                    errorMsg = data.detail;
                }
                showToast(errorMsg, true);
            }
        } catch (err) {
            console.error('Error creating product:', err);
            showToast('Error adding product to catalog', true);
        } finally {
            modalSaveBtn.disabled = false;
            modalSaveBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add to Catalog';
        }
    });
}
// -------------------------------------------------------------
// Global Actions
// -------------------------------------------------------------
refreshBtn.addEventListener('click', () => {
    const originalContent = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    Promise.all([
        loadAnalyticsData(),
        currentTab === 'leads-tab' ? loadLeadsData() : Promise.resolve(),
        currentTab === 'catalog-tab' ? loadCatalogData() : Promise.resolve()
    ]).then(() => {
        setTimeout(() => {
            refreshBtn.innerHTML = originalContent;
            refreshBtn.disabled = false;
            showToast('All dashboard data refreshed');
        }, 300);
    }).catch(err => {
        refreshBtn.innerHTML = originalContent;
        refreshBtn.disabled = false;
        showToast('Failed to refresh data', true);
    });
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Load analytics tab first
    loadAnalyticsData();
    
    // Fetch leads raw data silently to count statuses for charts correctly
    fetch('/api/leads')
        .then(res => res.json())
        .then(data => {
            leadsData = data;
            loadAnalyticsData(); // Redraw chart once we have total list
        })
        .catch(err => console.warn('Silent lead load failed:', err));
});

// -------------------------------------------------------------
// Settings Tab Logic
// -------------------------------------------------------------
const welcomeImageInput = document.getElementById('welcome-image');
const welcomeTextInput = document.getElementById('welcome-text');
const previewImageName = document.getElementById('preview-image-name');
const previewText = document.getElementById('preview-text');
const saveSettingsBtn = document.getElementById('save-settings-btn');

function updateLivePreview() {
    const imgVal = welcomeImageInput ? (welcomeImageInput.value.trim() || 'kdi-logo-white-bg.jpg') : 'kdi-logo-white-bg.jpg';
    const textVal = welcomeTextInput ? (welcomeTextInput.value || 'Hi {profile_name}! \ud83d\udc4b\nWelcome to *KDI Power*!') : '';

    if (previewImageName) {
        if (imgVal.startsWith('http://') || imgVal.startsWith('https://')) {
            previewImageName.innerHTML = `<img src="${imgVal}" style="max-height: 120px; max-width: 100%; border-radius: 6px; object-fit: contain;" alt="Header Preview" onerror="this.onerror=null; this.parentElement.textContent='${imgVal}'">`;
        } else {
            previewImageName.textContent = imgVal;
        }
    }

    if (previewText) {
        let formattedText = textVal
            .replace(/{profile_name}/g, 'Rajesh')
            .replace(/\n/g, '<br>')
            .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        previewText.innerHTML = formattedText;
    }
}

if (welcomeImageInput && welcomeTextInput) {
    welcomeImageInput.addEventListener('input', updateLivePreview);
    welcomeTextInput.addEventListener('input', updateLivePreview);
}

function loadSettingsData() {
    fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            if (welcomeImageInput && data.welcome_image) welcomeImageInput.value = data.welcome_image;
            if (welcomeTextInput && data.welcome_text) welcomeTextInput.value = data.welcome_text;
            updateLivePreview();
        })
        .catch(err => {
            showToast('Failed to load configuration', true);
            console.error('Settings load error:', err);
        });
}

if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        const payload = {
            welcome_image: welcomeImageInput.value.trim(),
            welcome_text: welcomeTextInput.value.trim()
        };

        saveSettingsBtn.disabled = true;
        saveSettingsBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

        fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
            showToast('Configuration saved successfully!');
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Configuration';
        })
        .catch(err => {
            showToast('Failed to save configuration', true);
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Configuration';
        });
    });
}

// -------------------------------------------------------------
// Browse Categories Manager
// -------------------------------------------------------------
const MAX_CATEGORIES = 10;
let browseCategories = [];

const categoriesList = document.getElementById('categories-list');
const catCountBadge = document.getElementById('cat-count-badge');
const catLimitWarning = document.getElementById('cat-limit-warning');
const addCategoryBtn = document.getElementById('add-category-btn');
const saveCategoriesBtn = document.getElementById('save-categories-btn');
const waListPreviewItems = document.getElementById('wa-list-preview-items');

function generateCatId(title) {
    return 'cat_' + title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 20);
}

function updateCatCountBadge() {
    const count = browseCategories.length;
    catCountBadge.textContent = `${count} / ${MAX_CATEGORIES}`;
    
    if (count >= MAX_CATEGORIES) {
        catCountBadge.classList.add('at-limit');
        catLimitWarning.style.display = 'block';
        addCategoryBtn.disabled = true;
        addCategoryBtn.style.opacity = '0.4';
    } else {
        catCountBadge.classList.remove('at-limit');
        catLimitWarning.style.display = 'none';
        addCategoryBtn.disabled = false;
        addCategoryBtn.style.opacity = '1';
    }
}

function renderCategoriesList() {
    categoriesList.innerHTML = '';
    
    if (browseCategories.length === 0) {
        categoriesList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">
                <i class="fa-solid fa-list" style="font-size: 1.5rem; opacity: 0.3; display: block; margin-bottom: 0.75rem;"></i>
                No categories configured. Click "Add Category" to begin.
            </div>
        `;
        updateCatCountBadge();
        renderCatPreview();
        return;
    }
    
    browseCategories.forEach((cat, index) => {
        const row = document.createElement('div');
        row.className = 'category-row';
        row.setAttribute('data-index', index);
        
        row.innerHTML = `
            <span class="cat-drag-handle" title="Drag to reorder"><i class="fa-solid fa-grip-vertical"></i></span>
            <span class="cat-order-num">${index + 1}</span>
            <input type="text" class="cat-title-input" value="${escapeHtml(cat.title)}" placeholder="Category name..." maxlength="24">
            <span class="cat-id-display" title="${escapeHtml(cat.id)}">${escapeHtml(cat.id)}</span>
            <div class="cat-move-btns">
                <button class="cat-move-btn" data-dir="up" title="Move up" ${index === 0 ? 'disabled style="opacity:0.2"' : ''}><i class="fa-solid fa-chevron-up"></i></button>
                <button class="cat-move-btn" data-dir="down" title="Move down" ${index === browseCategories.length - 1 ? 'disabled style="opacity:0.2"' : ''}><i class="fa-solid fa-chevron-down"></i></button>
            </div>
            <button class="cat-delete-btn" title="Remove category"><i class="fa-solid fa-xmark"></i></button>
        `;
        
        // Title input — update ID on change and re-render preview
        const titleInput = row.querySelector('.cat-title-input');
        titleInput.addEventListener('input', () => {
            const newTitle = titleInput.value.trim();
            browseCategories[index].title = newTitle;
            browseCategories[index].id = generateCatId(newTitle);
            row.querySelector('.cat-id-display').textContent = browseCategories[index].id;
            row.querySelector('.cat-id-display').title = browseCategories[index].id;
            renderCatPreview();
        });
        
        // Move buttons
        row.querySelectorAll('.cat-move-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.getAttribute('data-dir');
                if (dir === 'up' && index > 0) {
                    [browseCategories[index], browseCategories[index - 1]] = [browseCategories[index - 1], browseCategories[index]];
                } else if (dir === 'down' && index < browseCategories.length - 1) {
                    [browseCategories[index], browseCategories[index + 1]] = [browseCategories[index + 1], browseCategories[index]];
                }
                renderCategoriesList();
            });
        });
        
        // Delete button
        row.querySelector('.cat-delete-btn').addEventListener('click', () => {
            browseCategories.splice(index, 1);
            renderCategoriesList();
        });
        
        categoriesList.appendChild(row);
    });
    
    updateCatCountBadge();
    renderCatPreview();
}

function renderCatPreview() {
    waListPreviewItems.innerHTML = '';
    
    if (browseCategories.length === 0) {
        waListPreviewItems.innerHTML = '<div class="wa-list-empty">No categories to display</div>';
        return;
    }
    
    browseCategories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'wa-list-item';
        item.innerHTML = `
            <div class="wa-list-item-radio"></div>
            <span class="wa-list-item-title">${escapeHtml(cat.title || 'Untitled')}</span>
        `;
        waListPreviewItems.appendChild(item);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Add category button
if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
        if (browseCategories.length >= MAX_CATEGORIES) {
            showToast('Maximum 10 categories allowed by WhatsApp', true);
            return;
        }
        
        const newCat = {
            id: `cat_new_${Date.now().toString(36)}`,
            title: ''
        };
        browseCategories.push(newCat);
        renderCategoriesList();
        
        // Focus the new input
        const inputs = categoriesList.querySelectorAll('.cat-title-input');
        if (inputs.length > 0) {
            const lastInput = inputs[inputs.length - 1];
            lastInput.focus();
        }
    });
}

// Save categories button
if (saveCategoriesBtn) {
    saveCategoriesBtn.addEventListener('click', () => {
        // Validate: remove categories with empty titles
        const validCategories = browseCategories.filter(cat => cat.title && cat.title.trim());
        
        if (validCategories.length === 0) {
            showToast('Please add at least one category with a name', true);
            return;
        }
        
        // Regenerate IDs for final save
        validCategories.forEach(cat => {
            cat.title = cat.title.trim();
            cat.id = generateCatId(cat.title);
        });
        
        // Check for duplicate IDs
        const ids = validCategories.map(c => c.id);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
            // Append numeric suffix to dedupe
            const seen = {};
            validCategories.forEach(cat => {
                if (seen[cat.id]) {
                    cat.id = cat.id + '_' + (++seen[cat.id]);
                } else {
                    seen[cat.id] = 1;
                }
            });
        }
        
        saveCategoriesBtn.disabled = true;
        saveCategoriesBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
        
        fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ browse_categories: validCategories })
        })
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
            browseCategories = validCategories;
            renderCategoriesList();
            showToast('Browse categories saved successfully!');
            saveCategoriesBtn.disabled = false;
            saveCategoriesBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Categories';
        })
        .catch(err => {
            showToast('Failed to save categories', true);
            saveCategoriesBtn.disabled = false;
            saveCategoriesBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Categories';
        });
    });
}

// Load categories when settings tab opens
const _origLoadSettings = loadSettingsData;
loadSettingsData = function() {
    _origLoadSettings();
    
    // Also load browse categories
    fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            if (data.browse_categories && Array.isArray(data.browse_categories)) {
                browseCategories = data.browse_categories.map(cat => ({
                    id: cat.id || generateCatId(cat.title || ''),
                    title: cat.title || ''
                }));
            } else {
                // Defaults
                browseCategories = [
                    {id: 'cat_power', title: 'Power Cables'},
                    {id: 'cat_wires', title: 'Electrical Wires'},
                    {id: 'cat_armour', title: 'Armoured Cables'},
                    {id: 'cat_unarmour', title: 'Unarmoured Cables'},
                    {id: 'cat_control', title: 'Control Cables'}
                ];
            }
            renderCategoriesList();
        })
        .catch(err => {
            console.error('Failed to load browse categories:', err);
        });
};
// -------------------------------------------------------------
// Visitor Chats (Non-Leads) Logic
// -------------------------------------------------------------
let visitorsData = [];
let selectedVisitor = null;
let leadSelectedFile = null;
let visitorSelectedFile = null;
let outboundSelectedFile = null;

async function loadVisitorData() {
    const listContainer = document.getElementById('visitors-list-container');
    const loadingElem = document.getElementById('visitors-list-loading');
    const badgeElem = document.getElementById('visitor-count-badge');
    
    if (loadingElem) loadingElem.style.display = 'block';
    
    try {
        const res = await fetch('/api/visitors');
        visitorsData = await res.json();
        
        if (badgeElem) badgeElem.textContent = visitorsData.length;
        if (loadingElem) loadingElem.style.display = 'none';
        
        renderVisitorsList(visitorsData);
    } catch (err) {
        console.error('Failed to load visitor chats:', err);
        if (loadingElem) loadingElem.innerHTML = '<span class="text-rose-500">Failed to load visitor chats</span>';
    }
}

function renderVisitorsList(visitors) {
    const container = document.getElementById('visitors-list-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (visitors.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
                <i class="fa-solid fa-comments" style="font-size: 1.8rem; opacity: 0.3; display: block; margin-bottom: 0.5rem;"></i>
                No non-lead visitor chats yet.
            </div>
        `;
        return;
    }
    
    visitors.forEach(v => {
        const card = document.createElement('div');
        const isActive = selectedVisitor && selectedVisitor.phone === v.phone;
        card.className = `lead-item visitor ${isActive ? 'active' : ''}`;
        
        const cleanPhone = v.phone.replace(/[^0-9]/g, '');
        const timeStr = formatDateTime(v.last_active);
        const directionIcon = v.direction === 'outbound' ? 'fa-arrow-up-right-from-square' : 'fa-arrow-down-left';
        
        card.innerHTML = `
            <div class="lead-item-header">
                <span class="lead-item-name" style="font-size: 0.9rem;">+${cleanPhone}</span>
                <span class="badge badge-visitor"><i class="fa-solid fa-comment-dots"></i> ${v.message_count} msgs</span>
            </div>
            <div class="lead-item-body">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <i class="fa-solid ${directionIcon}" style="opacity: 0.65; margin-right: 4px;"></i>${escapeHtml(v.last_message || 'Chat message')}
                </span>
            </div>
            <div class="lead-item-meta">
                <span>Visitor</span>
                <span>${timeStr}</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            selectedVisitor = v;
            document.querySelectorAll('#visitors-list-container .lead-item').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            renderVisitorChat(v);
        });
        
        container.appendChild(card);
    });
}

async function renderVisitorChat(visitor) {
    const emptyState = document.getElementById('visitor-empty-state');
    const contentArea = document.getElementById('visitor-content-area');
    const phoneHeader = document.getElementById('visitor-phone-header');
    const waBtn = document.getElementById('visitor-wa-btn');
    const bubblesContainer = document.getElementById('visitor-chat-bubbles');
    
    if (emptyState) emptyState.classList.add('hidden');
    if (contentArea) contentArea.classList.remove('hidden');
    
    const cleanPhone = visitor.phone.replace(/[^0-9]/g, '');
    if (phoneHeader) phoneHeader.textContent = `+${cleanPhone}`;
    if (waBtn) waBtn.href = `https://web.whatsapp.com/send?phone=${cleanPhone}`;
    
    if (bubblesContainer) {
        bubblesContainer.innerHTML = '<div class="text-center" style="padding: 2rem; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading chat...</div>';
    }
    
    try {
        const res = await fetch(`/api/leads/${encodeURIComponent(visitor.phone)}/history`);
        const chatLogs = await res.json();
        
        if (!bubblesContainer) return;
        bubblesContainer.innerHTML = '';
        
        if (chatLogs.length === 0) {
            bubblesContainer.innerHTML = '<div class="text-center" style="padding: 2rem; color: var(--text-muted);">No messages logged.</div>';
            return;
        }
        
        chatLogs.forEach(msg => {
            const isOutbound = msg.direction === 'outbound';
            const timeStr = formatDateTime(msg.created_at || msg.timestamp);
            const formattedBody = (msg.body || '').replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            
            const row = document.createElement('div');
            row.className = `chat-bubble-row ${isOutbound ? 'outbound' : 'inbound'}`;
            row.innerHTML = `
                <div class="chat-bubble" ${isOutbound ? 'style="border-left: 3px solid var(--accent-cyan);"' : ''}>
                    <div class="chat-bubble-body">${formattedBody}</div>
                    <span class="chat-bubble-time">${timeStr}</span>
                </div>
            `;
            bubblesContainer.appendChild(row);
        });
        
        bubblesContainer.scrollTop = bubblesContainer.scrollHeight;
    } catch (err) {
        console.error('Error fetching visitor chat logs:', err);
    }
}

// Visitor search listener
const visitorSearch = document.getElementById('visitor-search');
if (visitorSearch) {
    visitorSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = visitorsData.filter(v => v.phone.toLowerCase().includes(q) || (v.last_message || '').toLowerCase().includes(q));
        renderVisitorsList(filtered);
    });
}

// -------------------------------------------------------------
// File Attachment Helpers for Reply Bars
// -------------------------------------------------------------
function setupAttachmentPicker(attachBtnId, fileInputId, pillId, fileNameId, removeBtnId, onSelectCallback) {
    const attachBtn = document.getElementById(attachBtnId);
    const fileInput = document.getElementById(fileInputId);
    const pill = document.getElementById(pillId);
    const fileNameTxt = document.getElementById(fileNameId);
    const removeBtn = document.getElementById(removeBtnId);
    
    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (fileNameTxt) fileNameTxt.textContent = file.name;
                if (pill) { pill.style.display = 'inline-flex'; pill.classList.remove('hidden'); }
                if (onSelectCallback) onSelectCallback(file);
            }
        });
    }
    
    if (removeBtn && fileInput && pill) {
        removeBtn.addEventListener('click', () => {
            fileInput.value = '';
            pill.style.display = 'none';
            pill.classList.add('hidden');
            if (onSelectCallback) onSelectCallback(null);
        });
    }
}

// Setup attachments for Lead reply bar
setupAttachmentPicker('lead-attach-btn', 'lead-file-input', 'lead-file-pill', 'lead-file-name', 'lead-remove-file', (file) => {
    leadSelectedFile = file;
});

// Setup attachments for Visitor reply bar
setupAttachmentPicker('visitor-attach-btn', 'visitor-file-input', 'visitor-file-pill', 'visitor-file-name', 'visitor-remove-file', (file) => {
    visitorSelectedFile = file;
});

// Send Visitor Reply
const visitorSendBtn = document.getElementById('visitor-send-btn');
const visitorChatInput = document.getElementById('visitor-chat-input');

if (visitorSendBtn) {
    visitorSendBtn.addEventListener('click', async () => {
        if (!selectedVisitor) { showToast('Please select a visitor chat first', true); return; }
        const text = (visitorChatInput ? visitorChatInput.value.trim() : '');
        if (!text && !visitorSelectedFile) { showToast('Enter a message or attach a file', true); return; }
        
        const formData = new FormData();
        formData.append('phone', selectedVisitor.phone);
        formData.append('message', text);
        if (visitorSelectedFile) formData.append('file', visitorSelectedFile);
        
        visitorSendBtn.disabled = true;
        visitorSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        
        try {
            const res = await fetch('/api/messages/send-media', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                showToast('Message sent via WhatsApp!');
                if (visitorChatInput) visitorChatInput.value = '';
                // Clear attachment
                const removeBtn = document.getElementById('visitor-remove-file');
                if (removeBtn) removeBtn.click();
                
                // Re-render chat
                renderVisitorChat(selectedVisitor);
            } else {
                showToast(data.detail || 'Failed to send message', true);
            }
        } catch (err) {
            console.error('Error sending visitor message:', err);
            showToast('Error sending message', true);
        } finally {
            visitorSendBtn.disabled = false;
            visitorSendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send';
        }
    });
}

// Upgrade Lead Manager Send to handle file attachments
const origHandleManagerSendMessage = window.handleManagerSendMessage;
window.handleManagerSendMessage = async function() {
    if (leadSelectedFile) {
        if (!selectedLead) { showToast('Please select a lead first', true); return; }
        const textInput = document.getElementById('manager-chat-input');
        const sendBtn = document.getElementById('manager-send-btn');
        const targetPhone = String(selectedLead.phone || selectedLead.phone_number || '').trim();
        
        const formData = new FormData();
        formData.append('phone', targetPhone);
        formData.append('message', textInput ? textInput.value.trim() : '');
        formData.append('file', leadSelectedFile);
        
        if (sendBtn) sendBtn.disabled = true;
        
        try {
            const res = await fetch('/api/messages/send-media', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Media message sent via WhatsApp!');
                if (textInput) textInput.value = '';
                const removeBtn = document.getElementById('lead-remove-file');
                if (removeBtn) removeBtn.click();
                loadLeadHistory(selectedLead.phone);
            } else {
                showToast(data.detail || 'Failed to send message', true);
            }
        } catch (e) {
            console.error('Error sending lead media:', e);
            showToast('Failed to send media message', true);
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
        return;
    }
    // Fall back to original text send
    if (origHandleManagerSendMessage) origHandleManagerSendMessage();
};

// -------------------------------------------------------------
// Outbound Direct Messaging Tab Logic
// -------------------------------------------------------------
const outboundPhoneInput = document.getElementById('outbound-phone-input');
const outboundContactSelect = document.getElementById('outbound-contact-select');
const outboundTextInput = document.getElementById('outbound-text-input');
const outboundFileInput = document.getElementById('outbound-file-input');
const outboundDropzone = document.getElementById('outbound-dropzone');
const outboundFilePreview = document.getElementById('outbound-file-preview');
const outboundFileNameTxt = document.getElementById('outbound-file-name-txt');
const outboundRemoveFileBtn = document.getElementById('outbound-remove-file-btn');
const outboundSendBtn = document.getElementById('outbound-send-btn');
const outboundHistoryTbody = document.getElementById('outbound-history-tbody');

async function loadOutboundData() {
    // 0. Ensure leads + visitors are fetched so the contact picker works even
    //    when this tab is opened before Leads / Visitor Chats.
    try {
        if (leadsData.length === 0) {
            const lr = await fetch('/api/leads');
            leadsData = await lr.json();
        }
        if (visitorsData.length === 0) {
            const vr = await fetch('/api/visitors');
            visitorsData = await vr.json();
        }
    } catch (e) {
        console.error('Failed to load contacts for outbound messaging:', e);
    }
    
    // 1. Populate contact dropdown
    if (outboundContactSelect) {
        outboundContactSelect.innerHTML = '<option value="">Pick Contact...</option>';
        // Combine leads + visitors
        const allContacts = [];
        leadsData.forEach(l => { if (l.phone) allContacts.push({ phone: l.phone, name: `${l.name} (Lead)` }); });
        visitorsData.forEach(v => { if (v.phone) allContacts.push({ phone: v.phone, name: `Visitor (${v.phone.slice(-4)})` }); });
        
        allContacts.forEach(c => {
            const clean = c.phone.replace(/[^0-9]/g, '');
            outboundContactSelect.innerHTML += `<option value="${clean}">${c.name} - +${clean}</option>`;
        });
    }
    
    // 2. Load sent outbound history table
    if (outboundHistoryTbody) {
        outboundHistoryTbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading outbound log...</td></tr>';
        try {
            const res = await fetch('/api/outbound-messages');
            const logs = await res.json();
            outboundHistoryTbody.innerHTML = '';
            
            if (logs.length === 0) {
                outboundHistoryTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 2rem;">No outbound manager messages logged yet.</td></tr>';
                return;
            }
            
            logs.forEach(log => {
                const tr = document.createElement('tr');
                const timeStr = formatDateTime(log.created_at);
                tr.innerHTML = `
                    <td><strong>+${log.phone}</strong></td>
                    <td style="max-width: 300px; font-size: 0.8rem;">${escapeHtml(log.body)}</td>
                    <td style="font-size: 0.75rem; color: var(--text-muted);">${timeStr}</td>
                `;
                outboundHistoryTbody.appendChild(tr);
            });
        } catch (e) {
            console.error('Failed to load outbound history:', e);
            outboundHistoryTbody.innerHTML = '<tr><td colspan="3" class="text-center text-rose-500">Failed to load history</td></tr>';
        }
    }
}

if (outboundContactSelect) {
    outboundContactSelect.addEventListener('change', () => {
        if (outboundContactSelect.value && outboundPhoneInput) {
            outboundPhoneInput.value = outboundContactSelect.value;
        }
    });
}

// Outbound Dropzone file handling
if (outboundDropzone && outboundFileInput) {
    outboundDropzone.addEventListener('click', () => outboundFileInput.click());
    
    outboundDropzone.addEventListener('dragover', (e) => { e.preventDefault(); outboundDropzone.style.borderColor = 'var(--accent-cyan)'; });
    outboundDropzone.addEventListener('dragleave', () => { outboundDropzone.style.borderColor = 'var(--glass-border)'; });
    outboundDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        outboundDropzone.style.borderColor = 'var(--glass-border)';
        if (e.dataTransfer.files.length > 0) {
            outboundFileInput.files = e.dataTransfer.files;
            handleOutboundFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    outboundFileInput.addEventListener('change', () => {
        if (outboundFileInput.files.length > 0) {
            handleOutboundFileSelect(outboundFileInput.files[0]);
        }
    });
}

function handleOutboundFileSelect(file) {
    outboundSelectedFile = file;
    if (outboundFileNameTxt) outboundFileNameTxt.textContent = file.name;
    if (outboundFilePreview) { outboundFilePreview.style.display = 'flex'; outboundFilePreview.classList.remove('hidden'); }
}

if (outboundRemoveFileBtn) {
    outboundRemoveFileBtn.addEventListener('click', () => {
        outboundSelectedFile = null;
        if (outboundFileInput) outboundFileInput.value = '';
        if (outboundFilePreview) { outboundFilePreview.style.display = 'none'; outboundFilePreview.classList.add('hidden'); }
    });
}

// Send Outbound Direct Message
if (outboundSendBtn) {
    outboundSendBtn.addEventListener('click', async () => {
        const phone = outboundPhoneInput ? outboundPhoneInput.value.trim().replace(/[^0-9]/g, '') : '';
        const text = outboundTextInput ? outboundTextInput.value.trim() : '';
        
        if (!phone) { showToast('Please enter recipient phone number', true); return; }
        if (!text && !outboundSelectedFile) { showToast('Please enter message text or attach a file', true); return; }
        
        const formData = new FormData();
        formData.append('phone', phone);
        formData.append('message', text);
        if (outboundSelectedFile) formData.append('file', outboundSelectedFile);
        
        outboundSendBtn.disabled = true;
        outboundSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        
        try {
            const res = await fetch('/api/messages/send-media', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                showToast('Outbound message sent via WhatsApp!');
                if (outboundTextInput) outboundTextInput.value = '';
                if (outboundRemoveFileBtn) outboundRemoveFileBtn.click();
                loadOutboundData();
            } else {
                showToast(data.detail || 'Failed to send outbound message', true);
            }
        } catch (e) {
            console.error('Error sending outbound message:', e);
            showToast('Error sending message via WhatsApp', true);
        } finally {
            outboundSendBtn.disabled = false;
            outboundSendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Direct Message';
        }
    });
}

// -------------------------------------------------------------
// Catalogue PDF Manager Logic (Settings Tab)
// -------------------------------------------------------------
const pdfDropzone = document.getElementById('catalogue-pdf-dropzone');
const pdfFileInput = document.getElementById('catalogue-pdf-file-input');
const uploadPdfBtn = document.getElementById('upload-catalogue-pdf-btn');
const activePdfFilename = document.getElementById('active-pdf-filename');
let selectedPdfFile = null;

if (pdfDropzone && pdfFileInput) {
    pdfDropzone.addEventListener('click', () => pdfFileInput.click());
    
    pdfDropzone.addEventListener('dragover', (e) => { e.preventDefault(); pdfDropzone.style.borderColor = '#38bdf8'; });
    pdfDropzone.addEventListener('dragleave', () => { pdfDropzone.style.borderColor = 'var(--accent-cyan)'; });
    pdfDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfDropzone.style.borderColor = 'var(--accent-cyan)';
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.toLowerCase().endswith('.pdf')) {
                pdfFileInput.files = e.dataTransfer.files;
                handlePdfSelect(file);
            } else {
                showToast('Please select a PDF file (.pdf)', true);
            }
        }
    });
    
    pdfFileInput.addEventListener('change', () => {
        if (pdfFileInput.files.length > 0) {
            handlePdfSelect(pdfFileInput.files[0]);
        }
    });
}

function handlePdfSelect(file) {
    selectedPdfFile = file;
    if (uploadPdfBtn) {
        uploadPdfBtn.disabled = false;
        uploadPdfBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload & Replace (${file.name})`;
    }
}

if (uploadPdfBtn) {
    uploadPdfBtn.addEventListener('click', async () => {
        if (!selectedPdfFile) { showToast('Select a PDF file first', true); return; }
        
        const formData = new FormData();
        formData.append('file', selectedPdfFile);
        
        uploadPdfBtn.disabled = true;
        uploadPdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading Catalogue...';
        
        try {
            const res = await fetch('/api/settings/upload-catalogue', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                showToast(`Catalogue PDF updated successfully! (${data.filename})`);
                if (activePdfFilename) activePdfFilename.textContent = data.filename;
                uploadPdfBtn.disabled = true;
                uploadPdfBtn.innerHTML = '<i class="fa-solid fa-check"></i> Uploaded Successfully';
                selectedPdfFile = null;
                if (pdfFileInput) pdfFileInput.value = '';
            } else {
                showToast(data.detail || 'Failed to upload Catalogue PDF', true);
                uploadPdfBtn.disabled = false;
                uploadPdfBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Retry Upload';
            }
        } catch (e) {
            console.error('Error uploading catalogue PDF:', e);
            showToast('Error uploading Catalogue PDF', true);
            uploadPdfBtn.disabled = false;
            uploadPdfBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Retry Upload';
        }
    });
}
