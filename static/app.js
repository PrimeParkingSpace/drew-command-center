// Drew Command Center v8.0 — Costs Edition

class DrewCommandCenter {
    constructor() {
        this.currentPage = 'stats';
        this.allChatMessages = [];
        this.selectedFiles = [];
        this.taskFilter = 'all';
        this.activityFilter = 'all';
        this.usageData = null;
        this.hourlyData = null;
        this.statsDays = 30;
        this.statsFrom = null;
        this.statsTo = null;
        this.costsDays = null;
        this.costsFrom = null;
        this.costsTo = null;
        this.showGBP = false;
        this.costsData = null;
        this.drillProject = null;
        // Chat pagination
        this.chatPage = 1;
        this.chatHasMore = false;
        this.chatLoading = false;
        this.chatTotalCount = 0;
        this.chatDates = [];
        this.chatSearchTerm = '';
        this.chatDateFilter = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileMenu();
        this.loadPage('stats');
        setInterval(() => {
            if (this.currentPage === 'dashboard') this.loadDashboardStats();
        }, 30000);
    }

    // ─── Formatting Helpers ───
    fmtMoney(n, forceGBP) {
        const useGBP = forceGBP !== undefined ? forceGBP : this.showGBP;
        if (useGBP) {
            const gbpRate = this._gbpRate || 0.748;
            return '£' + (n * gbpRate).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }
        return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    fmtTokens(n) {
        if (n >= 1e9) return (n/1e9).toFixed(1) + 'B';
        if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
        return n.toString();
    }
    fmtPct(n) { return n.toFixed(1) + '%'; }
    familyColor(family) {
        const colors = {opus: '#6c5ce7', sonnet: '#3b82f6', haiku: '#22c55e'};
        return colors[family] || '#8b8fa3';
    }
    familyColorBg(family) {
        const colors = {opus: 'rgba(108,92,231,0.15)', sonnet: 'rgba(59,130,246,0.15)', haiku: 'rgba(34,197,94,0.15)'};
        return colors[family] || 'rgba(139,143,163,0.15)';
    }

    // ─── Date Range Picker HTML ───
    buildDateRangePicker(prefix, activeDays, onSelect) {
        const presets = [
            {label: '7d', days: 7},
            {label: '30d', days: 30},
            {label: '90d', days: 90},
            {label: 'All Time', days: 0},
        ];
        const today = new Date().toISOString().slice(0, 10);
        return '<div class="date-range-picker" style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;margin-bottom:1.5rem;padding:1rem;background:#16213e;border-radius:12px">' +
            presets.map(p => {
                const isActive = (p.days === activeDays) || (p.days === 0 && activeDays === 999);
                return '<button class="btn-date-preset" data-prefix="' + prefix + '" data-days="' + p.days + '" style="padding:0.4rem 1rem;border-radius:8px;border:1px solid ' + (isActive ? '#6c5ce7' : '#2a2d5a') + ';background:' + (isActive ? '#6c5ce7' : 'transparent') + ';color:' + (isActive ? '#fff' : '#8b8fa3') + ';cursor:pointer;font-size:0.85rem;font-weight:600">' + p.label + '</button>';
            }).join('') +
            '<span style="color:#8b8fa3;margin:0 0.5rem">|</span>' +
            '<input type="date" id="' + prefix + '-from" style="background:#1a1a2e;border:1px solid #2a2d5a;color:#e0e0e0;padding:0.35rem 0.5rem;border-radius:6px;font-size:0.8rem" value="' + (this[prefix + 'From'] || '') + '">' +
            '<span style="color:#8b8fa3">to</span>' +
            '<input type="date" id="' + prefix + '-to" style="background:#1a1a2e;border:1px solid #2a2d5a;color:#e0e0e0;padding:0.35rem 0.5rem;border-radius:6px;font-size:0.8rem" value="' + (this[prefix + 'To'] || today) + '">' +
            '<button id="' + prefix + '-custom-go" class="btn-date-preset" style="padding:0.4rem 0.8rem;border-radius:8px;border:1px solid #6c5ce7;background:transparent;color:#6c5ce7;cursor:pointer;font-size:0.85rem">Go</button>' +
            '<span style="margin-left:auto"></span>' +
            '<button id="currency-toggle-' + prefix + '" style="padding:0.4rem 0.8rem;border-radius:8px;border:1px solid #2a2d5a;background:transparent;color:#8b8fa3;cursor:pointer;font-size:0.8rem">' + (this.showGBP ? '💷 GBP' : '💵 USD') + '</button>' +
            '</div>';
    }

    setupDatePickerEvents(prefix, callback) {
        const container = document.querySelector('.date-range-picker');
        if (!container) return;
        container.querySelectorAll('.btn-date-preset[data-prefix="' + prefix + '"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const days = parseInt(btn.dataset.days);
                if (days === 0) {
                    this[prefix + 'Days'] = 999;
                    this[prefix + 'From'] = '2026-02-17';
                    this[prefix + 'To'] = new Date().toISOString().slice(0, 10);
                } else {
                    this[prefix + 'Days'] = days;
                    this[prefix + 'From'] = null;
                    this[prefix + 'To'] = null;
                }
                callback();
            });
        });
        const goBtn = document.getElementById(prefix + '-custom-go');
        if (goBtn) {
            goBtn.addEventListener('click', () => {
                const from = document.getElementById(prefix + '-from').value;
                const to = document.getElementById(prefix + '-to').value;
                if (from && to) {
                    this[prefix + 'From'] = from;
                    this[prefix + 'To'] = to;
                    this[prefix + 'Days'] = null;
                    callback();
                }
            });
        }
        const currBtn = document.getElementById('currency-toggle-' + prefix);
        if (currBtn) {
            currBtn.addEventListener('click', () => {
                this.showGBP = !this.showGBP;
                callback();
            });
        }
    }

    // ─── SVG Chart Builders ───
    buildLineChart(dailyData, width = 800, height = 250) {
        if (!dailyData || dailyData.length === 0) return '<p class="text-muted">No data</p>';
        const pad = {top: 30, right: 20, bottom: 50, left: 60};
        const w = width - pad.left - pad.right;
        const h = height - pad.top - pad.bottom;
        const familyTotals = {};
        dailyData.forEach(d => {
            Object.values(d.models || {}).forEach(m => {
                if (!familyTotals[m.family]) familyTotals[m.family] = new Array(dailyData.length).fill(0);
            });
        });
        const totalLine = dailyData.map(d => d.total_cost || 0);
        dailyData.forEach((d, i) => {
            Object.values(d.models || {}).forEach(m => {
                if (familyTotals[m.family]) familyTotals[m.family][i] += m.cost;
            });
        });
        const maxVal = Math.max(...totalLine, 0.01);
        const xStep = w / Math.max(dailyData.length - 1, 1);
        const makePath = (values, color, strokeWidth = 2) => {
            const points = values.map((v, i) => pad.left + i * xStep + ',' + (pad.top + h - (v / maxVal) * h));
            return '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-linejoin="round" stroke-linecap="round"/>';
        };
        let gridLines = '';
        for (let i = 0; i <= 5; i++) {
            const y = pad.top + (h / 5) * i;
            const val = maxVal - (maxVal / 5) * i;
            gridLines += '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (pad.left + w) + '" y2="' + y + '" stroke="#1e2040" stroke-width="1"/>';
            gridLines += '<text x="' + (pad.left - 8) + '" y="' + (y + 4) + '" fill="#8b8fa3" font-size="11" text-anchor="end">$' + (val >= 10 ? val.toFixed(0) : val.toFixed(2)) + '</text>';
        }
        let xLabels = '';
        const labelEvery = Math.max(1, Math.floor(dailyData.length / 8));
        dailyData.forEach((d, i) => {
            if (i % labelEvery === 0 || i === dailyData.length - 1) {
                xLabels += '<text x="' + (pad.left + i * xStep) + '" y="' + (pad.top + h + 20) + '" fill="#8b8fa3" font-size="10" text-anchor="middle">' + d.date.slice(5) + '</text>';
            }
        });
        let hoverElements = '';
        dailyData.forEach((d, i) => {
            const x = pad.left + i * xStep;
            const y = pad.top + h - (d.total_cost / maxVal) * h;
            hoverElements += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#febc2e" opacity="0" class="chart-dot"><title>' + d.date + ' Total: $' + d.total_cost.toFixed(2) + '</title></circle>';
        });
        let paths = '';
        Object.entries(familyTotals).forEach(([family, values]) => {
            paths += makePath(values, this.familyColor(family), 1.5);
        });
        paths += makePath(totalLine, '#febc2e', 2.5);
        return '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;height:auto;max-height:' + height + 'px">' + gridLines + xLabels + paths + hoverElements + '<style>.chart-dot:hover{opacity:1!important;r:6}</style></svg>';
    }

    buildBarChart(dailyData, width = 800, height = 220) {
        if (!dailyData || dailyData.length === 0) return '<p class="text-muted">No data</p>';
        const pad = {top: 20, right: 20, bottom: 50, left: 70};
        const w = width - pad.left - pad.right;
        const h = height - pad.top - pad.bottom;
        const maxVal = Math.max(...dailyData.map(d => (d.total_input || 0) + (d.total_output || 0)), 1);
        const barW = Math.max(4, (w / dailyData.length) - 2);
        let bars = '';
        let xLabels = '';
        const labelEvery = Math.max(1, Math.floor(dailyData.length / 8));
        dailyData.forEach((d, i) => {
            const x = pad.left + (w / dailyData.length) * i + 1;
            const inputH = ((d.total_input || 0) / maxVal) * h;
            const outputH = ((d.total_output || 0) / maxVal) * h;
            const totalH = inputH + outputH;
            const y = pad.top + h - totalH;
            bars += '<rect x="' + x + '" y="' + (y + outputH) + '" width="' + barW + '" height="' + inputH + '" fill="#3b82f6" rx="1"><title>' + d.date + ' Input: ' + this.fmtTokens(d.total_input) + '</title></rect>';
            bars += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + outputH + '" fill="#f97316" rx="1"><title>' + d.date + ' Output: ' + this.fmtTokens(d.total_output) + '</title></rect>';
            if (i % labelEvery === 0 || i === dailyData.length - 1) {
                xLabels += '<text x="' + (x + barW/2) + '" y="' + (pad.top + h + 20) + '" fill="#8b8fa3" font-size="10" text-anchor="middle">' + d.date.slice(5) + '</text>';
            }
        });
        let yLabels = '';
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (h / 4) * i;
            const val = maxVal - (maxVal / 4) * i;
            yLabels += '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (pad.left + w) + '" y2="' + y + '" stroke="#1e2040" stroke-width="1"/>';
            yLabels += '<text x="' + (pad.left - 8) + '" y="' + (y + 4) + '" fill="#8b8fa3" font-size="11" text-anchor="end">' + this.fmtTokens(val) + '</text>';
        }
        return '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;height:auto;max-height:' + height + 'px">' + yLabels + bars + xLabels + '</svg>' +
            '<div style="display:flex;gap:1.5rem;justify-content:center;margin-top:0.5rem;font-size:0.8rem">' +
            '<span><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Input</span>' +
            '<span><span style="display:inline-block;width:12px;height:12px;background:#f97316;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Output</span></div>';
    }

    buildDonutChart(modelSummary, size = 200) {
        if (!modelSummary || Object.keys(modelSummary).length === 0) return '';
        const families = {};
        Object.values(modelSummary).forEach(m => {
            if (!families[m.family]) families[m.family] = 0;
            families[m.family] += m.cost;
        });
        const total = Object.values(families).reduce((a, b) => a + b, 0) || 1;
        const r = size / 2 - 10;
        const cx = size / 2, cy = size / 2;
        let startAngle = -Math.PI / 2;
        let paths = '';
        Object.entries(families).sort((a, b) => b[1] - a[1]).forEach(([family, cost]) => {
            const pct = cost / total;
            const endAngle = startAngle + pct * 2 * Math.PI;
            const largeArc = pct > 0.5 ? 1 : 0;
            const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
            paths += '<path d="M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + largeArc + ',1 ' + x2 + ',' + y2 + ' Z" fill="' + this.familyColor(family) + '"><title>' + family + ': ' + this.fmtMoney(cost) + ' (' + this.fmtPct(pct * 100) + ')</title></path>';
            startAngle = endAngle;
        });
        return '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:' + size + 'px;height:' + size + 'px">' +
            paths + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.55) + '" fill="#12122a"/>' +
            '<text x="' + cx + '" y="' + (cy - 8) + '" fill="#e0e0e0" font-size="16" font-weight="700" text-anchor="middle">' + this.fmtMoney(total) + '</text>' +
            '<text x="' + cx + '" y="' + (cy + 12) + '" fill="#8b8fa3" font-size="10" text-anchor="middle">Total Spend</text></svg>' +
            '<div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:1rem">' +
            Object.entries(families).sort((a, b) => b[1] - a[1]).map(([f, c]) =>
                '<div style="display:flex;align-items:center;gap:0.5rem"><span style="width:12px;height:12px;border-radius:3px;background:' + this.familyColor(f) + '"></span><span style="color:#e0e0e0;text-transform:capitalize;font-weight:600">' + f + '</span><span style="color:#8b8fa3;margin-left:auto">' + this.fmtMoney(c) + ' (' + this.fmtPct(c/total*100) + ')</span></div>'
            ).join('') + '</div>';
    }

    buildHeatmap(hourlyData) {
        if (!hourlyData || hourlyData.length === 0) return '<p class="text-muted">No hourly data available</p>';
        const grid = {};
        let maxTokens = 1;
        hourlyData.forEach(h => {
            const dt = new Date(h.starting_at);
            const dow = dt.getUTCDay();
            const hour = dt.getUTCHours();
            const key = dow + '-' + hour;
            grid[key] = (grid[key] || 0) + h.total_tokens;
            if (grid[key] > maxTokens) maxTokens = grid[key];
        });
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const cellW = 28, cellH = 24, padL = 40, padT = 25;
        const width = padL + 24 * cellW + 10;
        const height = padT + 7 * cellH + 10;
        let cells = '';
        for (let dow = 0; dow < 7; dow++) {
            cells += '<text x="' + (padL - 5) + '" y="' + (padT + dow * cellH + cellH/2 + 4) + '" fill="#8b8fa3" font-size="10" text-anchor="end">' + days[dow] + '</text>';
            for (let hr = 0; hr < 24; hr++) {
                const val = grid[dow + '-' + hr] || 0;
                const alpha = Math.max(0.05, val / maxTokens);
                cells += '<rect x="' + (padL + hr * cellW) + '" y="' + (padT + dow * cellH) + '" width="' + (cellW - 2) + '" height="' + (cellH - 2) + '" rx="3" fill="rgba(108,92,231,' + alpha + ')"><title>' + days[dow] + ' ' + hr + ':00 - ' + this.fmtTokens(val) + ' tokens</title></rect>';
            }
        }
        let hourLabels = '';
        for (let hr = 0; hr < 24; hr += 3) {
            hourLabels += '<text x="' + (padL + hr * cellW + cellW/2) + '" y="' + (padT - 8) + '" fill="#8b8fa3" font-size="9" text-anchor="middle">' + hr + ':00</text>';
        }
        return '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;height:auto;max-height:' + height + 'px;overflow:visible">' + hourLabels + cells + '</svg>';
    }

    buildSparkline(values, width = 120, height = 30, color = '#febc2e') {
        if (!values || values.length < 2) return '';
        const max = Math.max(...values, 0.01);
        const min = Math.min(...values, 0);
        const range = max - min || 1;
        const step = width / (values.length - 1);
        const points = values.map((v, i) => (i * step) + ',' + (height - ((v - min) / range) * (height - 4) - 2)).join(' ');
        return '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:' + width + 'px;height:' + height + 'px"><polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/></svg>';
    }

    // ─── Stacked Area Chart for Costs ───
    buildStackedAreaChart(timeline, projects, width = 800, height = 280) {
        if (!timeline || timeline.length === 0) return '<p class="text-muted">No data</p>';
        const pad = {top: 30, right: 20, bottom: 50, left: 60};
        const w = width - pad.left - pad.right;
        const h = height - pad.top - pad.bottom;

        // Build stacked values
        const projIds = projects.map(p => p.id);
        const projColors = {};
        projects.forEach(p => projColors[p.id] = p.color);

        // Compute stacked totals per day
        const stacked = timeline.map(day => {
            let cumulative = 0;
            const layers = {};
            projIds.forEach(id => {
                const val = day.projects[id] || 0;
                layers[id] = {bottom: cumulative, top: cumulative + val, val: val};
                cumulative += val;
            });
            return {date: day.date, layers: layers, total: cumulative};
        });

        const maxVal = Math.max(...stacked.map(s => s.total), 0.01);
        const xStep = w / Math.max(stacked.length - 1, 1);

        const toY = (v) => pad.top + h - (v / maxVal) * h;
        const toX = (i) => pad.left + i * xStep;

        let areas = '';
        // Draw areas bottom to top (reverse so first project is on top visually)
        [...projIds].reverse().forEach(id => {
            let pathD = 'M' + toX(0) + ',' + toY(stacked[0].layers[id].bottom);
            // Top line forward
            for (let i = 0; i < stacked.length; i++) {
                pathD += ' L' + toX(i) + ',' + toY(stacked[i].layers[id].top);
            }
            // Bottom line backward
            for (let i = stacked.length - 1; i >= 0; i--) {
                pathD += ' L' + toX(i) + ',' + toY(stacked[i].layers[id].bottom);
            }
            pathD += ' Z';
            areas += '<path d="' + pathD + '" fill="' + (projColors[id] || '#888') + '" opacity="0.7"><title>' + id + '</title></path>';
        });

        // Grid
        let grid = '';
        for (let i = 0; i <= 4; i++) {
            const y = pad.top + (h / 4) * i;
            const val = maxVal - (maxVal / 4) * i;
            grid += '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (pad.left + w) + '" y2="' + y + '" stroke="#1e2040" stroke-width="1"/>';
            grid += '<text x="' + (pad.left - 8) + '" y="' + (y + 4) + '" fill="#8b8fa3" font-size="11" text-anchor="end">$' + (val >= 1 ? val.toFixed(0) : val.toFixed(2)) + '</text>';
        }
        let xLabels = '';
        const labelEvery = Math.max(1, Math.floor(stacked.length / 8));
        stacked.forEach((s, i) => {
            if (i % labelEvery === 0 || i === stacked.length - 1) {
                xLabels += '<text x="' + toX(i) + '" y="' + (pad.top + h + 20) + '" fill="#8b8fa3" font-size="10" text-anchor="middle">' + s.date.slice(5) + '</text>';
            }
        });

        return '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;height:auto;max-height:' + height + 'px">' + grid + areas + xLabels + '</svg>';
    }

    // ─── Stats Page ───
    async loadDetailedStats() {
        const container = document.getElementById('stats-content');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:3rem"><div class="loading" style="width:40px;height:40px;margin:0 auto"></div><p class="text-muted" style="margin-top:1rem">Loading real usage data...</p></div>';
        try {
            let usageUrl = '/api/anthropic/usage';
            const params = new URLSearchParams();
            if (this.statsFrom && this.statsTo) {
                params.set('from', this.statsFrom);
                params.set('to', this.statsTo);
            } else if (this.statsDays) {
                params.set('days', this.statsDays);
            }
            if (params.toString()) usageUrl += '?' + params.toString();

            const [usageRes, hourlyRes] = await Promise.all([fetch(usageUrl), fetch('/api/anthropic/usage/hourly')]);
            const usage = await usageRes.json();
            const hourly = await hourlyRes.json();
            if (!usage.configured) {
                container.innerHTML = '<div class="card" style="text-align:center;padding:3rem;border-color:#febc2e"><div style="font-size:3rem;margin-bottom:1rem">🔑</div><h2 style="color:#febc2e;margin-bottom:1rem">Configure ANTHROPIC_ADMIN_KEY</h2></div>';
                return;
            }
            if (usage.error) {
                const isRateLimit = usage.error.includes('429') || usage.error.includes('Too Many');
                const msg = isRateLimit 
                    ? 'Anthropic API rate limited — please wait a minute and try again.' 
                    : usage.error;
                const icon = isRateLimit ? '⏳' : '❌';
                container.innerHTML = '<div class="card" style="border-color:#ff5f57;text-align:center;padding:2rem"><div style="font-size:2.5rem;margin-bottom:1rem">' + icon + '</div><h3 style="color:#ff5f57;margin-bottom:0.5rem">' + (isRateLimit ? 'Rate Limited' : 'Error') + '</h3><p class="text-muted">' + msg + '</p>' + (isRateLimit ? '<button onclick="window.drewApp.loadDetailedStats()" style="margin-top:1rem;padding:0.5rem 1.5rem;border-radius:8px;border:1px solid #6c5ce7;background:#6c5ce7;color:white;cursor:pointer">Retry</button>' : '') + '</div>';
                return;
            }
            this.usageData = usage;
            this.hourlyData = hourly;
            this._gbpRate = usage.gbp_rate || 0.748;
            this.renderStatsPage(usage, hourly);
        } catch (error) {
            console.error('Stats error:', error);
            container.innerHTML = '<div class="card" style="border-color:#ff5f57"><h3 style="color:#ff5f57">Failed to load stats</h3><p class="text-muted">' + error.message + '</p></div>';
        }
    }

    renderStatsPage(usage, hourly) {
        const container = document.getElementById('stats-content');
        const t = usage.totals || {};
        const totalTokens = (t.input_tokens || 0) + (t.output_tokens || 0);
        const cacheRate = t.input_tokens > 0 ? ((t.cache_read_tokens || 0) / t.input_tokens * 100) : 0;
        const costPerKTok = totalTokens > 0 ? (t.cost / (totalTokens / 1000)) : 0;
        const tokensPerDollar = t.cost > 0 ? (totalTokens / t.cost) : 0;
        const avgCostPerRequest = t.buckets > 0 ? (t.cost / t.buckets) : 0;
        const numDays = usage.num_days || 30;
        const activeDays = this.statsFrom ? null : (this.statsDays || 30);
        const vatNote = '<span style="color:#8b8fa3;font-size:0.75rem">inc. 20% VAT</span>';

        // Always show inc. VAT values; GBP toggle changes currency
        const displayCost = this.showGBP ? usage.total_gbp : usage.total_inc_tax;
        const displayMonth = this.showGBP ? usage.month_gbp : usage.month_inc_tax;
        const displayToday = this.showGBP ? usage.today_gbp : usage.today_inc_tax;

        container.innerHTML = this.buildDateRangePicker('stats', activeDays || 0, () => this.loadDetailedStats()) +
            '<div class="kpi-row">' +
            '<div class="kpi-tile" style="border-top:3px solid #6c5ce7"><div class="kpi-value" style="color:#6c5ce7">' + this.fmtMoney(displayCost) + '</div><div class="kpi-label">Total Spend (' + numDays + 'd)</div>' + vatNote + '</div>' +
            '<div class="kpi-tile" style="border-top:3px solid #febc2e"><div class="kpi-value" style="color:#febc2e">' + this.fmtMoney(displayMonth) + '</div><div class="kpi-label">This Month</div>' + vatNote + '</div>' +
            '<div class="kpi-tile" style="border-top:3px solid #22c55e"><div class="kpi-value" style="color:#22c55e">' + this.fmtMoney(displayToday) + '</div><div class="kpi-label">Today</div>' + vatNote + '</div>' +
            '<div class="kpi-tile" style="border-top:3px solid #3b82f6"><div class="kpi-value" style="color:#3b82f6">' + this.fmtTokens(totalTokens) + '</div><div class="kpi-label">Total Tokens</div></div>' +
            '<div class="kpi-tile" style="border-top:3px solid #f97316"><div class="kpi-value" style="color:#f97316">' + (t.buckets || 0) + '</div><div class="kpi-label">API Calls</div></div>' +
            '</div>' +
            '<div class="card chart-card"><div class="card-header"><h2>Daily Spend</h2><div style="display:flex;gap:1rem;font-size:0.8rem">' +
            '<span><span style="display:inline-block;width:12px;height:3px;background:#6c5ce7;margin-right:4px;vertical-align:middle"></span>Opus</span>' +
            '<span><span style="display:inline-block;width:12px;height:3px;background:#3b82f6;margin-right:4px;vertical-align:middle"></span>Sonnet</span>' +
            '<span><span style="display:inline-block;width:12px;height:3px;background:#22c55e;margin-right:4px;vertical-align:middle"></span>Haiku</span>' +
            '<span><span style="display:inline-block;width:12px;height:3px;background:#febc2e;margin-right:4px;vertical-align:middle"></span>Total</span></div></div>' +
            '<div class="chart-container">' + this.buildLineChart(usage.daily_data) + '</div></div>' +
            '<div style="display:grid;grid-template-columns:250px 1fr;gap:1.5rem;margin-bottom:1.5rem" class="model-breakdown-grid">' +
            '<div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center"><h3 style="margin-bottom:1rem;font-size:1rem;color:#8b8fa3">Spend by Family</h3>' + this.buildDonutChart(usage.model_summary) + '</div>' +
            '<div class="card"><h3 style="margin-bottom:1rem">Model Breakdown</h3><table class="cost-table"><thead><tr><th>Model</th><th style="text-align:right">Input</th><th style="text-align:right">Output</th><th style="text-align:right">Cache Read</th><th style="text-align:right">Cost</th><th style="text-align:right">%</th></tr></thead><tbody>' +
            Object.entries(usage.model_summary || {}).sort((a,b) => b[1].cost - a[1].cost).map(([id, m]) => {
                const pct = t.cost > 0 ? (m.cost / t.cost * 100) : 0;
                return '<tr><td style="color:' + this.familyColor(m.family) + ';font-weight:600">' + m.display + '</td><td style="text-align:right">' + this.fmtTokens(m.input_tokens) + '</td><td style="text-align:right">' + this.fmtTokens(m.output_tokens) + '</td><td style="text-align:right">' + this.fmtTokens(m.cache_read_tokens) + '</td><td style="text-align:right;font-weight:600">' + this.fmtMoney(m.cost) + '</td><td style="text-align:right">' + this.fmtPct(pct) + '</td></tr>';
            }).join('') +
            '</tbody></table></div></div>' +
            '<div class="card chart-card"><div class="card-header"><h2>Daily Token Usage</h2></div><div class="chart-container">' + this.buildBarChart(usage.daily_data) + '</div></div>' +
            '<div class="kpi-row" style="margin-bottom:1.5rem">' +
            '<div class="kpi-tile"><div class="kpi-value" style="color:#a78bfa;font-size:1.5rem">' + this.fmtMoney(avgCostPerRequest) + '</div><div class="kpi-label">Avg Cost / Request</div></div>' +
            '<div class="kpi-tile"><div class="kpi-value" style="color:#60a5fa;font-size:1.5rem">' + costPerKTok.toFixed(4) + '</div><div class="kpi-label">Cost per 1K Tokens</div></div>' +
            '<div class="kpi-tile"><div class="kpi-value" style="color:#34d399;font-size:1.5rem">' + this.fmtPct(cacheRate) + '</div><div class="kpi-label">Cache Hit Rate</div></div>' +
            '<div class="kpi-tile"><div class="kpi-value" style="color:#fbbf24;font-size:1.5rem">' + this.fmtTokens(tokensPerDollar) + '</div><div class="kpi-label">Tokens per Dollar</div></div></div>' +
            '<div class="card chart-card"><div class="card-header"><h2>Activity Heatmap (Last 7 Days, UTC)</h2></div><div class="chart-container" style="overflow-x:auto">' + this.buildHeatmap(hourly.hourly_data) + '</div></div>' +
            this.buildBillingSection(usage);

        this.setupDatePickerEvents('stats', () => this.loadDetailedStats());

        container.querySelectorAll('.kpi-tile').forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            setTimeout(() => { el.style.transition = 'all 0.4s ease'; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, i * 80);
        });
    }

    buildBillingSection(usage) {
        const daily = usage.daily_data || [];
        if (!daily.length) return '';
        const t = usage.totals || {};
        const gbpRate = usage.gbp_rate || 0.748;
        const totalUSD = t.cost || 0;
        const totalVAT = totalUSD * 0.2;
        const totalIncVAT = totalUSD + totalVAT;
        const totalGBP = totalIncVAT * gbpRate;
        const sorted = [...daily].reverse();
        let running = 0;
        let rows = sorted.map(d => {
            const dayCost = d.total_cost || 0;
            running += dayCost;
            const dayVAT = dayCost * 1.2;
            const models = Object.values(d.models || {}).map(m => m.display).join(', ');
            return '<tr><td style="white-space:nowrap">' + d.date + '</td>' +
                '<td style="text-align:right">' + this.fmtMoney(dayCost) + '</td>' +
                '<td style="text-align:right;color:#8b8fa3">' + this.fmtMoney(dayVAT) + '</td>' +
                '<td style="text-align:right;font-weight:600">' + this.fmtMoney(running * 1.2) + '</td>' +
                '<td style="color:#8b8fa3;font-size:0.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + models + '</td></tr>';
        }).join('');
        return '<div class="card" style="margin-top:1.5rem"><h3 style="margin-bottom:1rem">\ud83d\udcb3 Daily Cost Breakdown (from Anthropic Usage API)</h3>' +
            '<div class="kpi-row" style="margin-bottom:1rem">' +
            '<div class="kpi-tile" style="border-top:3px solid #6c5ce7"><div class="kpi-value" style="color:#6c5ce7;font-size:1.8rem">' + this.fmtMoney(totalUSD) + '</div><div class="kpi-label">Total (ex. VAT)</div></div>' +
            '<div class="kpi-tile" style="border-top:3px solid #ef4444"><div class="kpi-value" style="color:#ef4444;font-size:1.8rem">' + this.fmtMoney(totalIncVAT) + '</div><div class="kpi-label">Total (inc. 20% VAT)</div></div>' +
            '<div class="kpi-tile" style="border-top:3px solid #22c55e"><div class="kpi-value" style="color:#22c55e;font-size:1.8rem">\u00a3' + totalGBP.toFixed(2) + '</div><div class="kpi-label">Estimated GBP (inc. VAT)</div></div>' +
            '</div>' +
            '<div style="max-height:400px;overflow-y:auto"><table class="cost-table"><thead><tr><th>Date</th><th style="text-align:right">Cost (ex.VAT)</th><th style="text-align:right">Inc. VAT</th><th style="text-align:right">Running Total</th><th>Models Used</th></tr></thead><tbody>' +
            rows +
            '</tbody></table></div>' +
            '<p style="color:#8b8fa3;font-size:0.75rem;margin-top:0.75rem">All data from Anthropic Usage API \u00b7 For invoices visit <a href="https://console.anthropic.com/settings/billing" target="_blank" style="color:#6c5ce7">console.anthropic.com/settings/billing</a></p></div>';
    }

    // ─── Costs Page ───
    async loadCosts() {
        const container = document.getElementById('costs-content');
        if (!container) return;
        container.innerHTML = '<div style="text-align:center;padding:3rem"><div class="loading" style="width:40px;height:40px;margin:0 auto"></div><p class="text-muted" style="margin-top:1rem">Loading cost data...</p></div>';
        try {
            const params = new URLSearchParams();
            if (this.costsFrom) params.set('from', this.costsFrom);
            if (this.costsTo) params.set('to', this.costsTo);
            const url = '/api/costs' + (params.toString() ? '?' + params.toString() : '');
            const res = await fetch(url);
            const data = await res.json();
            if (!data.configured) {
                container.innerHTML = '<div class="card" style="text-align:center;padding:3rem;border-color:#febc2e"><div style="font-size:3rem;margin-bottom:1rem">🔑</div><h2 style="color:#febc2e">Configure ANTHROPIC_ADMIN_KEY</h2></div>';
                return;
            }
            if (data.error) {
                const isRL = data.error.includes('429') || data.error.includes('Too Many');
                container.innerHTML = '<div class="card" style="border-color:#ff5f57;text-align:center;padding:2rem"><div style="font-size:2.5rem;margin-bottom:1rem">' + (isRL ? '⏳' : '❌') + '</div><h3 style="color:#ff5f57">' + (isRL ? 'Rate Limited' : 'Error') + '</h3><p class="text-muted">' + (isRL ? 'Anthropic API rate limited — please wait a minute and try again.' : data.error) + '</p>' + (isRL ? '<button onclick="window.drewApp.loadCosts()" style="margin-top:1rem;padding:0.5rem 1.5rem;border-radius:8px;border:1px solid #6c5ce7;background:#6c5ce7;color:white;cursor:pointer">Retry</button>' : '') + '</div>';
                return;
            }
            this.costsData = data;
            this._gbpRate = data.gbp_rate || 0.748;
            this.renderCostsPage(data);
        } catch (error) {
            console.error('Costs error:', error);
            const msg = error.message || '';
            const isRL = msg.includes('429') || msg.includes('Too Many');
            container.innerHTML = '<div class="card" style="border-color:#ff5f57;text-align:center;padding:2rem"><div style="font-size:2.5rem;margin-bottom:1rem">' + (isRL ? '⏳' : '❌') + '</div><h3 style="color:#ff5f57">' + (isRL ? 'Rate Limited' : 'Failed to load costs') + '</h3><p class="text-muted">' + (isRL ? 'Please wait a minute and try again.' : msg) + '</p>' + (isRL ? '<button onclick="window.drewApp.loadCosts()" style="margin-top:1rem;padding:0.5rem 1.5rem;border-radius:8px;border:1px solid #6c5ce7;background:#6c5ce7;color:white;cursor:pointer">Retry</button>' : '') + '</div>';
        }
    }

    renderCostsPage(data) {
        const container = document.getElementById('costs-content');
        const projects = data.projects || [];
        const grandTotal = data.grand_total || 0;
        const grandGBP = data.grand_total_gbp || 0;
        const grandIncVat = data.grand_total_inc_vat || 0;

        // Date range picker
        let html = this.buildDateRangePicker('costs', 0, () => this.loadCosts());

        // Grand total banner
        html += '<div class="card" style="background:linear-gradient(135deg,#16213e,#1a1a2e);border:1px solid #6c5ce7;margin-bottom:1.5rem">' +
            '<div style="display:flex;flex-wrap:wrap;gap:2rem;align-items:center;justify-content:center;padding:0.5rem">' +
            '<div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:#6c5ce7">' + this.fmtMoney(grandTotal) + '</div><div style="color:#8b8fa3;font-size:0.85rem">Total (ex. VAT)</div></div>' +
            '<div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:#a78bfa">' + this.fmtMoney(grandIncVat) + '</div><div style="color:#8b8fa3;font-size:0.85rem">Total (inc. 20% VAT)</div></div>' +
            '<div style="text-align:center"><div style="font-size:2rem;font-weight:700;color:#60a5fa">£' + (grandGBP).toFixed(2) + '</div><div style="color:#8b8fa3;font-size:0.85rem">Total GBP (inc. VAT)</div></div>' +
            '</div></div>';

        // Project cost cards
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;margin-bottom:1.5rem">';
        projects.forEach(p => {
            html += '<div class="card project-card" data-project="' + p.id + '" style="cursor:pointer;border-left:4px solid ' + p.color + ';padding:1rem;transition:transform 0.2s">' +
                '<div style="font-size:1rem;font-weight:600;color:#e0e0e0;margin-bottom:0.5rem">' + p.name + '</div>' +
                '<div style="font-size:1.5rem;font-weight:700;color:' + p.color + '">' + this.fmtMoney(p.total_cost) + '</div>' +
                '<div style="display:flex;justify-content:space-between;margin-top:0.5rem;font-size:0.8rem;color:#8b8fa3">' +
                '<span>' + p.duration_days + 'd' + (p.ongoing ? ' (ongoing)' : '') + '</span>' +
                '<span>' + this.fmtPct(p.pct_of_total) + '</span></div>' +
                '<div style="background:#1e2040;border-radius:4px;height:4px;margin-top:0.5rem;overflow:hidden"><div style="background:' + p.color + ';height:100%;width:' + Math.min(p.pct_of_total, 100) + '%;border-radius:4px"></div></div>' +
                '</div>';
        });
        html += '</div>';

        // Stacked area timeline
        html += '<div class="card chart-card"><div class="card-header"><h2>Daily Spend by Project</h2>' +
            '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;font-size:0.75rem">' +
            projects.map(p => '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + p.color + ';margin-right:3px;vertical-align:middle"></span>' + p.name.replace(/^.{2}/, '') + '</span>').join('') +
            '</div></div><div class="chart-container">' + this.buildStackedAreaChart(data.timeline, projects) + '</div></div>';

        // Project breakdown table
        html += '<div class="card"><h3 style="margin-bottom:1rem">Project Breakdown</h3>' +
            '<div style="overflow-x:auto"><table class="cost-table"><thead><tr>' +
            '<th>Project</th><th style="text-align:right">Duration</th><th style="text-align:right">Total Cost</th><th style="text-align:right">Avg/Day</th><th style="text-align:right">% of Total</th><th style="text-align:right">Input Tokens</th><th style="text-align:right">Output Tokens</th>' +
            '</tr></thead><tbody>' +
            projects.map(p =>
                '<tr class="project-row" data-project="' + p.id + '" style="cursor:pointer">' +
                '<td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + p.color + ';margin-right:8px;vertical-align:middle"></span><span style="color:' + p.color + ';font-weight:600">' + p.name + '</span></td>' +
                '<td style="text-align:right">' + p.duration_days + 'd' + (p.ongoing ? ' ⟳' : '') + '</td>' +
                '<td style="text-align:right;font-weight:600">' + this.fmtMoney(p.total_cost) + '</td>' +
                '<td style="text-align:right">' + this.fmtMoney(p.avg_per_day) + '</td>' +
                '<td style="text-align:right">' + this.fmtPct(p.pct_of_total) + '</td>' +
                '<td style="text-align:right">' + this.fmtTokens(p.input_tokens) + '</td>' +
                '<td style="text-align:right">' + this.fmtTokens(p.output_tokens) + '</td>' +
                '</tr>'
            ).join('') +
            '</tbody></table></div></div>';

        // Drill-down container
        html += '<div id="costs-drilldown"></div>';

        container.innerHTML = html;

        this.setupDatePickerEvents('costs', () => this.loadCosts());

        // Project click handlers
        container.querySelectorAll('.project-card, .project-row').forEach(el => {
            el.addEventListener('click', () => this.showProjectDrilldown(el.dataset.project));
        });

        // Animate cards
        container.querySelectorAll('.project-card').forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(15px)';
            setTimeout(() => { el.style.transition = 'all 0.3s ease'; el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, i * 60);
        });
    }

    showProjectDrilldown(projectId) {
        const dd = document.getElementById('costs-drilldown');
        if (!dd || !this.costsData) return;
        const project = this.costsData.projects.find(p => p.id === projectId);
        if (!project) return;

        if (this.drillProject === projectId) {
            dd.innerHTML = '';
            this.drillProject = null;
            return;
        }
        this.drillProject = projectId;

        const daily = project.daily || [];
        let html = '<div class="card" style="border-left:4px solid ' + project.color + ';margin-top:1.5rem">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">' +
            '<h3 style="color:' + project.color + ';margin:0">' + project.name + ' — Daily Breakdown</h3>' +
            '<button onclick="document.getElementById(\'costs-drilldown\').innerHTML=\'\';window.drewApp.drillProject=null" style="background:transparent;border:1px solid #2a2d5a;color:#8b8fa3;padding:0.3rem 0.8rem;border-radius:6px;cursor:pointer;font-size:0.8rem">✕ Close</button></div>';

        if (daily.length > 0) {
            // Mini bar chart
            const maxCost = Math.max(...daily.map(d => d.cost), 0.01);
            html += '<div style="display:flex;gap:2px;align-items:end;height:80px;margin-bottom:1rem;padding:0 0.5rem">';
            daily.forEach(d => {
                const h = Math.max(2, (d.cost / maxCost) * 70);
                html += '<div style="flex:1;min-width:6px;display:flex;flex-direction:column;align-items:center;gap:2px" title="' + d.date + ': $' + d.cost.toFixed(2) + '">' +
                    '<div style="width:100%;height:' + h + 'px;background:' + project.color + ';border-radius:2px 2px 0 0;opacity:0.8"></div></div>';
            });
            html += '</div>';

            html += '<table class="cost-table"><thead><tr><th>Date</th><th style="text-align:right">Cost</th><th style="text-align:right">Input</th><th style="text-align:right">Output</th></tr></thead><tbody>';
            daily.forEach(d => {
                html += '<tr><td>' + d.date + '</td><td style="text-align:right;font-weight:600;color:' + project.color + '">' + this.fmtMoney(d.cost) + '</td><td style="text-align:right">' + this.fmtTokens(d.input_tokens) + '</td><td style="text-align:right">' + this.fmtTokens(d.output_tokens) + '</td></tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<p class="text-muted">No daily data for this project in selected range.</p>';
        }

        html += '</div>';
        dd.innerHTML = html;
        dd.scrollIntoView({behavior: 'smooth', block: 'start'});
    }

    // ─── Models Page ───
    async loadModels() {
        const modelsGrid = document.getElementById('models-grid');
        const costSavings = document.getElementById('cost-savings-content');
        const currentModel = document.getElementById('current-model-display');
        try {
            const response = await fetch('/api/models');
            const data = await response.json();
            if (!data.configured) {
                if (modelsGrid) modelsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem"><p class="text-muted">Configure ANTHROPIC_ADMIN_KEY to see real model usage data</p></div>';
                return;
            }
            const models = data.model_summary || {};
            const sorted = Object.entries(models).sort((a, b) => b[1].cost - a[1].cost);
            if (costSavings) {
                costSavings.innerHTML = '<div class="cost-savings-grid"><div class="cost-comparison-item current"><div class="cost-amount current">' + this.fmtMoney(data.today_cost || 0) + '</div><div class="cost-label">Today</div></div><div class="cost-comparison-item alternative"><div class="cost-amount alternative">' + this.fmtMoney(data.month_cost || 0) + '</div><div class="cost-label">Month to Date</div></div><div class="cost-comparison-item savings"><div class="cost-amount savings">' + this.fmtMoney(data.total_cost || 0) + '</div><div class="cost-label">All Time (30d)</div></div></div>';
            }
            if (currentModel && sorted.length > 0) {
                const [topId, topModel] = sorted[0];
                currentModel.innerHTML = '<div class="current-model-display"><div style="font-size:2rem;color:' + this.familyColor(topModel.family) + '">●</div><div class="current-model-info"><div class="current-model-name">' + topModel.display + '</div><div class="current-model-desc">Highest usage (' + this.fmtMoney(topModel.cost) + ')</div></div></div>';
            }
            if (modelsGrid) {
                modelsGrid.innerHTML = sorted.map(([id, m]) => {
                    const totalTok = (m.input_tokens || 0) + (m.output_tokens || 0);
                    const p = m.pricing || {};
                    return '<div class="model-card" style="border-color:' + this.familyColor(m.family) + '33"><div class="model-header"><div class="model-title"><span style="font-size:1.5rem;color:' + this.familyColor(m.family) + '">●</span><h4>' + m.display + '</h4></div><span class="model-badge" style="background:' + this.familyColorBg(m.family) + ';color:' + this.familyColor(m.family) + '">' + m.family + '</span></div><div class="model-pricing"><div class="pricing-grid"><div class="pricing-item"><span>Total Spend</span><span class="price" style="color:' + this.familyColor(m.family) + '">' + this.fmtMoney(m.cost) + '</span></div><div class="pricing-item"><span>Total Tokens</span><span class="price">' + this.fmtTokens(totalTok) + '</span></div><div class="pricing-item"><span>Input</span><span class="price">' + this.fmtTokens(m.input_tokens) + '</span></div><div class="pricing-item"><span>Output</span><span class="price">' + this.fmtTokens(m.output_tokens) + '</span></div><div class="pricing-item"><span>Cache Read</span><span class="price">' + this.fmtTokens(m.cache_read_tokens) + '</span></div><div class="pricing-item"><span>Days Active</span><span class="price">' + m.days_active + '</span></div></div>' + (p.input ? '<div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #1e2040;font-size:0.8rem;color:#8b8fa3">Pricing: $' + p.input + '/MTok in, $' + p.output + '/MTok out' + (p.cache_read ? ', $' + p.cache_read + '/MTok cache' : '') + '</div>' : '') + '</div></div>';
                }).join('');
            }
        } catch (error) {
            console.error('Error loading models:', error);
            if (modelsGrid) modelsGrid.innerHTML = '<div style="grid-column:1/-1"><p class="text-muted">Failed to load model data</p></div>';
        }
    }

    // ─── Dashboard ───
    async loadDashboardStats() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const stats = await response.json();
            const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setEl('active-tasks-count', stats.active_tasks || 0);
            setEl('completed-today-count', stats.completed_today || 0);
            setEl('scheduled-jobs-count', stats.scheduled_jobs || 0);
            setEl('messages-today-count', stats.messages_today || 0);
            try {
                const usageRes = await fetch('/api/anthropic/usage');
                const usage = await usageRes.json();
                if (usage.configured && !usage.error) {
                    const costTile = document.getElementById('api-cost-tile');
                    if (costTile) {
                        const last7 = (usage.daily_data || []).slice(-7).map(d => d.total_cost);
                        costTile.innerHTML = '<div class="stat-value" style="color:#febc2e;font-size:1.6rem">' + this.fmtMoney(usage.today_cost || 0) + '</div><div class="stat-label">Today API Cost</div><div style="margin-top:0.5rem;font-size:0.8rem;color:#8b8fa3">Month: ' + this.fmtMoney(usage.month_cost || 0) + '</div><div style="margin-top:0.25rem">' + this.buildSparkline(last7) + '</div>';
                    }
                }
            } catch (e) { /* optional */ }
        } catch (error) { console.error('Dashboard stats error:', error); }
    }

    // ─── Chat (Persistent, Paginated) ───
    async loadChat() {
        this.chatPage = 1;
        this.chatSearchTerm = '';
        this.chatDateFilter = '';
        this.allChatMessages = [];
        try {
            const datesRes = await fetch('/api/chat/dates');
            const datesData = await datesRes.json();
            this.chatDates = datesData.dates || [];
            this.chatTotalCount = datesData.total_messages || 0;
            this.renderDateNav();
            this.updateMessageCount();
        } catch (e) { console.error('Date load error:', e); }
        await this.loadChatPage(1, false);
        // Double rAF ensures DOM has painted before scrolling
        requestAnimationFrame(() => requestAnimationFrame(() => this.scrollChatToBottom()));
        this.setupChatScroll();
    }

    async loadChatPage(page, prepend = false) {
        if (this.chatLoading) return;
        this.chatLoading = true;
        const params = new URLSearchParams({page: page, limit: 50});
        if (this.chatSearchTerm) params.set('search', this.chatSearchTerm);
        if (this.chatDateFilter) params.set('date', this.chatDateFilter);
        try {
            const res = await fetch('/api/chat/history?' + params.toString());
            const data = await res.json();
            this.chatHasMore = data.has_more;
            this.chatPage = data.page;
            this.chatTotalCount = data.total_count;
            if (prepend) {
                const chatEl = document.getElementById('chat-messages');
                const oldHeight = chatEl ? chatEl.scrollHeight : 0;
                this.allChatMessages = data.messages.concat(this.allChatMessages);
                this.renderChatMessages(this.allChatMessages);
                if (chatEl) { const newHeight = chatEl.scrollHeight; chatEl.scrollTop = newHeight - oldHeight; }
            } else {
                this.allChatMessages = data.messages;
                this.renderChatMessages(data.messages);
            }
            this.updateMessageCount();
        } catch (error) { console.error('Chat page load error:', error); }
        finally { this.chatLoading = false; }
    }

    setupChatScroll() {
        const chatEl = document.getElementById('chat-messages');
        if (!chatEl) return;
        chatEl.addEventListener('scroll', () => {
            if (chatEl.scrollTop < 100 && this.chatHasMore && !this.chatLoading) {
                this.loadChatPage(this.chatPage + 1, true);
            }
        });
    }

    renderDateNav() {
        const container = document.getElementById('chat-date-nav');
        if (!container) return;
        if (!this.chatDates || this.chatDates.length === 0) { container.innerHTML = ''; return; }
        const options = this.chatDates.map(d => {
            const dateObj = new Date(d.date + 'T12:00:00');
            const label = dateObj.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
            return '<option value="' + d.date + '"' + (this.chatDateFilter === d.date ? ' selected' : '') + '>' + label + ' (' + d.count + ')</option>';
        }).join('');
        container.innerHTML = '<select id="chat-date-select" class="chat-date-select"><option value="">All dates</option>' + options + '</select>';
        document.getElementById('chat-date-select').addEventListener('change', (e) => {
            this.chatDateFilter = e.target.value;
            this.chatPage = 1;
            this.allChatMessages = [];
            this.loadChatPage(1, false).then(() => this.scrollChatToBottom());
        });
    }

    updateMessageCount() {
        const el = document.getElementById('chat-message-count');
        if (el) el.textContent = this.chatTotalCount + ' messages';
    }

    renderChatMessages(messages) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        let html = '';
        if (this.chatHasMore) {
            html += '<div id="chat-load-more" style="text-align:center;padding:1rem"><div style="display:inline-block;background:#1e2040;color:#8b8fa3;padding:0.4rem 1rem;border-radius:20px;font-size:0.75rem;cursor:pointer" onclick="window.drewApp.loadChatPage(window.drewApp.chatPage + 1, true)">Load older messages...</div></div>';
        }
        let lastDate = '';
        html += messages.map(msg => {
            let dateHeader = '';
            const msgDate = msg.session_date || (msg.timestamp ? msg.timestamp.substring(0, 10) : '');
            if (msgDate && msgDate !== lastDate) {
                lastDate = msgDate;
                const dateObj = new Date(msgDate + 'T12:00:00');
                const label = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                dateHeader = '<div style="text-align:center;margin:1.5rem 0 1rem"><div style="display:inline-block;background:#1a1a35;color:#6c5ce7;padding:0.4rem 1.2rem;border-radius:20px;font-size:0.8rem;font-weight:600;border:1px solid #2a2d5a">' + label + '</div></div>';
            }
            if (msg.role === 'system') {
                return dateHeader + '<div style="text-align:center;margin:1rem 0"><div style="display:inline-block;background:#1e2040;color:#8b8fa3;padding:0.5rem 1rem;border-radius:20px;font-size:0.85rem">' + msg.content + '</div></div>';
            }
            const isUser = msg.role === 'user';
            return dateHeader +
                '<div class="message ' + msg.role + '" style="justify-content:' + (isUser ? 'flex-end' : 'flex-start') + '">' +
                (isUser ? '' : '<div class="message-avatar" style="background:#1e2040">🦊</div>') +
                '<div><div class="message-bubble" style="background:' + (isUser ? '#6c5ce7' : '#1e2040') + ';color:' + (isUser ? 'white' : '#e0e0e0') + ';max-width:100%;padding:0.75rem 1rem;border-radius:18px;' + (isUser ? 'border-bottom-right-radius:4px' : 'border-bottom-left-radius:4px') + '">' + msg.content + '</div>' +
                '<div class="message-time" style="text-align:' + (isUser ? 'right' : 'left') + '">' + this.formatTime(msg.timestamp) + '</div></div>' +
                (isUser ? '<div class="message-avatar" style="background:#6c5ce7;color:white">👤</div>' : '') +
                '</div>';
        }).join('');
        chatMessages.innerHTML = html;
    }

    addMessageToChat(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        const isUser = message.role === 'user';
        const messageEl = document.createElement('div');
        messageEl.className = 'message ' + message.role;
        messageEl.style.justifyContent = isUser ? 'flex-end' : 'flex-start';
        messageEl.innerHTML =
            (isUser ? '' : '<div class="message-avatar" style="background:#1e2040">🦊</div>') +
            '<div><div class="message-bubble" style="background:' + (isUser ? '#6c5ce7' : '#1e2040') + ';color:' + (isUser ? 'white' : '#e0e0e0') + ';max-width:100%;padding:0.75rem 1rem;border-radius:18px;' + (isUser ? 'border-bottom-right-radius:4px' : 'border-bottom-left-radius:4px') + '">' + message.content + '</div>' +
            '<div class="message-time" style="text-align:' + (isUser ? 'right' : 'left') + '">' + this.formatTime(message.timestamp) + '</div></div>' +
            (isUser ? '<div class="message-avatar" style="background:#6c5ce7;color:white">👤</div>' : '');
        chatMessages.appendChild(messageEl);
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;
        const typingIndicator = document.getElementById('typing-indicator');
        try {
            input.disabled = true; input.value = ''; input.style.height = 'auto';
            this.addMessageToChat({ role: 'user', content, timestamp: new Date().toISOString() });
            this.scrollChatToBottom();
            if (typingIndicator) typingIndicator.style.display = 'flex';
            const response = await fetch('/api/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            if (typingIndicator) typingIndicator.style.display = 'none';
            this.addMessageToChat(data.assistant_message);
            this.allChatMessages.push(data.user_message);
            this.allChatMessages.push(data.assistant_message);
            this.chatTotalCount = data.total_messages;
            this.updateMessageCount();
            this.scrollChatToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
            if (typingIndicator) typingIndicator.style.display = 'none';
        } finally { input.disabled = false; input.focus(); }
    }

    // ─── All existing methods ───
    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => { e.preventDefault(); this.loadPage(item.dataset.page); });
        });
        const chatForm = document.getElementById('chat-form');
        if (chatForm) chatForm.addEventListener('submit', (e) => { e.preventDefault(); this.sendMessage(); });
        const quickTaskForm = document.getElementById('quick-task-form');
        if (quickTaskForm) quickTaskForm.addEventListener('submit', (e) => { e.preventDefault(); this.addQuickTask(); });
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('input', () => this.autoResizeTextarea(chatInput));
            chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); } });
        }
        const chatSearch = document.getElementById('chat-search');
        if (chatSearch) {
            let searchTimeout;
            chatSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.chatSearchTerm = e.target.value.trim();
                    this.chatPage = 1;
                    this.allChatMessages = [];
                    this.loadChatPage(1, false).then(() => this.scrollChatToBottom());
                }, 300);
            });
        }
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
    }

    setupMobileMenu() {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => sidebar.classList.toggle('mobile-visible'));
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) sidebar.classList.remove('mobile-visible');
            });
        }
    }

    loadPage(page) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const navItem = document.querySelector('[data-page="' + page + '"]');
        if (navItem) navItem.classList.add('active');
        document.querySelectorAll('[id$="-page"]').forEach(p => p.classList.add('d-none'));
        const pageEl = document.getElementById(page + '-page');
        if (pageEl) pageEl.classList.remove('d-none');
        this.currentPage = page;
        this.loadPageData(page);
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('mobile-visible');
    }

    async loadPageData(page) {
        try {
            switch(page) {
                case 'dashboard': await this.loadDashboardStats(); await this.loadRecentActivity(); break;
                case 'chat': await this.loadChat(); break;
                case 'tasks': await this.loadTasks(); break;
                case 'scheduled': await this.loadScheduledJobs(); break;
                case 'activity': await this.loadActivity(); break;
                case 'stats': await this.loadDetailedStats(); break;
                case 'models': await this.loadModels(); break;
                case 'costs': await this.loadCosts(); break;
            }
        } catch (error) { console.error('Error loading ' + page + ':', error); }
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/api/activity?limit=10');
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const activities = await response.json();
            const activityList = document.getElementById('recent-activity');
            if (!activityList) return;
            if (activities && activities.length > 0) {
                activityList.innerHTML = activities.map(a => '<div class="activity-item"><div class="activity-time">' + this.formatDateTime(a.timestamp) + '</div><div class="activity-content"><h4>' + this.formatAction(a.action) + '</h4><p>' + a.summary + '</p></div></div>').join('');
            } else {
                activityList.innerHTML = '<div class="activity-item"><div class="activity-content"><p class="text-muted">No recent activity</p></div></div>';
            }
        } catch (error) { console.error('Error loading recent activity:', error); }
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const tasks = await response.json();
            this.allTasks = tasks;
            this.renderTasks(tasks);
            this.setupTaskFilters();
        } catch (error) { console.error('Error loading tasks:', error); }
    }

    renderTasks(tasks) {
        const filtered = this.taskFilter === 'all' ? tasks : tasks.filter(t => t.status === this.taskFilter);
        const tasksList = document.getElementById('tasks-list');
        if (!tasksList) return;
        if (filtered && filtered.length > 0) {
            tasksList.innerHTML = filtered.map(task =>
                '<div class="task-item" data-task-id="' + task.id + '">' +
                '<div class="task-title">' + task.title + '</div>' +
                '<div class="text-muted" style="font-size:0.85rem;margin:0.25rem 0">' + (task.description || '') + '</div>' +
                (task.progress !== undefined ? '<div style="background:#1e2040;border-radius:4px;height:6px;margin:0.5rem 0;overflow:hidden"><div style="background:' + (task.progress === 100 ? '#28c840' : '#6c5ce7') + ';height:100%;width:' + task.progress + '%;border-radius:4px;transition:width 0.3s"></div></div>' : '') +
                '<div class="task-meta"><span class="task-status status-' + task.status + '">' + task.status + '</span><span class="priority-' + task.priority + '">' + task.priority + '</span><span class="text-muted">' + (task.category || 'general') + '</span><span class="text-muted">' + this.formatDate(task.created_at) + '</span></div></div>'
            ).join('');
        } else { tasksList.innerHTML = '<div class="task-item"><div class="task-title text-muted">No tasks found</div></div>'; }
    }

    setupTaskFilters() {
        const header = document.querySelector('#tasks-page .card-header .d-flex');
        if (!header) return;
        const filters = ['all', 'queued', 'active', 'completed'];
        header.innerHTML = filters.map(f => '<button class="btn btn-secondary task-filter-btn' + (this.taskFilter === f ? ' active' : '') + '" data-filter="' + f + '" style="' + (this.taskFilter === f ? 'background:#6c5ce7;color:white' : '') + '">' + f.charAt(0).toUpperCase() + f.slice(1) + '</button>').join('');
        header.querySelectorAll('.task-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.taskFilter = btn.dataset.filter;
                header.querySelectorAll('.task-filter-btn').forEach(b => { b.style.background = ''; b.style.color = ''; });
                btn.style.background = '#6c5ce7'; btn.style.color = 'white';
                this.renderTasks(this.allTasks || []);
            });
        });
    }

    async loadScheduledJobs() {
        try {
            const response = await fetch('/api/scheduled');
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const jobs = await response.json();
            const jobsList = document.getElementById('scheduled-list');
            if (!jobsList) return;
            if (jobs && jobs.length > 0) {
                jobsList.innerHTML = jobs.map(job =>
                    '<div class="card"><div class="d-flex justify-content-between align-items-center"><div><h3 style="margin-bottom:0.25rem">' + job.name + '</h3><p class="text-muted" style="margin-bottom:0.25rem">' + (job.description || '') + '</p><p class="text-muted" style="font-size:0.85rem"><code style="background:#1e2040;padding:0.15rem 0.5rem;border-radius:4px">' + job.schedule + '</code> Type: ' + (job.job_type || 'unknown') + '</p></div><div style="text-align:right"><div class="status-indicator status-' + job.status + '"><div class="status-dot"></div>' + job.status + '</div>' + (job.next_run ? '<div class="text-muted mt-1" style="font-size:0.8rem">Next: ' + this.formatDateTime(job.next_run) + '</div>' : '') + (job.last_run ? '<div class="text-muted" style="font-size:0.8rem">Last: ' + this.formatDateTime(job.last_run) + ' (' + (job.last_status || '') + ')</div>' : '') + '</div></div></div>'
                ).join('');
            } else { jobsList.innerHTML = '<div class="card"><p class="text-muted">No scheduled jobs</p></div>'; }
        } catch (error) { console.error('Error loading scheduled jobs:', error); }
    }

    async loadActivity() {
        try {
            const response = await fetch('/api/activity?limit=50');
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const activities = await response.json();
            this.allActivities = activities;
            this.renderActivity(activities);
            this.setupActivityFilters();
        } catch (error) { console.error('Error loading activity:', error); }
    }

    renderActivity(activities) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;
        const filtered = this.activityFilter === 'all' ? activities : activities.filter(a => {
            if (this.activityFilter === 'tasks') return a.action.includes('task');
            if (this.activityFilter === 'chat') return a.action.includes('chat');
            if (this.activityFilter === 'cron') return a.session_type === 'monitoring' || a.action.includes('scheduled');
            return true;
        });
        if (filtered && filtered.length > 0) {
            activityList.innerHTML = filtered.map(a => '<div class="activity-item"><div class="activity-time">' + this.formatDateTime(a.timestamp) + '</div><div class="activity-content"><h4>' + this.formatAction(a.action) + '</h4><p>' + a.summary + '</p><p class="text-muted" style="font-size:0.75rem">' + (a.session_type || 'unknown') + ' - ' + (a.user || 'system') + '</p></div></div>').join('');
        } else { activityList.innerHTML = '<div class="activity-item"><div class="activity-content"><p class="text-muted">No activity found</p></div></div>'; }
    }

    setupActivityFilters() {
        const filterContainer = document.querySelector('#activity-page > .d-flex .d-flex');
        if (!filterContainer) return;
        const filters = ['all', 'tasks', 'chat', 'cron'];
        filterContainer.innerHTML = filters.map(f => '<button class="btn btn-secondary activity-filter-btn" data-filter="' + f + '" style="' + (this.activityFilter === f ? 'background:#6c5ce7;color:white' : '') + '">' + f.charAt(0).toUpperCase() + f.slice(1) + '</button>').join('');
        filterContainer.querySelectorAll('.activity-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activityFilter = btn.dataset.filter;
                filterContainer.querySelectorAll('.activity-filter-btn').forEach(b => { b.style.background = ''; b.style.color = ''; });
                btn.style.background = '#6c5ce7'; btn.style.color = 'white';
                this.renderActivity(this.allActivities || []);
            });
        });
    }

    scrollChatToBottom() {
        const el = document.getElementById('chat-messages');
        if (!el) return;
        // Temporarily disable smooth scroll for instant jump
        el.style.scrollBehavior = 'auto';
        el.scrollTop = el.scrollHeight;
        requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight;
            setTimeout(() => {
                el.scrollTop = el.scrollHeight;
                // Re-enable smooth scroll after jump
                el.style.scrollBehavior = 'smooth';
            }, 50);
        });
        // Final fallback for slow renders
        setTimeout(() => { el.scrollTop = el.scrollHeight; }, 500);
    }
    formatAction(action) { return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
    formatTime(ts) { try { return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch(e) { return 'now'; } }
    formatDate(ts) { try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch(e) { return 'today'; } }
    formatDateTime(ts) { try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch(e) { return 'now'; } }
    showError(msg) { this.showToast(msg, '#ff4757'); }
    showSuccess(msg) { this.showToast(msg, '#28c840'); }
    showToast(message, bg) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;top:20px;right:20px;background:' + bg + ';color:white;padding:12px 20px;border-radius:8px;z-index:9999;font-size:0.9rem;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => document.body.removeChild(toast), 300); }, 3000);
    }
    autoResizeTextarea(textarea) { textarea.style.height = 'auto'; textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'; }
    async addQuickTask() {
        const input = document.getElementById('quick-task-input');
        const title = input.value.trim();
        if (!title) return;
        try {
            const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
            if (!response.ok) throw new Error();
            input.value = ''; this.showSuccess('Task added!'); this.loadDashboardStats();
        } catch(e) { this.showError('Failed to add task'); }
    }
    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        this.selectedFiles = files;
        const preview = document.getElementById('file-preview');
        if (!preview) return;
        if (files.length > 0) {
            preview.style.display = 'block';
            preview.innerHTML = files.map((f, i) => '<div class="file-preview-item"><span class="file-name">' + f.name + ' (' + (f.size/1024).toFixed(1) + ' KB)</span><button class="file-remove-btn" onclick="window.drewApp.removeFile(' + i + ')">x</button></div>').join('');
        } else { preview.style.display = 'none'; }
    }
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        const dt = new DataTransfer();
        this.selectedFiles.forEach(f => dt.items.add(f));
        document.getElementById('file-input').files = dt.files;
        this.handleFileSelection({ target: { files: dt.files } });
    }
}

document.addEventListener('DOMContentLoaded', () => { window.drewApp = new DrewCommandCenter(); });
