# Calendar

A modern calendar application with rich data visualization and event management features.

![Version](https://img.shields.io/badge/version-1.3.1-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20HTML-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

## Features

### Calendar Views
- **Day View** - Hourly schedule display with current time indicator
- **Week View** - Full week overview with event blocks
- **Month View** - Monthly calendar grid with event previews

### Event Management
- Create, edit, and delete events with rich details
- Categorize events (e.g., 售前/Pre-sales, 项目/Project)
- Mark events as urgent or completed
- Set reminders for events
- Filter events by category

### Data Statistics Panel
Comprehensive data visualization dashboard:
- Completion rate display (weekly & cumulative)
- Category distribution (dual pie charts)
- 4-week trend line chart
- Activity heatmap (weekly patterns)
- Monthly distribution bar chart

### Export
- Export events to JSON format
- Export current week's events
- Grouped by category

### Desktop App
- Native Windows application via Electron
- Standalone executable, no installation required

## Screenshots

*Coming soon*

## Quick Start

### HTML Version

1. Navigate to `releases/v1.3.1/html/`
2. Double-click `start.bat`
3. Open http://localhost:3000 in your browser

Or use command line:
```bash
cd releases/v1.3.1/html
npx serve . -p 3000
```

### Desktop App

Navigate to `releases/v1.3.1/win/` and double-click `Calendar.exe`

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build Electron app
npm run electron:build
```

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Desktop**: Electron
- **Date Handling**: date-fns
- **Database**: Dexie (IndexedDB)
- **Charts**: Custom SVG visualizations

## Project Structure

```
calendar/
├── app/                 # Next.js app directory
│   ├── page.tsx         # Main calendar page
│   ├── life/            # Life calendar page
│   └── settings/        # Settings page
├── components/
│   ├── calendar/        # Calendar components (DayView, WeekView, MonthView)
│   ├── events/          # Event components (EventBlock, EventForm)
│   └── stats/           # Statistics panel components
├── context/             # React context providers
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── types/               # TypeScript type definitions
├── electron/            # Electron main & preload scripts
└── releases/            # Release versions (gitignored)
```

## License

MIT License

## Changelog

See [RELEASES.md](RELEASES.md) for release history.