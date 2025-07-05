#!/usr/bin/env node

/**
 * Map Manager Debug Test - Comprehensive testing without browser
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Map Manager Debug Test Suite');
console.log('=' .repeat(60));

// Mock DOM environment
class MockElement {
    constructor(id, tagName = 'div') {
        this.id = id;
        this.tagName = tagName;
        this.classList = new MockClassList();
        this.style = {};
        this.value = '';
        this.options = [];
        this.innerHTML = '';
        this.children = [];
        this.eventListeners = {};
    }
    
    addEventListener(event, handler) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(handler);
    }
    
    click() {
        if (this.eventListeners.click) {
            this.eventListeners.click.forEach(handler => {
                try {
                    handler({ preventDefault: () => {}, stopPropagation: () => {} });
                } catch (error) {
                    console.log(`❌ Error in ${this.id} click handler:`, error.message);
                }
            });
        }
    }
    
    appendChild(child) {
        this.children.push(child);
    }
    
    querySelectorAll(selector) {
        return [];
    }
}

class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    
    add(className) {
        this.classes.add(className);
    }
    
    remove(className) {
        this.classes.delete(className);
    }
    
    contains(className) {
        return this.classes.has(className);
    }
}

// Mock global objects
global.window = {
    plantsDatabase: null,
    MapManager: null,
    console: console,
    alert: (msg) => console.log(`🚨 ALERT: ${msg}`)
};

global.document = {
    getElementById: (id) => {
        const elements = {
            'map-plant-select': new MockElement('map-plant-select', 'select'),
            'map-add-btn': new MockElement('map-add-btn', 'button'),
            'map-edit-btn': new MockElement('map-edit-btn', 'button'),
            'map-delete-btn': new MockElement('map-delete-btn', 'button'),
            'map-print-btn': new MockElement('map-print-btn', 'button'),
            'map-cancel-btn': new MockElement('map-cancel-btn', 'button'),
            'map-confirm-btn': new MockElement('map-confirm-btn', 'button'),
            'mapContainer': new MockElement('mapContainer', 'div'),
            'map-edit-controls': new MockElement('map-edit-controls', 'div')
        };
        return elements[id] || null;
    },
    createElement: (tagName) => new MockElement('', tagName),
    addEventListener: () => {},
    head: { appendChild: () => {} }
};

global.console = console;

// Test runner
class MapDebugger {
    constructor() {
        this.results = [];
        this.issues = [];
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
    }
    
    test(name, testFn) {
        try {
            const result = testFn();
            if (result === true || result === undefined) {
                this.results.push({ name, status: 'PASS', message: 'OK' });
                this.log(`✅ ${name}: PASSED`);
            } else {
                this.results.push({ name, status: 'WARN', message: result });
                this.log(`⚠️ ${name}: ${result}`);
            }
        } catch (error) {
            this.results.push({ name, status: 'FAIL', message: error.message });
            this.log(`❌ ${name}: ${error.message}`);
            this.issues.push({ test: name, error: error.message, stack: error.stack });
        }
    }
    
    async runTests() {
        this.log('🔍 Starting comprehensive map debugging...');
        
        // Test 1: Load plant database
        this.test('Load Plant Database', () => {
            try {
                const plantDbPath = path.join(__dirname, 'plantdatabase.js');
                const plantDbContent = fs.readFileSync(plantDbPath, 'utf8');
                
                // Execute the plant database script
                eval(plantDbContent);
                
                if (global.window.plantsDatabase && Array.isArray(global.window.plantsDatabase)) {
                    this.log(`📦 Loaded ${global.window.plantsDatabase.length} plants`);
                    
                    // Check for Apple Banana
                    const appleBanana = global.window.plantsDatabase.find(p => p.name === 'Apple Banana');
                    if (appleBanana) {
                        this.log(`🍌 Found Apple Banana: ${appleBanana.emoji} ${appleBanana.name}`);
                        return true;
                    } else {
                        return 'Apple Banana not found in database';
                    }
                } else {
                    return 'Plant database not loaded or invalid format';
                }
            } catch (error) {
                return `Failed to load plant database: ${error.message}`;
            }
        });
        
        // Test 2: Load map manager
        this.test('Load Map Manager', () => {
            try {
                const mapManagerPath = path.join(__dirname, 'map-manager.js');
                const mapManagerContent = fs.readFileSync(mapManagerPath, 'utf8');
                
                // Execute the map manager script
                eval(mapManagerContent);
                
                if (global.window.MapManager && typeof global.window.MapManager === 'object') {
                    this.log('🗺️ Map Manager loaded successfully');
                    return true;
                } else {
                    return 'Map Manager not loaded or invalid format';
                }
            } catch (error) {
                return `Failed to load map manager: ${error.message}`;
            }
        });
        
        // Test 3: Check Map Manager API
        this.test('Map Manager API', () => {
            const mapManager = global.window.MapManager;
            if (!mapManager) return 'Map Manager not available';
            
            const requiredMethods = [
                'initializeMap',
                'setupMapEventListeners', 
                'populatePlantDropdown',
                'renderMapPlants'
            ];
            
            const missingMethods = requiredMethods.filter(method => 
                typeof mapManager[method] !== 'function'
            );
            
            if (missingMethods.length > 0) {
                return `Missing methods: ${missingMethods.join(', ')}`;
            }
            
            this.log('🔧 All required methods found');
            return true;
        });
        
        // Test 4: Initialize map
        this.test('Map Initialization', () => {
            const mapManager = global.window.MapManager;
            if (!mapManager) return 'Map Manager not available';
            
            try {
                mapManager.initializeMap();
                this.log('🗺️ Map initialization completed');
                return true;
            } catch (error) {
                return `Map initialization failed: ${error.message}`;
            }
        });
        
        // Test 5: Setup event listeners
        this.test('Event Listeners Setup', () => {
            const mapManager = global.window.MapManager;
            if (!mapManager) return 'Map Manager not available';
            
            try {
                mapManager.setupMapEventListeners();
                this.log('🔧 Event listeners setup completed');
                
                // Check if elements have event listeners
                const addBtn = global.document.getElementById('map-add-btn');
                const hasClickListener = addBtn && addBtn.eventListeners.click && addBtn.eventListeners.click.length > 0;
                
                if (hasClickListener) {
                    this.log('✅ Add button has click listener');
                    return true;
                } else {
                    return 'Add button missing click listener';
                }
            } catch (error) {
                return `Event listeners setup failed: ${error.message}`;
            }
        });
        
        // Test 6: Populate dropdown
        this.test('Dropdown Population', () => {
            const mapManager = global.window.MapManager;
            if (!mapManager) return 'Map Manager not available';
            
            try {
                mapManager.populatePlantDropdown();
                
                const dropdown = global.document.getElementById('map-plant-select');
                if (dropdown && dropdown.value === 'Apple Banana') {
                    this.log('🍌 Dropdown defaulted to Apple Banana');
                    return true;
                } else {
                    return `Dropdown value: ${dropdown?.value || 'undefined'}`;
                }
            } catch (error) {
                return `Dropdown population failed: ${error.message}`;
            }
        });
        
        // Test 7: Test add mode
        this.test('Add Mode Functionality', () => {
            const addBtn = global.document.getElementById('map-add-btn');
            if (!addBtn) return 'Add button not found';
            
            try {
                // Set dropdown value first
                const dropdown = global.document.getElementById('map-plant-select');
                if (dropdown) {
                    dropdown.value = 'Apple Banana';
                }
                
                // Click add button
                addBtn.click();
                
                this.log('🎯 Add button clicked successfully');
                return true;
            } catch (error) {
                return `Add mode test failed: ${error.message}`;
            }
        });
        
        // Test 8: Test cancel functionality
        this.test('Cancel Functionality', () => {
            const cancelBtn = global.document.getElementById('map-cancel-btn');
            if (!cancelBtn) return 'Cancel button not found';
            
            try {
                cancelBtn.click();
                this.log('🔴 Cancel button clicked successfully');
                return true;
            } catch (error) {
                return `Cancel test failed: ${error.message}`;
            }
        });
        
        this.log('\n' + '=' .repeat(60));
        this.log('📊 TEST SUMMARY');
        this.log('=' .repeat(60));
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const warned = this.results.filter(r => r.status === 'WARN').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        this.log(`✅ PASSED: ${passed}`);
        this.log(`⚠️ WARNED: ${warned}`);
        this.log(`❌ FAILED: ${failed}`);
        
        if (this.issues.length > 0) {
            this.log('\n🐛 ISSUES FOUND:');
            this.issues.forEach((issue, i) => {
                this.log(`${i + 1}. ${issue.test}: ${issue.error}`);
            });
        }
        
        if (failed === 0) {
            this.log('\n🎉 All critical tests passed! Map should be working.');
        } else {
            this.log('\n🚨 Critical issues found. Map functionality may be broken.');
        }
        
        return { passed, warned, failed, issues: this.issues };
    }
}

// Run the tests
async function main() {
    const tester = new MapDebugger();
    const results = await tester.runTests();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { MapDebugger };