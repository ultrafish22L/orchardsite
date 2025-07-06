# Giant Sloth Orchard - Complete Tropical Farm Web Application Reproduction Prompt

## PART I: USER EXPERIENCE & DESIGN SPECIFICATION

### Core Application Purpose
Create a sophisticated web application for Giant Sloth Orchard, a tropical farm on Hawaii's Big Island, that serves as both a comprehensive plant catalog and real-time farm management dashboard. The application must feel like a premium tropical experience while providing practical functionality for plant enthusiasts, visitors, and farm operations.

### Visual Design Language

**Tropical Hawaiian Aesthetic:**
- **Color Palette**: Deep tropical greens transitioning to seafoam, with mint white accents and warm golden highlights
- **Background**: Fixed tropical forest photography with animated gradient overlays creating depth and movement
- **Glassmorphism Effects**: Semi-transparent containers with backdrop blur throughout, creating floating glass panels
- **Typography**: Clean, modern sans-serif with gradient text effects on headers and italicized botanical names
- **Lighting**: Subtle glow effects and enhanced shadows suggesting dappled sunlight through forest canopy

**Interactive Elements:**
- **Hover States**: Smooth scale transforms (1.05x) with upward translation and glowing tropical shadows
- **Floating Animations**: Random tropical emojis continuously floating upward from bottom with gentle rotation and blur
- **Transitions**: All interactions use smooth cubic-bezier easing (0.3s duration) for premium feel
- **Depth Layers**: Clear visual hierarchy with multiple z-index levels creating spatial relationships

### Navigation Architecture

**Primary Navigation Bar**: Six main sections arranged horizontally with glassmorphism styling:
- **Home**: Plant catalog and search (default active state)
- **Weather**: Real-time weather dashboard with charts and historical data
- **Map**: Interactive farm layout with drag-and-drop plant positioning
- **Resources**: Growing guides, external links, and cultivation resources
- **About**: Farm story, philosophy, and background
- **Contact**: Visit information and location details

**Context-Sensitive Secondary Navigation**: Each primary section reveals relevant secondary controls:
- **Home**: Plant category filters (All, Bananas, Citrus, Theobroma, Fruit, Herbs & Spices, Carnivorous, Ornamental, Wish List)
- **Weather**: Dashboard/Graphs toggle, mode selector (Demo/Cloud/Local/Auto), settings gear icon
- **Map**: Plant selector dropdown, add/edit/delete tools with confirmation controls
- **Other Sections**: Decorative tropical emoji strip for visual consistency

### Plant Catalog Experience

**Grid Layout:**
- **Responsive Cards**: Adaptive grid (1-4 columns based on screen size) with consistent aspect ratios
- **Card Content**: High-quality plant photo, common name (large), botanical name (italicized, smaller), category badge
- **Hover Behavior**: Cards lift and glow on hover, creating tactile feedback
- **Loading States**: Graceful image loading with emoji fallbacks (🌿) for failed images
- **Search Integration**: Real-time filtering with highlighted results, no page refreshes

**Plant Detail Experience:**
- **Modal Overlay**: Full-screen modal with blurred background, maintaining context
- **Image Gallery**: Large primary image with zoom capability, additional photos if available
- **Information Tabs**: General Info, Cultivation Tips, Pest Management, Pruning Guidelines
- **Resource Links**: External links with clear indicators and new tab behavior
- **Navigation**: Circular back button (bottom-left) with arrow icon, unobtrusive but accessible

### Weather Dashboard Experience

**Real-Time Data Display:**
- **Current Conditions**: Large, prominent display of temperature, humidity, wind, pressure
- **Visual Charts**: Multiple chart types (line, area, bar, polar) showing trends and patterns
- **Mode Switching**: Seamless transitions between demo data and live API feeds
- **Historical Views**: 24-hour, 7-day, and monthly data perspectives
- **Mobile Optimization**: Charts adapt to screen size with touch-friendly interactions

### Interactive Farm Map

**Plant Positioning System:**
- **Visual Map**: Farm layout background image with overlay for plant markers
- **Drag-and-Drop**: Intuitive plant positioning with visual feedback during drag operations
- **Edit Modes**: Clear visual states for view/edit modes with appropriate tool visibility
- **Plant Selection**: Dropdown populated from plant database for adding new positions
- **Confirmation Flow**: Clear cancel/confirm options for destructive operations
- **Print Functionality**: 2-page print layout with map rotated 90° showing positioned plants

### Content Pages Design

**About Page**: Centered content window with the exact text: "Located on the beautiful Big Island of Hawaii, Giant Sloth Orchard is a small tropical farm specializing in exotic food trees and plants. We grow rare and delicious tropical fruits, herbs, and spices to nourish our ohana and share the bounty of Hawaii's incredible growing climate. Giant sloths love cacao. We support the delicate balance of the forest. Our food is of the gods. Not incidental in FishDivine evolution, we decide which fruits thrive as tastier, more nutritious, multivariate delights. We are aware of our stereotype, but unvexed, with ease, we deliberately follow our noses with curiosity...ever seeking theobroma."

**Resources Page:**
- **External Links Section**: https://plantpono.org/, https://www.ctahr.hawaii.edu, https://www.hawaiiantropicalplants.com
- **Avocado Growing Guide**: Comprehensive cultivation notes
- **Background**: Rare plant photography for visual interest
- **Layout**: Centered content window with side margins, not full-width

**Contact Page**: Simple, elegant presentation: "Visits to Giant Sloth Orchard are available by appointment only" Location: Holualoa, Hawaii Island. Decorated with tropical emoji icons.

### Responsive Behavior

**Mobile Experience:**
- **Touch-Friendly**: All interactive elements minimum 44px touch targets
- **Navigation**: Collapsible secondary navigation for space efficiency
- **Charts**: Responsive scaling with touch interactions for data exploration
- **Plant Cards**: Single column layout with optimized image sizes
- **Modal Behavior**: Full-screen takeover on mobile devices

**Desktop Experience:**
- **Multi-Column Layouts**: Efficient use of screen real estate
- **Hover States**: Rich hover interactions throughout
- **Keyboard Navigation**: Full keyboard accessibility for power users
- **Multi-Tasking**: Ability to have multiple sections visible simultaneously

### Performance Expectations

**Loading Experience:**
- **Progressive Enhancement**: Core content loads first, enhancements layer on
- **Image Optimization**: Lazy loading with smooth fade-in animations
- **Smooth Interactions**: No janky animations, 60fps target for all transitions
- **Offline Capability**: Graceful degradation when network unavailable
- **Error Recovery**: User-friendly error messages with clear recovery paths

---

## PART II: TECHNICAL IMPLEMENTATION SPECIFICATION

### Exact File Structure
```
├── proxy-server.js      (651 lines) - Express server with CORS proxy
├── index.html          (887 lines) - Complete SPA with embedded structure
├── styles.css          (1948 lines) - Full styling system
├── app.js             (245 lines) - Core application orchestration
├── weather-manager.js  (1328 lines) - Weather API integration
├── plant-manager.js   (371 lines) - Plant catalog management
├── map-manager.js     (1341 lines) - Interactive mapping system
├── plantdatabase.js   (1540 lines) - Plant data with photos/info
├── package.json       (160 lines) - Node.js configuration
├── giantslothorchard.png - Logo image with circular cropping
└── giantslothorchard_map.png - Farm map background
```

### Express Server Implementation (proxy-server.js)

**Dependencies:**
```javascript
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
```

**Core Server Configuration:**
```javascript
const app = express();
const PORT = process.env.PORT || 3000;

// CORS enabled for all origins
app.use(cors());

// WeatherLink API proxy with specific path rewriting
app.use('/api/weatherlink', createProxyMiddleware({
    target: 'https://api.weatherlink.com',
    changeOrigin: true,
    pathRewrite: { '^/api/weatherlink': '' }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Demo data generation endpoints
app.get('/api/demo/current', generateDemoWeatherData);
app.get('/api/demo/historical', generateDemoHistoricalData);

// Static file serving
app.use(express.static('.'));
```

### HTML Structure (index.html - 887 lines)

**Document Head:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Giant Sloth Orchard - Exotic Tropical Plants & Rare Fruits</title>
    <meta name="description" content="Giant Sloth Orchard - Specializing in exotic tropical plants and rare fruits on the Big Island of Hawaii.">
    <link rel="icon" type="image/png" href="giantslothorchard.png">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
```

**Header Structure:**
```html
<header class="header">
    <div class="header-content">
        <div class="logo">
            <img src="giantslothorchard.png" alt="Giant Sloth Orchard Logo" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span style="display: none;">🦥</span>
        </div>
        <div class="header-text">
            <h1>Giant Sloth Orchard</h1>
            <p>Exotic Tropical Plants & Rare Fruits 🌺 Big Island, Hawaii</p>
        </div>
    </div>
</header>
```

**Navigation Implementation:**
- Primary navigation with 6 buttons (Home, Weather, Map, Resources, About, Contact)
- Context-sensitive secondary navigation that changes based on active section
- Search container integrated into navigation
- Dynamic loading of plant and map database scripts

### CSS Architecture (styles.css - 1948 lines)

**Root Variables:**
```css
:root {
    --primary-gradient: linear-gradient(135deg, #0f4c3a 0%, #2d8f64 100%);
    --glass-bg: rgba(255, 255, 255, 0.1);
    --glass-border: rgba(255, 255, 255, 0.2);
    --tropical-green: #2d8f64;
    --shadow-tropical: rgba(45, 143, 100, 0.3);
}
```

**Body and Background:**
```css
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #0f4c3a 0%, #2d8f64 100%);
    background-attachment: fixed;
    color: white;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    overflow-x: hidden;
}

body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2560&q=80');
    background-size: cover;
    background-position: center;
    opacity: 0.3;
    z-index: -1;
}
```

**Floating Animation System:**
```css
.floating-icon {
    position: fixed;
    font-size: 24px;
    opacity: 0.6;
    z-index: -1;
    pointer-events: none;
    animation: float-up linear;
}

@keyframes float-up {
    0% {
        bottom: -30px;
        transform: rotate(0deg) translateX(0px);
        opacity: 0.6;
    }
    50% {
        transform: rotate(180deg) translateX(20px);
    }
    100% {
        bottom: 100vh;
        transform: rotate(360deg) translateX(-20px);
        opacity: 0;
    }
}
```

### JavaScript Module Architecture

**App.js - Core Orchestration (245 lines):**
```javascript
class OrchardApp {
    constructor() {
        this.currentPage = 'home';
        this.managers = {
            plant: new PlantManager(),
            weather: new WeatherManager(),
            map: new MapManager()
        };
        this.init();
    }
    
    init() {
        this.setupNavigation();
        this.setupFloatingIcons();
        this.setupSearch();
        this.loadInitialData();
    }
    
    setupNavigation() {
        // Primary navigation event handlers
        // Secondary navigation context switching
        // Page state management
    }
    
    setupFloatingIcons() {
        // Random icon generation from emoji set
        // Continuous animation spawning
        // Performance optimization for animations
    }
}
```

**Weather-Manager.js - API Integration (1328 lines):**
```javascript
class WeatherManager {
    constructor() {
        this.currentMode = 'demo';
        this.apiEndpoints = {
            demo: '/api/demo/current',
            cloud: '/api/weatherlink/v2/current',
            local: '/api/weatherlink/current'
        };
        this.charts = {};
        this.updateInterval = null;
    }
    
    async fetchWeatherData(mode = this.currentMode) {
        // API request handling with error recovery
        // Data caching and refresh logic
        // Fallback to demo mode on API failure
    }
    
    initializeCharts() {
        // Chart.js configuration for each chart type
        // Responsive design settings
        // Real-time update mechanisms
    }
}
```

**Plant-Manager.js - Catalog System (371 lines):**
```javascript
class PlantManager {
    constructor() {
        this.plants = []; // Loaded from plantdatabase.js
        this.filteredPlants = [];
        this.currentCategory = 'all';
        this.searchTerm = '';
    }
    
    filterPlants(category, searchTerm = '') {
        // Multi-criteria filtering logic
        // Search algorithm with fuzzy matching
        // Real-time grid updates
    }
    
    renderPlantGrid() {
        // Dynamic HTML generation
        // Lazy image loading implementation
        // Event handler attachment
    }
    
    showPlantDetail(plantId) {
        // Modal creation and population
        // Image gallery functionality
        // Resource link handling
    }
}
```

**Map-Manager.js - Interactive Mapping (1341 lines):**
```javascript
class MapManager {
    constructor() {
        this.editMode = false;
        this.plantPositions = new Map();
        this.dragState = { isDragging: false, currentPlant: null };
        this.mapContainer = null;
    }
    
    initializeMap() {
        // Map container setup
        // Background image loading
        // Plant marker creation
    }
    
    enableEditMode() {
        // Visual state changes
        // Event handler modifications
        // Tool visibility updates
    }
    
    handlePlantDrag(event) {
        // Touch and mouse event handling
        // Position calculation and validation
        // Visual feedback during drag
    }
    
    printMap() {
        // Captures actual map state with positioned plants
        // Creates 2-page print layout (both pages rotated 90°)
        // Includes plant list and contact information
        // Uses actual map background image with fallback to gradient
        // Preserves plant positions from edit mode in print output
        // Fully compatible with file:// protocol (no server required)
    }
}
```

### Package.json Configuration (160 lines)

**Dependencies:**
```json
{
    "dependencies": {
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "http-proxy-middleware": "^2.0.6"
    },
    "devDependencies": {
        "nodemon": "^3.0.1",
        "eslint": "^8.50.0"
    },
    "optionalDependencies": {
        "pm2": "^5.3.0"
    }
}
```

**Scripts:**
```json
{
    "scripts": {
        "start": "node proxy-server.js",
        "dev": "nodemon proxy-server.js --watch proxy-server.js --watch public/",
        "test": "node scripts/test-apis.js",
        "health": "curl -s http://localhost:3000/api/health | jq .",
        "demo": "curl -s http://localhost:3000/api/demo/current | jq ."
    }
}
```

### Data Integration Points

**Plant Database Integration (plantdatabase.js - 1540 lines):**
- External plantdatabase.js file with array of plant objects
- Each plant object contains: name, botanical, category, emoji, info_url, general_info, cultivation_tips, pest_management, pruning_guidelines
- Botanical names must be italicized in all displays
- Category-based filtering system
- Search functionality across all text fields

**Weather Data Structure:**
```javascript
// Expected API response format
{
    temperature: { current: 75.2, high: 82.1, low: 68.9 },
    humidity: 65,
    wind: { speed: 8.5, direction: 'NE', gust: 12.3 },
    pressure: 30.15,
    rainfall: { today: 0.25, week: 1.75 }
}
```

**Map Data Persistence:**
- Plant positions stored in localStorage
- Dynamic loading/saving of plant placements
- Drag-and-drop position calculations
- Edit mode state management

### Critical Implementation Details

**Offline Compatibility:**
- Site must work when opened directly from file:// protocol
- Weather manager defaults to demo mode when no server available
- Map print function works without server dependencies
- All external CDN resources (Chart.js, html2canvas) cached by browser

**Map Print Functionality:**
- Captures current map state with all positioned plants
- Calculates relative positions for print layout
- Creates 2-page document with map rotated 90° on both pages
- Includes plant list and contact information
- Uses actual giantslothorchard_map.png as background
- Fallback to CSS gradient if image unavailable

**Navigation State Management:**
- Context-sensitive secondary navigation
- Page state persistence
- Smooth transitions between sections
- Search integration with real-time filtering

---

## POTENTIAL IMPROVEMENTS

1. **Enhanced Plant Database**: Add more plant photos (plant_photo, flower_photo, fruit_photo) by scraping from specified Hawaiian plant websites
2. **Advanced Search**: Implement fuzzy search with autocomplete and search history
3. **Plant Care Calendar**: Add seasonal care reminders and planting schedules
4. **Mobile App**: Progressive Web App (PWA) capabilities for offline mobile use
5. **User Accounts**: Save personal plant collections and visit history
6. **Interactive Tours**: Virtual farm tours with 360° photography
7. **E-commerce Integration**: Plant sales and appointment booking system
8. **Social Features**: Plant sharing and community growing tips
9. **Advanced Analytics**: Plant growth tracking and yield predictions
10. **Multilingual Support**: Hawaiian and other language translations