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
            mapContainer.addEventListener('click', handleMapClick);
            mapContainer.addEventListener('mousedown', handleMouseDown);
            mapContainer.addEventListener('mousemove', handleMouseMove);
            mapContainer.addEventListener('mouseup', handleMouseUp);
            mapContainer.addEventListener('mouseleave', handleMouseUp);
        }
        
        // Populate plant dropdown
        populatePlantDropdown();
        
        // Render existing plants
        renderMapPlants();
        
        mapInitialized = true;
        console.log('✅ Farm map initialized');
    }

    function loadPlantPlacements() {
        // In the future, this could load from mapdata.js file
        // For now, start with empty placements
        try {
            if (typeof mapPlants !== 'undefined' && Array.isArray(mapPlants)) {
                console.log('📍 Found map data in global scope');
                mapPlants.forEach(plant => {
                    const plantId = 'plant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    placedPlants[plantId] = plant;
                });
                console.log('✅ Map plant data loaded successfully:', Object.keys(placedPlants).length, 'plants');
            } else {
                console.log('📍 No existing map data found, starting fresh');
            }
        } catch (error) {
            console.log('📍 Error loading map data:', error);
        }
        placedPlants = placedPlants || {};
    }

    function savePlantPlacements() {
        // In a real implementation, this would save to mapdata.js file
        // For now, just keep in memory and log the data structure
        const mapData = Object.values(placedPlants).filter(plant => !plant.isTemp);
        console.log('💾 Plant placements saved (memory only):');
        console.log('mapPlants = ', JSON.stringify(mapData, null, 2));
        
        // This is what would be written to mapdata.js:
        // mapPlants = [
        //   {
        //     name: "Plant Name",
        //     botanical: "Botanical Name", 
        //     emoji: "🌱",
        //     x: 100,
        //     y: 150,
        //     radius: 25,
        //     diameter: 10
        //   },
        //   ...
        // ];
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
            console.log('🍌 Plant dropdown defaulted to Apple Banana');
        }
    }

    function handleMapClick(event) {
        console.log('🖱️ Map clicked in mode:', mapMode, 'tempPlantData:', !!tempPlantData);
        
        if (mapMode === 'add') {
            // In add mode, place plant at cursor position if none exists
            if (!tempPlantData) {
                console.log('🌱 Placing new temp plant...');
                const rect = event.currentTarget.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                console.log('📍 Placement coordinates:', { x, y });
                placeTempPlantAtPosition(x, y);
                event.preventDefault();
            } else {
                console.log('⚠️ Temp plant already exists, ignoring click');
            }
            return;
        }

        if (mapMode === 'edit') {
            // In edit mode, clicking selects plants for dragging
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const clickedPlant = findPlantAtPosition(x, y);
            
            if (clickedPlant && clickedPlant.id !== 'temp') {
                console.log('✏️ Plant selected for editing:', clickedPlant.name);
                selectedPlant = clickedPlant.id;
                event.preventDefault();
            } else {
                console.log('🕳️ Empty area clicked - deselecting');
                selectedPlant = null;
            }
            return;
        }
        
        if (mapMode === 'delete') {
            // In delete mode, mark plants for deletion
            const rect = event.currentTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const clickedPlant = findPlantAtPosition(x, y);
            
            if (clickedPlant && clickedPlant.id !== 'temp') {
                console.log('🗑️ Plant marked for deletion:', clickedPlant.name);
                markPlantForDeletion(clickedPlant.id);
                event.preventDefault();
            }
            return;
        }
        
        // In normal mode, clicking on a plant shows its detail
        console.log('👁️ Normal mode click - checking for plants');
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const clickedPlant = findPlantAtPosition(x, y);
        
        if (clickedPlant) {
            console.log('🌿 Plant clicked:', clickedPlant.name);
            // Show plant detail immediately in normal mode
            showPlantDetailFromMap(clickedPlant);
        } else {
            console.log('🕳️ Empty area clicked - deselecting');
            // Clicked empty area: deselect
            deselectPlant();
        }
    }

    function handleMouseDown(event) {
        if (mapMode === 'add') {
            // In add mode, only start dragging if clicking on the temp plant
            if (tempPlantData) {
                const rect = event.currentTarget.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
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
        
        if (mapMode === 'add' && tempPlantData) {
            // Update temp plant position
            tempPlantData.x = x;
            tempPlantData.y = y;
            renderMapPlants();
        } else if (mapMode === 'edit' && selectedPlant && placedPlants[selectedPlant]) {
            // Update existing plant position
            placedPlants[selectedPlant].x = x;
            placedPlants[selectedPlant].y = y;
            renderMapPlants();
        }
    }

    function handleMouseUp(event) {
        isDragging = false;
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
        hideElement('map-plant-select');
        hideElement('map-add-btn');
        hideElement('map-edit-btn');
        hideElement('map-delete-btn');
        hideElement('map-print-btn');
        
        // Show only confirm/cancel controls
        showElement('map-edit-controls');
    }

    function showAllButtons() {
        // Show all primary buttons
        showElement('map-plant-select');
        showElement('map-add-btn');
        showElement('map-edit-btn');
        showElement('map-delete-btn');
        showElement('map-print-btn');
        
        // Hide confirm/cancel controls
        hideElement('map-edit-controls');
    }

    function cancelAddPlant() {
        console.log('❌ Canceling add mode');
        mapMode = 'normal';
        selectedPlantForAddition = '';
        tempPlantData = null; // Reset temp plant data

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
        
        // Get plant size (diameter in feet)
        const diameter = getPlantDiameter(plantData);
        const radius = (diameter * mapConfig.mapScale) / 2;
        console.log('📏 Plant dimensions:', { diameter, radius });
        
        // Create temp plant object (not added to placedPlants)
        tempPlantData = {
            name: plantData.name,
            botanical: plantData.botanical,
            emoji: getPlantEmoji(plantData),
            x: x,
            y: y,
            radius: radius,
            diameter: diameter
        };
        
        console.log('✅ Temp plant data created (not in database)');
        
        renderMapPlants();
    }

    function confirmAddPlant() {
        console.log('✅ Confirming add mode');
        
        if (!tempPlantData) {
            console.log('❌ No plant to add');
            alert('Please place a plant on the map first');
            return;
        }
        
        mapMode = 'normal';
        selectedPlantForAddition = '';

        const plantId = 'plant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        placedPlants[plantId] = tempPlantData;
        tempPlantData = null; // Reset temp plant data

        // Show all buttons, hide confirm/cancel
        showAllButtons();
        
        // Reset cursor
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.style.cursor = 'default';
        }
        
        savePlantPlacements();
        renderMapPlants();
        console.log('✅ Plant added successfully');
    }

    function placePlantAtPosition(x, y) {
        // This function is now an alias for placeTempPlantAtPosition
        placeTempPlantAtPosition(x, y);
    }

    function getPlantDiameter(plantData) {
        // Try to extract diameter from various possible fields
        if (plantData.diameter) return parseFloat(plantData.diameter);
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
        console.log('✅ Confirming deletion of', Object.keys(tempDeleteList).length, 'plants');
        
        // Actually remove plants from placedPlants
        Object.keys(tempDeleteList).forEach(plantId => {
            const plantName = placedPlants[plantId]?.name;
            delete placedPlants[plantId];
            console.log('🗑️ Plant permanently deleted:', plantName);
        });
        
        // Clear temp delete list
        tempDeleteList = {};
        
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
            
            const plantElement = document.createElement('div');
            plantElement.className = 'map-plant';
            plantElement.dataset.plantId = id;
            
            if (selectedPlant === id) {
                plantElement.classList.add('selected');
            }
            
            plantElement.style.left = (plant.x - plant.radius) + 'px';
            plantElement.style.top = (plant.y - plant.radius) + 'px';
            plantElement.style.width = (plant.radius * 2) + 'px';
            plantElement.style.height = (plant.radius * 2) + 'px';
            
            plantElement.innerHTML = `
                <div class="map-plant-circle">
                    <div class="map-plant-emoji">${plant.emoji}</div>
                </div>
            `;
            
            mapContainer.appendChild(plantElement);
        });
        
        // Render plants marked for deletion with special styling
        Object.entries(tempDeleteList).forEach(([id, plant]) => {
            console.log('🗑️ Rendering plant marked for deletion:', id, plant.name);
            
            const plantElement = document.createElement('div');
            plantElement.className = 'map-plant marked-for-deletion';
            plantElement.dataset.plantId = id;
            
            plantElement.style.left = (plant.x - plant.radius) + 'px';
            plantElement.style.top = (plant.y - plant.radius) + 'px';
            plantElement.style.width = (plant.radius * 2) + 'px';
            plantElement.style.height = (plant.radius * 2) + 'px';
            
            plantElement.innerHTML = `
                <div class="map-plant-circle">
                    <div class="map-plant-emoji">${plant.emoji}</div>
                </div>
            `;
            
            mapContainer.appendChild(plantElement);
        });
        
        // Render temp plant if it exists
        if (tempPlantData) {
            console.log('🟡 Rendering temp plant:', tempPlantData.name);
            
            const plantElement = document.createElement('div');
            plantElement.className = 'map-plant temp';
            plantElement.dataset.plantId = 'temp';
            
            plantElement.style.left = (tempPlantData.x - tempPlantData.radius) + 'px';
            plantElement.style.top = (tempPlantData.y - tempPlantData.radius) + 'px';
            plantElement.style.width = (tempPlantData.radius * 2) + 'px';
            plantElement.style.height = (tempPlantData.radius * 2) + 'px';
            
            plantElement.innerHTML = `
                <div class="map-plant-circle">
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
        console.log('🖨️ Printing map in 2 pages (portrait, rotated 90°)...');
        
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
        
        // Create plant data for print
        let plantsHTML = '';
        mapPlants.forEach((plant, index) => {
            const rect = plant.getBoundingClientRect();
            const containerRect = mapContainer.getBoundingClientRect();
            
            // Calculate relative position within the map
            const relativeX = ((rect.left - containerRect.left) / containerRect.width) * 100;
            const relativeY = ((rect.top - containerRect.top) / containerRect.height) * 100;
            
            const emoji = plant.querySelector('.map-plant-emoji')?.textContent || '🌿';
            const plantName = plant.dataset.plantId || `Plant ${index + 1}`;
            
            plantsHTML += `
                <div class="print-plant" style="left: ${relativeX}%; top: ${relativeY}%;" title="${plantName}">
                    <div class="print-plant-emoji">${emoji}</div>
                </div>
            `;
        });
        
        // Get the map image source for print
        const mapImg = mapContainer.querySelector('img');
        let mapImageSrc = 'giantslothorchard_map.png';
        
        if (mapImg && mapImg.src) {
            mapImageSrc = mapImg.src;
            console.log('🖼️ Using map image source:', mapImageSrc);
        } else {
            console.log('🖼️ Using fallback image path for printing');
        }
        
        // Try a different approach - create print content in current window
        const existingPrintContent = document.getElementById('print-content');
        if (existingPrintContent) {
            existingPrintContent.remove();
        }
        
        // Create print content div
        const printContent = document.createElement('div');
        printContent.id = 'print-content';
        printContent.style.cssText = `
            position: fixed;
            top: -9999px;
            left: -9999px;
            width: 8.5in;
            height: 11in;
            background: white;
            z-index: 9999;
        `;
        
        printContent.innerHTML = `
            <style media="print">
                @page {
                    size: portrait;
                    margin: 0.5in;
                }
                
                body * {
                    visibility: hidden;
                }
                
                #print-content, #print-content * {
                    visibility: visible;
                }
                
                #print-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                }
                
                .print-page {
                    width: 100%;
                    height: 100vh;
                    page-break-after: always;
                    display: flex;
                    flex-direction: column;
                    background: white;
                    box-sizing: border-box;
                    padding: 20px;
                    position: relative;
                    color: black;
                }
                
                .print-page:last-child {
                    page-break-after: avoid;
                }
                
                .print-title {
                    color: #2d8f64;
                    font-size: 18px;
                    margin: 0 0 20px 0;
                    text-align: center;
                    font-weight: bold;
                }
                
                .map-content {
                    flex: 1;
                    background: linear-gradient(45deg, #4a7c59 0%, #6b8e23 50%, #228b22 100%);
                    border: 2px solid #2d8f64;
                    border-radius: 10px;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                    transform: rotate(90deg);
                    transform-origin: center;
                    width: 80%;
                    height: 60%;
                    margin: auto;
                }
                
                .map-background-image {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0.8;
                    z-index: 1;
                }
                
                .print-plant {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    z-index: 10;
                }
                
                .print-plant-emoji {
                    font-size: 16px;
                    text-align: center;
                    line-height: 20px;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 50%;
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }
                
                .map-title {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
                    text-align: center;
                    z-index: 5;
                }
                
                .map-subtitle {
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 14px;
                    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
                    z-index: 5;
                }
                
                .plant-list {
                    margin-top: 20px;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 5px;
                }
                
                .plant-list h3 {
                    margin: 0 0 10px 0;
                    color: #2d8f64;
                }
                
                .plant-item {
                    margin: 5px 0;
                    font-size: 14px;
                    color: black;
                }
            </style>
            
            <div class="print-page">
                <h2 class="print-title">🦥 Giant Sloth Orchard - Farm Map (Page 1 of 2)</h2>
                <div class="map-content page-1">
                    <img class="map-background-image" src="${mapImageSrc}" alt="Farm Map">
                    ${plantsHTML}
                    <div class="map-title">Giant Sloth Orchard<br><small>Holualoa, Hawaii Island</small></div>
                    <div class="map-subtitle">Exotic Tropical Plants & Rare Fruits</div>
                </div>
                <div class="plant-list">
                    <h3>Current Plants on Farm</h3>
                    ${mapPlants.length > 0 ? 
                        Array.from(mapPlants).map((plant, i) => {
                            const emoji = plant.querySelector('.map-plant-emoji')?.textContent || '🌿';
                            const plantId = plant.dataset.plantId || `Plant ${i + 1}`;
                            return `<div class="plant-item">${emoji} ${plantId}</div>`;
                        }).join('') 
                        : '<div class="plant-item">No plants currently placed on map</div>'
                    }
                </div>
            </div>
            
            <div class="print-page">
                <h2 class="print-title">🦥 Giant Sloth Orchard - Farm Map (Page 2 of 2)</h2>
                <div class="map-content page-2">
                    <img class="map-background-image" src="${mapImageSrc}" alt="Farm Map">
                    ${plantsHTML}
                    <div class="map-title">Giant Sloth Orchard<br><small>Holualoa, Hawaii Island</small></div>
                    <div class="map-subtitle">Visits by appointment only</div>
                </div>
                <div class="plant-list">
                    <h3>Contact Information</h3>
                    <div class="plant-item">📍 Location: Holualoa, Hawaii Island</div>
                    <div class="plant-item">📞 Visits: By appointment only</div>
                    <div class="plant-item">🌺 Specializing in exotic tropical plants and rare fruits</div>
                    <div class="plant-item">🦥 Giant sloths love cacao - supporting forest balance</div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(printContent);
        
        // Print immediately
        console.log('🖨️ Opening print dialog...');
        window.print();
        
        // Clean up after printing
        setTimeout(() => {
            if (printContent && printContent.parentNode) {
                printContent.parentNode.removeChild(printContent);
            }
        }, 1000);
        
        console.log('✅ Print content created with', mapPlants.length, 'plants');
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