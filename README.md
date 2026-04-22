Calendar
A modern calendar application with rich data visualization and event management features

Features
Calendar Views
Day View - Hourly schedule display with current time indicator
Week View - Full week overview with event blocks
Month View - Monthly calendar grid with event previews
Event Management
Create, edit, and delete events with rich details
Categorize events (e.g., 售前/Pre-sales, 项目/Project)
Mark events as urgent or completed
Set reminders for events
Filter events by category
Data Statistics Panel
Comprehensive data visualization dashboard:

Completion rate display (weekly & cumulative)
Category distribution (dual pie charts)
4-week trend line chart
24 solar terms heatmap
Monthly distribution bar chart
Export
Export events to JSON format
Export current week's events
Grouped by category
Desktop App
Native Windows application via Electron
Standalone executable, no installation required
Quick Start
HTML Version
Navigate to releases/v1.2.11/html/
Double-click start.bat
Open http://localhost:3000 in your browser
Desktop App
Navigate to releases/v1.2.11/win/ and double-click Calendar.exe

Development

npm install
npm run dev
Tech Stack
Framework: Next.js 16 with React 19
Language: TypeScript
Styling: Tailwind CSS
Desktop: Electron
Date Handling: date-fns
Database: Dexie (IndexedDB)
Charts: Custom SVG visualizations
License
MIT License
