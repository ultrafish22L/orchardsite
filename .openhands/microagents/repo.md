# Giant Sloth Orchard Website Repository Guide

## 🌺 Overview
Giant Sloth Orchard is a comprehensive web application for a tropical fruit farm located on the Big Island of Hawaii. The site features an interactive plant catalog, farm mapping system, and real-time weather monitoring integration.

## 🏗️ Architecture

### Frontend Structure
- **Single Page Application (SPA)** with multiple content sections
- **Modular JavaScript architecture** using the revealing module pattern
- **Hawaiian tropical theme** with glassmorphism design elements
- **Responsive design** optimized for desktop and mobile

### Backend Structure
- **Express.js proxy server** for weather API integration
- **CORS-enabled** for cross-origin requests
- **Static file serving** for the frontend application
- **API signature generation** for WeatherLink authentication

## 📁 Key Files & Directories

### Core Application Files
```
index.html              # Main HTML application interface
app.js                  # Application coordinator and page management
proxy-server.js         # Express.js backend server
package.json           # Node.js dependencies and scripts
styles.css             # Hawaiian-themed CSS with glassmorphism
```

### JavaScript Modules
```
plant-manager.js       # Plant catalog and search functionality
map-manager.js         # Interactive farm map with drag-and-drop
weather-manager.js     # Weather station data integration
plantdatabase.js       # Comprehensive tropical plant database
mapdata.js            # Farm map configuration and plant placement data
```

### Assets & Resources
```
giantslothorchard.png     # Main logo image
giantslothorchard_map.png # Farm map background image
node_modules/             # NPM dependencies
```

### Documentation
```
*.md files               # Various setup and feature documentation
*.pdf files             # Detailed setup guides
```

## 🎯 Core Features

### 1. Plant Catalog System
- **Database**: 100+ tropical plants with detailed information
- **Categories**: Bananas, Citrus, Theobroma, Fruits, Herbs, Carnivorous, Ornamental
- **Search**: Real-time plant search with filtering
- **Details**: Botanical names, cultivation tips, pest management, pruning guidelines

### 2. Interactive Farm Map
- **Drag & Drop**: Place plants on farm map with visual representation
- **Edit Mode**: Move, add, or remove plants from map
- **Plant Sizing**: Accurate plant size representation based on mature dimensions
- **Data Persistence**: Save/load map configurations
- **Export**: Print-friendly map generation

### 3. Weather Station Integration
- **Multiple APIs**: WeatherLink v2 Cloud API and Local API support
- **Real-time Data**: Live weather monitoring with automatic updates
- **Historical Charts**: Temperature, humidity, pressure, wind, rainfall data
- **Demo Mode**: Simulated data for testing and demonstration
- **Performance Monitoring**: API call statistics and connection status

### 4. User Interface
- **Navigation**: Multi-level navigation with primary and secondary menus
- **Responsive**: Mobile-friendly design with touch interactions
- **Accessibility**: Keyboard navigation and screen reader support
- **Visual Feedback**: Loading states, error messages, success confirmations

## 🔧 Technical Implementation

### JavaScript Architecture
```javascript
// Module Pattern Example
window.ModuleName = (function() {
    'use strict';
    
    // Private variables and functions
    let privateVar = 'value';
    
    function privateFunction() {
        // Implementation
    }
    
    // Public API
    return {
        publicMethod: function() {
            // Implementation
        },
        init: function() {
            // Initialization
        }
    };
})();
```

### CSS Architecture
- **CSS Variables**: Consistent theming with custom properties
- **BEM-like Naming**: Structured class naming convention
- **Glassmorphism**: Modern glass-like UI elements
- **Responsive Grid**: CSS Grid and Flexbox layouts

### Data Management
- **Local Storage**: Plant map data and user preferences
- **JSON APIs**: Weather data fetching and processing
- **State Management**: Module-level state with event coordination

## 🌐 API Integration

### WeatherLink v2 APIs
```javascript
// Cloud API Configuration
cloud: { 
    apiKey: 'your-api-key', 
    stationId: 'station-id', 
    apiSecret: 'api-secret',
    baseUrl: 'https://api.weatherlink.com/v2'
}

// Local API Configuration
local: { 
    ip: '192.168.1.100', 
    port: '80', 
    https: false,
    proxyUrl: 'http://localhost:50783'
}
```

### Proxy Server Endpoints
```
GET  /                          # Serve main application
GET  /api/health               # Health check endpoint
GET  /api/status               # Server status information
POST /api/proxy/cloud          # WeatherLink Cloud API proxy
POST /api/proxy/local          # WeatherLink Local API proxy
GET  /api/demo/*               # Demo data endpoints
```

## 🚀 Development Workflow

### Setup Commands
```bash
npm install                    # Install dependencies
npm start                     # Start production server
npm run dev                   # Start development server with nodemon
npm test                      # Run API tests
npm run health                # Check server health
```

### Development Server
- **Port**: 50783 (configurable via PORT environment variable)
- **Hot Reload**: Nodemon watches for file changes
- **CORS**: Enabled for development
- **Logging**: Request logging with timestamps

### Testing
- **API Testing**: Built-in test scripts for weather APIs
- **Demo Mode**: Simulated data for development
- **Health Checks**: Server status monitoring

## 📊 Data Structures

### Plant Database Schema
```javascript
{
    name: "Plant Name",
    botanical: "Scientific Name",
    category: "category-slug",
    emoji: "🌱",
    rare: boolean,
    height: number,        // feet
    diameter: number,      // feet
    base_color: "#hex",
    plant_photo: "url",
    flower_photo: "url",
    info_url: "url",
    general_info: "string",
    cultivation_tips: "string",
    pest_management: "string",
    pruning_guidelines: "string"
}
```

### Map Data Schema
```javascript
{
    plantId: {
        x: number,         // pixels from left
        y: number,         // pixels from top
        plantData: object, // reference to plant database entry
        id: string,        // unique identifier
        timestamp: number  // placement time
    }
}
```

### Weather Data Schema
```javascript
{
    temperature: number,
    humidity: number,
    pressure: number,
    windSpeed: number,
    windDirection: number,
    rainfall: number,
    uvIndex: number,
    timestamp: number
}
```

## 🎨 Styling Guidelines

### Color Palette
```css
--tropical-deep-green: #0f4c3a;
--tropical-seafoam: #2d8f64;
--tropical-mint: #7fffd4;
--tropical-golden: #ffd700;
--tropical-coral: #ff7f7f;
--tropical-sunset: #ff6b35;
```

### Component Patterns
- **Glass Cards**: `background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px);`
- **Buttons**: Rounded corners with hover effects and transitions
- **Navigation**: Multi-level with active states and smooth transitions
- **Grid Layouts**: CSS Grid for plant catalog and responsive layouts

## 🔍 Common Tasks

### Adding New Plants
1. Add plant data to `plantdatabase.js`
2. Include all required fields (name, botanical, category, etc.)
3. Test plant appears in catalog and map dropdown
4. Verify search and filtering work correctly

### Modifying Weather Integration
1. Update API settings in `weather-manager.js`
2. Test connection with health check endpoints
3. Verify data parsing and display
4. Update demo data if needed

### Styling Changes
1. Use CSS variables for consistent theming
2. Test responsive behavior on mobile devices
3. Maintain glassmorphism aesthetic
4. Ensure accessibility standards

### Map Functionality
1. Plant placement data stored in localStorage
2. Map coordinates are pixel-based from top-left
3. Plant sizes calculated from database dimensions
4. Edit mode provides drag-and-drop functionality

## 🐛 Debugging Tips

### Common Issues
- **Plant Database**: Check `window.plantsDatabase` is loaded
- **Weather APIs**: Verify proxy server is running on correct port
- **Map Rendering**: Ensure map container has proper dimensions
- **CORS Errors**: Check proxy server CORS configuration

### Debug Tools
- **Console Logging**: Extensive logging throughout modules
- **Health Endpoints**: `/api/health` and `/api/status`
- **Demo Mode**: Test functionality without external APIs
- **Browser DevTools**: Network tab for API call monitoring

## 🌟 Best Practices

### Code Style
- Use `'use strict';` in all modules
- Consistent error handling with try-catch blocks
- Descriptive variable and function names
- Comment complex logic and API integrations

### Performance
- Lazy load plant images
- Debounce search input
- Cache weather data appropriately
- Optimize map rendering for large datasets

### Security
- API keys should be environment variables in production
- Validate all user inputs
- Sanitize data before storage
- Use HTTPS in production

## 🚀 Deployment Notes

### Production Setup
1. Set environment variables for API keys
2. Configure proper CORS origins
3. Set up SSL/TLS certificates
4. Configure reverse proxy if needed
5. Set up monitoring and logging

### Environment Variables
```bash
PORT=3000
NODE_ENV=production
WEATHERLINK_API_KEY=your-key
WEATHERLINK_API_SECRET=your-secret
WEATHERLINK_STATION_ID=your-station
```

This repository represents a complete tropical farm management system with modern web technologies and Hawaiian cultural elements. The modular architecture makes it easy to extend and maintain while providing a rich user experience for farm planning and monitoring.