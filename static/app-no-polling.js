// Drew Command Center JavaScript - NO POLLING VERSION

class DrewCommandCenter {
    constructor() {
        this.currentPage = 'chat';
        this.allChatMessages = [];
        this.selectedFiles = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileMenu();
        
        // Force chat page to show on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('chat-page').classList.remove('d-none');
            document.getElementById('dashboard-page').classList.add('d-none');
        }
        
        this.loadPage('chat');
        
        // Auto-refresh dashboard stats every 30 seconds (but NOT chat polling)
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

        // File upload functionality
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e);
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
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Hide all pages
        document.querySelectorAll('[id$="-page"]').forEach(p => {
            p.classList.add('d-none');
        });

        // Show selected page
        document.getElementById(`${page}-page`).classList.remove('d-none');

        // Load page data
        this.currentPage = page;
        this.loadPageData(page);

        // Hide mobile menu
        document.querySelector('.sidebar')?.classList.remove('mobile-visible');
    }

    async loadPageData(page) {
        try {
            switch(page) {
                case 'dashboard':
                    await this.loadDashboardStats();
                    await this.loadRecentActivity();
                    break;
                case 'chat':
                    await this.loadChat();
                    break;
                case 'tasks':
                    await this.loadTasks();
                    break;
                case 'scheduled':
                    await this.loadScheduledJobs();
                    break;
                case 'activity':
                    await this.loadActivity();
                    break;
                case 'stats':
                    await this.loadDetailedStats();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${page} data:`, error);
            this.showError(`Failed to load ${page} data`);
        }
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const stats = await response.json();

            document.getElementById('active-tasks').textContent = stats.active_tasks || 0;
            document.getElementById('completed-today').textContent = stats.completed_today || 0;
            document.getElementById('scheduled-jobs').textContent = stats.scheduled_jobs || 0;
            document.getElementById('messages-today').textContent = stats.messages_today || 0;

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // Show fallback data
            document.getElementById('active-tasks').textContent = '—';
            document.getElementById('completed-today').textContent = '—';
            document.getElementById('scheduled-jobs').textContent = '—';
            document.getElementById('messages-today').textContent = '—';
        }
    }

    async loadDetailedStats() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const stats = await response.json();

            const statsContainer = document.getElementById('detailed-stats');
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Tasks</h3>
                        <div class="stat-value">${stats.active_tasks || 0}</div>
                        <div class="stat-label">Active</div>
                    </div>
                    <div class="stat-card">
                        <h3>Conversations</h3>
                        <div class="stat-value">${stats.total_conversations || 0}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-card">
                        <h3>Jobs</h3>
                        <div class="stat-value">${stats.scheduled_jobs || 0}</div>
                        <div class="stat-label">Scheduled</div>
                    </div>
                    <div class="stat-card">
                        <h3>System</h3>
                        <div class="stat-value">✅</div>
                        <div class="stat-label">${stats.system_status || 'Unknown'}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading detailed stats:', error);
            this.showError('Failed to load detailed stats');
        }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/activity?limit=10');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const activities = await response.json();

            const activityList = document.getElementById('recent-activity');
            if (activities && activities.length > 0) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-time">${this.formatDateTime(activity.timestamp)}</div>
                        <div class="activity-content">
                            <h4>${activity.action.replace(/_/g, ' ')}</h4>
                            <p>${activity.summary}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                activityList.innerHTML = '<div class="activity-item">No recent activity</div>';
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const tasks = await response.json();

            const tasksList = document.getElementById('tasks-list');
            if (tasks && tasks.length > 0) {
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
            } else {
                tasksList.innerHTML = '<div class="task-item">No tasks found</div>';
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('Failed to load tasks');
        }
    }

    async loadScheduledJobs() {
        try {
            const response = await fetch('/api/scheduled');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const jobs = await response.json();

            const jobsList = document.getElementById('scheduled-list');
            if (jobs && jobs.length > 0) {
                jobsList.innerHTML = jobs.map(job => `
                    <div class="card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h3>${job.name}</h3>
                                <p class="text-muted">${job.schedule}</p>
                                <p class="text-muted">Type: ${job.job_type || 'unknown'}</p>
                            </div>
                            <div class="text-right">
                                <div class="status-indicator status-${job.status}">
                                    <div class="status-dot"></div>
                                    ${job.status}
                                </div>
                                ${job.next_run ? `<div class="text-muted mt-1">Next: ${this.formatDateTime(job.next_run)}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                jobsList.innerHTML = '<div class="card">No scheduled jobs</div>';
            }
        } catch (error) {
            console.error('Error loading scheduled jobs:', error);
            this.showError('Failed to load scheduled jobs');
        }
    }

    async loadActivity() {
        try {
            const response = await fetch('/api/activity?limit=50');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const activities = await response.json();

            const activityList = document.getElementById('activity-list');
            if (activities && activities.length > 0) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-time">${this.formatDateTime(activity.timestamp)}</div>
                        <div class="activity-content">
                            <h4>${activity.action.replace(/_/g, ' ')}</h4>
                            <p>${activity.summary}</p>
                            <p class="text-muted">Session: ${activity.session_type || 'unknown'}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                activityList.innerHTML = '<div class="activity-item">No activity logged</div>';
            }
        } catch (error) {
            console.error('Error loading activity:', error);
            this.showError('Failed to load activity log');
        }
    }

    // CRITICAL FIX: No more polling, just load messages once
    async loadChat() {
        console.log('Loading chat (NO POLLING)...');
        try {
            const response = await fetch('/api/chat/live?limit=50');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            if (data.messages) {
                this.allChatMessages = data.messages;
                this.renderChatMessages(data.messages);
                this.scrollChatToBottom();
                console.log(`Loaded ${data.messages.length} messages (no polling)`);
            }
            
        } catch (error) {
            console.error('Error loading chat:', error);
            this.showError('Failed to load chat');
        }
    }

    renderChatMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        chatMessages.innerHTML = messages.map(msg => `
            <div class="message ${msg.role}">
                <div class="message-content">${msg.content}</div>
                <div class="message-time">${this.formatTime(msg.timestamp)}</div>
            </div>
        `).join('');
    }

    addMessageToChat(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.role}`;
        messageEl.innerHTML = `
            <div class="message-content">${message.content}</div>
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
        `;
        chatMessages.appendChild(messageEl);
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        
        if (!content) return;
        
        try {
            input.disabled = true;
            
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            // Add both messages to UI
            this.addMessageToChat(data.user_message);
            this.addMessageToChat(data.assistant_message);
            
            // Update stored messages
            this.allChatMessages.push(data.user_message);
            this.allChatMessages.push(data.assistant_message);
            
            input.value = '';
            this.scrollChatToBottom();
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        } finally {
            input.disabled = false;
            input.focus();
        }
    }

    scrollChatToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    formatTime(timestamp) {
        try {
            return new Date(timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch {
            return 'now';
        }
    }

    formatDate(timestamp) {
        try {
            return new Date(timestamp).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        } catch {
            return 'today';
        }
    }

    formatDateTime(timestamp) {
        try {
            return new Date(timestamp).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch {
            return 'now';
        }
    }

    showError(message) {
        // Simple error display
        console.error(message);
        
        // You could add a toast notification here
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = message;
        errorDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#ff4757;color:white;padding:10px;border-radius:5px;z-index:9999';
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 3000);
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    async addQuickTask() {
        const input = document.getElementById('quick-task-input');
        const title = input.value.trim();
        
        if (!title) return;
        
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            input.value = '';
            this.showSuccess('Task added successfully');
            
            // Reload tasks if on tasks page
            if (this.currentPage === 'tasks') {
                this.loadTasks();
            }
            
        } catch (error) {
            console.error('Error adding task:', error);
            this.showError('Failed to add task');
        }
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-toast';
        successDiv.textContent = message;
        successDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#2ed573;color:white;padding:10px;border-radius:5px;z-index:9999';
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 3000);
    }

    filterChatMessages(query) {
        if (!query) {
            this.renderChatMessages(this.allChatMessages);
            return;
        }
        
        const filtered = this.allChatMessages.filter(msg => 
            msg.content.toLowerCase().includes(query.toLowerCase())
        );
        this.renderChatMessages(filtered);
    }

    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        this.selectedFiles = files;
        
        if (files.length > 0) {
            console.log(`Selected ${files.length} file(s):`, files.map(f => f.name));
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Drew Command Center - NO POLLING VERSION');
    window.drewApp = new DrewCommandCenter();
});