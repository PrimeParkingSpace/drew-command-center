# 🦊 Drew Command Center

A modern command center dashboard for Henry's AI assistant "Drew". Built with Flask and PostgreSQL, designed for mobile-first usage with a sleek dark theme.

## Features

### 📊 Dashboard
- Real-time stats overview
- Active tasks, completed today, scheduled jobs
- Recent activity feed
- Quick task creation

### 💬 Chat Interface (Primary Feature)
- Full-screen chat experience like iMessage/Telegram
- Mobile-optimized with smooth scrolling
- Typing indicators and message bubbles
- Drew's avatar: 🦊
- Auto-scroll to latest messages
- Markdown support

### 📝 Task Management
- Kanban-style task tracking
- Status: Queued → Active → Completed → Blocked
- Priority levels: Low, Normal, High, Urgent
- Categories for organization
- Deliverables tracking (JSONB)

### ⏰ Scheduled Jobs
- Cron job monitoring
- Status indicators (active/paused/error)
- Last run and next run times
- Job types: cron, heartbeat, sync

### 📋 Activity Log
- Complete audit trail
- Session type tracking (main, isolated, subagent)
- Filterable timeline view

### 📈 Statistics
- API usage tracking (placeholder)
- Cost monitoring (placeholder)
- System uptime
- Message counts

## Tech Stack

- **Backend**: Flask with Gunicorn
- **Database**: PostgreSQL (Railway's DATABASE_URL)
- **Frontend**: Vanilla JavaScript SPA
- **Styling**: Custom CSS with dark theme
- **Deployment**: Railway Platform
- **Domain**: drewpeacock.ai

## Database Schema

### `tasks`
- Basic task management with status tracking
- JSONB deliverables field for flexible data
- Timestamps for creation and completion

### `scheduled_jobs`
- Cron job and heartbeat monitoring
- Configuration stored as JSONB
- Next run calculations

### `activity_log`
- System-wide activity tracking
- Action types: task_created, chat, heartbeat, etc.
- Session type identification

### `chat_messages`
- Chat history storage
- Role-based messages (user/assistant)
- Channel tracking (web/telegram)
- Metadata in JSONB format

## Deployment

### Railway Setup
1. Connect this repository to Railway
2. Set environment variables:
   - `DATABASE_URL` (provided by Railway PostgreSQL)
   - `APP_PASSWORD` (default: drewpeacock)
   - `SECRET_KEY` (for Flask sessions)

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Set up local PostgreSQL
createdb drew_command_center

# Run the app
python app.py
```

The app will initialize the database automatically on first run.

## Security

- Password protection with session-based authentication
- Environment variable configuration
- Secure PostgreSQL connections
- Input validation and sanitization

## Mobile Features

- Responsive design (mobile-first)
- PWA capabilities (Add to Home Screen)
- Touch-optimized interface
- Service worker ready (sw.js placeholder)
- Viewport meta tags configured

## API Endpoints

- `GET /api/stats` - Dashboard statistics
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/<id>` - Update task
- `GET /api/scheduled` - List scheduled jobs
- `GET /api/activity` - Activity log
- `GET /api/chat/messages` - Chat history
- `POST /api/chat/send` - Send chat message

## Color Scheme

- Background: `#0a0a1a` (deep dark)
- Cards: `#12122a` (dark slate)
- Borders: `#1e2040` (subtle borders)
- Primary: `#6c5ce7` (Drew's purple)
- Text: `#e0e0e0` (light) / `#8b8fa3` (muted)
- Success: `#28c840`
- Error: `#ff5f57`
- Warning: `#febc2e`

## Future Integrations

The chat interface is designed to integrate with OpenClaw's message system:
- API endpoints ready for external message routing
- Session tracking prepared
- Metadata fields for integration context

## File Structure

```
drew-command-center/
├── app.py              # Flask application
├── db.py              # Database setup and connection
├── requirements.txt   # Python dependencies
├── Procfile          # Railway deployment config
├── static/
│   ├── style.css     # Dark theme styling
│   └── app.js        # Frontend JavaScript
├── templates/
│   └── index.html    # Single-page application
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## License

Private project for Henry's personal use.