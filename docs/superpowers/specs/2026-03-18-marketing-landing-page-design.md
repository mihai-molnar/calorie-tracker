# CalTracker Marketing Landing Page — Design Spec

## Overview

A static marketing landing page replacing the React web app. Single HTML file + CSS, no build step, no JavaScript framework. Served by the existing nginx on the Hetzner VPS.

## Goal

Present CalTracker to potential users, communicate the two core differentiators (conversational tracking and no bloat), and link to the App Store.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | Static HTML |
| Styling | CSS (single file) |
| Fonts | System font stack (no external fonts) |
| Hosting | nginx on existing Hetzner VPS |
| JavaScript | None |

## Color & Style

- **Accent:** iOS system blue (`#007AFF`)
- **Background:** White (light) / near-black (dark)
- **Text:** Dark gray on light, light gray on dark
- **Font:** System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Dark mode:** Automatic via `prefers-color-scheme: dark` media query
- **Tone:** Casual and friendly
- **Responsiveness:** Mobile-first, stacks vertically on small screens

## Page Structure

### 1. Hero Section

- **Headline:** "Track calories by just talking about your food"
- **Subline:** "No searching ingredients. No weighing grams. Just tell CalTracker what you ate."
- **CTA:** "Download on the App Store" button (placeholder `#` href until published)
- **Visual:** Phone mockup placeholder on the right (CSS-styled div simulating a phone frame with a chat UI sketch). Will be replaced with real screenshots later.

### 2. How It Works (3 columns, stacks on mobile)

| Step | Title | Description |
|------|-------|-------------|
| 1 | Say what you ate | "Had a chicken sandwich and a coffee. That's all you need to type." |
| 2 | Get instant tracking | "CalTracker understands your meal and logs the calories automatically." |
| 3 | See your progress | "Simple dashboard. Weight trend, daily calories. Nothing extra." |

### 3. Why CalTracker (2 feature cards)

**Card 1 — "No ingredient search, no gram counting"**
"Other apps make you search a database and weigh everything. CalTracker just listens."

**Card 2 — "No bloat"**
"No water intake. No exercise rings. No social features. Just food and weight."

### 4. Footer

- App name + year
- "Download on the App Store" link (placeholder)
- "Privacy Policy" link (placeholder, required for App Store)

## File Structure

```
site/
  index.html      # Single-page marketing site
  style.css       # All styles
  assets/         # Future screenshots, favicon, etc.
```

## Deployment

### nginx Config Changes

Update `calorie-tracker.nginx` to serve from `site/` instead of `frontend/dist`:

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

Changes from current config:
- `root` points to `site/` instead of `frontend/dist`
- Removed SPA fallback (`try_files ... /index.html`) — not needed for a static page

### Deployment Steps

```bash
cd /opt/calorie-tracker && git pull
sudo cp deploy/calorie-tracker.nginx /etc/nginx/sites-available/calorie-tracker
sudo nginx -t && sudo systemctl reload nginx
```

No backend restart needed.

## What's Removed

The React frontend (`frontend/` directory) is no longer served. The directory stays in the repo for reference but is not deployed. The nginx config no longer references it.

## What's Preserved

- Backend API (`/api/` proxy) — unchanged, iOS app continues to use it
- Backend systemd service — unchanged
- SSL/domain can be added later without changing the page structure

## Future

- Replace phone mockup placeholder with real app screenshots
- Add proper domain name instead of IP
- Add SSL (Let's Encrypt)
- Add App Store link when published
- Add privacy policy page
- Rename "CalTracker" when final name is chosen (text find-and-replace)
