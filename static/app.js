// Drew Command Center JavaScript

class DrewCommandCenter {
    constructor() {
        this.currentPage = 'dashboard';
        this.allChatMessages = []; // Store all messages for filtering
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileMenu();
        this.loadPage('dashboard');
        
        // Auto-refresh dashboard stats every 30 seconds
        setInterval(() => {
            if (this.currentPage === 'dashboard') {
                this.loadDashboardStats();
            }
        }, 30000);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.loadPage(page);
            });
        });

        // Chat form
        const chatForm = document.getElementById('chat-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }

        // Quick task form
        const quickTaskForm = document.getElementById('quick-task-form');
        if (quickTaskForm) {
            quickTaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addQuickTask();
            });
        }

        // Auto-resize chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('input', () => {
                this.autoResizeTextarea(chatInput);
            });
        }

        // Chat search functionality
        const chatSearch = document.getElementById('chat-search');
        if (chatSearch) {
            chatSearch.addEventListener('input', (e) => {
                this.filterChatMessages(e.target.value);
            });
        }
    }

    setupMobileMenu() {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-visible');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('mobile-visible');
                }
            });
        }
    }

    loadPage(page) {
        // Stop chat polling when leaving chat page
        if (this.chatPollInterval && page !== 'chat') {
            clearInterval(this.chatPollInterval);
            this.chatPollInterval = null;
        }
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Hide all page sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.add('d-none');
        });

        // Show selected page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.remove('d-none');
        }

        this.currentPage = page;

        // Load page-specific data
        switch (page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'tasks':
                this.loadTasks();
                break;
            case 'scheduled':
                this.loadScheduledJobs();
                break;
            case 'activity':
                this.loadActivity();
                break;
            case 'chat':
                this.loadChat();
                break;
            case 'stats':
                this.loadStats();
                break;
            case 'models':
                this.loadModels();
                break;
        }

        // Close mobile menu
        document.querySelector('.sidebar').classList.remove('mobile-visible');
    }

    async loadDashboard() {
        try {
            await this.loadDashboardStats();
            await this.loadRecentActivity();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();

            // Update stat cards
            document.getElementById('active-tasks-count').textContent = stats.active_tasks || 0;
            document.getElementById('completed-today-count').textContent = stats.completed_today || 0;
            document.getElementById('scheduled-jobs-count').textContent = stats.scheduled_jobs || 0;
            document.getElementById('messages-today-count').textContent = stats.messages_today || 0;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/activity?limit=10');
            const activities = await response.json();

            const activityFeed = document.getElementById('recent-activity');
            activityFeed.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                    <div class="activity-icon ${this.getActivityIconClass(activity.action)}">
                        ${this.getActivityIcon(activity.action)}
                    </div>
                    <div class="activity-content">
                        <h4>${activity.summary}</h4>
                        <p class="text-muted">${activity.session_type}</p>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            const tasks = await response.json();

            const tasksList = document.getElementById('tasks-list');
            tasksList.innerHTML = tasks.map(task => `
                <div class="task-item" data-task-id="${task.id}">
                    <div class="task-title">${task.title}</div>
                    <div class="task-description text-muted">${task.description || ''}</div>
                    <div class="task-meta">
                        <span class="task-status status-${task.status}">${task.status}</span>
                        <span class="priority-${task.priority}">${task.priority} priority</span>
                        <span class="text-muted">${task.category || 'uncategorized'}</span>
                        <span class="text-muted">${this.formatDate(task.created_at)}</span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('Failed to load tasks');
        }
    }

    async loadScheduledJobs() {
        try {
            const response = await fetch('/api/scheduled');
            const jobs = await response.json();

            const jobsList = document.getElementById('scheduled-list');
            jobsList.innerHTML = jobs.map(job => `
                <div class="card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3>${job.name}</h3>
                            <p class="text-muted">${job.schedule}</p>
                            <p class="text-muted">Type: ${job.job_type}</p>
                        </div>
                        <div class="text-right">
                            <div class="status-indicator status-${job.status}">
                                <div class="status-dot"></div>
                                ${job.status}
                            </div>
                            ${job.next_run ? `<div class="text-muted mt-1">Next: ${this.formatDateTime(job.next_run)}</div>` : ''}
                            ${job.last_run ? `<div class="text-muted">Last: ${this.formatDateTime(job.last_run)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading scheduled jobs:', error);
            this.showError('Failed to load scheduled jobs');
        }
    }

    async loadActivity() {
        try {
            const response = await fetch('/api/activity?limit=50');
            const activities = await response.json();

            const activityList = document.getElementById('activity-list');
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-time">${this.formatDateTime(activity.timestamp)}</div>
                    <div class="activity-icon ${this.getActivityIconClass(activity.action)}">
                        ${this.getActivityIcon(activity.action)}
                    </div>
                    <div class="activity-content">
                        <h4>${activity.action.replace('_', ' ')}</h4>
                        <p>${activity.summary}</p>
                        <p class="text-muted">Session: ${activity.session_type}</p>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading activity:', error);
            this.showError('Failed to load activity log');
        }
    }

    async loadChat() {
        this.lastMessageId = null;
        this.chatPollInterval = null;
        try {
            // Try live feed from Mac server first
            const response = await fetch('/api/chat/live?limit=200');
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                this.allChatMessages = data.messages;
                this.lastMessageId = data.last_id;
                this.renderChatMessages(data.messages);
                this.scrollChatToBottom();
                this.chatSource = 'live';
                
                // Start polling for new messages every 3 seconds
                this.startChatPolling();
            } else {
                // Fallback to stored messages
                const fallback = await fetch('/api/chat/messages');
                const messages = await fallback.json();
                this.allChatMessages = messages;
                this.renderChatMessages(messages);
                this.scrollChatToBottom();
                this.chatSource = 'stored';
            }
            
            const searchInput = document.getElementById('chat-search');
            if (searchInput) searchInput.value = '';
        } catch (error) {
            console.error('Error loading chat:', error);
            // Fallback to stored
            try {
                const fallback = await fetch('/api/chat/messages');
                const messages = await fallback.json();
                this.allChatMessages = messages;
                this.renderChatMessages(messages);
                this.scrollChatToBottom();
                this.chatSource = 'stored';
            } catch (e) {
                this.showError('Failed to load chat');
            }
        }
    }

    startChatPolling() {
        if (this.chatPollInterval) clearInterval(this.chatPollInterval);
        this.chatPollInterval = setInterval(async () => {
            if (this.currentPage !== 'chat') return;
            try {
                const url = this.lastMessageId 
                    ? `/api/chat/live?after=${this.lastMessageId}&limit=50`
                    : '/api/chat/live?limit=200';
                const response = await fetch(url);
                const data = await response.json();
                if (data.messages && data.messages.length > 0) {
                    for (const msg of data.messages) {
                        this.allChatMessages.push(msg);
                        this.addMessageToChat(msg);
                    }
                    this.lastMessageId = data.last_id;
                    this.scrollChatToBottom();
                }
            } catch (e) {
                // Silent fail on poll
            }
        }, 3000);
    }

    renderChatMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = messages.map(message => `
            <div class="message ${message.role}">
                ${message.role === 'assistant' ? `<div class="message-avatar">🦊</div>` : ''}
                <div class="message-content">
                    <div class="message-bubble">${this.formatMessageContent(message.content)}</div>
                    <div class="message-time">${this.formatTime(message.timestamp)} • ${this.formatDate(message.timestamp)}</div>
                </div>
                ${message.role === 'user' ? `<div class="message-avatar">👤</div>` : ''}
            </div>
        `).join('');
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        if (!message) return;

        chatInput.value = '';
        this.autoResizeTextarea(chatInput);

        if (this.chatSource === 'live') {
            // Send to OpenClaw via Mac server
            this.showTypingIndicator();
            try {
                await fetch('/api/chat/live/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                // Response will appear via polling — Drew will reply through OpenClaw
                // Hide typing after 30s max (polling will show the real response)
                setTimeout(() => this.hideTypingIndicator(), 30000);
            } catch (e) {
                this.hideTypingIndicator();
                this.showError('Failed to send message');
            }
        } else {
            // Fallback to stored chat
            this.showTypingIndicator();
            try {
                const response = await fetch('/api/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: message })
                });
                const result = await response.json();
                this.addMessageToChat(result.user_message);
                setTimeout(() => {
                    this.hideTypingIndicator();
                    this.addMessageToChat(result.assistant_message);
                }, 1500);
            } catch (e) {
                this.hideTypingIndicator();
                this.showError('Failed to send message');
            }
        }
    }

    addMessageToChat(message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.innerHTML = `
            ${message.role === 'assistant' ? `<div class="message-avatar">🦊</div>` : ''}
            <div class="message-content">
                <div class="message-bubble">${this.formatMessageContent(message.content)}</div>
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
            ${message.role === 'user' ? `<div class="message-avatar">👤</div>` : ''}
        `;
        
        chatMessages.appendChild(messageDiv);
        // Also add to allChatMessages for search
        this.allChatMessages.push(message);
        this.scrollChatToBottom();
    }

    filterChatMessages(searchTerm) {
        if (!searchTerm.trim()) {
            // Show all messages if search is empty
            this.renderChatMessages(this.allChatMessages);
        } else {
            // Filter messages that contain the search term (case insensitive)
            const filteredMessages = this.allChatMessages.filter(message =>
                message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                message.role.toLowerCase().includes(searchTerm.toLowerCase())
            );
            this.renderChatMessages(filteredMessages);
        }
        this.scrollChatToBottom();
    }

    showTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.style.display = 'flex';
        this.scrollChatToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.style.display = 'none';
    }

    scrollChatToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async addQuickTask() {
        const taskInput = document.getElementById('quick-task-input');
        const title = taskInput.value.trim();

        if (!title) return;

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title })
            });

            if (!response.ok) {
                throw new Error('Failed to create task');
            }

            taskInput.value = '';
            this.showSuccess('Task created successfully');
            
            // Refresh dashboard if we're on it
            if (this.currentPage === 'dashboard') {
                this.loadDashboardStats();
                this.loadRecentActivity();
            }
        } catch (error) {
            console.error('Error creating task:', error);
            this.showError('Failed to create task');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();

            const statsContent = document.getElementById('stats-content');
            const maxCost = stats.max_daily_cost || 1;
            const details = stats.daily_cost_details || [];
            
            statsContent.innerHTML = `
                <!-- 💰 COST TRACKING — TOP -->
                <div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h3 style="margin:0;">💰 Anthropic API Costs</h3>
                        <button onclick="drew.refreshCosts()" class="btn-small" id="refresh-costs-btn">🔄 Refresh from Anthropic</button>
                    </div>
                    <div class="stats-grid" style="margin-bottom: 1.5rem;">
                        <div class="stat-card">
                            <div class="stat-value" style="color:#ff6b6b;">$${stats.total_estimated_cost.toFixed(2)}</div>
                            <div class="stat-label">Total Spend</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">$${stats.avg_daily_cost.toFixed(2)}</div>
                            <div class="stat-label">Daily Average</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${(stats.total_tokens / 1000000).toFixed(1)}M</div>
                            <div class="stat-label">Total Tokens</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.days_since_first_boot || 0}</div>
                            <div class="stat-label">Days Running</div>
                        </div>
                    </div>

                    <!-- Cost by Model -->
                    <div class="stats-breakdown" style="margin-bottom: 1.5rem;">
                        ${(stats.cost_by_model || []).map(model => {
                            const pct = ((parseFloat(model.cost) / stats.total_estimated_cost) * 100).toFixed(1);
                            const name = model.model.replace('claude-', '').replace('-20250514', '');
                            return `
                            <div class="breakdown-item">
                                <span><strong>${name}</strong> <span style="color:#8b8fa3">(${pct}%)</span></span>
                                <span class="breakdown-count" style="color:#6c5ce7;">$${parseFloat(model.cost).toFixed(2)}</span>
                            </div>`;
                        }).join('')}
                    </div>

                    <!-- Daily Cost Chart -->
                    <div style="position: relative; height: 250px; margin-bottom: 1.5rem;">
                        <canvas id="costChart"></canvas>
                    </div>

                    <!-- Daily Cost Table with Projects -->
                    <h4 style="margin-bottom: 0.75rem;">📅 Daily Breakdown</h4>
                    <div style="overflow-x:auto;">
                        <table class="cost-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Cost</th>
                                    <th>Running Total</th>
                                    <th style="width:40px;"></th>
                                    <th>What Was Built</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${details.map(d => {
                                    const date = new Date(d.date);
                                    const dayName = date.toLocaleDateString('en-GB', {weekday:'short'});
                                    const dateStr = date.toLocaleDateString('en-GB', {day:'numeric', month:'short'});
                                    const barWidth = Math.max(2, (d.daily_cost / maxCost) * 100);
                                    const activities = (d.activities || []).filter(a => a);
                                    const actText = activities.length > 0 
                                        ? activities.slice(0, 3).map(a => a.length > 60 ? a.substring(0,57)+'...' : a).join(' · ')
                                        : '<span style="color:#555">No major activity logged</span>';
                                    const costColor = d.daily_cost > 300 ? '#ff6b6b' : d.daily_cost > 150 ? '#ffa94d' : d.daily_cost > 50 ? '#6c5ce7' : '#8b8fa3';
                                    return `
                                    <tr>
                                        <td style="white-space:nowrap;"><strong>${dayName}</strong> ${dateStr}</td>
                                        <td style="color:${costColor}; font-weight:600; white-space:nowrap;">$${d.daily_cost.toFixed(2)}</td>
                                        <td style="color:#8b8fa3; white-space:nowrap;">$${d.running_total.toFixed(2)}</td>
                                        <td><div style="background:${costColor}; height:8px; border-radius:4px; width:${barWidth}%; min-width:3px;"></div></td>
                                        <td style="font-size:0.85em; color:#b0b0b0;">${actText}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Summary Stats -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.total_tasks || 0}</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.total_activity_entries || 0}</div>
                        <div class="stat-label">Activity Entries</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.total_chat_messages || 0}</div>
                        <div class="stat-label">Chat Messages</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.active_tasks || 0}</div>
                        <div class="stat-label">Active Tasks</div>
                    </div>
                </div>

                <!-- Task Status + Categories side by side -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div class="card">
                        <h3>Task Status</h3>
                        <div class="stats-breakdown">
                            ${Object.entries(stats.task_status_breakdown || {}).map(([status, count]) => `
                                <div class="breakdown-item">
                                    <span class="status-indicator status-${status}">
                                        <div class="status-dot"></div>
                                        ${status}
                                    </span>
                                    <span class="breakdown-count">${count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="card">
                        <h3>Top Categories</h3>
                        <div class="stats-breakdown">
                            ${(stats.active_categories || []).map(cat => `
                                <div class="breakdown-item">
                                    <span>${cat.category}</span>
                                    <span class="breakdown-count">${cat.count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Activity Breakdown + Weekly Chart -->
                <div class="card">
                    <h3>Activity Types</h3>
                    <div class="stats-breakdown">
                        ${(stats.activity_breakdown || []).map(item => `
                            <div class="breakdown-item">
                                <span>${item.action.replace('_', ' ')}</span>
                                <span class="breakdown-count">${item.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card">
                    <h3>📊 Tasks Completed (Weekly)</h3>
                    <div style="position: relative; height: 250px; margin-top: 1rem;">
                        <canvas id="weeklyTasksChart"></canvas>
                    </div>
                </div>
            `;

            // Load Chart.js and create charts
            this.loadCharts(stats);

        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError('Failed to load stats');
        }
    }

    loadCharts(stats) {
        // Load Chart.js if not already loaded
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
            script.onload = () => this.createCharts(stats);
            document.head.appendChild(script);
        } else {
            this.createCharts(stats);
        }
    }

    createCharts(stats) {
        // Cost Chart
        const costCtx = document.getElementById('costChart');
        if (costCtx) {
            const costLabels = stats.daily_costs.map(d => new Date(d.date).toLocaleDateString());
            const costData = stats.daily_costs.map(d => parseFloat(d.estimated_cost));

            new Chart(costCtx, {
                type: 'line',
                data: {
                    labels: costLabels,
                    datasets: [{
                        label: 'Daily Cost ($)',
                        data: costData,
                        borderColor: '#6c5ce7',
                        backgroundColor: 'rgba(108, 92, 231, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e0e0e0' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#8b8fa3' },
                            grid: { color: '#1e2040' }
                        },
                        y: {
                            ticks: { 
                                color: '#8b8fa3',
                                callback: function(value) {
                                    return '$' + value.toFixed(2);
                                }
                            },
                            grid: { color: '#1e2040' }
                        }
                    }
                }
            });
        }

        // Weekly Tasks Chart
        const weeklyCtx = document.getElementById('weeklyTasksChart');
        if (weeklyCtx && stats.weekly_completed) {
            const weeklyLabels = stats.weekly_completed.map(w => 
                new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            );
            const weeklyData = stats.weekly_completed.map(w => w.completed);

            new Chart(weeklyCtx, {
                type: 'bar',
                data: {
                    labels: weeklyLabels,
                    datasets: [{
                        label: 'Tasks Completed',
                        data: weeklyData,
                        backgroundColor: '#28c840',
                        borderColor: '#28c840',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e0e0e0' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#8b8fa3' },
                            grid: { color: '#1e2040' }
                        },
                        y: {
                            ticks: { color: '#8b8fa3' },
                            grid: { color: '#1e2040' }
                        }
                    }
                }
            });
        }
    }

    // Utility functions
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (msgDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (msgDate.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    formatMessageContent(content) {
        // Basic markdown support
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    getActivityIcon(action) {
        const icons = {
            'task_created': '📝',
            'task_completed': '✅',
            'task_updated': '📝',
            'heartbeat': '💓',
            'chat': '💬',
            'error': '❌',
            'cron_run': '⏰'
        };
        return icons[action] || '📄';
    }

    getActivityIconClass(action) {
        const classes = {
            'task_created': 'status-active',
            'task_completed': 'status-success',
            'task_updated': 'status-active',
            'heartbeat': 'status-active',
            'chat': 'status-active',
            'error': 'status-error',
            'cron_run': 'status-active'
        };
        return classes[action] || 'status-active';
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            background: type === 'success' ? '#28c840' : '#ff5f57',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    async refreshCosts() {
        const btn = document.getElementById('refresh-costs-btn');
        if (btn) { btn.textContent = '⏳ Refreshing...'; btn.disabled = true; }
        try {
            const resp = await fetch('/api/costs/refresh', { method: 'POST' });
            const data = await resp.json();
            if (data.error) {
                this.showError('Refresh failed: ' + data.error);
            } else {
                this.showSuccess(`Updated! ${data.rows} records, $${data.total_cost} total`);
                this.loadStats(); // Reload the page
            }
        } catch (e) {
            this.showError('Refresh failed: ' + e.message);
        } finally {
            if (btn) { btn.textContent = '🔄 Refresh from Anthropic'; btn.disabled = false; }
        }
    }

    async loadModels() {
        try {
            const [modelsResponse, activeResponse, statsResponse] = await Promise.all([
                fetch('/api/models'),
                fetch('/api/models/active'),
                fetch('/api/stats')
            ]);

            const models = await modelsResponse.json();
            const activeData = await activeResponse.json();
            const stats = await statsResponse.json();

            const activeModel = activeData.active_model;
            
            this.renderCurrentModel(models, activeModel);
            this.renderCostSavings(models, activeModel, stats);
            this.renderModelsGrid(models, activeModel);

        } catch (error) {
            console.error('Error loading models:', error);
            this.showError('Failed to load models data');
        }
    }

    renderCurrentModel(models, activeModelId) {
        const currentModel = models.find(m => m.id === activeModelId);
        if (!currentModel) return;

        const currentModelDisplay = document.getElementById('current-model-display');
        currentModelDisplay.innerHTML = `
            <div class="current-model-display">
                <div class="current-model-info">
                    <div class="current-model-name">
                        ${currentModel.provider_emoji} ${currentModel.name}
                    </div>
                    <div class="current-model-desc">
                        ${currentModel.description}
                    </div>
                    <div class="current-model-pricing">
                        <span>Input: $${currentModel.pricing.input}/M</span>
                        <span>Output: $${currentModel.pricing.output}/M</span>
                        ${currentModel.pricing.cache_read > 0 ? `<span>Cache: $${currentModel.pricing.cache_read}/M</span>` : ''}
                    </div>
                </div>
                <div class="model-ratings">
                    <div class="rating-item">
                        <div class="rating-label">Speed</div>
                        <div class="rating-stars">
                            ${this.renderStars(currentModel.speed)}
                        </div>
                    </div>
                    <div class="rating-item">
                        <div class="rating-label">Quality</div>
                        <div class="rating-stars">
                            ${this.renderStars(currentModel.quality)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCostSavings(models, activeModelId, stats) {
        const activeModel = models.find(m => m.id === activeModelId);
        const sonnetModel = models.find(m => m.id === 'anthropic/claude-sonnet-4-20250514');
        
        if (!activeModel || !sonnetModel || activeModelId === sonnetModel.id) {
            document.getElementById('cost-savings-content').innerHTML = `
                <p class="text-muted">Cost savings analysis will appear when using a different model than Sonnet.</p>
            `;
            return;
        }

        // Calculate potential savings based on last week's Opus usage
        const totalCost = stats.total_estimated_cost || 0;
        const costRatio = sonnetModel.pricing.input / activeModel.pricing.input;
        const potentialCost = totalCost * costRatio;
        const savings = totalCost - potentialCost;
        const savingsPercent = totalCost > 0 ? ((savings / totalCost) * 100) : 0;

        const costSavingsContent = document.getElementById('cost-savings-content');
        costSavingsContent.innerHTML = `
            <div class="cost-savings-explanation">
                <p>If you had run your recent workload on <strong>${sonnetModel.name}</strong> instead of <strong>${activeModel.name}</strong>, estimated savings:</p>
            </div>
            <div class="cost-savings-grid">
                <div class="cost-comparison-item current">
                    <div class="cost-amount current">$${totalCost.toFixed(2)}</div>
                    <div class="cost-label">${activeModel.name}</div>
                </div>
                <div class="cost-comparison-item alternative">
                    <div class="cost-amount alternative">$${potentialCost.toFixed(2)}</div>
                    <div class="cost-label">${sonnetModel.name}</div>
                </div>
                <div class="cost-comparison-item savings">
                    <div class="cost-amount savings">$${savings.toFixed(2)}</div>
                    <div class="cost-label">Savings (${savingsPercent.toFixed(1)}%)</div>
                </div>
            </div>
        `;
    }

    renderModelsGrid(models, activeModelId) {
        const modelsGrid = document.getElementById('models-grid');
        
        // Find cheapest model for comparison
        const cheapestInputPrice = Math.min(...models.map(m => m.pricing.input));
        
        modelsGrid.innerHTML = models.map(model => {
            const isActive = model.id === activeModelId;
            const inputMultiplier = model.pricing.input / cheapestInputPrice;
            
            let priceClass = 'moderate';
            let priceText = '';
            
            if (inputMultiplier === 1) {
                priceClass = 'cheapest';
                priceText = 'Most affordable';
            } else if (inputMultiplier >= 5) {
                priceClass = 'expensive';
                priceText = `${inputMultiplier.toFixed(1)}x more expensive`;
            } else {
                priceClass = 'moderate';
                priceText = `${inputMultiplier.toFixed(1)}x base price`;
            }

            return `
                <div class="model-card ${isActive ? 'active' : ''}" data-model-id="${model.id}">
                    <div class="model-header">
                        <div class="model-title">
                            <span class="provider-logo">${model.provider_emoji}</span>
                            <div>
                                <h4>${model.name}</h4>
                                ${isActive ? '<div class="model-badge">Current Default</div>' : ''}
                            </div>
                        </div>
                    </div>

                    <div class="model-pricing">
                        <div class="pricing-grid">
                            <div class="pricing-item">
                                <span>Input:</span>
                                <span class="price">$${model.pricing.input}/M</span>
                            </div>
                            <div class="pricing-item">
                                <span>Output:</span>
                                <span class="price">$${model.pricing.output}/M</span>
                            </div>
                            ${model.pricing.cache_read > 0 ? `
                            <div class="pricing-item">
                                <span>Cache Read:</span>
                                <span class="price">$${model.pricing.cache_read}/M</span>
                            </div>
                            <div class="pricing-item">
                                <span>Cache Write:</span>
                                <span class="price">$${model.pricing.cache_write}/M</span>
                            </div>
                            ` : ''}
                        </div>
                        <div class="price-comparison ${priceClass}">
                            ${priceText}
                        </div>
                    </div>

                    <div class="model-ratings">
                        <div class="rating-item">
                            <div class="rating-label">Speed</div>
                            <div class="rating-stars">
                                ${this.renderStars(model.speed)}
                            </div>
                            <div class="rating-value">${model.speed}/5</div>
                        </div>
                        <div class="rating-item">
                            <div class="rating-label">Quality</div>
                            <div class="rating-stars">
                                ${this.renderStars(model.quality)}
                            </div>
                            <div class="rating-value">${model.quality}/5</div>
                        </div>
                    </div>

                    <div class="model-features">
                        <div class="feature-section">
                            <h5>✨ Best for:</h5>
                            <div class="feature-list">
                                ${model.best_for.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                            </div>
                        </div>
                        <div class="feature-section">
                            <h5>⚠️ Limitations:</h5>
                            <div class="feature-list">
                                ${model.limitations.map(limitation => `<span class="feature-tag limitation">${limitation}</span>`).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="model-actions">
                        <button class="model-select-btn ${isActive ? 'active' : ''}" 
                                onclick="drew.selectModel('${model.id}')"
                                ${isActive ? 'disabled' : ''}>
                            ${isActive ? '✅ Currently Active' : 'Select as Default'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStars(rating) {
        return Array.from({length: 5}, (_, i) => 
            `<div class="star ${i < rating ? 'filled' : ''}"></div>`
        ).join('');
    }

    async selectModel(modelId) {
        try {
            const response = await fetch('/api/models/select', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ model: modelId })
            });

            if (!response.ok) {
                throw new Error('Failed to select model');
            }

            const result = await response.json();
            this.showSuccess('Model selection updated successfully!');
            
            // Reload the models page to reflect changes
            this.loadModels();

        } catch (error) {
            console.error('Error selecting model:', error);
            this.showError('Failed to update model selection');
        }
    }
}

// Initialize the app when DOM is loaded
let drew;
document.addEventListener('DOMContentLoaded', () => {
    drew = new DrewCommandCenter();
    
    // Make functions globally available for onclick handlers
    window.drew = drew;
});