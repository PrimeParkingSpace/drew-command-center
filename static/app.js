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
        try {
            const response = await fetch('/api/chat/messages');
            const messages = await response.json();

            this.allChatMessages = messages; // Store all messages
            this.renderChatMessages(messages);
            this.scrollChatToBottom();
            
            // Clear any existing search
            const searchInput = document.getElementById('chat-search');
            if (searchInput) {
                searchInput.value = '';
            }
        } catch (error) {
            console.error('Error loading chat:', error);
            this.showError('Failed to load chat messages');
        }
    }

    renderChatMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = messages.map(message => `
            <div class="message ${message.role}">
                ${message.role === 'assistant' ? `<div class="message-avatar">🦊</div>` : ''}
                <div class="message-content">
                    <div class="message-bubble">${this.formatMessageContent(message.content)}</div>
                    <div class="message-time">${this.formatTime(message.timestamp)}</div>
                </div>
                ${message.role === 'user' ? `<div class="message-avatar">👤</div>` : ''}
            </div>
        `).join('');
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message) return;

        // Clear input and show typing indicator
        chatInput.value = '';
        this.autoResizeTextarea(chatInput);
        this.showTypingIndicator();

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: message })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const result = await response.json();
            
            // Add messages to chat
            this.addMessageToChat(result.user_message);
            
            // Simulate Drew typing delay
            setTimeout(() => {
                this.hideTypingIndicator();
                this.addMessageToChat(result.assistant_message);
            }, 1500);

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.showError('Failed to send message');
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

            // Update stats page with enhanced data
            const statsContent = document.getElementById('stats-content');
            statsContent.innerHTML = `
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
                        <div class="stat-value">${stats.days_since_first_boot || 0}</div>
                        <div class="stat-label">Days Since First Boot</div>
                    </div>
                </div>

                <!-- Task Status Breakdown -->
                <div class="card">
                    <h3>Task Status Breakdown</h3>
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

                <!-- Activity Breakdown -->
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

                <!-- Most Active Categories -->
                <div class="card">
                    <h3>Most Active Categories</h3>
                    <div class="stats-breakdown">
                        ${(stats.active_categories || []).map(cat => `
                            <div class="breakdown-item">
                                <span>${cat.category}</span>
                                <span class="breakdown-count">${cat.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Cost Tracking Section -->
                <div class="card">
                    <h3>💰 Cost Tracking</h3>
                    <div class="stats-grid" style="margin-bottom: 1.5rem;">
                        <div class="stat-card">
                            <div class="stat-value">$${stats.total_estimated_cost.toFixed(2)}</div>
                            <div class="stat-label">Total Estimated Spend</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">$${stats.avg_daily_cost.toFixed(2)}</div>
                            <div class="stat-label">Average Daily Cost</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${(stats.total_tokens / 1000000).toFixed(1)}M</div>
                            <div class="stat-label">Total Tokens</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${(stats.cost_by_model || []).length}</div>
                            <div class="stat-label">Models Used</div>
                        </div>
                    </div>

                    <!-- Cost by Model -->
                    <h4>Cost by Model</h4>
                    <div class="stats-breakdown" style="margin-bottom: 1.5rem;">
                        ${(stats.cost_by_model || []).map(model => `
                            <div class="breakdown-item">
                                <span>${model.model}</span>
                                <span class="breakdown-count">$${parseFloat(model.cost).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Daily Cost Chart -->
                    <h4>Daily Cost Trend</h4>
                    <div style="position: relative; height: 300px; margin-top: 1rem;">
                        <canvas id="costChart"></canvas>
                    </div>
                </div>

                <!-- Weekly Tasks Chart -->
                <div class="card">
                    <h3>📊 Tasks Completed (Weekly)</h3>
                    <div style="position: relative; height: 300px; margin-top: 1rem;">
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DrewCommandCenter();
});