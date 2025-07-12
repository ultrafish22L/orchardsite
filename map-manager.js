// Map Manager Module
// Handles all interactive farm map functionality for Giant Sloth Orchard

window.MapManager = (function() {
    'use strict';
    
    // Map state variables
    let mapMode = 'normal'; // 'normal', 'edit', or 'delete'
    let selectedPlant = null;
    let placedPlants = {};
    let selectedPlantForAddition = '';
    let tempPlantData = null; // Holds the temp plant data without adding to placedPlants
    let tempDeleteList = {}; // Holds plants marked for deletion
    let plantsAddedInCurrentSession = []; // Track plants added during current add session
    let originalPositions = {}; // Backup of plant positions before editing
    let mapInitialized = false;
    let isDragging = false;

    // Map configuration
    const mapConfig = {
        defaultPlantSize: 10, // feet, fallback for plants without size data
        minPlantSize: 3,
        maxPlantSize: 50,
        mapScale: 2 // pixels per foot
    };

    function initializeMap() {
        if (mapInitialized) return;
        
        console.log('🗺️ Initializing farm map...');
        
        // Load any saved plant placements
        loadPlantPlacements();
        
        // Set up the map container
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            console.log('🔧 Adding click listener to mapContainer:', mapContainer.id);
            mapContainer.addEventListener('click', handleMapClick);
            mapContainer.addEventListener('mousedown', handleMouseDown);
            mapContainer.addEventListener('mousemove', handleMouseMove);
            mapContainer.addEventListener('mouseup', handleMouseUp);
            mapContainer.addEventListener('mouseleave', handleMouseUp);
            console.log('✅ All map event listeners added');
        } else {
            console.log('❌ mapContainer not found!');
        }
        
        // Populate plant dropdown
        populatePlantDropdown();
        
        // Setup diameter input handlers
        setupDiameterInputHandlers();
        
        // Render existing plants
        renderMapPlants();
        
        mapInitialized = true;
        console.log('✅ Farm map initialized');
    }

    function loadPlantPlacements() {
        try {
            // First try to load from localStorage
            const savedData = localStorage.getItem('giantSlothOrchard_plantMap');
            if (savedData) {
                const mapData = JSON.parse(savedData);
                if (Array.isArray(mapData)) {
                    console.log('📍 Loading map data from localStorage');
                    mapData.forEach(plant => {
                        const plantId = 'plant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        placedPlants[plantId] = plant;
                    });
                    console.log('✅ Map plant data loaded from localStorage:', Object.keys(placedPlants).length, 'plants');
                    return;
                }
            }
            
            // Fallback to global scope (mapdata.js)
            if (typeof window.mapPlants !== 'undefined' && Array.isArray(window.mapPlants)) {
                console.log('📍 Loading map data from global scope (mapdata.js)');
                window.mapPlants.forEach(plant => {
                    const plantId = 'plant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    placedPlants[plantId] = plant;
                });
                console.log('✅ Map plant data loaded from file:', Object.keys(placedPlants).length, 'plants');
                // Save to localStorage for future use
                savePlantPlacements();
            } else {
                console.log('📍 No existing map data found, starting fresh');
            }
        } catch (error) {
            console.log('📍 Error loading map data:', error);
            // Try fallback to global scope
            if (typeof window.mapPlants !== 'undefined' && Array.isArray(window.mapPlants)) {
                window.mapPlants.forEach(plant => {
                    const plantId = 'plant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    placedPlants[plantId] = plant;
                });
                console.log('✅ Map plant data loaded from fallback:', Object.keys(placedPlants).length, 'plants');
            }
        }
        placedPlants = placedPlants || {};
    }

    function savePlantPlacements() {
        try {
            const mapData = Object.values(placedPlants).filter(plant => !plant.isTemp);
            localStorage.setItem('giantSlothOrchard_plantMap', JSON.stringify(mapData));
            console.log('💾 Plant placements saved to localStorage:', mapData.length, 'plants');
        } catch (error) {
            console.error('❌ Error saving plant placements to localStorage:', error);
            // Fallback: log the data structure for manual recovery
            const mapData = Object.values(placedPlants).filter(plant => !plant.isTemp);
            console.log('💾 Plant placements (backup log):');
            console.log('window.mapPlants = ', JSON.stringify(mapData, null, 2));
        }
    }

    function downloadMapData() {
        try {
            const mapData = Object.values(placedPlants).filter(plant => !plant.isTemp);
            const timestamp = new Date().toISOString().split('T')[0];
            
            // Create JavaScript file content
            const fileContent = `// Giant Sloth Orchard - Plant Map Data
// Downloaded on: ${new Date().toISOString()}
// Plants: ${mapData.length}

window.mapPlants = ${JSON.stringify(mapData, null, 4)};

console.log('📍 Map data loaded:', window.mapPlants.length, 'plants');`;

            // Create and download file
            const blob = new Blob([fileContent], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `giant-sloth-orchard-map-${timestamp}.js`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('📥 Map data downloaded:', mapData.length, 'plants');
        } catch (error) {
            console.error('❌ Error downloading map data:', error);
            alert('Error downloading map data. Check console for details.');
        }
    }

    function uploadMapData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js,.json';
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    let mapData;
                    const content = e.target.result;
                    
                    if (file.name.endsWith('.js')) {
                        // Extract array from JavaScript file
                        const match = content.match(/window\.mapPlants\s*=\s*(\[[\s\S]*?\]);/);
                        if (match) {
                            mapData = JSON.parse(match[1]);
                        } else {
                            throw new Error('Could not find mapPlants array in JavaScript file');
                        }
                    } else {
                        // Parse JSON file
                        mapData = JSON.parse(content);
                    }
                    
                    if (!Array.isArray(mapData)) {
                        throw new Error('Map data must be an array');
                    }
                    
                    // Clear existing plants and load new data
                    placedPlants = {};
                    mapData.forEach(plant => {
                        const plantId = 'plant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        placedPlants[plantId] = plant;
                    });
                    
                    // Save to localStorage and re-render
                    savePlantPlacements();
                    renderMapPlants();
                    
                    console.log('📤 Map data uploaded successfully:', mapData.length, 'plants');
                    alert(`Map data loaded successfully! ${mapData.length} plants imported.`);
                    
                } catch (error) {
                    console.error('❌ Error uploading map data:', error);
                    alert('Error loading map data: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function clearMapData() {
        if (confirm('Are you sure you want to clear all plants from the map? This cannot be undone.')) {
            placedPlants = {};
            localStorage.removeItem('giantSlothOrchard_plantMap');
            renderMapPlants();
            console.log('🗑️ Map data cleared');
        }
    }

    function populatePlantDropdown() {
        const dropdown = document.getElementById('map-plant-select');
        if (!dropdown || !window.plantsDatabase) return;
        
        dropdown.innerHTML = '<option value="">Select plant to add...</option>';
        
        // Filter out wishlist items and sort by name
        const availablePlants = window.plantsDatabase
            .filter(plant => plant.category !== 'wishlist')
            .sort((a, b) => a.name.localeCompare(b.name));
        
        availablePlants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant.name;
            option.textContent = `${plant.emoji || '🌱'} ${plant.name}`;
            dropdown.appendChild(option);
        });
        
        // Default to Apple Banana if it exists
        const appleBanana = availablePlants.find(plant => plant.name === 'Apple Banana');
        if (appleBanana) {
            dropdown.value = 'Apple Banana';
            updateDiameterInputFromPlant('Apple Banana');
            console.log('🍌 Plant dropdown defaulted to Apple Banana');
        }
    }

    function setupDiameterInputHandlers() {
        const diameterInput = document.getElementById('map-diameter-input');
        const editDiameterInput = document.getElementById('map-edit-diameter-input');
        
        if (diameterInput) {
            // Prevent the input from triggering map clicks
            diameterInput.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            diameterInput.addEventListener('keydown', function(e) {
                e.stopPropagation();
            });
            
            console.log('✅ Diameter input handlers setup');
        }
        
        if (editDiameterInput) {
            // Prevent the input from triggering map clicks
            editDiameterInput.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            editDiameterInput.addEventListener('keydown', function(e) {
                e.stopPropagation();
            });
            
            console.log('✅ Edit diameter input handlers setup');
        }
    }

    function updateDiameterInputFromPlant(plantName) {
        const diameterInput = document.getElementById('map-diameter-input');
        if (!diameterInput || !window.plantsDatabase) return;

        const plantData = window.plantsDatabase.find(p => p.name === plantName);
        if (plantData) {
            const diameter = getPlantDiameter(plantData);
            diameterInput.value = diameter;
            console.log('📏 Updated diameter input to:', diameter, 'feet for', plantName);
        }
    }

    function getCurrentDiameter() {
        const diameterInput = document.getElementById('map-diameter-input');
        if (diameterInput && diameterInput.value) {
            const value = parseFloat(diameterInput.value);
            if (!isNaN(value) && value > 0) {
                return value;
            }
        }
        
        // Fallback to plant database diameter
        if (selectedPlantForAddition && window.plantsDatabase) {
            const plantData = window.plantsDatabase.find(p => p.name === selectedPlantForAddition);
            if (plantData) {
                return getPlantDiameter(plantData);
            }
        }
        
        return mapConfig.defaultPlantSize;
    }

    // Debug function to reset mode
    window.resetMapMode = function() {
        window.debugLog && window.debugLog('🔄 Resetting map mode to normal', 'info');
        mapMode = 'normal';
        tempPlantData = null;
        showAllButtons();
        hideConfirmCancelButtons();
        window.debugLog && window.debugLog('✅ Map mode reset to: ' + mapMode, 'success');
    };
    
    // Debug function to check current state
    window.debugState = function() {
        const state = {
            mapMode: mapMode,
            selectedPlant: selectedPlant,
            tempPlantData: !!tempPlantData,
            placedPlantsCount: Object.keys(placedPlants).length,
            placedPlantsKeys: Object.keys(placedPlants).join(', '),
            tempDeleteListCount: Object.keys(tempDeleteList).length,
            tempDeleteListKeys: Object.keys(tempDeleteList).join(', ')
        };
        window.debugLog && window.debugLog('🔍 Current state: ' + JSON.stringify(state), 'info');
        return state;
    };

    function handleMapClick(event) {
        console.log('🖱️ Map clicked in mode:', mapMode, 'tempPlantData:', !!tempPlantData);
        console.log('🖱️ Event target:', event.target.className, 'Current target:', event.currentTarget.id);
        // Add a simple test to see if this function is being called
        window.debugLog && window.debugLog('🖱️ handleMapClick called! Mode: ' + mapMode, 'info');
        
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const clickedPlant = findPlantAtPosition(x, y);
        
        console.log('🔍 Debug click:', {
            selectedPlant,
            clickedPlantId: clickedPlant?.id,
            clickedPlantName: clickedPlant?.name,
            isEqual: selectedPlant === clickedPlant?.id,
            coordinates: { x, y }
        });
        
        if (mapMode === 'add') {
            // Check if we clicked on an existing plant first
            if (clickedPlant && clickedPlant.id !== 'temp') {
                // If clicking on already selected plant, do nothing
                if (selectedPlant === clickedPlant.id) {
                    console.log('🖱️ Clicked already selected plant in add mode - ignoring');
                    event.preventDefault();
                    return;
                }
                // First click selects the plant
                console.log('🎯 Selecting plant in add mode:', clickedPlant.name);
                selectPlant(clickedPlant.id);
                event.preventDefault();
                return;
            }
            
            // Place new plant immediately as permanent
            console.log('🌱 Placing new plant...');
            console.log('📍 Placement coordinates:', { x, y });
            addPlantAtPosition(x, y);
            event.preventDefault();
            return;
        }

        if (mapMode === 'edit') {
            if (clickedPlant && clickedPlant.id !== 'temp') {
                // If clicking on already selected plant, do nothing
                if (selectedPlant === clickedPlant.id) {
                    console.log('🖱️ Clicked already selected plant in edit mode - ignoring');
                    event.preventDefault();
                    return;
                }
                // First click selects the plant
                console.log('🎯 Selecting plant for editing:', clickedPlant.name);
                selectPlant(clickedPlant.id);
                event.preventDefault();
            } else {
                console.log('🕳️ Empty area clicked - deselecting');
                deselectPlant();
            }
            return;
        }
        
        if (mapMode === 'delete') {
            console.log('🗑️ Delete mode click handling - clickedPlant:', clickedPlant);
            if (clickedPlant && clickedPlant.id !== 'temp') {
                console.log('🗑️ Processing plant for deletion toggle:', clickedPlant.id);
                // Toggle plant deletion status
                if (tempDeleteList[clickedPlant.id]) {
                    // Plant is already marked for deletion - unmark it
                    delete tempDeleteList[clickedPlant.id];
                    console.log('✅ Unmarked plant for deletion:', clickedPlant.name);
                } else {
                    // Mark plant for deletion
                    tempDeleteList[clickedPlant.id] = placedPlants[clickedPlant.id];
                    console.log('🗑️ Marked plant for deletion:', clickedPlant.name);
                }
                console.log('🗑️ Current tempDeleteList:', Object.keys(tempDeleteList));
                renderMapPlants();
                event.preventDefault();
            } else {
                console.log('🕳️ Empty area clicked in delete mode');
            }
            return;
        }
        
        // In normal mode, first click selects, subsequent clicks show detail
        console.log('👁️ Normal mode click - checking for plants');
        
        if (clickedPlant) {
            console.log('🔍 Normal mode plant click comparison:', {
                selectedPlant,
                clickedPlantId: clickedPlant.id,
                areEqual: selectedPlant === clickedPlant.id,
                selectedPlantType: typeof selectedPlant,
                clickedPlantIdType: typeof clickedPlant.id
            });
            
            // If clicking on already selected plant, show detail modal
            if (selectedPlant === clickedPlant.id) {
                console.log('🌿 Showing detail for selected plant:', clickedPlant.name);
                showPlantDetailFromMap(clickedPlant);
            } else {
                // First click selects the plant
                console.log('🎯 Selecting plant in normal mode:', clickedPlant.name);
                selectPlant(clickedPlant.id);
            }
        } else {
            console.log('🕳️ Empty area clicked - deselecting');
            // Clicked empty area: deselect
            deselectPlant();
        }
    }

    function handleMouseDown(event) {
        if (mapMode === 'add') {
            // In add mode, allow dragging any existing plant (including newly placed ones)
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const clickedPlant = findPlantAtPosition(x, y);
            if (clickedPlant && clickedPlant.id !== 'temp') {
                selectedPlant = clickedPlant.id;
                isDragging = true;
                event.preventDefault();
                console.log('🖱️ Started dragging plant in add mode:', placedPlants[selectedPlant].name);
            }
            // Also check temp plant if it exists
            else if (tempPlantData) {
                const distance = Math.sqrt(
                    Math.pow(x - tempPlantData.x, 2) + Math.pow(y - tempPlantData.y, 2)
                );
                if (distance <= tempPlantData.radius) {
                    isDragging = true;
                    event.preventDefault();
                }
            }
        } else if (mapMode === 'edit') {
            // In edit mode, find any plant at click position and start dragging immediately
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const clickedPlant = findPlantAtPosition(x, y);
            if (clickedPlant && clickedPlant.id !== 'temp') {
                selectedPlant = clickedPlant.id;
                isDragging = true;
                event.preventDefault();
                console.log('🖱️ Started dragging plant:', placedPlants[selectedPlant].name);
            }
        }
        // In normal mode, don't allow dragging - only clicking for details
    }

    function handleMouseMove(event) {
        if (!isDragging) return;
        
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (mapMode === 'add') {
            if (selectedPlant && placedPlants[selectedPlant]) {
                // Update existing plant position in add mode
                placedPlants[selectedPlant].x = x;
                placedPlants[selectedPlant].y = y;
                renderMapPlants();
            } else if (tempPlantData) {
                // Update temp plant position
                tempPlantData.x = x;
                tempPlantData.y = y;
                renderMapPlants();
            }
        } else if (mapMode === 'edit' && selectedPlant && placedPlants[selectedPlant]) {
            // Update existing plant position
            placedPlants[selectedPlant].x = x;
            placedPlants[selectedPlant].y = y;
            renderMapPlants();
        }
    }

    function handleMouseUp(event) {
        if (isDragging && mapMode === 'add' && selectedPlant) {
            // Save changes when dragging in add mode
            savePlantPlacements();
            console.log('💾 Saved plant position after drag in add mode');
        }
        isDragging = false;
        selectedPlant = null;
    }

    function findPlantAtPosition(x, y) {
        // Check temp plant first
        if (tempPlantData) {
            const distance = Math.sqrt(
                Math.pow(x - tempPlantData.x, 2) + Math.pow(y - tempPlantData.y, 2)
            );
            if (distance <= tempPlantData.radius) {
                return { id: 'temp', ...tempPlantData };
            }
        }
        
        // Check placed plants
        for (const [id, plant] of Object.entries(placedPlants)) {
            const distance = Math.sqrt(
                Math.pow(x - plant.x, 2) + Math.pow(y - plant.y, 2)
            );
            if (distance <= plant.radius) {
                return { id, ...plant };
            }
        }
        return null;
    }

    function selectPlant(plantId) {
        selectedPlant = plantId;
        
        // Update dropdown to match selected plant
        const dropdown = document.getElementById('map-plant-select');
        if (dropdown && placedPlants[plantId]) {
            dropdown.value = placedPlants[plantId].name;
        }
        
        // Update main diameter input to match selected plant
        const mainDiameterInput = document.getElementById('map-diameter-input');
        if (mainDiameterInput && placedPlants[plantId]) {
            const plant = placedPlants[plantId];
            const plantData = window.plantsDatabase?.find(p => p.name === plant.name) || {};
            const diameter = plant.diameter || getPlantDiameter(plantData);
            console.log('🔧 selectPlant updating main diameter:', {
                plantId,
                plantName: plant.name,
                storedDiameter: plant.diameter,
                defaultDiameter: getPlantDiameter(plantData),
                finalDiameter: diameter,
                currentInputValue: mainDiameterInput.value
            });
            mainDiameterInput.value = diameter;
            console.log('🔧 After update, input value:', mainDiameterInput.value);
        }
        
        // If in edit mode, populate the edit controls
        if (mapMode === 'edit' && placedPlants[plantId]) {
            const plant = placedPlants[plantId];
            const editNameSpan = document.getElementById('map-edit-plant-name');
            const editDiameterInput = document.getElementById('map-edit-diameter-input');
            
            if (editNameSpan) {
                editNameSpan.textContent = plant.name;
            }
            
            if (editDiameterInput) {
                // Use stored diameter or get from database
                const plantData = window.plantsDatabase?.find(p => p.name === plant.name) || {};
                const diameter = plant.diameter || getPlantDiameter(plantData);
                editDiameterInput.value = diameter;
            }
        }

        renderMapPlants();
        console.log('🎯 Selected plant:', plantId);
    }

    function deselectPlant() {
        selectedPlant = null;
        
        // Clear dropdown selection
        const dropdown = document.getElementById('map-plant-select');
        if (dropdown) {
            dropdown.value = '';
        }
        
        renderMapPlants();
    }

    function showPlantDetailFromMap(clickedPlant) {
        console.log('🔍 Attempting to show plant detail for:', clickedPlant.name);
        
        // Find the plant in the database
        if (!window.plantsDatabase) {
            console.log('❌ No plant database available');
            return;
        }
        
        const plantData = window.plantsDatabase.find(p => p.name === clickedPlant.name);
        if (plantData && window.PlantManager) {
            console.log('✅ Found plant in database:', plantData.name);
            // Find the index of this plant in the filtered plants array
            const filteredPlants = window.PlantManager.getFilteredPlants();
            const plantIndex = filteredPlants.findIndex(p => p.name === plantData.name);
            
            if (plantIndex !== -1) {
                console.log('✅ Opening plant detail at index:', plantIndex);
                window.PlantManager.openPlantDetail(plantIndex);
            } else {
                console.log('⚠️ Plant not found in filtered plants, trying direct approach');
                // If not found in filtered plants, we need to create a custom detail view
                // For now, let's try to open it anyway by creating a temporary filtered list
                const tempFilteredPlants = window.plantsDatabase.filter(p => p.name === plantData.name);
                if (tempFilteredPlants.length > 0) {
                    // Temporarily override the filtered plants method
                    const originalMethod = window.PlantManager.getFilteredPlants;
                    window.PlantManager.getFilteredPlants = () => tempFilteredPlants;
                    window.PlantManager.openPlantDetail(0);
                    // Restore the original method
                    setTimeout(() => {
                        window.PlantManager.getFilteredPlants = originalMethod;
                    }, 100);
                }
            }
        } else {
            console.log('❌ Plant not found in database or PlantManager not available');
        }
    }

    function startAddPlant() {
        console.log('🚀 Starting add mode...');
        console.log('📊 Current state:', { mapMode, tempPlantData });
        
        const dropdown = document.getElementById('map-plant-select');
        if (!dropdown || !dropdown.value) {
            console.log('❌ No plant selected in dropdown');
            alert('Please select a plant to add first');
            return;
        }
        
        selectedPlantForAddition = dropdown.value;
        mapMode = 'add';
        tempPlantData = null; // Reset temp plant data
        plantsAddedInCurrentSession = []; // Reset session tracking
        isDragging = false; // Reset dragging state
        
        console.log('✅ Entering add mode:', { selectedPlantForAddition, mapMode });
        
        // Hide all buttons except check and X
        hideAllButtonsExceptConfirmCancel();
        
        // Change cursor to indicate add mode
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'crosshair';
        }
        
        console.log('➕ Add mode activated for:', selectedPlantForAddition);
    }

    function startEditMode() {
        console.log('🚀 Starting edit mode...');
        
        mapMode = 'edit';
        selectedPlant = null; // Clear selection
        tempPlantData = null; // Reset temp plant data
        isDragging = false; // Reset dragging state
        
        // Backup original positions for cancel functionality
        originalPositions = {};
        Object.keys(placedPlants).forEach(plantId => {
            originalPositions[plantId] = {
                x: placedPlants[plantId].x,
                y: placedPlants[plantId].y
            };
        });
        
        console.log('✅ Entering edit mode - backed up', Object.keys(originalPositions).length, 'plant positions');
        
        // Hide all buttons except check and X
        hideAllButtonsExceptConfirmCancel();
        
        // Change cursor to indicate edit mode
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'move';
        }
        
        console.log('✏️ Edit mode activated - click and drag plants to reposition');
    }

    function cancelEditMode() {
        console.log('❌ Canceling edit mode');
        mapMode = 'normal';
        selectedPlant = null;
        tempPlantData = null;
        isDragging = false;

        // Restore original positions
        Object.keys(originalPositions).forEach(plantId => {
            if (placedPlants[plantId]) {
                placedPlants[plantId].x = originalPositions[plantId].x;
                placedPlants[plantId].y = originalPositions[plantId].y;
            }
        });
        
        console.log('🔄 Restored', Object.keys(originalPositions).length, 'plants to original positions');
        originalPositions = {}; // Clear backup

        // Show all buttons, hide confirm/cancel
        showAllButtons();

        // Reset cursor
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'default';
        }

        // Re-render to show restored positions
        renderMapPlants();
        console.log('✅ Edit mode canceled');
    }

    function confirmEditMode() {
        console.log('✅ Confirming edit mode');
        
        // Save diameter changes if a plant is selected
        if (selectedPlant && placedPlants[selectedPlant]) {
            const editDiameterInput = document.getElementById('map-edit-diameter-input');
            if (editDiameterInput && editDiameterInput.value) {
                const newDiameter = parseFloat(editDiameterInput.value);
                if (!isNaN(newDiameter) && newDiameter > 0) {
                    placedPlants[selectedPlant].diameter = newDiameter;
                    placedPlants[selectedPlant].radius = calculatePlantRadius(newDiameter);
                    console.log('📏 Updated plant diameter to:', newDiameter, 'feet');
                }
            }
        }
        
        mapMode = 'normal';
        selectedPlant = null;
        tempPlantData = null;
        isDragging = false;
        
        // Clear backup positions since changes are confirmed
        originalPositions = {};

        // Show all buttons, hide confirm/cancel
        showAllButtons();

        // Reset cursor
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'default';
        }

        // Save changes
        savePlantPlacements();
        renderMapPlants();
        console.log('✅ Edit mode confirmed - changes saved');
    }

    function hideAllButtonsExceptConfirmCancel() {
        // Hide all primary buttons
        hideElement('map-diameter-input');
        hideElement('map-plant-select');
        hideElement('map-add-btn');
        hideElement('map-edit-btn');
        hideElement('map-delete-btn');
        hideElement('map-print-btn');
        hideElement('map-download-btn');
        hideElement('map-upload-btn');
        hideElement('map-clear-btn');
        
        // Show only confirm/cancel controls
        showElement('map-edit-controls');
    }

    function showAllButtons() {
        // Show all primary buttons
        showElement('map-diameter-input');
        showElement('map-plant-select');
        showElement('map-add-btn');
        showElement('map-edit-btn');
        showElement('map-delete-btn');
        showElement('map-print-btn');
        showElement('map-download-btn');
        showElement('map-upload-btn');
        showElement('map-clear-btn');
        
        // Hide confirm/cancel controls
        hideElement('map-edit-controls');
    }

    function cancelAddPlant() {
        console.log('❌ Canceling add mode');
        
        // Remove all plants added during this session
        if (plantsAddedInCurrentSession.length > 0) {
            console.log('🗑️ Removing plants added in this session:', plantsAddedInCurrentSession.length);
            plantsAddedInCurrentSession.forEach(plantId => {
                if (placedPlants[plantId]) {
                    const plantName = placedPlants[plantId].name;
                    delete placedPlants[plantId];
                    console.log('🗑️ Removed plant:', plantName, plantId);
                }
            });
            
            // Save after removing plants
            savePlantPlacements();
        }
        
        // Reset state
        mapMode = 'normal';
        selectedPlantForAddition = '';
        tempPlantData = null; // Reset temp plant data
        plantsAddedInCurrentSession = []; // Clear session tracking

        // Show all buttons, hide confirm/cancel
        showAllButtons();
        
        // Reset cursor
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'default';
        }
        console.log('✅ Add mode canceled');

        // Render existing plants
        renderMapPlants();
    }

    function placeTempPlantAtPosition(x, y) {
        console.log('🌱 placeTempPlantAtPosition called:', { x, y, selectedPlantForAddition });
        
        if (!selectedPlantForAddition || !window.plantsDatabase) {
            console.log('❌ Missing requirements:', { selectedPlantForAddition, plantsDatabase: !!window.plantsDatabase });
            return;
        }
        
        const plantData = window.plantsDatabase.find(p => p.name === selectedPlantForAddition);
        if (!plantData) {
            console.log('❌ Plant data not found for:', selectedPlantForAddition);
            return;
        }
        
        console.log('✅ Found plant data:', plantData.name);
        
        // Get plant size (diameter in feet) - use custom diameter if provided
        const diameter = getCurrentDiameter();
        const height = getPlantHeight(plantData);
        const radius = calculatePlantRadius(diameter);
        console.log('📏 Plant dimensions:', { diameter, height, radius });
        
        // Create temp plant object (not added to placedPlants)
        tempPlantData = {
            name: plantData.name,
            botanical: plantData.botanical,
            emoji: getPlantEmoji(plantData),
            x: x,
            y: y,
            radius: radius,
            diameter: diameter,
            height: height
        };
        
        console.log('✅ Temp plant data created (not in database)');
        
        renderMapPlants();
    }

    function confirmAddPlant() {
        console.log('✅ Confirming add mode - exiting to normal mode');
        
        // In the new add mode, plants are placed immediately, so we just exit add mode
        mapMode = 'normal';
        selectedPlantForAddition = '';
        tempPlantData = null; // Clear any temp data
        plantsAddedInCurrentSession = []; // Clear session tracking (plants are now confirmed)

        // Show all buttons, hide confirm/cancel
        showAllButtons();
        
        // Reset cursor
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'default';
        }
        
        // Save any final changes and re-render
        savePlantPlacements();
        renderMapPlants();
        console.log('✅ Exited add mode successfully');
    }

    function placePlantAtPosition(x, y) {
        // This function is now an alias for placeTempPlantAtPosition
        placeTempPlantAtPosition(x, y);
    }

    function addPlantAtPosition(x, y) {
        console.log('🌱 addPlantAtPosition called:', { x, y, selectedPlantForAddition });
        
        if (!selectedPlantForAddition) {
            console.log('❌ No plant selected for addition');
            return;
        }
        
        // Find the plant data
        const plantData = window.plantsDatabase.find(p => p.name === selectedPlantForAddition);
        if (!plantData) {
            console.log('❌ Plant not found in database:', selectedPlantForAddition);
            return;
        }
        
        console.log('✅ Found plant data:', plantData.name);
        
        // Create plant data object - use custom diameter if provided
        const diameter = getCurrentDiameter();
        const height = getPlantHeight(plantData);
        const radius = calculatePlantRadius(diameter);
        const emoji = getPlantEmoji(plantData);
        
        const newPlantData = {
            x: x,
            y: y,
            radius: radius,
            diameter: diameter,
            height: height,
            name: plantData.name,
            emoji: emoji
        };
        
        // Generate unique ID and add to permanent plants immediately
        const plantId = 'plant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        placedPlants[plantId] = newPlantData;
        
        // Track this plant for potential cancellation
        plantsAddedInCurrentSession.push(plantId);
        
        console.log('✅ Plant added permanently:', plantId, newPlantData.name);
        console.log('📝 Session plants:', plantsAddedInCurrentSession.length);
        
        // Save and render
        savePlantPlacements();
        renderMapPlants();
    }

    function getPlantDiameter(plantData) {
        // Use the new diameter field from database
        if (plantData.diameter) return parseFloat(plantData.diameter);
        
        // Legacy fallback for old data
        if (plantData.size) return parseFloat(plantData.size);
        if (plantData.mature_diameter) return parseFloat(plantData.mature_diameter);
        if (plantData.width) return parseFloat(plantData.width);
        
        // Fallback based on category
        switch (plantData.category) {
            case 'bananas': return 8;
            case 'citrus': return 15;
            case 'theobroma': return 20;
            case 'fruit': return 12;
            case 'herbs': return 3;
            case 'carnivorous': return 1;
            case 'ornamental': return 6;
            default: return mapConfig.defaultPlantSize;
        }
    }

    function getPlantHeight(plantData) {
        // Use the new height field from database
        if (plantData.height) return parseFloat(plantData.height);
        
        // Fallback based on category
        switch (plantData.category) {
            case 'bananas': return 12;
            case 'citrus': return 10;
            case 'theobroma': return 20;
            case 'fruit': return 15;
            case 'herbs': return 3;
            case 'carnivorous': return 0.5;
            case 'ornamental': return 6;
            default: return 8;
        }
    }

    function getPlantBaseColor(plantData) {
        // Use the new base_color field from database
        if (plantData.base_color) return plantData.base_color;
        
        // Fallback based on category
        switch (plantData.category) {
            case 'bananas': return '#FFD700';
            case 'citrus': return '#FFA500';
            case 'theobroma': return '#8B4513';
            case 'fruit': return '#32CD32';
            case 'herbs': return '#9ACD32';
            case 'carnivorous': return '#FF0000';
            case 'ornamental': return '#FF69B4';
            default: return '#7fffd4';
        }
    }

    function calculatePlantRadius(diameter) {
        // Map scale: 455x125 feet farm
        // Convert diameter in feet to pixels for map display
        const mapWidthFeet = 455;
        const mapHeightFeet = 125;
        const mapWidthPixels = 910; // Approximate map container width
        const mapHeightPixels = 250; // Approximate map container height
        
        // Use the smaller scale to ensure plants fit properly
        const scaleX = mapWidthPixels / mapWidthFeet;
        const scaleY = mapHeightPixels / mapHeightFeet;
        const scale = Math.min(scaleX, scaleY);
        
        // Convert diameter to radius in pixels
        const radiusPixels = (diameter * scale) / 2;
        
        // Ensure minimum and maximum sizes for visibility
        return Math.max(8, Math.min(radiusPixels, 50));
    }

    function calculatePlantOpacity(height) {
        // Taller plants = darker (higher opacity)
        // Height range: 0.2 feet (tiny plants) to 40 feet (large trees)
        const minHeight = 0.2;
        const maxHeight = 40;
        const minOpacity = 0.3;
        const maxOpacity = 0.8;
        
        // Normalize height to 0-1 range
        const normalizedHeight = Math.max(0, Math.min(1, (height - minHeight) / (maxHeight - minHeight)));
        
        // Calculate opacity
        return minOpacity + (normalizedHeight * (maxOpacity - minOpacity));
    }

    function getPlantEmoji(plantData) {
        if (plantData.emoji) return plantData.emoji;
        
        // Fallback emojis based on category
        switch (plantData.category) {
            case 'bananas': return '🍌';
            case 'citrus': return '🍊';
            case 'theobroma': return '🍫';
            case 'fruit': return '🍎';
            case 'herbs': return '🌿';
            case 'carnivorous': return '🪲';
            case 'ornamental': return '🌺';
            default: return '🌱';
        }
    }

    function startDeleteMode() {
        console.log('🚀 Starting delete mode...');
        
        mapMode = 'delete';
        tempDeleteList = {}; // Reset delete list
        selectedPlant = null; // Clear selection
        
        console.log('✅ Entering delete mode');
        
        // Hide all buttons except check and X
        hideAllButtonsExceptConfirmCancel();
        
        // Change cursor to indicate delete mode
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'crosshair';
        }
        
        console.log('🗑️ Delete mode activated - click plants to mark for deletion');
    }

    function markPlantForDeletion(plantId) {
        if (placedPlants[plantId]) {
            // Move plant to temp delete list
            tempDeleteList[plantId] = placedPlants[plantId];
            console.log('📝 Plant marked for deletion:', tempDeleteList[plantId].name);
            
            // Re-render to show updated state
            renderMapPlants();
        }
    }

    function confirmDeletePlants() {
        console.log('🗑️ Confirming deletion of', Object.keys(tempDeleteList).length, 'plants');
        
        // Delete all plants in temp delete list
        Object.keys(tempDeleteList).forEach(plantId => {
            if (placedPlants[plantId]) {
                const plantName = placedPlants[plantId].name;
                delete placedPlants[plantId];
                console.log('🗑️ Plant permanently deleted:', plantName);
            }
        });
        
        console.log('✅ Confirming deletion completed');
        
        // Clear temp delete list and selection
        tempDeleteList = {};
        selectedPlant = null;
        
        // Return to normal mode
        mapMode = 'normal';
        
        // Show all buttons, hide confirm/cancel
        showAllButtons();
        
        // Reset cursor
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'default';
        }
        
        // Save changes and re-render
        savePlantPlacements();
        renderMapPlants();
        console.log('✅ Plants deleted successfully');
    }

    function cancelDeletePlants() {
        console.log('❌ Canceling plant deletion');
        
        // Clear temp delete list (plants return to normal)
        tempDeleteList = {};
        selectedPlant = null; // Clear selection
        
        // Return to normal mode
        mapMode = 'normal';
        
        // Show all buttons, hide confirm/cancel
        showAllButtons();
        
        // Reset cursor
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'default';
        }
        
        // Re-render to restore plants
        renderMapPlants();
        console.log('✅ Delete mode canceled');
    }

    function renderMapPlants() {
        console.log('🎨 renderMapPlants called');
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) {
            console.log('❌ No map container found');
            return;
        }
        
        // Clear existing plant elements
        const existingPlants = mapContainer.querySelectorAll('.map-plant');
        console.log('🗑️ Removing', existingPlants.length, 'existing plant elements');
        existingPlants.forEach(plant => plant.remove());
        
        console.log('📊 Permanent plants to render:', Object.keys(placedPlants).length);
        console.log('📊 Temp plant:', tempPlantData ? tempPlantData.name : 'none');
        console.log('📊 Plants marked for deletion:', Object.keys(tempDeleteList).length);
        
        // Render permanent plants
        Object.entries(placedPlants).forEach(([id, plant]) => {
            // Skip plants that are marked for deletion
            if (tempDeleteList[id]) {
                console.log('⏭️ Skipping plant marked for deletion:', plant.name);
                return;
            }
            
            console.log('🌱 Rendering permanent plant:', id, plant.name);
            
            // Get plant data from database for styling
            const plantData = window.plantsDatabase?.find(p => p.name === plant.name) || {};
            const height = getPlantHeight(plantData);
            // Use stored diameter if available, otherwise get from database
            const diameter = plant.diameter || getPlantDiameter(plantData);
            const baseColor = getPlantBaseColor(plantData);
            const radius = calculatePlantRadius(diameter);
            const opacity = calculatePlantOpacity(height);
            
            const plantElement = document.createElement('div');
            plantElement.className = 'map-plant';
            plantElement.dataset.plantId = id;
            
            if (selectedPlant === id) {
                plantElement.classList.add('selected');
            }
            
            // Use calculated radius instead of stored radius
            plantElement.style.left = (plant.x - radius) + 'px';
            plantElement.style.top = (plant.y - radius) + 'px';
            plantElement.style.width = (radius * 2) + 'px';
            plantElement.style.height = (radius * 2) + 'px';
            
            plantElement.innerHTML = `
                <div class="map-plant-circle" style="background-color: ${baseColor}; opacity: ${opacity};">
                    <div class="map-plant-emoji">${plant.emoji}</div>
                </div>
            `;
            
            mapContainer.appendChild(plantElement);
        });
        
        // Render plants marked for deletion with special styling
        Object.entries(tempDeleteList).forEach(([id, plant]) => {
            console.log('🗑️ Rendering plant marked for deletion:', id, plant.name);
            
            // Get plant data from database for styling
            const plantData = window.plantsDatabase?.find(p => p.name === plant.name) || {};
            const height = getPlantHeight(plantData);
            const diameter = getPlantDiameter(plantData);
            const baseColor = getPlantBaseColor(plantData);
            const radius = calculatePlantRadius(diameter);
            const opacity = calculatePlantOpacity(height) * 0.6; // Dimmer for deletion
            
            const plantElement = document.createElement('div');
            plantElement.className = 'map-plant marked-for-deletion';
            plantElement.dataset.plantId = id;
            
            // Use calculated radius instead of stored radius
            plantElement.style.left = (plant.x - radius) + 'px';
            plantElement.style.top = (plant.y - radius) + 'px';
            plantElement.style.width = (radius * 2) + 'px';
            plantElement.style.height = (radius * 2) + 'px';
            
            plantElement.innerHTML = `
                <div class="map-plant-circle" style="background-color: ${baseColor}; opacity: ${opacity}; border-color: #ff6b6b;">
                    <div class="map-plant-emoji">${plant.emoji}</div>
                </div>
            `;
            
            mapContainer.appendChild(plantElement);
        });
        
        // Render temp plant if it exists
        if (tempPlantData) {
            console.log('🟡 Rendering temp plant:', tempPlantData.name);
            
            // Get plant data from database for styling
            const plantData = window.plantsDatabase?.find(p => p.name === tempPlantData.name) || {};
            const height = getPlantHeight(plantData);
            const diameter = getPlantDiameter(plantData);
            const baseColor = getPlantBaseColor(plantData);
            const radius = calculatePlantRadius(diameter);
            const opacity = calculatePlantOpacity(height) * 0.8; // Slightly dimmer for temp
            
            const plantElement = document.createElement('div');
            plantElement.className = 'map-plant temp';
            plantElement.dataset.plantId = 'temp';
            
            // Use calculated radius instead of stored radius
            plantElement.style.left = (tempPlantData.x - radius) + 'px';
            plantElement.style.top = (tempPlantData.y - radius) + 'px';
            plantElement.style.width = (radius * 2) + 'px';
            plantElement.style.height = (radius * 2) + 'px';
            
            plantElement.innerHTML = `
                <div class="map-plant-circle" style="background-color: ${baseColor}; opacity: ${opacity}; border-color: #ffff44;">
                    <div class="map-plant-emoji">${tempPlantData.emoji}</div>
                </div>
            `;
            
            mapContainer.appendChild(plantElement);
        }
        
        const finalElements = mapContainer.querySelectorAll('.map-plant');
        console.log('✅ Final DOM elements count:', finalElements.length);
    }

    function handlePlantDropdownChange(event) {
        const selectedPlantName = event.target.value;
        
        if (!selectedPlantName) {
            deselectPlant();
            return;
        }

        // Update diameter input when plant selection changes
        updateDiameterInputFromPlant(selectedPlantName);
        
        // If in normal mode and a plant is already selected, keep the current selection
        // This prevents the dropdown from interfering with map selections
        if (mapMode === 'normal' && selectedPlant) {
            // Only change selection if the dropdown value matches an existing plant
            const matchingPlant = Object.entries(placedPlants)
                .find(([id, plant]) => plant.name === selectedPlantName);
            
            if (matchingPlant) {
                selectPlant(matchingPlant[0]);
            }
        }
    }

    function setupMapEventListeners() {
        console.log('🔧 Setting up map event listeners...');
        
        // Plant dropdown
        const plantSelect = document.getElementById('map-plant-select');
        if (plantSelect) {
            plantSelect.addEventListener('change', handlePlantDropdownChange);
            console.log('✅ Plant dropdown listener added');
        }
        
        // Add button
        const addBtn = document.getElementById('map-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', startAddPlant);
            console.log('✅ Add button listener added');
        }
        
        // Edit button
        const editBtn = document.getElementById('map-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', startEditMode);
            console.log('✅ Edit button listener added');
        }
        
        // Delete button
        const deleteBtn = document.getElementById('map-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', startDeleteMode);
            console.log('✅ Delete button listener added');
        }
        
        // Print button
        const printBtn = document.getElementById('map-print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', printMap);
            console.log('✅ Print button listener added');
        }

        // Download button
        const downloadBtn = document.getElementById('map-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadMapData);
            console.log('✅ Download button listener added');
        }

        // Upload button
        const uploadBtn = document.getElementById('map-upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', uploadMapData);
            console.log('✅ Upload button listener added');
        }

        // Clear button
        const clearBtn = document.getElementById('map-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearMapData);
            console.log('✅ Clear button listener added');
        }
        
        // Edit mode controls
        const cancelBtn = document.getElementById('map-cancel-btn');
        const confirmBtn = document.getElementById('map-confirm-btn');
        
        if (cancelBtn) {
            console.log('🔧 Adding cancel button listener...');
            cancelBtn.addEventListener('click', function(e) {
                console.log('🔴 Cancel button clicked!');
                e.preventDefault();
                e.stopPropagation();
                if (mapMode === 'add') {
                    cancelAddPlant();
                } else if (mapMode === 'edit') {
                    cancelEditMode();
                } else if (mapMode === 'delete') {
                    cancelDeletePlants();
                }
                console.log('🔴 Cancel button clicked done!');
            });
            console.log('✅ Cancel button listener added');
        } else {
            console.log('❌ Cancel button not found!');
        }
        
        if (confirmBtn) {
            console.log('🔧 Adding confirm button listener...');
            confirmBtn.addEventListener('click', function(e) {
                console.log('🟢 Confirm button clicked!');
                e.preventDefault();
                try {
                    if (mapMode === 'add') {
                        confirmAddPlant();
                    } else if (mapMode === 'edit') {
                        confirmEditMode();
                    } else if (mapMode === 'delete') {
                        confirmDeletePlants();
                    }
                } catch (error) {
                    console.error('❌ Error in confirm function:', error);
                }
            });
            console.log('✅ Confirm button listener added');
        } else {
            console.log('❌ Confirm button not found!');
        }
    }

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    function printMap() {
        console.log('🖨️ Printing map directly...');
        
        // Ensure we're on the map page
        const mapContent = document.getElementById('mapContent');
        if (!mapContent || mapContent.classList.contains('hidden')) {
            console.warn('⚠️ Map not currently visible, cannot print');
            return;
        }
        
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) {
            console.error('❌ Map container not found');
            return;
        }
        
        // Get all the current plants on the map
        const mapPlants = mapContainer.querySelectorAll('.map-plant');
        console.log('🌱 Found', mapPlants.length, 'plants on map');
        
        // Create plant data for print - split between left and right halves
        let leftPlantsHTML = '';
        let rightPlantsHTML = '';
        let leftPlantsList = [];
        let rightPlantsList = [];
        
        // Function to determine best text position to avoid clipping and overlaps
        function getSmartTextPosition(x, y, isLeftHalf) {
            // Define boundaries (with margins for text)
            const margin = 15; // Percentage margin from edges
            const topBoundary = margin;
            const bottomBoundary = 100 - margin;
            const leftBoundary = margin;
            const rightBoundary = 100 - margin;
            
            // Default to bottom position
            let position = 'position-bottom';
            
            // Check if bottom position would be clipped
            if (y > bottomBoundary - 10) {
                position = 'position-top';
            }
            // Check if top position would be clipped
            else if (y < topBoundary + 10) {
                position = 'position-bottom';
            }
            // For plants near edges, use side positioning
            else if (x < leftBoundary + 10) {
                position = 'position-right';
            }
            else if (x > rightBoundary - 10) {
                position = 'position-left';
            }
            
            return position;
        }

        mapPlants.forEach((plant, index) => {
            const rect = plant.getBoundingClientRect();
            const containerRect = mapContainer.getBoundingClientRect();
            
            // Calculate relative position within the map
            const relativeX = ((rect.left - containerRect.left) / containerRect.width) * 100;
            const relativeY = ((rect.top - containerRect.top) / containerRect.height) * 100;
            
            const emoji = plant.querySelector('.map-plant-emoji')?.textContent || '🌿';
            const plantId = plant.dataset.plantId;
            const plantName = plantId && placedPlants[plantId] ? placedPlants[plantId].name : `Plant ${index + 1}`;
            
            // Split plants based on X position (left half vs right half)
            if (relativeX <= 50) {
                // Left half - adjust X position to be relative to left half (0-100%)
                const adjustedX = (relativeX / 50) * 100;
                const textPosition = getSmartTextPosition(adjustedX, relativeY, true);
                
                leftPlantsHTML += `
                    <div class="print-plant" style="left: ${adjustedX}%; top: ${relativeY}%;" title="${plantName}">
                        <div class="print-plant-emoji">${emoji}</div>
                        <div class="print-plant-name ${textPosition}">${plantName}</div>
                    </div>
                `;
                leftPlantsList.push({ emoji, plantName });
            } else {
                // Right half - adjust X position to be relative to right half (0-100%)
                const adjustedX = ((relativeX - 50) / 50) * 100;
                const textPosition = getSmartTextPosition(adjustedX, relativeY, false);
                
                rightPlantsHTML += `
                    <div class="print-plant" style="left: ${adjustedX}%; top: ${relativeY}%;" title="${plantName}">
                        <div class="print-plant-emoji">${emoji}</div>
                        <div class="print-plant-name ${textPosition}">${plantName}</div>
                    </div>
                `;
                rightPlantsList.push({ emoji, plantName });
            }
        });
        
        // Create plant list HTML for each half
        const leftPlantListHTML = leftPlantsList.length > 0 ? 
            leftPlantsList.map(plant => `<div class="plant-item">${plant.emoji} ${plant.plantName}</div>`).join('') 
            : '<div class="plant-item">No plants on left half</div>';
            
        const rightPlantListHTML = rightPlantsList.length > 0 ? 
            rightPlantsList.map(plant => `<div class="plant-item">${plant.emoji} ${plant.plantName}</div>`).join('') 
            : '<div class="plant-item">No plants on right half</div>';
        
        // Remove any existing print content
        const existingPrintContent = document.getElementById('print-content');
        if (existingPrintContent) {
            existingPrintContent.remove();
        }
        
        // Create print content div
        const printContent = document.createElement('div');
        printContent.id = 'print-content';
        printContent.innerHTML = `
            <div class="print-page map-page">
                <div class="map-content">
                    <img class="map-image left-half" src="giantslothorchard_map.png" alt="Farm Map - Left Half" onerror="this.style.display='none';">
                    ${leftPlantsHTML}
                </div>
            </div>
            
            <div class="print-page map-page">
                <div class="map-content">
                    <img class="map-image right-half" src="giantslothorchard_map.png" alt="Farm Map - Right Half" onerror="this.style.display='none';">
                    ${rightPlantsHTML}
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(printContent);
        
        console.log('🖨️ Print content added to page, opening print dialog...');
        
        // Trigger print dialog directly
        window.print();
        
        // Clean up print content after printing
        setTimeout(() => {
            if (document.getElementById('print-content')) {
                document.getElementById('print-content').remove();
            }
        }, 1000);
        
        console.log('✅ Print dialog opened with', mapPlants.length, 'plants');
    }
    function createPrintPages(mapContainer) {
        // Create a temporary print-specific container
        const printContainer = document.createElement('div');
        printContainer.className = 'map-print-container';
        
        // Clone the map container for each page
        const mapClone1 = mapContainer.cloneNode(true);
        const mapClone2 = mapContainer.cloneNode(true);
        
        // Remove IDs to avoid conflicts
        removeIds(mapClone1);
        removeIds(mapClone2);
        
        // Style the clones for printing
        styleMapForPrint(mapClone1, 1);
        styleMapForPrint(mapClone2, 2);
        
        // Create the print container HTML
        printContainer.innerHTML = `
            <div class="map-print-page map-print-page-1">
                <h2 class="print-title">Giant Sloth Orchard - Farm Map (Page 1 of 2)</h2>
                <div class="map-print-content" id="map-print-content-1"></div>
            </div>
            <div class="map-print-page map-print-page-2">
                <h2 class="print-title">Giant Sloth Orchard - Farm Map (Page 2 of 2)</h2>
                <div class="map-print-content" id="map-print-content-2"></div>
            </div>
        `;
        
        // Add to body first
        document.body.appendChild(printContainer);
        
        // Add the map clones to the print content
        const printContent1 = document.getElementById('map-print-content-1');
        const printContent2 = document.getElementById('map-print-content-2');
        
        if (printContent1 && printContent2) {
            printContent1.appendChild(mapClone1);
            printContent2.appendChild(mapClone2);
        }
    }
    
    function removeIds(element) {
        // Remove ID attributes to avoid conflicts
        if (element.id) {
            element.removeAttribute('id');
        }
        
        // Recursively remove IDs from children
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
            removeIds(children[i]);
        }
    }
    
    function styleMapForPrint(mapClone, pageNumber) {
        // Reset any transforms and make visible
        mapClone.style.cssText = `
            position: relative !important;
            width: 100% !important;
            height: 600px !important;
            background: white !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            overflow: hidden !important;
            border: 1px solid #ccc !important;
        `;
        
        // Apply page-specific clipping and rotation
        if (pageNumber === 1) {
            // Show top half, rotated
            mapClone.style.transform = 'rotate(90deg) scale(0.8)';
            mapClone.style.transformOrigin = 'center center';
            mapClone.style.clipPath = 'inset(0 0 50% 0)';
        } else {
            // Show bottom half, rotated
            mapClone.style.transform = 'rotate(90deg) scale(0.8)';
            mapClone.style.transformOrigin = 'center center';
            mapClone.style.clipPath = 'inset(50% 0 0 0)';
        }
        
        // Force all child elements to be visible
        const allElements = mapClone.querySelectorAll('*');
        allElements.forEach(element => {
            element.style.visibility = 'visible !important';
            element.style.display = element.style.display === 'none' ? 'block' : element.style.display;
            element.style.opacity = '1';
        });
        
        // Ensure map background image is visible
        const mapImg = mapClone.querySelector('img');
        if (mapImg) {
            mapImg.style.cssText = `
                display: block !important;
                visibility: visible !important;
                width: 100% !important;
                height: auto !important;
                opacity: 1 !important;
            `;
        }
        
        // Ensure all plant markers are visible and styled for print
        const plantMarkers = mapClone.querySelectorAll('.plant-marker');
        plantMarkers.forEach(marker => {
            marker.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: absolute !important;
                z-index: 10 !important;
                background: rgba(255, 255, 255, 0.9) !important;
                border: 2px solid #000 !important;
                border-radius: 50% !important;
                padding: 4px !important;
                font-size: 12px !important;
                font-weight: bold !important;
                color: #000 !important;
                min-width: 24px !important;
                min-height: 24px !important;
                text-align: center !important;
            `;
            
            // Make sure text labels are readable
            const label = marker.querySelector('.plant-label');
            if (label) {
                label.style.cssText = `
                    color: #000 !important;
                    background-color: rgba(255, 255, 255, 0.95) !important;
                    padding: 2px 4px !important;
                    border-radius: 3px !important;
                    font-size: 10px !important;
                    font-weight: bold !important;
                    display: block !important;
                    visibility: visible !important;
                `;
            }
        });
    }

    // Public API
    return {
        // Core functions
        initializeMap: initializeMap,
        renderMapPlants: renderMapPlants,
        
        // Plant management
        startAddPlant: startAddPlant,
        selectPlant: selectPlant,
        deselectPlant: deselectPlant,
        
        // Mode management
        getMapMode: () => mapMode,
        getSelectedPlant: () => selectedPlant,
        getPlacedPlants: () => placedPlants,
        getTempPlantData: () => tempPlantData,
        
        // Setup functions
        setupMapEventListeners: setupMapEventListeners,
        populatePlantDropdown: populatePlantDropdown,
        
        // Cancel edit mode (called by app when navigating away)
        cancelEditMode: function() {
            if (mapMode === 'add') {
                cancelAddPlant();
            } else if (mapMode === 'edit') {
                cancelEditMode();
            } else if (mapMode === 'delete') {
                cancelDeletePlants();
            }
        },
        
        // Utility functions
        showElement: showElement,
        hideElement: hideElement,
        printMap: printMap
    };
})();