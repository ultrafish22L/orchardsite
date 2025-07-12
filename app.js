// Main Application Module
// Coordinates all modules and handles global app functionality

window.AppManager = (function() {
    'use strict';
    
    // Global app state
    let currentPage = 'home';

    function setActivePage(page) {
        console.log('🔄 Switching to page:', page);
        
        // Check if map is in edit mode and cancel if switching away from map
        if (window.MapManager && window.MapManager.getMapMode() === 'edit' && page !== 'map') {
            console.log('🗺️ Cancelling map edit mode due to navigation');
            window.MapManager.cancelEditMode();
        }
        
        currentPage = page;
        
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
        
        document.querySelectorAll('.page-content').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Hide plant, weather, and map content initially
        if (window.PlantManager) {
            window.PlantManager.hideElement('plantGrid');
        }
        hideElement('weatherContent');
        hideElement('mapContent');
        if (window.PlantManager) {
            window.PlantManager.hideAllMessages();
        }
        
        // Hide all secondary navigation bars
        hideElement('plantNav');
        hideElement('weatherNav');
        hideElement('mapNav');
        hideElement('defaultNav');
        
        if (page === 'weather') {
            console.log('🌦️ Activating weather page');
            showElement('weatherContent');
            document.getElementById('weatherContent').classList.add('active');
            showElement('weatherNav');
            
            // Initialize weather if not already done or restart it
            if (window.WeatherManager) {
                window.WeatherManager.initializeWeather();
            }
        } else if (page === 'map') {
            console.log('🗺️ Activating map page');
            showElement('mapContent');
            document.getElementById('mapContent').classList.add('active');
            showElement('mapNav');
            
            // Initialize map if not already done
            if (window.MapManager) {
                window.MapManager.initializeMap();
            }
        } else {
            console.log('🌱 Activating other page:', page);
            hideElement('weatherContent');
            hideElement('mapContent');
            document.getElementById('weatherContent').classList.remove('active');
            document.getElementById('mapContent').classList.remove('active');
            
            // Stop weather updates when not on weather page
            if (window.WeatherManager) {
                window.WeatherManager.stopWeatherDataPolling();
            }
            
            if (page === 'home') {
                showElement('plantNav');
                if (window.PlantManager) {
                    window.PlantManager.showElement('plantGrid');
                    window.PlantManager.renderPlants();
                }
            } else {
                // For Resources, About, Contact - show default nav with tropical emojis
                showElement('defaultNav');
                const pageElement = document.getElementById(page + 'Page');
                if (pageElement) {
                    pageElement.classList.remove('hidden');
                }
            }
        }
    }

    function setupMainEventListeners() {
        // Main page navigation
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                setActivePage(this.dataset.page);
            });
        });
        
        // General keyboard event listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Cancel map edit mode on Escape
                if (window.MapManager && window.MapManager.getMapMode() === 'edit') {
                    window.MapManager.cancelEditMode();
                    return;
                }
                
                if (window.PlantManager) {
                    window.PlantManager.closeDetail();
                    window.PlantManager.closePhotoModal();
                }
            }
        });
    }

    function startFloatingAnimation() {
        const icons = ['🌺','🌿','🍃','🦋','✨','🦥','🍎','🍋','🍫'];
        
        function createIcon() {
            const icon = document.createElement('div');
            icon.className = 'floating-icon';
            icon.textContent = icons[Math.floor(Math.random() * icons.length)];
            icon.style.left = Math.random() * 100 + 'vw';
            
            const duration = 20 + Math.random() * 30;
            icon.style.animationDuration = duration + 's';
            icon.style.setProperty('--rotation', Math.random() * 720 + 'deg');
            icon.style.setProperty('--wind-drift', (Math.random() - 0.5) * 100 + 'px');
            
            // Ensure icon starts completely off-screen
            icon.style.bottom = '-50px';
            icon.style.opacity = '0';
            
            document.body.appendChild(icon);
            
            // Force a small delay to ensure proper positioning before animation starts
            setTimeout(() => {
                if (icon.parentNode) {
                    icon.style.opacity = '0.6';
                }
            }, 50);
            
            // Clean up after animation completes
            setTimeout(() => {
                if (icon.parentNode) {
                    icon.parentNode.removeChild(icon);
                }
            }, duration * 1000 + 100); // Add small buffer to ensure cleanup
        }
        
        // Initial batch with staggered timing
        for (let i = 0; i < 10; i++) {
            setTimeout(createIcon, i * 500);
        }
        
        // Regular interval for new icons
        setInterval(createIcon, 2000);
    }

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    function init() {
        console.log('🚀 Initializing Giant Sloth Orchard...');
        
        setupMainEventListeners();
        
        // Setup module event listeners
        if (window.PlantManager) {
            window.PlantManager.setupPlantEventListeners();
        }
        
        if (window.WeatherManager) {
            window.WeatherManager.setupWeatherEventListeners();
        }
        
        if (window.MapManager) {
            window.MapManager.setupMapEventListeners();
        }
        
        startFloatingAnimation();
        
        // Show loading message for plants
        if (window.PlantManager) {
            window.PlantManager.showMessage('loadingMessage');
        }
        
        // Initialize the plant database check after a delay
        setTimeout(() => {
            if (window.PlantManager) {
                window.PlantManager.checkPlantDatabase();
            }
        }, 1000);
        
        console.log('✅ Giant Sloth Orchard initialization complete!');
    }

    // Handle visibility change (pause weather updates when tab is hidden)
    document.addEventListener('visibilitychange', () => {
        if (window.WeatherManager) {
            if (document.hidden) {
                window.WeatherManager.stopWeatherDataPolling();
                console.log('⏸️ Weather updates paused (tab hidden)');
            } else {
                if (currentPage === 'weather') {
                    window.WeatherManager.startWeatherDataPolling();
                    console.log('▶️ Weather updates resumed (tab visible)');
                }
            }
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.WeatherManager) {
            window.WeatherManager.stopWeatherDataPolling();
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        setActivePage: setActivePage,
        getCurrentPage: () => currentPage,
        init: init,
        showElement: showElement,
        hideElement: hideElement
    };
})();

// Debug Console Functions
window.debugLog = function(message, type = 'info') {
    const output = document.getElementById('debug-output');
    if (!output) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
        info: '#00ff00',
        warn: '#ffff00', 
        error: '#ff0000',
        success: '#00ffff'
    };
    
    const logEntry = document.createElement('div');
    logEntry.style.color = colors[type] || colors.info;
    logEntry.style.marginBottom = '2px';
    logEntry.style.fontSize = '11px';
    logEntry.style.lineHeight = '1.2';
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    output.appendChild(logEntry);
    
    // Auto-scroll to bottom
    setTimeout(() => {
        output.scrollTop = output.scrollHeight;
    }, 10);
    
    // Keep only last 100 messages to prevent memory issues
    while (output.children.length > 100) {
        output.removeChild(output.firstChild);
    }
};

window.toggleDebugPanel = function() {
    const panel = document.getElementById('debug-panel');
    const toggle = document.getElementById('debug-toggle');
    
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        toggle.style.display = 'none';
        debugLog('🐛 Debug panel opened', 'success');
    } else {
        panel.style.display = 'none';
        toggle.style.display = 'block';
    }
};

window.clearDebugOutput = function() {
    const output = document.getElementById('debug-output');
    if (output) {
        output.innerHTML = '';
        debugLog('Debug console cleared', 'info');
    }
};

window.testSelectPlant = function() {
    debugLog('🧪 Testing selectPlant function...', 'info');
    
    // Get the first placed plant
    const placedPlants = JSON.parse(localStorage.getItem('mapPlants') || '{}');
    const plantIds = Object.keys(placedPlants);
    
    if (plantIds.length === 0) {
        debugLog('❌ No plants found on map', 'error');
        return;
    }
    
    const plantId = plantIds[0];
    debugLog(`🌱 Testing with plant ID: ${plantId}`, 'info');
    debugLog(`🌱 Plant data: ${JSON.stringify(placedPlants[plantId])}`, 'info');
    
    // Test selectPlant function
    if (window.MapManager && window.MapManager.selectPlant) {
        window.MapManager.selectPlant(plantId);
        debugLog('✅ selectPlant function called', 'success');
    } else {
        debugLog('❌ MapManager.selectPlant not found', 'error');
    }
};

window.testDiameterSync = function() {
    debugLog('🧪 Testing diameter synchronization...', 'info');
    
    const mainInput = document.getElementById('map-diameter-input');
    const dropdown = document.getElementById('map-plant-dropdown');
    
    if (!mainInput) {
        debugLog('❌ Main diameter input not found', 'error');
        return;
    }
    
    if (!dropdown) {
        debugLog('❌ Plant dropdown not found', 'error');
        return;
    }
    
    debugLog(`📏 Current diameter input value: ${mainInput.value}`, 'info');
    debugLog(`🌱 Current dropdown value: ${dropdown.value}`, 'info');
    
    // Test updating diameter input
    const testValue = 15;
    mainInput.value = testValue;
    debugLog(`📏 Set diameter input to: ${testValue}`, 'success');
};

window.showPlantData = function() {
    debugLog('📊 Showing plant data...', 'info');
    
    const placedPlants = JSON.parse(localStorage.getItem('mapPlants') || '{}');
    debugLog(`🗺️ Placed plants count: ${Object.keys(placedPlants).length}`, 'info');
    
    Object.entries(placedPlants).forEach(([id, plant]) => {
        debugLog(`🌱 ${id}: ${plant.name} (diameter: ${plant.diameter || 'default'})`, 'info');
    });
    
    const mainInput = document.getElementById('map-diameter-input');
    const dropdown = document.getElementById('map-plant-dropdown');
    
    if (mainInput) {
        debugLog(`📏 Main diameter input: ${mainInput.value}`, 'info');
    }
    
    if (dropdown) {
        debugLog(`🌱 Selected plant: ${dropdown.value}`, 'info');
    }
};

// Override console.log to capture debug messages
const originalConsoleLog = console.log;
console.log = function(...args) {
    originalConsoleLog.apply(console, args);
    
    // Only capture messages with debug emojis
    const message = args.join(' ');
    if (message.includes('🔧') || message.includes('🐛') || message.includes('🌱') || message.includes('📏')) {
        debugLog(message, 'info');
    }
};

// Add keyboard shortcut for debug panel (Ctrl+Shift+D or Cmd+Shift+D)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDebugPanel();
    }
});

