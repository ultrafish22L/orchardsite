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
    const savedData = localStorage.getItem('giantSlothOrchard_plantMap');
    const placedPlantsArray = savedData ? JSON.parse(savedData) : [];
    
    if (placedPlantsArray.length === 0) {
        debugLog('❌ No plants found on map', 'error');
        return;
    }
    
    const plantData = placedPlantsArray[0];
    debugLog(`🌱 Testing with first plant: ${plantData.name}`, 'info');
    debugLog(`🌱 Plant data: ${JSON.stringify(plantData)}`, 'info');
    
    // Test selectPlant function - need to find actual plant ID from current map state
    if (window.debugState) {
        const state = window.debugState();
        const plantKeys = state.placedPlantsKeys.split(', ').filter(key => key.trim());
        if (plantKeys.length > 0) {
            const plantId = plantKeys[0];
            debugLog(`🎯 Using plant ID from current state: ${plantId}`, 'info');
            if (window.MapManager && window.MapManager.selectPlant) {
                window.MapManager.selectPlant(plantId);
                debugLog('✅ selectPlant function called', 'success');
            } else {
                debugLog('❌ MapManager.selectPlant not found', 'error');
            }
        } else {
            debugLog('❌ No plant IDs found in current state', 'error');
        }
    } else {
        debugLog('❌ debugState function not found', 'error');
    }
};

window.testDragPlant = function() {
    debugLog('🧪 Testing drag functionality...', 'info');
    
    // Get the first placed plant from current state
    if (!window.debugState) {
        debugLog('❌ debugState function not found', 'error');
        return;
    }
    
    const state = window.debugState();
    const plantKeys = state.placedPlantsKeys.split(', ').filter(key => key.trim());
    
    if (plantKeys.length === 0) {
        debugLog('❌ No plants found on map', 'error');
        return;
    }

    const plantId = plantKeys[0];
    debugLog(`🌱 Testing drag with plant ID: ${plantId}`, 'info');
    
    // Simulate drag sequence
    debugLog('🖱️ Step 1: Simulating plant click to start drag...', 'info');
    
    // Set up drag state manually
    if (window.MapManager) {
        window.MapManager.selectedPlant = plantId;
        window.MapManager.isDragging = true;
        debugLog('✅ Drag state set: selectedPlant=' + plantId + ', isDragging=true', 'success');
        
        // Simulate mouse move to new position
        const newX = plant.x + 50;
        const newY = plant.y + 50;
        debugLog(`🖱️ Step 2: Simulating mouse move to (${newX}, ${newY})...`, 'info');
        
        // Create a fake mouse event
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            const rect = mapContainer.getBoundingClientRect();
            const fakeEvent = {
                clientX: rect.left + newX,
                clientY: rect.top + newY
            };
            
            // Call the mouse move handler directly
            if (window.MapManager.handleMouseMove) {
                window.MapManager.handleMouseMove(fakeEvent);
                debugLog('✅ Mouse move handler called', 'success');
            }
            
            // Simulate mouse up
            debugLog('🖱️ Step 3: Simulating mouse up to end drag...', 'info');
            if (window.MapManager.handleMouseUp) {
                window.MapManager.handleMouseUp(fakeEvent);
                debugLog('✅ Mouse up handler called', 'success');
            }
        }
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

window.showPlantDataFixed = function() {
    debugLog('📊 FIXED FUNCTION 20250713052730 - Showing plant data...', 'info');
    debugLog('🔍 FIXED FUNCTION 20250713052730 - Checking localStorage...', 'info');
    
    const correctKey = localStorage.getItem('giantSlothOrchard_plantMap');
    debugLog('✅ FIXED FUNCTION - Correct key: ' + correctKey, 'info');
    
    const wrongKey = localStorage.getItem('mapPlants');
    debugLog('❌ FIXED FUNCTION - Wrong key: ' + wrongKey, 'info');
    
    if (correctKey) {
        const placedPlantsArray = JSON.parse(correctKey);
        debugLog('🗺️ FIXED FUNCTION - Placed plants count: ' + placedPlantsArray.length, 'info');
    } else {
        debugLog('❌ FIXED FUNCTION - No data found in giantSlothOrchard_plantMap', 'error');
    }
    
    const mainInput = document.getElementById('map-diameter-input');
    const dropdown = document.getElementById('map-plant-dropdown');
    
    if (mainInput) {
        debugLog('📏 FIXED FUNCTION - Main diameter input: ' + mainInput.value, 'info');
    }
    
    if (dropdown) {
        debugLog('🌱 FIXED FUNCTION - Selected plant: ' + dropdown.value, 'info');
    }
};

// Keep the old function but redirect it to the new one
window.showPlantData = function() {
    debugLog('🔄 REDIRECTING to fixed function...', 'info');
    window.showPlantDataFixed();
};

// Add a completely new function for testing
window.testNewFunction = function() {
    debugLog('🚀 TEST NEW FUNCTION 20250713052900 - This is working!', 'info');
    debugLog('🔍 TEST - Checking localStorage keys...', 'info');
    
    const correctKey = localStorage.getItem('giantSlothOrchard_plantMap');
    debugLog('✅ TEST - Correct key data: ' + correctKey, 'info');
    
    const wrongKey = localStorage.getItem('mapPlants');
    debugLog('❌ TEST - Wrong key data: ' + wrongKey, 'info');
    
    if (correctKey) {
        const placedPlantsArray = JSON.parse(correctKey);
        debugLog('🗺️ TEST - Placed plants count: ' + placedPlantsArray.length, 'info');
    } else {
        debugLog('❌ TEST - No data found in giantSlothOrchard_plantMap', 'error');
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

