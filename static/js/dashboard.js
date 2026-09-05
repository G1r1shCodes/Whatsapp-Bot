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
    
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#4b5563' : '#94a3b8';
    const chartBorderColor = isLight ? '#ffffff' : '#111827';
    
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
                borderColor: chartBorderColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor,
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

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#4b5563' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
    
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
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Inter' }, stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'Inter', weight: '600' } }
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

// Edit Lead Details Modal Handlers
function openEditLeadModal() {
    if (!selectedLead) {
        showToast('Select a lead first', true);
        return;
    }
    const modal = document.getElementById('edit-lead-modal');
    if (!modal) return;
    
    document.getElementById('edit-lead-name').value = selectedLead.name === 'Unknown' ? '' : selectedLead.name;
    document.getElementById('edit-lead-company').value = selectedLead.company === 'Unknown' ? '' : selectedLead.company;
    document.getElementById('edit-lead-email').value = selectedLead.email || '';
    document.getElementById('edit-lead-location').value = selectedLead.location === 'Unknown' ? '' : selectedLead.location;
    document.getElementById('edit-lead-product').value = selectedLead.product_interest === 'Unknown' ? '' : selectedLead.product_interest;
    document.getElementById('edit-lead-quantity').value = selectedLead.quantity === 'Unknown' ? '' : selectedLead.quantity;
    document.getElementById('edit-lead-requirements').value = selectedLead.requirements || '';
    
    modal.classList.remove('hidden');
}
window.openEditLeadModal = openEditLeadModal;

const saveLeadDetailsBtn = document.getElementById('save-lead-details-btn');
if (saveLeadDetailsBtn) {
    saveLeadDetailsBtn.addEventListener('click', async () => {
        if (!selectedLead) return;
        
        const data = {
            name: document.getElementById('edit-lead-name').value.trim() || 'Unknown',
            company: document.getElementById('edit-lead-company').value.trim() || 'Unknown',
            email: document.getElementById('edit-lead-email').value.trim(),
            location: document.getElementById('edit-lead-location').value.trim() || 'Unknown',
            product_interest: document.getElementById('edit-lead-product').value.trim() || 'Unknown',
            quantity: document.getElementById('edit-lead-quantity').value.trim() || 'Unknown',
            requirements: document.getElementById('edit-lead-requirements').value.trim()
        };
        
        saveLeadDetailsBtn.disabled = true;
        saveLeadDetailsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        
        try {
            const res = await fetch(`/api/leads/${selectedLead.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok && result.success) {
                showToast('Lead details updated successfully!');
                Object.assign(selectedLead, data);
                selectLead(selectedLead);
                document.getElementById('edit-lead-modal').classList.add('hidden');
                loadLeadsData();
            } else {
                showToast(result.detail || 'Failed to save lead details', true);
            }
        } catch (e) {
            console.error('Error saving lead details:', e);
            showToast('Error saving lead details', true);
        } finally {
            saveLeadDetailsBtn.disabled = false;
            saveLeadDetailsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Details';
        }
    });
}

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
            const formattedBody = messageText.replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            
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
let cachedCategories = [];

async function fetchProductCategories() {
    try {
        const res = await fetch('/api/product-categories');
        const data = await res.json();
        if (Array.isArray(data)) {
            cachedCategories = data;
        }
    } catch (err) {
        console.error('Error loading product categories:', err);
    }
    return cachedCategories;
}

if (categorySelect) {
    categorySelect.addEventListener('change', () => {
        loadCatalogData();
    });
}

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
        const [resProducts, categories] = await Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetchProductCategories()
        ]);
        catalogData = resProducts;
        
        // Rebuild category filter dropdown merging configured categories + actual product categories
        const dataCategories = [...new Set(catalogData.map(p => p.category).filter(Boolean))];
        const mergedCategories = [...new Set([...categories, ...dataCategories])].sort();
        const allCategories = ['All', ...mergedCategories];
        const currentSelected = categorySelect ? categorySelect.value : 'All';
        if (categorySelect) {
            categorySelect.innerHTML = allCategories.map(cat => {
                const label = cat === 'All' ? 'All Categories' : cat;
                const selected = cat === currentSelected ? 'selected' : '';
                return `<option value="${cat}" ${selected}>${label}</option>`;
            }).join('');
        }
        
        const filter = categorySelect ? categorySelect.value : 'All';
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

async function openAddCableModal() {
    const catSelect = document.getElementById('new-cable-category');
    if (catSelect) {
        const categories = await fetchProductCategories();
        const dataCategories = catalogData.length > 0 ? [...new Set(catalogData.map(p => p.category).filter(Boolean))] : [];
        const allCats = [...new Set([...categories, ...dataCategories])].sort();
        const currentVal = catSelect.value;
        catSelect.innerHTML = '<option value="">Select category...</option>' + allCats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
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
// Manage Categories Modal Logic
// -------------------------------------------------------------
const manageCategoriesBtn = document.getElementById('manage-categories-btn');
const manageCategoriesModal = document.getElementById('manage-categories-modal');
const prodCatCloseBtn = document.getElementById('prod-cat-close-btn');
const prodCatDoneBtn = document.getElementById('prod-cat-done-btn');
const prodCatInput = document.getElementById('prod-cat-input');
const addProdCatBtn = document.getElementById('prod-cat-add-btn');
const prodCatList = document.getElementById('prod-cat-list');

async function renderProdCategoriesList() {
    if (!prodCatList) return;
    prodCatList.innerHTML = '<li style="color: #94a3b8; font-size: 0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</li>';
    const categories = await fetchProductCategories();
    
    if (categories.length === 0) {
        prodCatList.innerHTML = '<li style="color: #94a3b8; font-size: 0.85rem;">No categories found</li>';
        return;
    }
    
    prodCatList.innerHTML = categories.map(cat => `
        <li style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <span style="font-size: 0.9rem; font-weight: 500; color: #f8fafc;">${cat}</span>
            <button class="btn-delete-cat" data-category="${cat}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem 0.5rem; font-size: 0.85rem; transition: opacity 0.2s;" title="Delete Category">
                <i class="fa-solid fa-trash"></i>
            </button>
        </li>
    `).join('');
}

async function handleAddProdCategory() {
    if (!prodCatInput) return;
    const val = prodCatInput.value.trim();
    if (!val) return;
    
    if (addProdCatBtn) {
        addProdCatBtn.disabled = true;
        addProdCatBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
    }
    try {
        const res = await fetch('/api/product-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: val })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            prodCatInput.value = '';
            await renderProdCategoriesList();
            loadCatalogData();
        } else {
            alert(result.detail || result.message || 'Failed to add category');
        }
    } catch (err) {
        console.error('Error adding category:', err);
        alert('Network error while adding category');
    } finally {
        if (addProdCatBtn) {
            addProdCatBtn.disabled = false;
            addProdCatBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Category';
        }
    }
}

async function handleDeleteProdCategory(catName) {
    if (!confirm(`Are you sure you want to remove category "${catName}"?`)) return;
    try {
        const res = await fetch(`/api/product-categories/${encodeURIComponent(catName)}`, {
            method: 'DELETE'
        });
        const result = await res.json();
        if (res.ok && result.success) {
            await renderProdCategoriesList();
            loadCatalogData();
        } else {
            alert(result.detail || result.message || 'Failed to delete category');
        }
    } catch (err) {
        console.error('Error deleting category:', err);
        alert('Network error while deleting category');
    }
}

if (manageCategoriesBtn) {
    manageCategoriesBtn.addEventListener('click', () => {
        if (manageCategoriesModal) manageCategoriesModal.classList.remove('hidden');
        renderProdCategoriesList();
    });
}
if (prodCatCloseBtn) {
    prodCatCloseBtn.addEventListener('click', () => {
        if (manageCategoriesModal) manageCategoriesModal.classList.add('hidden');
    });
}
if (prodCatDoneBtn) {
    prodCatDoneBtn.addEventListener('click', () => {
        if (manageCategoriesModal) manageCategoriesModal.classList.add('hidden');
    });
}
if (addProdCatBtn) {
    addProdCatBtn.addEventListener('click', handleAddProdCategory);
}
if (prodCatInput) {
    prodCatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddProdCategory();
        }
    });
}
if (prodCatList) {
    prodCatList.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-delete-cat');
        if (delBtn) {
            const cat = delBtn.dataset.category;
            if (cat) handleDeleteProdCategory(cat);
        }
    });
}

// -------------------------------------------------------------
// Bulk Excel Upload Modal Logic
// -------------------------------------------------------------
const bulkUploadBtn = document.getElementById('bulk-upload-btn');
const bulkUploadModal = document.getElementById('bulk-upload-modal');
const bulkModalCloseBtn = document.getElementById('bulk-modal-close-btn');
const bulkModalCancelBtn = document.getElementById('bulk-modal-cancel-btn');
const bulkDropzone = document.getElementById('bulk-upload-dropzone');
const bulkFileInput = document.getElementById('bulk-upload-file-input');
const bulkSubmitBtn = document.getElementById('bulk-upload-submit-btn');
const bulkDropzoneLabel = document.getElementById('bulk-dropzone-label');
let selectedBulkFile = null;

function openBulkUploadModal() {
    if (!bulkUploadModal) return;
    // Reset state
    selectedBulkFile = null;
    if (bulkFileInput) bulkFileInput.value = '';
    if (bulkDropzoneLabel) bulkDropzoneLabel.textContent = 'Click to Select or Drop Excel File (.xlsx)';
    if (bulkSubmitBtn) { bulkSubmitBtn.disabled = true; bulkSubmitBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Import'; }
    const resultsArea = document.getElementById('bulk-upload-results');
    if (resultsArea) resultsArea.style.display = 'none';
    bulkUploadModal.classList.remove('hidden');
}

function closeBulkUploadModal() {
    if (bulkUploadModal) bulkUploadModal.classList.add('hidden');
}

if (bulkUploadBtn) bulkUploadBtn.addEventListener('click', openBulkUploadModal);
if (bulkModalCloseBtn) bulkModalCloseBtn.addEventListener('click', closeBulkUploadModal);
if (bulkModalCancelBtn) bulkModalCancelBtn.addEventListener('click', closeBulkUploadModal);

// Close on overlay click
if (bulkUploadModal) {
    bulkUploadModal.addEventListener('click', (e) => {
        if (e.target === bulkUploadModal) closeBulkUploadModal();
    });
}

// Dropzone click → open file picker
if (bulkDropzone && bulkFileInput) {
    bulkDropzone.addEventListener('click', () => bulkFileInput.click());

    // Drag & drop support
    bulkDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        bulkDropzone.style.borderColor = '#10b981';
        bulkDropzone.style.background = 'rgba(16, 185, 129, 0.08)';
    });
    bulkDropzone.addEventListener('dragleave', () => {
        bulkDropzone.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        bulkDropzone.style.background = 'rgba(16, 185, 129, 0.03)';
    });
    bulkDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        bulkDropzone.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        bulkDropzone.style.background = 'rgba(16, 185, 129, 0.03)';
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                handleBulkFileSelect(file);
            } else {
                showToast('Please select an Excel file (.xlsx)', true);
            }
        }
    });

    bulkFileInput.addEventListener('change', () => {
        if (bulkFileInput.files.length > 0) {
            handleBulkFileSelect(bulkFileInput.files[0]);
        }
    });
}

function handleBulkFileSelect(file) {
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', true);
        return;
    }
    selectedBulkFile = file;
    if (bulkDropzoneLabel) {
        bulkDropzoneLabel.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }
    if (bulkSubmitBtn) {
        bulkSubmitBtn.disabled = false;
        bulkSubmitBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload & Import (${file.name})`;
    }
    // Hide previous results
    const resultsArea = document.getElementById('bulk-upload-results');
    if (resultsArea) resultsArea.style.display = 'none';
}

// Submit upload
if (bulkSubmitBtn) {
    bulkSubmitBtn.addEventListener('click', async () => {
        if (!selectedBulkFile) {
            showToast('Please select an Excel file first', true);
            return;
        }

        bulkSubmitBtn.disabled = true;
        bulkSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading & Processing...';

        const formData = new FormData();
        formData.append('file', selectedBulkFile);

        try {
            const res = await fetch('/api/products/bulk-upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok && data.success) {
                showToast(data.message);

                // Show results
                const resultsArea = document.getElementById('bulk-upload-results');
                if (resultsArea) {
                    resultsArea.style.display = 'block';
                    const r = data.results;
                    document.getElementById('bulk-result-total').textContent = r.total_rows || 0;
                    document.getElementById('bulk-result-created').textContent = r.created || 0;
                    document.getElementById('bulk-result-updated').textContent = r.updated || 0;
                    document.getElementById('bulk-result-skipped').textContent = r.skipped || 0;

                    const errorsArea = document.getElementById('bulk-result-errors');
                    if (r.errors && r.errors.length > 0) {
                        errorsArea.style.display = 'block';
                        errorsArea.innerHTML = '<strong>Errors:</strong><br>' + r.errors.map(e =>
                            `• ${escapeHtml(e.product)}: ${escapeHtml(e.error)}`
                        ).join('<br>');
                    } else {
                        errorsArea.style.display = 'none';
                    }
                }

                // Reset file selection
                selectedBulkFile = null;
                if (bulkFileInput) bulkFileInput.value = '';
                if (bulkDropzoneLabel) bulkDropzoneLabel.textContent = 'Click to Select or Drop Excel File (.xlsx)';

                bulkSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Upload Complete!';
                bulkSubmitBtn.disabled = true;

                // Refresh catalog table
                loadCatalogData();
            } else {
                let errorMsg = 'Failed to upload products';
                if (typeof data.detail === 'string') {
                    errorMsg = data.detail;
                } else if (Array.isArray(data.detail) && data.detail.length > 0) {
                    errorMsg = data.detail.map(d => d.msg || d.message || JSON.stringify(d)).join(', ');
                }
                showToast(errorMsg, true);
                bulkSubmitBtn.disabled = false;
                bulkSubmitBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Retry Upload';
            }
        } catch (err) {
            console.error('Error bulk uploading products:', err);
            showToast('Error uploading products: ' + err.message, true);
            bulkSubmitBtn.disabled = false;
            bulkSubmitBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Retry Upload';
        }
    });
}

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

// Convert visitor into a tracked lead
async function convertVisitorToLead() {
    if (!selectedVisitor) {
        showToast('Please select a visitor chat first', true);
        return;
    }
    
    const cleanPhone = String(selectedVisitor.phone || '').replace(/[^0-9]/g, '');
    if (!confirm(`Convert visitor +${cleanPhone} into a lead?\n\nThey will move to the Leads Inbox where you can track and manage the inquiry.`)) {
        return;
    }
    
    try {
        const res = await fetch(`/api/visitors/${encodeURIComponent(selectedVisitor.phone)}/convert`, { method: 'POST' });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast(`Visitor +${cleanPhone} converted to lead`);
            selectedVisitor = null;
            const emptyState = document.getElementById('visitor-empty-state');
            const contentArea = document.getElementById('visitor-content-area');
            if (emptyState) emptyState.classList.remove('hidden');
            if (contentArea) contentArea.classList.add('hidden');
            loadVisitorData();
            leadsData = [];  // force contact picker / analytics to refetch on next open
        } else {
            showToast(data.detail || 'Failed to convert visitor to lead', true);
        }
    } catch (e) {
        console.error('Error converting visitor to lead:', e);
        showToast('Error converting visitor to lead', true);
    }
}

window.convertVisitorToLead = convertVisitorToLead;

// Delete single visitor chat
async function deleteSelectedVisitor() {
    if (!selectedVisitor) {
        showToast('Please select a visitor chat first', true);
        return;
    }
    
    const cleanPhone = String(selectedVisitor.phone || '').replace(/[^0-9]/g, '');
    if (!confirm(`Delete this visitor chat for +${cleanPhone}?\n\nThis removes their full conversation history.`)) {
        return;
    }
    
    try {
        const res = await fetch(`/api/visitors/${encodeURIComponent(selectedVisitor.phone)}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast(`Visitor chat for +${cleanPhone} deleted`);
            selectedVisitor = null;
            const emptyState = document.getElementById('visitor-empty-state');
            const contentArea = document.getElementById('visitor-content-area');
            if (emptyState) emptyState.classList.remove('hidden');
            if (contentArea) contentArea.classList.add('hidden');
            loadVisitorData();
        } else {
            showToast(data.detail || 'Failed to delete visitor chat', true);
        }
    } catch (e) {
        console.error('Error deleting visitor chat:', e);
        showToast('Error deleting visitor chat', true);
    }
}

window.deleteSelectedVisitor = deleteSelectedVisitor;

// Clear all visitor chats
async function clearAllVisitors() {
    if (!confirm('⚠️ ARE YOU SURE?\n\nThis will permanently delete ALL visitor chats (non-lead conversations).\nThis action cannot be undone!')) {
        return;
    }
    
    try {
        const res = await fetch('/api/visitors/clear-all', { method: 'DELETE' });
        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast(`Deleted ${data.deleted || ''} visitor chats`);
            selectedVisitor = null;
            const emptyState = document.getElementById('visitor-empty-state');
            const contentArea = document.getElementById('visitor-content-area');
            if (emptyState) emptyState.classList.remove('hidden');
            if (contentArea) contentArea.classList.add('hidden');
            loadVisitorData();
        } else {
            showToast(data.detail || 'Failed to clear visitor chats', true);
        }
    } catch (e) {
        console.error('Error clearing visitor chats:', e);
        showToast('Error clearing visitor chats', true);
    }
}

window.clearAllVisitors = clearAllVisitors;

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
// Catalogue PDF Manager Logic (Settings Tab)
// -------------------------------------------------------------
const pdfDropzone = document.getElementById('catalogue-pdf-dropzone');
const pdfFileInput = document.getElementById('catalogue-pdf-file-input');
const uploadPdfBtn = document.getElementById('upload-catalogue-pdf-btn');
const activePdfFilename = document.getElementById('active-pdf-filename');
const activePdfUrl = document.getElementById('active-pdf-url');
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
            if (file.name.toLowerCase().endsWith('.pdf')) {
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
    if (file.size > 25 * 1024 * 1024) {
        showToast('PDF file size must be less than 25MB', true);
        return;
    }
    selectedPdfFile = file;
    if (uploadPdfBtn) {
        uploadPdfBtn.disabled = false;
        uploadPdfBtn.innerHTML = `<i class="fa-solid fa-upload"></i> Upload & Replace (${file.name})`;
    }
    const label = pdfDropzone ? (pdfDropzone.querySelector('.dropzone-label') || pdfDropzone.querySelector('span')) : null;
    if (label) {
        label.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
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
                if (activePdfUrl && data.url) activePdfUrl.textContent = window.location.origin + data.url;
                uploadPdfBtn.disabled = true;
                uploadPdfBtn.innerHTML = '<i class="fa-solid fa-check"></i> Uploaded Successfully';
                selectedPdfFile = null;
                if (pdfFileInput) pdfFileInput.value = '';
                const label = pdfDropzone ? (pdfDropzone.querySelector('.dropzone-label') || pdfDropzone.querySelector('span')) : null;
                if (label) label.textContent = 'Click to Select or Drop New Catalogue PDF';
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

// -------------------------------------------------------------
// 6. OUTBOUND MESSAGING — Templates, Single Send, Broadcast
// -------------------------------------------------------------

let messageTemplates = [];
let broadcastRecipients = [];
let outboundSendMode = 'template'; // 'template' | 'freeform'
let selectedOutboundFile = null;

// ── Load outbound data when tab is opened ────────────────────
function loadOutboundData() {
    loadMessageTemplates();
    loadOutboundContacts();
    loadOutboundHistory();
    loadBroadcastHistory();
}

// ── Sub-tab Navigation ───────────────────────────────────────
document.querySelectorAll('.outbound-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-outbound-tab');
        
        document.querySelectorAll('.outbound-subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.outbound-subtab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const panelId = 'outbound-' + targetTab;
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) targetPanel.classList.add('active');
        
        // Refresh data for the target sub-tab
        if (targetTab === 'templates-tab') loadMessageTemplates();
        if (targetTab === 'broadcast-tab') loadBroadcastHistory();
    });
});

// ── Template API ─────────────────────────────────────────────
async function loadMessageTemplates() {
    try {
        const res = await fetch('/api/templates');
        const data = await res.json();
        messageTemplates = data.templates || [];
        renderTemplateCards();
        populateTemplateSelectors();
    } catch (e) {
        console.error('Error loading templates:', e);
    }
}

function renderTemplateCards() {
    const grid = document.getElementById('templates-grid');
    const emptyState = document.getElementById('templates-empty');
    if (!grid) return;
    
    // Clear existing template cards (not the empty state)
    grid.querySelectorAll('.template-card').forEach(c => c.remove());
    
    if (messageTemplates.length === 0) {
        if (emptyState) emptyState.style.display = '';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';
    
    messageTemplates.forEach(tpl => {
        const card = document.createElement('div');
        card.className = 'template-card';
        
        const statusClass = (tpl.meta_status || 'LOCAL').toLowerCase();
        const statusLabel = tpl.meta_status || 'LOCAL';
        
        const categoryIcons = { MARKETING: 'fa-bullhorn', UTILITY: 'fa-wrench', AUTHENTICATION: 'fa-shield-halved' };
        const catIcon = categoryIcons[tpl.category] || 'fa-puzzle-piece';
        
        // Build header info
        let headerInfo = '';
        if (tpl.header && tpl.header.type) {
            const htypeIcons = { text: 'fa-heading', image: 'fa-image', document: 'fa-file-pdf', video: 'fa-video' };
            headerInfo = `<span style="font-size:0.7rem;color:var(--text-muted);"><i class="fa-solid ${htypeIcons[tpl.header.type] || 'fa-heading'}"></i> ${tpl.header.type}</span>`;
        }
        
        // Button info
        let buttonInfo = '';
        if (tpl.buttons && tpl.buttons.length > 0) {
            buttonInfo = `<span style="font-size:0.7rem;color:var(--text-muted);"><i class="fa-solid fa-hand-pointer"></i> ${tpl.buttons.length} btn${tpl.buttons.length > 1 ? 's' : ''}</span>`;
        }
        
        card.innerHTML = `
            <div class="template-card-header">
                <div>
                    <div class="template-card-name">${escapeHtml(tpl.name)}</div>
                    <div class="template-card-category"><i class="fa-solid ${catIcon}"></i> ${tpl.category} • ${tpl.language || 'en'}</div>
                </div>
                <span class="tpl-status-badge ${statusClass}">
                    <i class="fa-solid ${statusClass === 'approved' ? 'fa-check-circle' : statusClass === 'rejected' ? 'fa-times-circle' : statusClass === 'pending' ? 'fa-clock' : 'fa-database'}"></i>
                    ${statusLabel}
                </span>
            </div>
            <div class="template-card-body">${escapeHtml(tpl.body || '')}</div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">${headerInfo}${buttonInfo}${tpl.footer ? `<span style="font-size:0.7rem;color:var(--text-muted);"><i class="fa-solid fa-shoe-prints"></i> footer</span>` : ''}</div>
            <div class="template-card-footer">
                <span style="font-size:0.7rem;color:var(--text-muted);">${formatDateTime(tpl.created_at)}</span>
                <div class="template-card-actions">
                    <button title="Delete template" class="delete-btn" onclick="deleteMessageTemplate('${tpl.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
            ${tpl.meta_status === 'REJECTED' && tpl.meta_rejection_reason ? `<div style="font-size:0.72rem;color:#f87171;background:rgba(239,68,68,0.08);padding:0.4rem 0.6rem;border-radius:6px;margin-top:0.25rem;"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(tpl.meta_rejection_reason)}</div>` : ''}
        `;
        grid.appendChild(card);
    });
}

function populateTemplateSelectors() {
    const selectors = [
        document.getElementById('outbound-template-select'),
        document.getElementById('broadcast-template-select')
    ];
    
    selectors.forEach(sel => {
        if (!sel) return;
        const firstOption = sel.querySelector('option');
        sel.innerHTML = '';
        sel.appendChild(firstOption || Object.assign(document.createElement('option'), { value: '', textContent: 'Choose a template...' }));
        
        // Show all templates, mark approved ones
        messageTemplates.forEach(tpl => {
            const opt = document.createElement('option');
            opt.value = tpl.id;
            const statusIcon = tpl.meta_status === 'APPROVED' ? '✅' : tpl.meta_status === 'PENDING' ? '⏳' : tpl.meta_status === 'REJECTED' ? '❌' : '💾';
            opt.textContent = `${statusIcon} ${tpl.name} (${tpl.category})`;
            sel.appendChild(opt);
        });
    });
}

async function deleteMessageTemplate(templateId) {
    if (!confirm('Delete this template? This will also remove it from Meta if submitted.')) return;
    try {
        const res = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast('Template deleted');
            loadMessageTemplates();
        } else {
            showToast(data.detail || 'Failed to delete template', true);
        }
    } catch (e) {
        showToast('Error deleting template', true);
    }
}

// ── Sync with Meta ───────────────────────────────────────────
const syncBtn = document.getElementById('sync-templates-btn');
if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        try {
            const res = await fetch('/api/templates/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(`Synced with Meta — ${data.synced} updated, ${data.meta_count} templates found`);
                loadMessageTemplates();
            } else {
                showToast(data.detail || 'Sync failed', true);
            }
        } catch (e) {
            showToast('Error syncing with Meta', true);
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync with Meta';
        }
    });
}

// ── Template Builder Modal ───────────────────────────────────
const createTemplateBtn = document.getElementById('create-template-btn');
const templateBuilderModal = document.getElementById('template-builder-modal');
const closeTemplateBuilderBtn = document.getElementById('close-template-builder');
const cancelTemplateBuilderBtn = document.getElementById('tpl-builder-cancel');

function openTemplateBuilder() {
    if (!templateBuilderModal) return;
    // Reset form
    const fields = ['tpl-builder-name', 'tpl-builder-body', 'tpl-builder-footer', 'tpl-builder-header-value'];
    fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const catSel = document.getElementById('tpl-builder-category');
    if (catSel) catSel.value = 'MARKETING';
    const langSel = document.getElementById('tpl-builder-language');
    if (langSel) langSel.value = 'en';
    const headerType = document.getElementById('tpl-builder-header-type');
    if (headerType) { headerType.value = ''; headerTypeChanged(); }
    const buttonsContainer = document.getElementById('tpl-buttons-container');
    if (buttonsContainer) buttonsContainer.innerHTML = '';
    updateBuilderBodyCharCount();
    
    templateBuilderModal.classList.remove('hidden');
}

function closeTemplateBuilder() {
    if (templateBuilderModal) templateBuilderModal.classList.add('hidden');
}

if (createTemplateBtn) createTemplateBtn.addEventListener('click', openTemplateBuilder);
if (closeTemplateBuilderBtn) closeTemplateBuilderBtn.addEventListener('click', closeTemplateBuilder);
if (cancelTemplateBuilderBtn) cancelTemplateBuilderBtn.addEventListener('click', closeTemplateBuilder);

// Header type change
function headerTypeChanged() {
    const headerType = document.getElementById('tpl-builder-header-type');
    const headerContent = document.getElementById('tpl-builder-header-content');
    const headerInput = document.getElementById('tpl-builder-header-value');
    if (!headerType || !headerContent) return;
    
    if (headerType.value) {
        headerContent.classList.remove('hidden');
        if (headerInput) {
            headerInput.placeholder = headerType.value === 'text' ? 'Header text...' : `Public ${headerType.value} URL (https://...)`;
        }
    } else {
        headerContent.classList.add('hidden');
    }
}

const headerTypeSelect = document.getElementById('tpl-builder-header-type');
if (headerTypeSelect) headerTypeSelect.addEventListener('change', headerTypeChanged);

// Body char count
function updateBuilderBodyCharCount() {
    const body = document.getElementById('tpl-builder-body');
    const counter = document.getElementById('tpl-body-char-count');
    if (body && counter) {
        counter.textContent = `${body.value.length} / 1024`;
    }
}

const tplBodyEl = document.getElementById('tpl-builder-body');
if (tplBodyEl) tplBodyEl.addEventListener('input', updateBuilderBodyCharCount);

// Add Variable
const addVariableBtn = document.getElementById('tpl-add-variable');
if (addVariableBtn) {
    addVariableBtn.addEventListener('click', () => {
        const body = document.getElementById('tpl-builder-body');
        if (!body) return;
        // Find next variable number
        const matches = body.value.match(/\{\{(\d+)\}\}/g) || [];
        const nums = matches.map(m => parseInt(m.replace(/[{}]/g, '')));
        const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        // Insert at cursor
        const start = body.selectionStart;
        const end = body.selectionEnd;
        const text = body.value;
        body.value = text.substring(0, start) + `{{${next}}}` + text.substring(end);
        body.focus();
        body.selectionStart = body.selectionEnd = start + `{{${next}}}`.length;
        updateBuilderBodyCharCount();
    });
}

// Add Button
const addButtonBtn = document.getElementById('tpl-add-button');
if (addButtonBtn) {
    addButtonBtn.addEventListener('click', () => {
        const container = document.getElementById('tpl-buttons-container');
        if (!container) return;
        const existing = container.querySelectorAll('.tpl-button-row').length;
        if (existing >= 3) { showToast('Max 3 buttons allowed', true); return; }
        
        const row = document.createElement('div');
        row.className = 'tpl-button-row';
        row.innerHTML = `
            <select class="btn-type-select">
                <option value="url">URL</option>
                <option value="phone">Phone</option>
                <option value="quick_reply">Quick Reply</option>
            </select>
            <input type="text" class="btn-text-input" placeholder="Button text" maxlength="25">
            <input type="text" class="btn-value-input" placeholder="URL or phone number">
            <button type="button" class="remove-btn" title="Remove"><i class="fa-solid fa-xmark"></i></button>
        `;
        
        row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
        
        // Hide value input for quick_reply
        const typeSelect = row.querySelector('.btn-type-select');
        const valueInput = row.querySelector('.btn-value-input');
        typeSelect.addEventListener('change', () => {
            valueInput.style.display = typeSelect.value === 'quick_reply' ? 'none' : '';
            valueInput.placeholder = typeSelect.value === 'phone' ? 'Phone (e.g. +919876543210)' : 'URL (https://...)';
        });
        
        container.appendChild(row);
    });
}

// Save Template (local or submit to Meta)
function collectTemplateBuilderData() {
    const name = (document.getElementById('tpl-builder-name')?.value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const category = document.getElementById('tpl-builder-category')?.value || 'MARKETING';
    const language = document.getElementById('tpl-builder-language')?.value || 'en';
    const body = document.getElementById('tpl-builder-body')?.value || '';
    const footer = document.getElementById('tpl-builder-footer')?.value || '';
    
    // Header
    let header = null;
    const headerType = document.getElementById('tpl-builder-header-type')?.value;
    if (headerType) {
        header = { type: headerType, content: document.getElementById('tpl-builder-header-value')?.value || '' };
    }
    
    // Buttons
    const buttons = [];
    document.querySelectorAll('#tpl-buttons-container .tpl-button-row').forEach(row => {
        const type = row.querySelector('.btn-type-select')?.value || 'url';
        const text = row.querySelector('.btn-text-input')?.value || '';
        const value = row.querySelector('.btn-value-input')?.value || '';
        if (text) buttons.push({ type, text, value });
    });
    
    return { name, category, language, header, body, footer, buttons };
}

async function saveTemplate(submitToMeta) {
    const data = collectTemplateBuilderData();
    
    if (!data.name) { showToast('Template name is required', true); return; }
    if (!data.body) { showToast('Template body text is required', true); return; }
    
    const btnId = submitToMeta ? 'tpl-builder-submit-meta' : 'tpl-builder-save-local';
    const btn = document.getElementById(btnId);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; }
    
    try {
        const res = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, submit_to_meta: submitToMeta })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            if (submitToMeta && result.meta_error) {
                // Template saved locally, but Meta submission failed — show the error
                showToast(`Template saved locally but Meta submission failed: ${result.meta_error}`, true);
            } else if (submitToMeta && result.meta_submitted) {
                showToast('Template submitted to Meta for review!');
            } else {
                showToast('Template saved locally');
            }
            closeTemplateBuilder();
            loadMessageTemplates();
        } else {
            showToast(result.detail || 'Failed to save template', true);
        }
    } catch (e) {
        showToast('Error saving template', true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = submitToMeta
                ? '<i class="fa-brands fa-meta"></i> Save & Submit to Meta'
                : '<i class="fa-solid fa-save"></i> Save Locally';
        }
    }
}

const saveLocalBtn = document.getElementById('tpl-builder-save-local');
const submitMetaBtn = document.getElementById('tpl-builder-submit-meta');
if (saveLocalBtn) saveLocalBtn.addEventListener('click', () => saveTemplate(false));
if (submitMetaBtn) submitMetaBtn.addEventListener('click', () => saveTemplate(true));

// ── Contact Picker (for Send tab) ────────────────────────────
async function loadOutboundContacts() {
    const select = document.getElementById('outbound-contact-select');
    if (!select) return;
    select.innerHTML = '<option value="">Pick Contact...</option>';
    
    try {
        // Load leads
        const leadsRes = await fetch('/api/leads');
        const leadsArr = await leadsRes.json();
        if (leadsArr.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Leads';
            leadsArr.forEach(l => {
                const phone = l.phone || l.phone_number || '';
                if (phone) {
                    const opt = document.createElement('option');
                    opt.value = phone;
                    opt.textContent = `${l.name || 'Unknown'} (+${phone})`;
                    optgroup.appendChild(opt);
                }
            });
            select.appendChild(optgroup);
        }
        
        // Load visitors
        const visitorsRes = await fetch('/api/visitors');
        const visitorsArr = await visitorsRes.json();
        if (visitorsArr.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Visitors';
            visitorsArr.forEach(v => {
                const phone = v.phone || '';
                if (phone) {
                    const opt = document.createElement('option');
                    opt.value = phone;
                    opt.textContent = `Visitor (+${phone})`;
                    optgroup.appendChild(opt);
                }
            });
            select.appendChild(optgroup);
        }
    } catch (e) {
        console.error('Error loading outbound contacts:', e);
    }
}

// Contact select → fill phone input & auto-populate variable 1 (Name)
const contactSelect = document.getElementById('outbound-contact-select');
if (contactSelect) {
    contactSelect.addEventListener('change', () => {
        const phoneInput = document.getElementById('outbound-phone-input');
        if (phoneInput && contactSelect.value) {
            phoneInput.value = contactSelect.value;
            updateSendPreviewRecipient();

            // Auto-fill {{1}} variable with contact name if available
            const selectedOpt = contactSelect.options[contactSelect.selectedIndex];
            if (selectedOpt && selectedOpt.textContent) {
                const nameMatch = selectedOpt.textContent.match(/^(.*?)\s*\(\+/);
                if (nameMatch && nameMatch[1] && !nameMatch[1].startsWith('Visitor') && nameMatch[1] !== 'Unknown') {
                    const var1Input = document.querySelector('#template-variables-list input[data-var="1"]');
                    if (var1Input) {
                        var1Input.value = nameMatch[1].trim();
                        updateSendPreview();
                    }
                }
            }
        }
    });
}

// Phone input → update preview
const phoneInput = document.getElementById('outbound-phone-input');
if (phoneInput) {
    phoneInput.addEventListener('input', updateSendPreviewRecipient);
}

function updateSendPreviewRecipient() {
    const phone = document.getElementById('outbound-phone-input')?.value || '';
    const el = document.getElementById('preview-recipient-phone');
    if (el) el.textContent = phone ? `+${phone.replace(/^\+/, '')}` : 'Select Recipient...';
}

// ── Send Mode Toggle ─────────────────────────────────────────
const modeTemplateBtnEl = document.getElementById('mode-template-btn');
const modeFreeformBtnEl = document.getElementById('mode-freeform-btn');
const templateSection = document.getElementById('template-send-section');
const freeformSection = document.getElementById('freeform-send-section');

function setSendMode(mode) {
    outboundSendMode = mode;
    if (mode === 'template') {
        modeTemplateBtnEl?.classList.add('active');
        modeFreeformBtnEl?.classList.remove('active');
        templateSection?.classList.remove('hidden');
        freeformSection?.classList.add('hidden');
    } else {
        modeFreeformBtnEl?.classList.add('active');
        modeTemplateBtnEl?.classList.remove('active');
        freeformSection?.classList.remove('hidden');
        templateSection?.classList.add('hidden');
    }
    updateSendPreview();
}

if (modeTemplateBtnEl) modeTemplateBtnEl.addEventListener('click', () => setSendMode('template'));
if (modeFreeformBtnEl) modeFreeformBtnEl.addEventListener('click', () => setSendMode('freeform'));

// ── Template Selector (Single Send) ──────────────────────────
const outboundTemplateSelect = document.getElementById('outbound-template-select');
if (outboundTemplateSelect) {
    outboundTemplateSelect.addEventListener('change', () => {
        const tplId = outboundTemplateSelect.value;
        const varSection = document.getElementById('template-variables-section');
        const varList = document.getElementById('template-variables-list');
        
        if (!tplId) {
            varSection?.classList.add('hidden');
            if (varList) varList.innerHTML = '';
            updateSendPreview();
            return;
        }
        
        const tpl = messageTemplates.find(t => t.id === tplId);
        if (!tpl) return;
        
        // Extract variables
        const vars = (tpl.body || '').match(/\{\{(\d+)\}\}/g) || [];
        const uniqueVars = [...new Set(vars.map(v => v.replace(/[{}]/g, '')))].sort((a, b) => parseInt(a) - parseInt(b));
        
        if (uniqueVars.length > 0) {
            varSection?.classList.remove('hidden');
            varList.innerHTML = '';
            uniqueVars.forEach(v => {
                const row = document.createElement('div');
                row.className = 'variable-input-row';
                row.innerHTML = `
                    <span class="variable-label">{{${v}}}</span>
                    <input type="text" class="outbound-input tpl-var-input" data-var="${v}" placeholder="Value for variable ${v}..." style="flex:1;">
                `;
                row.querySelector('input').addEventListener('input', updateSendPreview);
                varList.appendChild(row);
            });
        } else {
            varSection?.classList.add('hidden');
            if (varList) varList.innerHTML = '';
        }
        
        updateSendPreview();
    });
}

// ── Live Preview (Single Send) ───────────────────────────────
function updateSendPreview() {
    const previewText = document.getElementById('outbound-preview-text');
    const previewHeader = document.getElementById('outbound-preview-header');
    const previewFooter = document.getElementById('outbound-preview-footer');
    const previewButtons = document.getElementById('outbound-preview-buttons');
    const previewMediaBox = document.getElementById('outbound-preview-media-box');
    const previewTime = document.getElementById('outbound-preview-time');
    
    if (previewTime) previewTime.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (outboundSendMode === 'template') {
        // Template mode preview
        const tplId = document.getElementById('outbound-template-select')?.value;
        const tpl = tplId ? messageTemplates.find(t => t.id === tplId) : null;
        
        if (previewMediaBox) previewMediaBox.style.display = 'none';
        
        if (!tpl) {
            if (previewText) previewText.innerHTML = '<span style="color:#8696a0;font-style:italic;">Select a template to see live preview...</span>';
            if (previewHeader) previewHeader.style.display = 'none';
            if (previewFooter) previewFooter.style.display = 'none';
            if (previewButtons) previewButtons.style.display = 'none';
            return;
        }
        
        // Fill variables
        let bodyText = tpl.body || '';
        document.querySelectorAll('#template-variables-list .tpl-var-input').forEach(input => {
            const varNum = input.dataset.var;
            const val = input.value || `{{${varNum}}}`;
            bodyText = bodyText.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), val);
        });
        
        // Render body
        if (previewText) previewText.textContent = bodyText;
        
        // Header
        renderPreviewHeader(previewHeader, tpl.header);
        
        // Footer
        if (previewFooter) {
            if (tpl.footer) {
                previewFooter.style.display = 'block';
                previewFooter.textContent = tpl.footer;
            } else {
                previewFooter.style.display = 'none';
            }
        }
        
        // Buttons
        renderPreviewButtons(previewButtons, tpl.buttons);
        
    } else {
        // Freeform mode preview
        const text = document.getElementById('outbound-text-input')?.value || '';
        if (previewText) {
            previewText.textContent = text || '';
            if (!text) previewText.innerHTML = '<span style="color:#8696a0;font-style:italic;">Type a message to preview...</span>';
        }
        if (previewHeader) previewHeader.style.display = 'none';
        if (previewFooter) previewFooter.style.display = 'none';
        if (previewButtons) previewButtons.style.display = 'none';
        
        // File preview
        if (previewMediaBox && selectedOutboundFile) {
            previewMediaBox.style.display = 'flex';
            const ext = selectedOutboundFile.name.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
            document.getElementById('outbound-preview-media-icon').className = isImage ? 'fa-solid fa-image' : 'fa-solid fa-file-pdf';
            document.getElementById('outbound-preview-media-icon').style.color = isImage ? '#34a853' : '#ea4335';
            document.getElementById('outbound-preview-media-name').textContent = selectedOutboundFile.name;
            document.getElementById('outbound-preview-media-type').textContent = isImage ? 'Image' : 'Document';
        } else if (previewMediaBox) {
            previewMediaBox.style.display = 'none';
        }
    }
}

function renderPreviewHeader(container, header) {
    if (!container) return;
    if (!header || !header.type) { container.style.display = 'none'; return; }
    
    container.style.display = 'block';
    if (header.type === 'text') {
        container.style.cssText = 'padding: 0.6rem 0.75rem 0; font-size: 0.92rem; font-weight: 700; color: #111b21;';
        container.textContent = header.content || '';
    } else if (header.type === 'image') {
        container.style.cssText = 'padding: 0; overflow: hidden; border-radius: 8px 8px 0 0;';
        container.innerHTML = header.content
            ? `<img src="${escapeHtml(header.content)}" style="width:100%;max-height:180px;object-fit:cover;display:block;" onerror="this.style.display='none'">`
            : `<div style="width:100%;height:120px;background:#e4e6eb;display:flex;align-items:center;justify-content:center;color:#8696a0;"><i class="fa-solid fa-image" style="font-size:2rem;"></i></div>`;
    } else if (header.type === 'document') {
        container.style.cssText = 'padding: 0.5rem 0.75rem; background: #f0f2f5;';
        container.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-file-pdf" style="font-size:1.4rem;color:#ea4335;"></i><span style="font-size:0.82rem;color:#111b21;font-weight:500;">Document</span></div>`;
    } else if (header.type === 'video') {
        container.style.cssText = 'padding: 0; overflow: hidden; border-radius: 8px 8px 0 0;';
        container.innerHTML = `<div style="width:100%;height:120px;background:#e4e6eb;display:flex;align-items:center;justify-content:center;color:#8696a0;"><i class="fa-solid fa-video" style="font-size:2rem;"></i></div>`;
    }
}

function renderPreviewButtons(container, buttons) {
    if (!container) return;
    if (!buttons || buttons.length === 0) { container.style.display = 'none'; return; }
    
    container.style.display = 'block';
    container.innerHTML = '';
    buttons.forEach(btn => {
        const icon = btn.type === 'url' ? 'fa-arrow-up-right-from-square' : btn.type === 'phone' ? 'fa-phone' : 'fa-reply';
        const el = document.createElement('div');
        el.className = 'wa-preview-button';
        el.innerHTML = `<i class="fa-solid ${icon}"></i> ${escapeHtml(btn.text || 'Button')}`;
        container.appendChild(el);
    });
}

// ── Freeform mode inputs ─────────────────────────────────────
const outboundTextInput = document.getElementById('outbound-text-input');
if (outboundTextInput) {
    outboundTextInput.addEventListener('input', () => {
        updateOutboundCharCount();
        updateSendPreview();
    });
}

function updateOutboundCharCount() {
    const text = document.getElementById('outbound-text-input')?.value || '';
    const counter = document.getElementById('outbound-char-count');
    if (counter) counter.textContent = `${text.length} / 4096`;
}

// File attachment (freeform)
const outboundFileInput = document.getElementById('outbound-file-input');
const outboundDropzone = document.getElementById('outbound-dropzone');
const outboundFilePreview = document.getElementById('outbound-file-preview');
const outboundRemoveFile = document.getElementById('outbound-remove-file-btn');

if (outboundDropzone) {
    outboundDropzone.addEventListener('click', () => outboundFileInput?.click());
    outboundDropzone.addEventListener('dragover', e => { e.preventDefault(); outboundDropzone.style.borderColor = 'var(--accent-cyan)'; });
    outboundDropzone.addEventListener('dragleave', () => { outboundDropzone.style.borderColor = ''; });
    outboundDropzone.addEventListener('drop', e => {
        e.preventDefault();
        outboundDropzone.style.borderColor = '';
        if (e.dataTransfer.files.length > 0) handleOutboundFile(e.dataTransfer.files[0]);
    });
}

if (outboundFileInput) {
    outboundFileInput.addEventListener('change', () => {
        if (outboundFileInput.files.length > 0) handleOutboundFile(outboundFileInput.files[0]);
    });
}

function handleOutboundFile(file) {
    selectedOutboundFile = file;
    const nameEl = document.getElementById('outbound-file-name-txt');
    if (nameEl) nameEl.textContent = file.name;
    outboundFilePreview?.classList.remove('hidden');
    if (outboundFilePreview) outboundFilePreview.style.display = 'flex';
    outboundDropzone.style.display = 'none';
    updateSendPreview();
}

if (outboundRemoveFile) {
    outboundRemoveFile.addEventListener('click', () => {
        selectedOutboundFile = null;
        if (outboundFileInput) outboundFileInput.value = '';
        outboundFilePreview?.classList.add('hidden');
        if (outboundFilePreview) outboundFilePreview.style.display = 'none';
        if (outboundDropzone) outboundDropzone.style.display = '';
        updateSendPreview();
    });
}

// ── Send Message Button ──────────────────────────────────────
const outboundSendBtn = document.getElementById('outbound-send-btn');
if (outboundSendBtn) {
    outboundSendBtn.addEventListener('click', async () => {
        const phone = (document.getElementById('outbound-phone-input')?.value || '').trim().replace(/[^0-9]/g, '');
        if (!phone) { showToast('Enter a recipient phone number', true); return; }
        
        outboundSendBtn.disabled = true;
        outboundSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        
        try {
            if (outboundSendMode === 'template') {
                // Template send
                const tplId = document.getElementById('outbound-template-select')?.value;
                if (!tplId) { showToast('Select a template first', true); return; }
                
                // Collect variables
                const variables = {};
                document.querySelectorAll('#template-variables-list .tpl-var-input').forEach(input => {
                    variables[input.dataset.var] = input.value;
                });
                
                const res = await fetch(`/api/templates/${tplId}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, variables })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showToast(data.message || 'Template sent successfully!');
                    loadOutboundHistory();
                } else {
                    showToast(data.detail || 'Failed to send template', true);
                }
            } else {
                // Freeform send
                const messageText = document.getElementById('outbound-text-input')?.value || '';
                if (!messageText && !selectedOutboundFile) { showToast('Enter a message or attach a file', true); return; }
                
                if (selectedOutboundFile) {
                    // Send with file
                    const formData = new FormData();
                    formData.append('phone', phone);
                    formData.append('message', messageText);
                    formData.append('file', selectedOutboundFile);
                    
                    const res = await fetch('/api/messages/send-media', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        showToast('Message with file sent successfully!');
                        // Reset file
                        selectedOutboundFile = null;
                        if (outboundFileInput) outboundFileInput.value = '';
                        outboundFilePreview?.classList.add('hidden');
                        if (outboundFilePreview) outboundFilePreview.style.display = 'none';
                        if (outboundDropzone) outboundDropzone.style.display = '';
                    } else {
                        showToast(data.detail || 'Failed to send message', true);
                    }
                } else {
                    // Send text only
                    const res = await fetch('/api/leads/send-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone, message: messageText })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        showToast('Message sent via WhatsApp!');
                    } else {
                        showToast(data.detail || 'Failed to send message', true);
                    }
                }
                
                // Clear freeform input
                const textInput = document.getElementById('outbound-text-input');
                if (textInput) textInput.value = '';
                updateOutboundCharCount();
            }
            
            updateSendPreview();
            loadOutboundHistory();
        } catch (e) {
            showToast('Error sending message: ' + e.message, true);
        } finally {
            outboundSendBtn.disabled = false;
            outboundSendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
        }
    });
}

// ── Outbound History ─────────────────────────────────────────
async function loadOutboundHistory() {
    const tbody = document.getElementById('outbound-history-tbody');
    if (!tbody) return;
    
    try {
        const res = await fetch('/api/outbound-messages');
        const data = await res.json();
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding:2rem;">No outbound messages logged yet.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        const recent = data.slice(0, 20);
        recent.forEach(msg => {
            const phone = msg.phone || msg.phone_number || '-';
            const body = (msg.body || '').substring(0, 100) + ((msg.body || '').length > 100 ? '...' : '');
            const time = formatDateTime(msg.timestamp || msg.created_at);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-family:monospace;font-size:0.8rem;color:var(--accent-cyan);">+${escapeHtml(phone)}</td>
                <td style="font-size:0.8rem;color:var(--text-secondary);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(msg.body || '')}">${escapeHtml(body)}</td>
                <td style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;">${time}</td>
            `;
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', () => {
                document.getElementById('outbound-message-phone').textContent = '+' + phone;
                document.getElementById('outbound-message-time').textContent = time;
                document.getElementById('outbound-message-body').textContent = msg.body || '';
                document.getElementById('outbound-message-modal').classList.remove('hidden');
            });
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error loading outbound history:', e);
    }
}

// ══════════════════════════════════════════════════════════════
// MASS BROADCAST
// ══════════════════════════════════════════════════════════════

// ── Template Selector (Broadcast) ────────────────────────────
const broadcastTemplateSelect = document.getElementById('broadcast-template-select');
if (broadcastTemplateSelect) {
    broadcastTemplateSelect.addEventListener('change', () => {
        const tplId = broadcastTemplateSelect.value;
        const varSection = document.getElementById('broadcast-variables-section');
        const varList = document.getElementById('broadcast-variables-list');
        
        if (!tplId) {
            varSection?.classList.add('hidden');
            if (varList) varList.innerHTML = '';
            updateBroadcastPreview();
            updateBroadcastSendBtn();
            return;
        }
        
        const tpl = messageTemplates.find(t => t.id === tplId);
        if (!tpl) return;
        
        const vars = (tpl.body || '').match(/\{\{(\d+)\}\}/g) || [];
        const uniqueVars = [...new Set(vars.map(v => v.replace(/[{}]/g, '')))].sort((a, b) => parseInt(a) - parseInt(b));
        
        if (uniqueVars.length > 0) {
            varSection?.classList.remove('hidden');
            varList.innerHTML = '';
            uniqueVars.forEach(v => {
                const row = document.createElement('div');
                row.className = 'variable-input-row';
                row.innerHTML = `
                    <span class="variable-label">{{${v}}}</span>
                    <input type="text" class="outbound-input bc-var-input" data-var="${v}" placeholder="Value for {{${v}}}..." style="flex:1;">
                `;
                row.querySelector('input').addEventListener('input', updateBroadcastPreview);
                varList.appendChild(row);
            });
        } else {
            varSection?.classList.add('hidden');
            if (varList) varList.innerHTML = '';
        }
        
        updateBroadcastPreview();
        updateBroadcastSendBtn();
    });
}

// ── Broadcast Preview ────────────────────────────────────────
function updateBroadcastPreview() {
    const previewText = document.getElementById('broadcast-preview-text');
    const previewHeader = document.getElementById('broadcast-preview-header');
    const previewFooter = document.getElementById('broadcast-preview-footer');
    const previewButtons = document.getElementById('broadcast-preview-buttons');
    const previewTime = document.getElementById('broadcast-preview-time');
    
    if (previewTime) previewTime.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const tplId = document.getElementById('broadcast-template-select')?.value;
    const tpl = tplId ? messageTemplates.find(t => t.id === tplId) : null;
    
    if (!tpl) {
        if (previewText) previewText.innerHTML = '<span style="color:#8696a0;font-style:italic;">Select a template to preview...</span>';
        if (previewHeader) previewHeader.style.display = 'none';
        if (previewFooter) previewFooter.style.display = 'none';
        if (previewButtons) previewButtons.style.display = 'none';
        return;
    }
    
    let bodyText = tpl.body || '';
    document.querySelectorAll('#broadcast-variables-list .bc-var-input').forEach(input => {
        const varNum = input.dataset.var;
        const val = input.value || `{{${varNum}}}`;
        bodyText = bodyText.replace(new RegExp(`\\{\\{${varNum}\\}\\}`, 'g'), val);
    });
    
    if (previewText) previewText.textContent = bodyText;
    renderPreviewHeader(previewHeader, tpl.header);
    
    if (previewFooter) {
        if (tpl.footer) { previewFooter.style.display = 'block'; previewFooter.textContent = tpl.footer; }
        else { previewFooter.style.display = 'none'; }
    }
    renderPreviewButtons(previewButtons, tpl.buttons);
}

// ── Recipient Selection ──────────────────────────────────────
function addBroadcastRecipients(phones) {
    phones.forEach(p => {
        const clean = p.replace(/[^0-9]/g, '').trim();
        if (clean && clean.length >= 10 && !broadcastRecipients.includes(clean)) {
            broadcastRecipients.push(clean);
        }
    });
    renderBroadcastChips();
    updateBroadcastSendBtn();
}

function removeBroadcastRecipient(phone) {
    broadcastRecipients = broadcastRecipients.filter(p => p !== phone);
    renderBroadcastChips();
    updateBroadcastSendBtn();
}

function renderBroadcastChips() {
    const container = document.getElementById('broadcast-recipients-chips');
    const summary = document.getElementById('broadcast-recipients-summary');
    const countEl = document.getElementById('broadcast-recipients-count');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Show max 20 chips, rest as summary
    const showCount = Math.min(broadcastRecipients.length, 20);
    for (let i = 0; i < showCount; i++) {
        const chip = document.createElement('span');
        chip.className = 'broadcast-chip';
        chip.innerHTML = `+${broadcastRecipients[i]} <i class="fa-solid fa-xmark chip-remove" onclick="removeBroadcastRecipient('${broadcastRecipients[i]}')"></i>`;
        container.appendChild(chip);
    }
    
    if (summary) {
        if (broadcastRecipients.length > 0) {
            summary.classList.remove('hidden');
            summary.style.display = 'flex';
            if (countEl) countEl.textContent = broadcastRecipients.length;
        } else {
            summary.classList.add('hidden');
            summary.style.display = 'none';
        }
    }
}

function updateBroadcastSendBtn() {
    const btn = document.getElementById('broadcast-send-btn');
    if (!btn) return;
    const hasTpl = !!document.getElementById('broadcast-template-select')?.value;
    const hasRecipients = broadcastRecipients.length > 0;
    btn.disabled = !(hasTpl && hasRecipients);
}

// Select All Leads
const selectLeadsBtn = document.getElementById('broadcast-select-leads');
if (selectLeadsBtn) {
    selectLeadsBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/leads');
            const leads = await res.json();
            const phones = leads.map(l => l.phone || l.phone_number || '').filter(Boolean);
            addBroadcastRecipients(phones);
            showToast(`Added ${phones.length} lead phone numbers`);
        } catch (e) {
            showToast('Error loading leads', true);
        }
    });
}

// Select All Visitors
const selectVisitorsBtn = document.getElementById('broadcast-select-visitors');
if (selectVisitorsBtn) {
    selectVisitorsBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/visitors');
            const visitors = await res.json();
            const phones = visitors.map(v => v.phone || '').filter(Boolean);
            addBroadcastRecipients(phones);
            showToast(`Added ${phones.length} visitor phone numbers`);
        } catch (e) {
            showToast('Error loading visitors', true);
        }
    });
}

// Manual phone input toggle
const manualAddBtn = document.getElementById('broadcast-manual-add');
const manualInputArea = document.getElementById('broadcast-manual-input-area');
if (manualAddBtn && manualInputArea) {
    manualAddBtn.addEventListener('click', () => {
        manualInputArea.classList.toggle('hidden');
    });
}

// Add manual phones
const addManualPhonesBtn = document.getElementById('broadcast-add-manual-phones');
if (addManualPhonesBtn) {
    addManualPhonesBtn.addEventListener('click', () => {
        const textarea = document.getElementById('broadcast-manual-phones');
        if (!textarea) return;
        const text = textarea.value.trim();
        if (!text) return;
        const phones = text.split(/[\s,;\n]+/).filter(Boolean);
        addBroadcastRecipients(phones);
        textarea.value = '';
        showToast(`Added ${phones.length} phone number(s)`);
    });
}

// Excel / CSV Upload
const csvUploadBtn = document.getElementById('broadcast-csv-upload');
const csvInput = document.getElementById('broadcast-csv-input');
if (csvUploadBtn && csvInput) {
    csvUploadBtn.addEventListener('click', () => csvInput.click());
    csvInput.addEventListener('change', () => {
        const file = csvInput.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        if (isExcel) {
            if (typeof XLSX === 'undefined') {
                showToast('Excel parser component is loading. Please try again in a moment.', true);
                csvInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    const phones = [];
                    rows.forEach(row => {
                        if (Array.isArray(row)) {
                            row.forEach(cell => {
                                if (cell !== null && cell !== undefined) {
                                    const cleaned = String(cell).replace(/[^0-9]/g, '').trim();
                                    if (cleaned.length >= 10 && cleaned.length <= 15) {
                                        phones.push(cleaned);
                                    }
                                }
                            });
                        }
                    });

                    if (phones.length > 0) {
                        addBroadcastRecipients(phones);
                        showToast(`Imported ${phones.length} valid phone numbers from "${file.name}"`);
                    } else {
                        showToast('No valid phone numbers found in the uploaded Excel file.', true);
                    }
                } catch (err) {
                    console.error('Excel parse error:', err);
                    showToast('Failed to parse Excel file. Ensure it is a valid .xlsx or .xls file.', true);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            // Text / CSV Parsing
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const phones = [];
                    text.split(/\r?\n/).forEach(line => {
                        const parts = line.split(/[,;\t]/);
                        parts.forEach(part => {
                            const cleaned = part.replace(/[^0-9]/g, '').trim();
                            if (cleaned.length >= 10 && cleaned.length <= 15) {
                                phones.push(cleaned);
                            }
                        });
                    });

                    if (phones.length > 0) {
                        addBroadcastRecipients(phones);
                        showToast(`Imported ${phones.length} phone numbers from CSV`);
                    } else {
                        showToast('No valid phone numbers found in CSV file.', true);
                    }
                } catch (err) {
                    console.error('CSV parse error:', err);
                    showToast('Failed to parse CSV file.', true);
                }
            };
            reader.readAsText(file);
        }
        csvInput.value = '';
    });
}

// Clear all recipients
const clearAllRecipientsBtn = document.getElementById('broadcast-clear-all');
if (clearAllRecipientsBtn) {
    clearAllRecipientsBtn.addEventListener('click', () => {
        broadcastRecipients = [];
        renderBroadcastChips();
        updateBroadcastSendBtn();
    });
}

// ── Send Broadcast ───────────────────────────────────────────
const broadcastSendBtn = document.getElementById('broadcast-send-btn');
if (broadcastSendBtn) {
    broadcastSendBtn.addEventListener('click', async () => {
        const tplId = document.getElementById('broadcast-template-select')?.value;
        if (!tplId) { showToast('Select a template', true); return; }
        if (broadcastRecipients.length === 0) { showToast('Add at least one recipient', true); return; }
        
        if (!confirm(`Send broadcast to ${broadcastRecipients.length} recipients?`)) return;
        
        // Collect variables
        const variables = {};
        document.querySelectorAll('#broadcast-variables-list .bc-var-input').forEach(input => {
            variables[input.dataset.var] = input.value;
        });
        
        // Show progress
        const progressEl = document.getElementById('broadcast-progress');
        const progressFill = document.getElementById('broadcast-progress-fill');
        const sentCount = document.getElementById('broadcast-sent-count');
        const failedCount = document.getElementById('broadcast-failed-count');
        const totalCount = document.getElementById('broadcast-total-count');
        
        progressEl?.classList.remove('hidden');
        if (progressFill) progressFill.style.width = '0%';
        if (totalCount) totalCount.textContent = broadcastRecipients.length;
        if (sentCount) sentCount.textContent = '0';
        if (failedCount) failedCount.textContent = '0';
        
        broadcastSendBtn.disabled = true;
        broadcastSendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Broadcasting...';
        
        try {
            const res = await fetch('/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_id: tplId,
                    phones: broadcastRecipients,
                    variables
                })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                const r = data.results;
                if (progressFill) progressFill.style.width = '100%';
                if (sentCount) sentCount.textContent = r.sent;
                if (failedCount) failedCount.textContent = r.failed;
                showToast(`Broadcast complete! ${r.sent} sent, ${r.failed} failed`);
                
                // Clear recipients
                broadcastRecipients = [];
                renderBroadcastChips();
                updateBroadcastSendBtn();
                loadBroadcastHistory();
            } else {
                showToast(data.detail || 'Broadcast failed', true);
            }
        } catch (e) {
            showToast('Error sending broadcast: ' + e.message, true);
        } finally {
            broadcastSendBtn.disabled = false;
            broadcastSendBtn.innerHTML = '<i class="fa-solid fa-bullhorn"></i> Send Broadcast';
        }
    });
}

// ── Broadcast History ────────────────────────────────────────
async function loadBroadcastHistory() {
    const tbody = document.getElementById('broadcast-history-tbody');
    if (!tbody) return;
    
    try {
        const res = await fetch('/api/broadcast/history');
        const data = await res.json();
        const history = data.history || [];
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:1.5rem;">No broadcasts yet.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        history.slice(0, 20).forEach(bc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size:0.82rem;color:#fff;font-weight:500;">${escapeHtml(bc.template_name || '-')}</td>
                <td style="font-size:0.82rem;color:#34d399;font-weight:600;">${bc.sent || 0}</td>
                <td style="font-size:0.82rem;color:${bc.failed > 0 ? '#f87171' : 'var(--text-muted)'};font-weight:${bc.failed > 0 ? '600' : '400'};">${bc.failed || 0}</td>
                <td style="font-size:0.78rem;color:var(--text-muted);white-space:nowrap;">${formatDateTime(bc.created_at)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error loading broadcast history:', e);
    }
}

// ── Initialize on page load ──────────────────────────────────
// Pre-populate preview time
const previewTimeEl = document.getElementById('outbound-preview-time');
if (previewTimeEl) previewTimeEl.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });



// -------------------------------------------------------------
// Theme Toggle & Light/Dark Mode Manager
// -------------------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('kdi_theme') || 'light';
    setTheme(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            setTheme(next);
        });
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kdi_theme', theme);

    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    if (sunIcon && moonIcon) {
        if (theme === 'light') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'inline-block';
        } else {
            sunIcon.style.display = 'inline-block';
            moonIcon.style.display = 'none';
        }
    }

    // Update Chart.js themes if charts exist
    updateChartThemes(theme);
}

function updateChartThemes(theme) {
    const isLight = theme === 'light';
    const textColor = isLight ? '#4b5563' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
    const chartBorderColor = isLight ? '#ffffff' : '#111827';

    if (productChart) {
        if (productChart.options.plugins?.legend?.labels) {
            productChart.options.plugins.legend.labels.color = textColor;
        }
        if (productChart.data.datasets?.[0]) {
            productChart.data.datasets[0].borderColor = chartBorderColor;
        }
        productChart.update();
    }

    if (statusChart) {
        if (statusChart.options.scales?.y) {
            statusChart.options.scales.y.grid.color = gridColor;
            statusChart.options.scales.y.ticks.color = textColor;
        }
        if (statusChart.options.scales?.x) {
            statusChart.options.scales.x.ticks.color = textColor;
        }
        statusChart.update();
    }
}

// Initialize theme on load
initTheme();


