# Marketing Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the React web app with a static marketing landing page for CalTracker.

**Architecture:** Single HTML + CSS page served by nginx. No JavaScript, no build step. The nginx config is updated to serve from `site/` instead of `frontend/dist`. The `/api/` proxy stays unchanged for the iOS app.

**Tech Stack:** HTML, CSS, nginx

**Spec:** `docs/superpowers/specs/2026-03-18-marketing-landing-page-design.md`

---

### Task 1: Create the HTML page

**Files:**
- Create: `site/index.html`

- [ ] **Step 1: Create the `site/` directory and `assets/` subdirectory**

```bash
mkdir -p site/assets
```

- [ ] **Step 2: Write `site/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CalTracker — Track calories by just talking about your food</title>
    <meta name="description" content="No searching ingredients. No weighing grams. Just tell CalTracker what you ate.">
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <!-- Hero -->
    <section class="hero">
        <div class="hero-content">
            <h1>Track calories by just talking about your food</h1>
            <p class="hero-sub">No searching ingredients. No weighing grams. Just tell CalTracker what you ate.</p>
            <a href="#" class="cta-button">Download on the App Store</a>
        </div>
        <div class="hero-visual">
            <div class="phone-frame">
                <div class="phone-screen">
                    <div class="chat-bubble chat-user">Had a chicken sandwich and a coffee for lunch</div>
                    <div class="chat-bubble chat-assistant">Got it! That's about 520 kcal total — 420 for the chicken sandwich and 100 for the coffee with milk. You're at 1,240 / 2,100 kcal for today.</div>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works -->
    <section class="how-it-works">
        <div class="steps">
            <div class="step">
                <span class="step-number">1</span>
                <h3>Say what you ate</h3>
                <p>Had a chicken sandwich and a coffee. That's all you need to type.</p>
            </div>
            <div class="step">
                <span class="step-number">2</span>
                <h3>Get instant tracking</h3>
                <p>CalTracker understands your meal and logs the calories automatically.</p>
            </div>
            <div class="step">
                <span class="step-number">3</span>
                <h3>See your progress</h3>
                <p>Simple dashboard. Weight trend, daily calories. Nothing extra.</p>
            </div>
        </div>
    </section>

    <!-- Why CalTracker -->
    <section class="why">
        <div class="feature-cards">
            <div class="feature-card">
                <h3>No ingredient search, no gram counting</h3>
                <p>Other apps make you search a database and weigh everything. CalTracker just listens.</p>
            </div>
            <div class="feature-card">
                <h3>No bloat</h3>
                <p>No water intake. No exercise rings. No social features. Just food and weight.</p>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="footer-content">
            <p class="footer-brand">CalTracker</p>
            <div class="footer-links">
                <a href="#">Download on the App Store</a>
                <a href="#">Privacy Policy</a>
            </div>
            <p class="footer-copy">&copy; 2026 CalTracker</p>
        </div>
    </footer>

</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add site/index.html
git commit -m "feat: add marketing landing page HTML"
```

---

### Task 2: Create the CSS

**Files:**
- Create: `site/style.css`

- [ ] **Step 1: Write `site/style.css`**

```css
/* ── Reset & Base ── */

*,
*::before,
*::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --accent: #007AFF;
    --bg: #ffffff;
    --bg-alt: #f5f5f7;
    --text: #1d1d1f;
    --text-secondary: #6e6e73;
    --card-bg: #ffffff;
    --card-border: #e5e5e7;
    --phone-bg: #f5f5f7;
    --chat-user-bg: #007AFF;
    --chat-user-text: #ffffff;
    --chat-assistant-bg: #e9e9eb;
    --chat-assistant-text: #1d1d1f;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #000000;
        --bg-alt: #1c1c1e;
        --text: #f5f5f7;
        --text-secondary: #a1a1a6;
        --card-bg: #1c1c1e;
        --card-border: #38383a;
        --phone-bg: #1c1c1e;
        --chat-assistant-bg: #2c2c2e;
        --chat-assistant-text: #f5f5f7;
    }
}

html {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--text);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
}

body {
    line-height: 1.6;
}

/* ── Hero ── */

.hero {
    max-width: 960px;
    margin: 0 auto;
    padding: 80px 24px 60px;
    display: flex;
    align-items: center;
    gap: 60px;
}

.hero-content {
    flex: 1;
}

.hero h1 {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    margin-bottom: 16px;
}

.hero-sub {
    font-size: 1.15rem;
    color: var(--text-secondary);
    margin-bottom: 32px;
    max-width: 420px;
}

.cta-button {
    display: inline-block;
    padding: 14px 28px;
    background: var(--accent);
    color: #fff;
    text-decoration: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    transition: opacity 0.2s;
}

.cta-button:hover {
    opacity: 0.85;
}

/* ── Phone Mockup ── */

.hero-visual {
    flex: 0 0 280px;
}

.phone-frame {
    width: 280px;
    height: 500px;
    background: var(--phone-bg);
    border-radius: 36px;
    border: 3px solid var(--card-border);
    padding: 40px 16px 24px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
}

.phone-screen {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.chat-bubble {
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 0.85rem;
    line-height: 1.45;
    max-width: 90%;
}

.chat-user {
    background: var(--chat-user-bg);
    color: var(--chat-user-text);
    align-self: flex-end;
    border-bottom-right-radius: 4px;
}

.chat-assistant {
    background: var(--chat-assistant-bg);
    color: var(--chat-assistant-text);
    align-self: flex-start;
    border-bottom-left-radius: 4px;
}

/* ── How It Works ── */

.how-it-works {
    background: var(--bg-alt);
    padding: 60px 24px;
}

.steps {
    max-width: 960px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
}

.step {
    text-align: center;
}

.step-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 12px;
}

.step h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 8px;
}

.step p {
    color: var(--text-secondary);
    font-size: 0.95rem;
}

/* ── Why CalTracker ── */

.why {
    max-width: 960px;
    margin: 0 auto;
    padding: 60px 24px;
}

.feature-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
}

.feature-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 32px;
}

.feature-card h3 {
    font-size: 1.15rem;
    font-weight: 600;
    margin-bottom: 8px;
}

.feature-card p {
    color: var(--text-secondary);
    font-size: 0.95rem;
}

/* ── Footer ── */

footer {
    border-top: 1px solid var(--card-border);
    padding: 40px 24px;
}

.footer-content {
    max-width: 960px;
    margin: 0 auto;
    text-align: center;
}

.footer-brand {
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 12px;
}

.footer-links {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 12px;
}

.footer-links a {
    color: var(--accent);
    text-decoration: none;
    font-size: 0.9rem;
}

.footer-links a:hover {
    text-decoration: underline;
}

.footer-copy {
    color: var(--text-secondary);
    font-size: 0.8rem;
}

/* ── Responsive ── */

@media (max-width: 768px) {
    .hero {
        flex-direction: column;
        text-align: center;
        padding: 48px 24px 40px;
        gap: 40px;
    }

    .hero-sub {
        max-width: none;
    }

    .hero-visual {
        flex: none;
    }

    .steps {
        grid-template-columns: 1fr;
        max-width: 400px;
    }

    .feature-cards {
        grid-template-columns: 1fr;
    }

    .hero h1 {
        font-size: 2rem;
    }
}
```

- [ ] **Step 2: Verify the page looks correct**

Open `site/index.html` in a browser and check:
- Light and dark mode both work
- Hero section: headline, subline, CTA button, phone mockup with chat bubbles
- How It Works: 3 numbered steps in columns (stacks on mobile)
- Why CalTracker: 2 feature cards side by side (stacks on mobile)
- Footer: brand, links, copyright
- Mobile: resize to < 768px, verify everything stacks

- [ ] **Step 3: Commit**

```bash
git add site/style.css
git commit -m "feat: add marketing landing page styles"
```

---

### Task 3: Update nginx config

**Files:**
- Modify: `deploy/calorie-tracker.nginx`

- [ ] **Step 1: Update nginx config to serve from `site/`**

Replace the entire file with:

```nginx
server {
    listen 80;
    server_name 89.167.66.135;

    # Marketing site
    root /opt/calorie-tracker/site;
    index index.html;

    # API proxy to FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add deploy/calorie-tracker.nginx
git commit -m "chore: update nginx to serve static marketing site"
```

---

### Task 4: Deploy

- [ ] **Step 1: Push all changes**

```bash
git push
```

- [ ] **Step 2: Deploy on VPS (manual)**

```bash
cd /opt/calorie-tracker && git pull
sudo cp deploy/calorie-tracker.nginx /etc/nginx/sites-available/calorie-tracker
sudo nginx -t && sudo systemctl reload nginx
```

- [ ] **Step 3: Verify in browser**

Visit `http://89.167.66.135` — should show the marketing landing page, not the React app.

Visit `http://89.167.66.135/api/docs` — should still show the FastAPI docs (API proxy unchanged).
