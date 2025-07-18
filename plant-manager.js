// Plant Manager Module
// Handles all plant-related functionality for Giant Sloth Orchard

window.PlantManager = (function() {
    'use strict';
    
    // Plant state variables
    let currentCategory = 'all';
    let searchTerm = '';
    let plantsLoaded = false;

    // Check for plant database and initialize
    function checkPlantDatabase() {
        console.log('🔍 Checking for plant database...');
        
        let plantsData = null;
        
        if (typeof window.plantsDatabase !== 'undefined') {
            console.log('📊 Found plantsDatabase on window object');
            plantsData = window.plantsDatabase;
        } else if (typeof plants !== 'undefined') {
            console.log('📊 Found plants in global scope');
            plantsData = plants;
        } else if (typeof window.plants !== 'undefined') {
            console.log('📊 Found plants on window object');
            plantsData = window.plants;
        } else if (typeof getPlants === 'function') {
            console.log('📊 Found getPlants function');
            plantsData = getPlants();
        }
        
        if (plantsData && Array.isArray(plantsData) && plantsData.length > 0) {
            window.plantsDatabase = plantsData;
            plantsLoaded = true;
            console.log('✅ External plant database loaded successfully:', plantsData.length, 'plants');
            hideMessage('loadingMessage');
            hideMessage('errorMessage');
            renderPlants();
            updateFooterStats();
            
            // Update map dropdown if MapManager is available
            if (window.MapManager && typeof window.MapManager.populatePlantDropdown === 'function') {
                window.MapManager.populatePlantDropdown();
                console.log('🗺️ Map dropdown updated with plant database');
            }
        } else {
            console.log('❌ Plant database not found, empty, or invalid');
            plantsLoaded = false;
            hideMessage('loadingMessage');
            showMessage('errorMessage');
            
            const expectedPath = new URL('plantdatabase.js', window.location.href).href;
            const pathElement = document.getElementById('expected-db-path');
            if (pathElement) {
                pathElement.textContent = expectedPath;
            }
            
            document.getElementById('footer-plant-count').textContent = 'Error';
            document.getElementById('footer-wishlist-count').textContent = 'Error';
        }
    }

    function setActiveCategory(category) {
        console.log('🏷️ Switching to category:', category);
        currentCategory = category;
        
        document.querySelectorAll('[data-category]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        // If we're not on the home page, switch to it first
        if (window.AppManager && window.AppManager.getCurrentPage() !== 'home') {
            window.AppManager.setActivePage('home');
        } else {
            // If already on home page, just update the plants
            if (plantsLoaded) {
                renderPlants();
                updateFooterStats();
            }
        }
    }

    function getFilteredPlants() {
        if (!plantsLoaded || !window.plantsDatabase) {
            return [];
        }
        
        let filtered = window.plantsDatabase;
        
        if (currentCategory === 'wishlist') {
            // Wishlist: only plants that are ONLY in wishlist (no multi-category wishlist plants)
            filtered = filtered.filter(plant => plant.category === 'wishlist');
        } else if (currentCategory !== 'all') {
            // Specific category: exclude wishlist plants entirely, then filter by category
            filtered = filtered.filter(plant => {
                // First exclude any wishlist plants
                if (plant.category === 'wishlist' || 
                    (plant.category && plant.category.split(',').includes('wishlist'))) {
                    return false;
                }
                
                // Then check if plant matches current category
                if (plant.category.includes(',')) {
                    // Multi-category plant - check if current category is in the list
                    return plant.category.split(',').includes(currentCategory);
                } else {
                    // Single category plant - exact match
                    return plant.category === currentCategory;
                }
            });
        } else {
            // All: exclude wishlist plants entirely
            filtered = filtered.filter(plant => 
                plant.category !== 'wishlist' && 
                !(plant.category && plant.category.split(',').includes('wishlist'))
            );
        }
        
        if (searchTerm) {
            filtered = filtered.filter(plant => 
                plant.name.toLowerCase().includes(searchTerm) ||
                plant.botanical.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered.sort((a, b) => {
            const botanicalCompare = a.botanical.localeCompare(b.botanical);
            if (botanicalCompare !== 0) {
                return botanicalCompare;
            }
            return a.name.localeCompare(b.name);
        });
    }

    function renderPlants() {
        if (window.AppManager && window.AppManager.getCurrentPage() !== 'home') return;
        
        if (!plantsLoaded) {
            hideElement('plantGrid');
            showMessage('errorMessage');
            return;
        }
        
        const grid = document.getElementById('plantGrid');
        const filteredPlants = getFilteredPlants();
        
        hideAllMessages();
        
        if (filteredPlants.length === 0) {
            hideElement('plantGrid');
            showMessage('noResults');
            return;
        }
        
        showElement('plantGrid');
        grid.innerHTML = filteredPlants.map((plant, index) => {
            // Priority order: plant_photo, flower_photo, fruit_photo
            const photoUrl = plant.plant_photo || plant.flower_photo || plant.fruit_photo;
            
            return `
            <div class="plant-card" onclick="PlantManager.openPlantDetail(${index})">
                <div class="plant-image">
                    ${photoUrl ? 
                        `<img src="${photoUrl}" alt="${plant.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div style="display: none; font-size: 3rem;">${plant.emoji || '🌱'}</div>` :
                        `<div style="font-size: 3rem;">${plant.emoji || '🌱'}</div>`
                    }
                </div>
                <h3>${plant.name}</h3>
                <p>${plant.botanical}</p>
            </div>
            `;
        }).join('');
        
        console.log('✅ Plants rendered successfully:', filteredPlants.length);
    }

    function updateFooterStats() {
        if (!plantsLoaded || !window.plantsDatabase) {
            document.getElementById('footer-plant-count').textContent = 'Error';
            document.getElementById('footer-wishlist-count').textContent = 'Error';
            return;
        }
        
        const totalPlants = window.plantsDatabase.filter(plant => 
            plant.category !== 'wishlist' && 
            !(plant.category && plant.category.split(',').includes('wishlist'))
        ).length;
        const wishlistCount = window.plantsDatabase.filter(plant => 
            plant.category === 'wishlist' || 
            (plant.category && plant.category.split(',').includes('wishlist'))
        ).length;
        const currentFiltered = getFilteredPlants().length;
        
        const displayCount = currentCategory === 'all' ? totalPlants : currentFiltered;
        
        document.getElementById('footer-plant-count').textContent = displayCount;
        document.getElementById('footer-wishlist-count').textContent = wishlistCount;
    }

    function openPlantDetail(index) {
        const filteredPlants = getFilteredPlants();
        const plant = filteredPlants[index];
        console.log('🔍 Opening plant detail for:', plant.name);
        
        const overlay = document.getElementById('detailOverlay');
        const images = document.getElementById('detailImages');
        const text = document.getElementById('detailText');
        const moreResourcesLink = document.getElementById('moreResourcesLink');
        
        const imageUrls = [];
        if (plant.plant_photo) imageUrls.push({ url: plant.plant_photo, label: 'Plant' });
        if (plant.flower_photo) imageUrls.push({ url: plant.flower_photo, label: 'Flower' });
        if (plant.fruit_photo) imageUrls.push({ url: plant.fruit_photo, label: 'Fruit' });
        
        if (imageUrls.length > 0) {
            images.innerHTML = imageUrls.map((img, imgIndex) => `
                <div class="detail-image-container">
                    <img src="${img.url}" alt="${plant.name} - ${img.label}" class="detail-image" 
                         onclick="PlantManager.openPhotoModal('${img.url}')" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="detail-image-fallback" style="display: none;">
                        <div class="detail-emoji">${plant.emoji || '🌱'}</div>
                        <div class="detail-emoji-label">${img.label}</div>
                    </div>
                </div>
            `).join('');
        } else {
            images.innerHTML = `<div class="detail-image-fallback detail-image-only">
                <div class="detail-emoji">${plant.emoji || '🌱'}</div>
                <div class="detail-emoji-label">Plant</div>
            </div>`;
        }
        
        let textContent = `
            <h2>${plant.name}</h2>
            <p><em>${plant.botanical}</em></p>
            <p><strong>Category:</strong> ${plant.category}</p>
        `;
        
        if (plant.general_info) {
            textContent += `<h3>General Information</h3><p>${plant.general_info}</p>`;
        }
        
        if (plant.cultivation_tips) {
            textContent += `<h3>Cultivation Tips</h3><p>${plant.cultivation_tips}</p>`;
        }
        
        if (plant.pest_management) {
            textContent += `<h3>Pest Management</h3><p>${plant.pest_management}</p>`;
        }
        
        if (plant.pruning_guidelines) {
            textContent += `<h3>Pruning Guidelines</h3><p>${plant.pruning_guidelines}</p>`;
        }
        

        
        text.innerHTML = textContent;
        
        if (plant.info_url) {
            moreResourcesLink.href = plant.info_url;
            moreResourcesLink.style.display = 'block';
        } else {
            moreResourcesLink.style.display = 'none';
        }
        
        overlay.style.display = 'flex';
    }

    function closeDetail() {
        document.getElementById('detailOverlay').style.display = 'none';
    }



    function openPhotoModal(imageSrc) {
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        modalImage.src = imageSrc;
        modal.style.display = 'flex';
    }

    function closePhotoModal() {
        document.getElementById('photoModal').style.display = 'none';
    }

    function handleSearch(searchValue) {
        searchTerm = searchValue.toLowerCase();
        if (window.AppManager && window.AppManager.getCurrentPage() === 'home' && plantsLoaded) {
            renderPlants();
            updateFooterStats();
        }
    }

    function setupPlantEventListeners() {
        // Category navigation
        document.querySelectorAll('[data-category]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                setActiveCategory(this.dataset.category);
            });
        });
        
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                handleSearch(e.target.value);
            });
        }
    }

    // Utility functions for UI state management
    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    function showMessage(id) {
        showElement(id);
    }

    function hideMessage(id) {
        hideElement(id);
    }

    function hideAllMessages() {
        hideMessage('loadingMessage');
        hideMessage('errorMessage');
        hideMessage('noResults');
    }

    // Public API
    return {
        // Core functions
        checkPlantDatabase: checkPlantDatabase,
        setActiveCategory: setActiveCategory,
        renderPlants: renderPlants,
        updateFooterStats: updateFooterStats,
        
        // Detail functions  
        openPlantDetail: openPlantDetail,
        closeDetail: closeDetail,
        openPhotoModal: openPhotoModal,
        closePhotoModal: closePhotoModal,
        
        // Search functions
        handleSearch: handleSearch,
        
        // Setup functions
        setupPlantEventListeners: setupPlantEventListeners,
        
        // State getters
        getCurrentCategory: () => currentCategory,
        getSearchTerm: () => searchTerm,
        isPlantsLoaded: () => plantsLoaded,
        getFilteredPlants: getFilteredPlants,
        
        // Utility functions
        showElement: showElement,
        hideElement: hideElement,
        showMessage: showMessage,
        hideMessage: hideMessage,
        hideAllMessages: hideAllMessages
    };
})();

// Global functions for onclick handlers (backward compatibility)
function closeDetail() {
    window.PlantManager.closeDetail();
}

function closePhotoModal() {
    window.PlantManager.closePhotoModal();
}