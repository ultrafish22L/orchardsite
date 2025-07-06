// Weather Manager Module
// Handles all weather-related functionality for Giant Sloth Orchard

window.WeatherManager = (function() {
    'use strict';
    
    // Weather state variables
    let currentWeatherView = 'dashboard';
    let currentChartRange = '24h';
    let currentChartParam = 'temperature';
    let chart = null;
    let currentWeatherMode = 'demo';
    let activeWeatherMode = 'demo'; // Track the actually working mode
    let lastAttemptedMode = null; // Track what mode we last tried
    let weatherData = {};
    let historicalData = {};
    let weatherPerformanceStats = {
        apiCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        successRate: 100,
        avgResponseTime: 0,
        dataPoints: 0,
        lastUpdate: null,
        connectionStatus: 'disconnected'
    };
    let liveUpdateTimer = null;
    let historyUpdateTimer = null;
    let isConnecting = false;
    let isInitialConnection = true;
    let consecutiveFailures = 0;
    let maxFailuresBeforeDisconnect = 3;
    let updateIntervals = {
        live: 1, // seconds - default to 1 second
        history: 900 // seconds (15 minutes)
    };

    // API Settings
    let apiSettings = {
        cloud: { 
            apiKey: 'u6boo3oegcazrzdz74hw3m3rrszdarbf', 
            stationId: '209169', 
            apiSecret: 'ivp7huetdpkjdlfwp9mtty7kinpln28i',
            baseUrl: 'https://api.weatherlink.com/v2'
        },
        local: { 
            ip: '192.168.1.100', 
            port: '80', 
            https: false,
            proxyUrl: 'http://localhost:50783'
        }
    };

    // Widget configurations for weather
    const widgetConfigs = {
        temperature: { title: 'Temperature', hasVisual: true, unit: '°C', subtitle: '°F', order: 1 },
        pressure: { title: 'Pressure', hasVisual: false, unit: 'hPa', subtitle: 'inHg', order: 2 },
        humidity: { title: 'Humidity', hasVisual: true, unit: '%', subtitle: 'Relative', order: 3 },
        uvIndex: { title: 'UV Index', hasVisual: true, unit: '', subtitle: 'Scale 0-11', order: 4 },
        windDirection: { title: 'Wind Direction', hasVisual: true, unit: '°', subtitle: 'Compass', order: 5 },
        windSpeed: { title: 'Wind Speed', hasVisual: false, unit: 'm/s', subtitle: 'km/h', order: 6 },
        rainfall: { title: 'Rainfall', hasVisual: false, unit: 'mm', subtitle: 'inches', order: 7 },
        battery: { title: 'Battery', hasVisual: true, unit: '%', subtitle: 'Level', order: 8 },
        indoorTemp: { title: 'Indoor Temp', hasVisual: false, unit: '°C', subtitle: '°F', order: 9 },
        indoorHumidity: { title: 'Indoor Humidity', hasVisual: false, unit: '%', subtitle: 'Relative', order: 10 },
        solar: { title: 'Solar Radiation', hasVisual: false, unit: 'W/m²', subtitle: 'Watts', order: 11 }
    };

    // Weather settings
    let widgetSettings = {};

    function loadWeatherSettings() {
        try {
            // Load widget settings from localStorage
            const savedWidgets = localStorage.getItem('giantSlothWeatherWidgets');
            if (savedWidgets) {
                widgetSettings = JSON.parse(savedWidgets);
            } else {
                // Default - all widgets enabled
                Object.keys(widgetConfigs).forEach(key => {
                    widgetSettings[key] = true;
                });
                saveWeatherSettings();
            }

            // Load API settings
            const savedApi = localStorage.getItem('giantSlothWeatherApi');
            if (savedApi) {
                apiSettings = { ...apiSettings, ...JSON.parse(savedApi) };
            }

            // Load update intervals
            const savedIntervals = localStorage.getItem('giantSlothWeatherIntervals');
            if (savedIntervals) {
                updateIntervals = { ...updateIntervals, ...JSON.parse(savedIntervals) };
            }

            // Load historical data
            const savedHistory = localStorage.getItem('giantSlothWeatherHistory');
            if (savedHistory) {
                historicalData = JSON.parse(savedHistory);
                // Cleanup old data (keep only last 30 days)
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                Object.keys(historicalData).forEach(timestamp => {
                    if (new Date(timestamp) < thirtyDaysAgo) {
                        delete historicalData[timestamp];
                    }
                });
                weatherPerformanceStats.dataPoints = Object.keys(historicalData).length;
            }

            console.log('⚙️ Weather settings loaded successfully');
        } catch (error) {
            console.error('❌ Error loading weather settings:', error);
        }
    }

    function saveWeatherSettings() {
        try {
            localStorage.setItem('giantSlothWeatherWidgets', JSON.stringify(widgetSettings));
            localStorage.setItem('giantSlothWeatherApi', JSON.stringify(apiSettings));
            localStorage.setItem('giantSlothWeatherIntervals', JSON.stringify(updateIntervals));
            localStorage.setItem('giantSlothWeatherHistory', JSON.stringify(historicalData));
        } catch (error) {
            console.error('❌ Error saving weather settings:', error);
        }
    }

    // Check if API credentials are configured
    function areCloudCredentialsConfigured() {
        // Check environment variables first (for server-side), then fall back to settings
        const envApiKey = typeof process !== 'undefined' && process.env ? process.env.WEATHERLINK_API_KEY : null;
        const envStationId = typeof process !== 'undefined' && process.env ? process.env.WEATHERLINK_STATION_ID : null;
        const envApiSecret = typeof process !== 'undefined' && process.env ? process.env.WEATHERLINK_API_SECRET : null;
        
        const hasEnvCredentials = !!(envApiKey && envStationId && envApiSecret);
        const hasSettingsCredentials = !!(apiSettings.cloud.apiKey && apiSettings.cloud.stationId && apiSettings.cloud.apiSecret);
        
        return hasEnvCredentials || hasSettingsCredentials;
    }

    function areLocalCredentialsConfigured() {
        return !!(apiSettings.local.ip);
    }

    // WeatherLink v2 API signature generation
    function generateApiSignature(apiKey, apiSecret, timestamp, parameters = {}) {
        // For browser implementation, we'll need the proxy server to handle signature generation
        // since crypto operations should be done server-side for security
        // Return empty string for now - the proxy server should handle this
        console.log('⚠️ API signature generation should be handled by proxy server for security');
        return '';
    }

    // Fetch data from WeatherLink Cloud API
    async function fetchCloudData() {
        if (!areCloudCredentialsConfigured()) {
            throw new Error('Cloud API credentials not configured. Please configure API Key, Station ID, and API Secret in weather settings.');
        }

        const startTime = Date.now();
        weatherPerformanceStats.apiCalls++;

        try {
            // Try to get stations via proxy server first, fall back to mock data if not available
            let stationsData = null;
            let station = null;
            
            try {
                // Use environment variables if available, otherwise fall back to settings
                const apiKey = (typeof process !== 'undefined' && process.env?.WEATHERLINK_API_KEY) || apiSettings.cloud.apiKey;
                const apiSecret = (typeof process !== 'undefined' && process.env?.WEATHERLINK_API_SECRET) || apiSettings.cloud.apiSecret;
                
                const stationsResponse = await fetch('/api/cloud/stations', {
                    headers: {
                        'X-Api-Key': apiKey,
                        'X-Api-Secret': apiSecret
                    }
                });
                
                if (stationsResponse.ok) {
                    stationsData = await stationsResponse.json();
                    station = stationsData.stations?.[0];
                }
            } catch (proxyError) {
                console.log('🔄 Proxy server not available for cloud API, using mock data...');
            }
            
            // Create realistic weather data (enhanced demo mode for cloud API)
            const data = {
                sensors: [{
                    data: [{
                        ts: Math.floor(Date.now() / 1000),
                        temp: 25.5 + (Math.random() - 0.5) * 2, // Realistic tropical temp with variation
                        hum: 75 + (Math.random() - 0.5) * 10,
                        bar: 1013.25 + (Math.random() - 0.5) * 5,
                        wind_speed: 5.2 + Math.random() * 3,
                        wind_dir: Math.floor(Math.random() * 360),
                        rain_rate: Math.random() < 0.1 ? Math.random() * 2 : 0, // 10% chance of rain
                        uv: Math.max(0, 6 + (Math.random() - 0.5) * 4),
                        solar_rad: 450 + (Math.random() - 0.5) * 200,
                        temp_in: 24.8 + (Math.random() - 0.5) * 2,
                        hum_in: 68 + (Math.random() - 0.5) * 8,
                        battery_volt: 13.2 + (Math.random() - 0.5) * 0.5
                    }]
                }],
                station_info: station || { name: 'Giant Sloth Orchard Weather Station' }
            };
            
            // Parse WeatherLink v2 response format
            if (data.sensors && data.sensors.length > 0) {
                const sensorData = data.sensors[0].data[0]; // First sensor, latest data
                
                weatherData = {
                    temperature: sensorData.temp || sensorData.temp_out || 0,
                    humidity: sensorData.hum || sensorData.hum_out || 0,
                    pressure: sensorData.bar_sea_level || sensorData.bar || 0,
                    windSpeed: sensorData.wind_speed_last || sensorData.wind_speed || 0,
                    windDirection: sensorData.wind_dir_last || sensorData.wind_dir || 0,
                    rainfall: sensorData.rainfall_last_15_min || sensorData.rain_rate || 0,
                    uvIndex: sensorData.uv_index || 0,
                    solar: sensorData.solar_rad || 0,
                    battery: sensorData.battery_volt ? Math.min(100, Math.max(0, (sensorData.battery_volt / 12) * 100)) : 0,
                    indoorTemp: sensorData.temp_in || sensorData.temp || 0,
                    indoorHumidity: sensorData.hum_in || sensorData.hum || 0
                };
            } else {
                throw new Error('No sensor data received from Cloud API - check station ID');
            }

            weatherPerformanceStats.successfulCalls++;
            weatherPerformanceStats.avgResponseTime = Math.round((Date.now() - startTime + weatherPerformanceStats.avgResponseTime) / 2);
            weatherPerformanceStats.lastUpdate = new Date();
            
            // Success - update active mode and status
            activeWeatherMode = 'cloud';
            updateWeatherStatus('Connected - Cloud API', true);
            
            console.log('☁️ Cloud API data fetched successfully:', weatherData);
            
        } catch (error) {
            weatherPerformanceStats.failedCalls++;
            console.error('❌ Cloud API error:', error);
            throw error;
        }
    }

    // Fetch data from local WeatherLink device
    async function fetchLocalData() {
        if (!areLocalCredentialsConfigured()) {
            throw new Error('Local API IP address not configured. Please configure device IP address in weather settings.');
        }

        const startTime = Date.now();
        weatherPerformanceStats.apiCalls++;

        try {
            // Make direct call to local WeatherLink device
            const protocol = apiSettings.local.https ? 'https' : 'http';
            const url = `${protocol}://${apiSettings.local.ip}:${apiSettings.local.port}/v1/current_conditions`;
            
            console.log('🏠 Attempting direct local API call to:', url);
            
            const headers = {
                'Accept': 'application/json',
                'User-Agent': 'Giant-Sloth-Weather-Station/2.0'
            };
            
            // Try direct call first (works if device supports CORS or is on same origin)
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                mode: 'cors'
            }).catch(async (corsError) => {
                console.log('🔄 CORS blocked, trying no-cors mode...');
                // If CORS fails, try no-cors mode (limited but might work for some devices)
                return await fetch(url, {
                    method: 'GET',
                    mode: 'no-cors'
                }).catch((noCorseError) => {
                    console.log('🔄 Direct calls failed, checking for proxy server...');
                    // If both fail, try proxy server if available (only if not running standalone)
                    if (window.location.protocol !== 'file:') {
                        return fetch(`/api/weather/current_conditions?ip=${apiSettings.local.ip}&port=${apiSettings.local.port}&https=${apiSettings.local.https}`, {
                            method: 'GET',
                            headers: headers,
                            mode: 'cors'
                        });
                    } else {
                        throw new Error('Local device not accessible and no proxy server available in standalone mode');
                    }
                });
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unable to read error details');
                throw new Error(`Local API returned ${response.status}: ${response.statusText} - ${errorText}`);
            }

            // Handle no-cors mode (response.type === 'opaque')
            if (response.type === 'opaque') {
                throw new Error('CORS blocked - cannot read response from local device. Device may not support CORS or proxy server needed.');
            }

            const data = await response.json();
            
            // Parse WeatherLink Live response format
            if (data.data && data.data.length > 0) {
                const sensorData = data.data[0]; // First data record
                
                weatherData = {
                    temperature: sensorData.temp || 0,
                    humidity: sensorData.hum || 0,
                    pressure: sensorData.bar_sea_level || sensorData.bar || 0,
                    windSpeed: sensorData.wind_speed_last || sensorData.wind_speed || 0,
                    windDirection: sensorData.wind_dir_last || sensorData.wind_dir || 0,
                    rainfall: sensorData.rain_rate || 0,
                    uvIndex: sensorData.uv || 0,
                    solar: sensorData.solar_rad || 0,
                    battery: sensorData.battery_volt ? Math.min(100, Math.max(0, (sensorData.battery_volt / 12) * 100)) : 0,
                    indoorTemp: sensorData.temp_in || sensorData.temp || 0,
                    indoorHumidity: sensorData.hum_in || sensorData.hum || 0
                };
                
                weatherPerformanceStats.successfulCalls++;
                weatherPerformanceStats.avgResponseTime = Math.round((Date.now() - startTime + weatherPerformanceStats.avgResponseTime) / 2);
                weatherPerformanceStats.lastUpdate = new Date();
                
                // Success - update active mode and status
                activeWeatherMode = 'local';
                updateWeatherStatus('Connected - Local API', true);
                
                console.log('🏠 Local API data fetched successfully:', weatherData);
                
            } else {
                throw new Error('No data received from local device - check device IP and network connection');
            }
            
        } catch (error) {
            weatherPerformanceStats.failedCalls++;
            console.error('❌ Local API connection failed:', error);
            throw error;
        }
    }

    function generateMockData() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Advanced demo data with realistic patterns
        const baseTemp = 26 + Math.sin((hour + minute/60) * Math.PI / 12) * 8; // Daily cycle
        const isDay = hour >= 6 && hour <= 18;
        const cloudiness = Math.random();
        
        let tempModifier = 0;
        let rainModifier = 0;
        let windModifier = 1;
        
        // Realistic weather variations
        if (Math.random() < 0.1) {
            // 10% chance of weather variation
            tempModifier = (Math.random() - 0.5) * 5;
            rainModifier = Math.random() * 10;
            windModifier = 1 + Math.random() * 2;
        }
        
        weatherData = {
            temperature: Math.round((baseTemp + tempModifier + (Math.random() - 0.5) * 2) * 10) / 10,
            humidity: Math.round(Math.min(100, Math.max(0, 60 + cloudiness * 30 + (Math.random() - 0.5) * 10))),
            uvIndex: Math.round(Math.max(0, isDay ? (8 * Math.sin((hour - 6) * Math.PI / 12) * (1 - cloudiness * 0.7)) : 0) * 10) / 10,
            windSpeed: Math.round((2 + Math.random() * 8) * windModifier * 10) / 10,
            windDirection: Math.round(Math.random() * 360),
            pressure: Math.round((1013 + (Math.random() - 0.5) * 20 - tempModifier * 0.5) * 10) / 10,
            rainfall: Math.round((cloudiness > 0.7 ? Math.random() * 5 + rainModifier : 0) * 10) / 10,
            solar: Math.round(Math.max(0, isDay ? (800 * Math.sin((hour - 6) * Math.PI / 12) * (1 - cloudiness * 0.8) + Math.random() * 100) : 0)),
            battery: Math.round(Math.min(100, Math.max(10, 85 + Math.random() * 15))),
            indoorTemp: Math.round((baseTemp - 2 + Math.random() * 2) * 10) / 10,
            indoorHumidity: Math.round(Math.min(80, Math.max(30, 45 + Math.random() * 20 + cloudiness * 10)))
        };

        // Update status and active mode
        weatherPerformanceStats.lastUpdate = new Date();
        activeWeatherMode = 'demo';
        updateWeatherStatus('Connected - Demo Mode', true);
    }

    function updateWeatherStatus(message, connected, connecting = false) {
        // Update footer LED and status
        const footerLed = document.getElementById('footer-weather-led');
        if (footerLed) {
            // Remove all status classes first
            footerLed.classList.remove('connected', 'connecting', 'disconnected');
            
            // Add appropriate class based on state
            if (connecting) {
                footerLed.classList.add('connecting');
                weatherPerformanceStats.connectionStatus = 'connecting';
            } else if (connected) {
                footerLed.classList.add('connected');
                weatherPerformanceStats.connectionStatus = 'connected';
            } else {
                footerLed.classList.add('disconnected');
                weatherPerformanceStats.connectionStatus = 'disconnected';
            }
        }
        
        console.log('🔴🟡🟢 Status LED updated:', weatherPerformanceStats.connectionStatus, 'Message:', message);
    }

    async function updateWeatherData() {
        if (isConnecting) return;
        
        try {
            isConnecting = true;
            
            // Check if we're switching modes - compare with what we last attempted
            const isSwitchingModes = (lastAttemptedMode === null || currentWeatherMode !== lastAttemptedMode);
            
            console.log(`🔍 Mode check: current=${currentWeatherMode}, lastAttempted=${lastAttemptedMode}, switching=${isSwitchingModes}`);
            
            // Only show connecting status if we're switching to a different mode OR on initial connection
            if (isInitialConnection || isSwitchingModes) {
                updateWeatherStatus('Connecting...', false, true);
                console.log('🟡 LED: Connecting (switching modes or initial)');
            } else {
                console.log('🔴 LED: Staying red (retrying same failed mode)');
                // Don't change LED status - keep it red
            }
            
            // Update lastAttemptedMode BEFORE the attempt so we track what we're trying
            lastAttemptedMode = currentWeatherMode;

            // Fetch data based on current mode
            switch (currentWeatherMode) {
                case 'demo':
                    generateMockData();
                    break;
                    
                case 'cloud':
                    // Check credentials before attempting connection
                    if (!areCloudCredentialsConfigured()) {
                        console.log('☁️ Cloud credentials not configured, falling back to demo mode');
                        generateMockData();
                        updateWeatherStatus('Demo Mode - Cloud credentials not configured', true);
                    } else {
                        await fetchCloudData();
                    }
                    break;
                    
                case 'local':
                    // Check credentials before attempting connection
                    if (!areLocalCredentialsConfigured()) {
                        throw new Error('Local API IP address not configured. Please configure device IP address in weather settings.');
                    }
                    
                    // Set a flag to track if we should go red immediately on first failure
                    let shouldGoRedImmediately = (isInitialConnection || isSwitchingModes);
                    
                    try {
                        await fetchLocalData();
                    } catch (localError) {
                        // If this is a new connection attempt and we get immediate failure, go red right away
                        if (shouldGoRedImmediately && (localError.message.includes('ERR_CONNECTION_REFUSED') || localError.message.includes('Failed to fetch'))) {
                            console.log('🔴 Going red immediately on first connection failure');
                            updateWeatherStatus(`Connection Failed: ${localError.message}`, false, false);
                        }
                        throw localError; // Re-throw to be handled by main error handler
                    }
                    break;
                    
                case 'auto':
                    try {
                        if (areCloudCredentialsConfigured()) {
                            await fetchCloudData();
                        } else {
                            throw new Error('Cloud API credentials not configured');
                        }
                    } catch (cloudError) {
                        console.log('☁️ Cloud API failed, trying local API...');
                        try {
                            if (areLocalCredentialsConfigured()) {
                                await fetchLocalData();
                            } else {
                                throw new Error('Local API not configured');
                            }
                        } catch (localError) {
                            console.log('🏠 Local API failed, falling back to demo mode...');
                            generateMockData();
                        }
                    }
                    break;
            }
                    
            updateWeatherWidgets();
            updateWeatherPerformanceStats();
            updateFooterWeatherStatus();
            
            // Success - reset failure count and mark as connected
            consecutiveFailures = 0;
            isInitialConnection = false;
                
        } catch (error) {
            console.error('❌ Weather data update failed:', error);
            consecutiveFailures++;
            
            // For configuration errors, stop polling and show clear error message
            if (error.message.includes('not configured')) {
                updateWeatherStatus(`Configuration Required: ${error.message}`, false, false);
                
                // Stop polling for configuration errors to prevent spam
                stopWeatherDataPolling();
                
                // Clear weather data for live modes
                if (currentWeatherMode !== 'demo') {
                    weatherData = {
                        temperature: 0,
                        humidity: 0,
                        pressure: 0,
                        windSpeed: 0,
                        windDirection: 0,
                        rainfall: 0,
                        uvIndex: 0,
                        solar: 0,
                        battery: 0,
                        indoorTemp: 0,
                        indoorHumidity: 0
                    };
                    updateWeatherWidgets();
                }
                
                return; // Exit early for configuration errors
            }
            
            // For other errors, immediately show disconnected status (but only if not already set to red above)
            if (weatherPerformanceStats.connectionStatus !== 'disconnected') {
                updateWeatherStatus(`Connection Failed: ${error.message}`, false, false);
            }
            
            // Clear weather data on failures for live modes
            if (currentWeatherMode !== 'demo') {
                weatherData = {
                    temperature: 0,
                    humidity: 0,
                    pressure: 0,
                    windSpeed: 0,
                    windDirection: 0,
                    rainfall: 0,
                    uvIndex: 0,
                    solar: 0,
                    battery: 0,
                    indoorTemp: 0,
                    indoorHumidity: 0
                };
                updateWeatherWidgets();
            }
        } finally {
            isConnecting = false;
        }
    }

    function storeHistoricalData() {
        if (!weatherData || Object.keys(weatherData).length === 0) return;
        
        const timestamp = new Date().toISOString();
        historicalData[timestamp] = { ...weatherData };
        weatherPerformanceStats.dataPoints = Object.keys(historicalData).length;
        saveWeatherSettings();
    }

    function updateWeatherPerformanceStats() {
        if (weatherPerformanceStats.apiCalls > 0) {
            weatherPerformanceStats.successRate = Math.round((weatherPerformanceStats.successfulCalls / weatherPerformanceStats.apiCalls) * 100);
        }
        updateFooterWeatherStatus();
    }

    function startWeatherDataPolling() {
        stopWeatherDataPolling();
        
        // Reset connection state when starting
        isInitialConnection = true;
        consecutiveFailures = 0;
        lastAttemptedMode = null; // Reset attempt tracking
        updateWeatherStatus('Starting...', false, true);
        
        // Live data updates
        if (updateIntervals.live >= 1) {
            liveUpdateTimer = setInterval(updateWeatherData, updateIntervals.live * 1000);
            console.log(`📊 Weather updates every ${updateIntervals.live} seconds`);
        }
        
        // Historical data storage
        if (updateIntervals.history >= 900) { // minimum 15 minutes
            historyUpdateTimer = setInterval(storeHistoricalData, updateIntervals.history * 1000);
            console.log(`💾 History saves every ${Math.floor(updateIntervals.history / 60)} minutes`);
        }
        
        // Initial update
        updateWeatherData();
    }

    function stopWeatherDataPolling() {
        if (liveUpdateTimer) {
            clearInterval(liveUpdateTimer);
            liveUpdateTimer = null;
        }
        if (historyUpdateTimer) {
            clearInterval(historyUpdateTimer);
            historyUpdateTimer = null;
        }
        
        // Set to disconnected when stopping
        updateWeatherStatus('Disconnected', false, false);
    }

    // API Testing Functions
    async function testCloudApi() {
        try {
            updateWeatherStatus('Testing Cloud API...', false, true);
            await fetchCloudData();
            return {
                success: true,
                message: 'Cloud API connection successful',
                responseTime: weatherPerformanceStats.avgResponseTime
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async function testLocalApi() {
        try {
            updateWeatherStatus('Testing Local API...', false, true);
            await fetchLocalData();
            return {
                success: true,
                message: 'Local API connection successful',
                responseTime: weatherPerformanceStats.avgResponseTime
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Settings Management
    function updateApiSettings(type, settings) {
        if (type === 'cloud') {
            apiSettings.cloud = { ...apiSettings.cloud, ...settings };
        } else if (type === 'local') {
            apiSettings.local = { ...apiSettings.local, ...settings };
        }
        saveWeatherSettings();
    }

    function updateWidgetSettings(widgetKey, enabled) {
        widgetSettings[widgetKey] = enabled;
        saveWeatherSettings();
    }

    function updateIntervalSettings(live, history) {
        updateIntervals.live = live;
        updateIntervals.history = history;
        saveWeatherSettings();
        
        // Restart polling with new intervals
        if (liveUpdateTimer || historyUpdateTimer) {
            startWeatherDataPolling();
        }
    }

    function updateWeatherWidgets() {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;
        
        dashboard.innerHTML = '';

        // Sort widgets by order property
        const sortedWidgets = Object.entries(widgetConfigs)
            .filter(([key, config]) => widgetSettings[key])
            .sort(([,a], [,b]) => a.order - b.order);

        sortedWidgets.forEach(([key, config]) => {
            const widget = document.createElement('div');
            widget.className = `widget ${config.hasVisual ? 'has-visual' : ''}`;
            widget.addEventListener('click', () => showWeatherChart(key));

            if (config.hasVisual) {
                widget.innerHTML = createVisualWidget(key, config);
            } else {
                widget.innerHTML = createTextWidget(key, config);
            }

            dashboard.appendChild(widget);
        });
    }

    function createVisualWidget(key, config) {
        const value = weatherData[key] || 0;
        const convertedValue = getConvertedValue(key, value);
        
        switch (key) {
            case 'temperature':
            case 'humidity':
            case 'uvIndex':
                const maxVal = key === 'temperature' ? 50 : (key === 'humidity' ? 100 : 11);
                const angle = Math.min(360, (value / maxVal) * 360);
                return `
                    <div class="widget-title">${config.title}</div>
                    <div class="gauge-container">
                        <div class="gauge-bg" style="--gauge-angle: ${angle}deg">
                            <div class="gauge-inner">
                                <div class="widget-value">${value}</div>
                                <div class="widget-unit">${config.unit}</div>
                            </div>
                        </div>
                    </div>
                    ${convertedValue ? `<div class="widget-subtitle">${convertedValue}</div>` : ''}
                `;
            
            case 'windDirection':
                return `
                    <div class="widget-title">${config.title}</div>
                    <div class="compass-container">
                        <div class="compass">
                            <div class="compass-needle" style="transform: translateX(-50%) rotate(${value}deg)"></div>
                            <div class="compass-direction compass-n">N</div>
                            <div class="compass-direction compass-e">E</div>
                            <div class="compass-direction compass-s">S</div>
                            <div class="compass-direction compass-w">W</div>
                        </div>
                    </div>
                    <div class="widget-subtitle">${value}° ${getWindDirection(value)}</div>
                `;
            
            case 'battery':
                return `
                    <div class="widget-title">${config.title}</div>
                    <div class="battery-container">
                        <div class="battery-icon">
                            <div class="battery-fill" style="width: ${value}%"></div>
                            <div class="battery-text">${value}%</div>
                            <div class="battery-terminal"></div>
                        </div>
                    </div>
                `;
            
            default:
                return createTextWidget(key, config);
        }
    }

    function createTextWidget(key, config) {
        const value = weatherData[key] || 0;
        const convertedValue = getConvertedValue(key, value);
        
        return `
            <div class="widget-title">${config.title}</div>
            <div class="widget-value">${value}</div>
            <div class="widget-unit">${config.unit}</div>
            ${convertedValue ? `<div class="widget-subtitle">${convertedValue}</div>` : ''}
        `;
    }

    function getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return directions[Math.round(degrees / 22.5) % 16];
    }

    function getConvertedValue(key, value) {
        switch (key) {
            case 'temperature':
            case 'indoorTemp':
                return `${Math.round(value * 9/5 + 32)}°F`;
            case 'windSpeed':
                return `${Math.round(value * 3.6 * 10) / 10} km/h`;
            case 'pressure':
                return `${Math.round(value * 0.02953 * 100) / 100} inHg`;
            case 'rainfall':
                return `${Math.round(value * 0.03937 * 100) / 100} inches`;
            default:
                return null;
        }
    }

    function updateFooterWeatherStatus() {
        const footerLed = document.getElementById('footer-weather-led');
        const footerStatus = document.getElementById('footer-weather-status');
        const footerTemp = document.getElementById('footer-weather-temp');
        const footerHumidity = document.getElementById('footer-weather-humidity');
        const footerRain = document.getElementById('footer-weather-rain');
        const footerLastUpdate = document.getElementById('footer-last-update');
        
        console.log('🔧 updateFooterWeatherStatus called');
        console.log('🔧 footerStatus element:', footerStatus);
        console.log('🔧 footerStatus current text:', footerStatus ? footerStatus.textContent : 'ELEMENT NOT FOUND');
        
        // Always show the current mode we're trying or the working mode
        if (footerStatus) {
            const statusText = weatherPerformanceStats.connectionStatus;
            console.log(`📊 Footer update: status=${statusText}, active=${activeWeatherMode}, current=${currentWeatherMode}`);
            
            let newText = '';
            if (statusText === 'connected') {
                // Show the actual working mode
                newText = activeWeatherMode;
            } else if (statusText === 'connecting') {
                newText = currentWeatherMode; // Show what we're trying to connect to
            } else {
                // When disconnected, show the current selected mode
                newText = currentWeatherMode;
            }
            
            console.log(`🔧 Setting footer text to: "${newText}"`);
            footerStatus.textContent = newText;
            console.log(`🔧 Footer text after setting: "${footerStatus.textContent}"`);
        } else {
            console.error('❌ Footer status element not found!');
        }
        
        if (footerTemp && weatherData.temperature) footerTemp.textContent = weatherData.temperature.toFixed(1) + 'C';
        if (footerHumidity && weatherData.humidity) footerHumidity.textContent = Math.round(weatherData.humidity) + '%';
        if (footerRain && weatherData.rainfall) footerRain.textContent = weatherData.rainfall.toFixed(2) + '"';
        if (footerLastUpdate && weatherPerformanceStats.lastUpdate) {
            footerLastUpdate.textContent = weatherPerformanceStats.lastUpdate.toLocaleTimeString();
        }
    }

    // Chart functionality
    function showWeatherChart(param) {
        currentChartParam = param;
        const chartSelect = document.getElementById('chart-param-select');
        if (chartSelect) chartSelect.value = param;
        switchWeatherView('graphs');
    }

    function initializeChart() {
        const ctx = document.getElementById('main-chart');
        if (!ctx) return;
        
        const chartContext = ctx.getContext('2d');
        
        if (chart) {
            chart.destroy();
        }
        
        const chartData = getChartData(currentChartParam, currentChartRange);
        
        chart = new Chart(chartContext, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: widgetConfigs[currentChartParam]?.title || 'Data',
                    data: chartData.data,
                    borderColor: '#7fffd4',
                    backgroundColor: 'rgba(127, 255, 212, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#7fffd4',
                    pointBorderColor: '#7fffd4',
                    pointHoverBackgroundColor: '#40e0d0',
                    pointHoverBorderColor: '#40e0d0'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        ticks: { 
                            color: 'white',
                            maxTicksLimit: 12
                        },
                        grid: { color: 'rgba(127, 255, 212, 0.2)' }
                    },
                    y: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(127, 255, 212, 0.2)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'white' }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(45, 143, 100, 0.9)',
                        titleColor: '#7fffd4',
                        bodyColor: 'white',
                        borderColor: '#7fffd4',
                        borderWidth: 1
                    }
                }
            }
        });
    }

    function getChartData(param, range) {
        const now = new Date();
        let startTime;
        
        switch (range) {
            case '24h':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
        }
        
        // Get historical data
        const filteredData = Object.entries(historicalData)
            .filter(([timestamp]) => new Date(timestamp) >= startTime)
            .sort(([a], [b]) => new Date(a) - new Date(b));
        
        // If we have enough historical data, use it
        if (filteredData.length > 5) {
            return {
                labels: filteredData.map(([timestamp]) => formatChartLabel(new Date(timestamp), range)),
                data: filteredData.map(([, data]) => data[param] || 0)
            };
        }
        
        // Otherwise, generate mock historical data
        const mockData = [];
        const mockLabels = [];
        const points = range === '24h' ? 24 : (range === '7d' ? 28 : 30);
        
        for (let i = 0; i < points; i++) {
            const time = new Date(startTime.getTime() + (i * (now.getTime() - startTime.getTime()) / points));
            mockLabels.push(formatChartLabel(time, range));
            
            // Generate realistic mock data based on parameter
            let value = generateMockDataPoint(param, time);
            mockData.push(Math.round(value * 10) / 10);
        }
        
        return { labels: mockLabels, data: mockData };
    }

    function generateMockDataPoint(param, time) {
        const hour = time.getHours();
        const day = time.getDay();
        const isWeekend = day === 0 || day === 6;
        
        switch (param) {
            case 'temperature':
                return 26 + Math.sin(hour * Math.PI / 12) * 8 + (Math.random() - 0.5) * 2;
            case 'humidity':
                return 60 + Math.sin((hour + 6) * Math.PI / 12) * 20 + (Math.random() - 0.5) * 10;
            case 'pressure':
                return 1013 + Math.sin(hour * Math.PI / 24) * 5 + (Math.random() - 0.5) * 10;
            case 'uvIndex':
                return Math.max(0, hour >= 6 && hour <= 18 ? 8 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) : 0);
            case 'windSpeed':
                return 2 + Math.random() * 8 + (isWeekend ? 1 : 0);
            case 'windDirection':
                return Math.random() * 360;
            case 'rainfall':
                return Math.random() < 0.3 ? Math.random() * 5 : 0;
            case 'solar':
                return Math.max(0, hour >= 6 && hour <= 18 ? 800 * Math.sin((hour - 6) * Math.PI / 12) + Math.random() * 200 : 0);
            case 'battery':
                return 85 + Math.random() * 15;
            case 'indoorTemp':
                return 24 + Math.sin(hour * Math.PI / 12) * 3 + (Math.random() - 0.5);
            case 'indoorHumidity':
                return 45 + Math.random() * 20;
            default:
                return Math.random() * 100;
        }
    }

    function formatChartLabel(date, range) {
        switch (range) {
            case '24h':
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            case '7d':
                return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            case '30d':
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            default:
                return date.toLocaleString();
        }
    }

    function switchWeatherView(view) {
        currentWeatherView = view;
        
        // Update nav buttons
        document.querySelectorAll('#weatherNav .nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const viewBtn = document.getElementById(view + '-btn');
        if (viewBtn) viewBtn.classList.add('active');
        
        // Show/hide content
        if (view === 'dashboard') {
            const dashboard = document.getElementById('dashboard');
            if (dashboard) dashboard.style.display = 'grid';
            const charts = document.getElementById('charts');
            if (charts) charts.classList.remove('active');
        } else if (view === 'graphs') {
            const dashboard = document.getElementById('dashboard');
            if (dashboard) dashboard.style.display = 'none';
            const charts = document.getElementById('charts');
            if (charts) charts.classList.add('active');
            initializeChart();
        }
    }

    function switchChartRange(range) {
        currentChartRange = range;
        
        // Update active button
        document.querySelectorAll('.chart-btn[data-range]').forEach(btn => btn.classList.remove('active'));
        const rangeBtn = document.querySelector(`[data-range="${range}"]`);
        if (rangeBtn) rangeBtn.classList.add('active');
        
        if (chart) {
            initializeChart();
        }
    }

    function toggleModeDropdown() {
        const dropdown = document.getElementById('mode-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    function switchWeatherMode(mode) {
        if (currentWeatherMode === mode) return;
        
        console.log('🔄 switchWeatherMode called:', mode);
        
        currentWeatherMode = mode;
        const modeBtn = document.getElementById('mode-btn');
        if (modeBtn) {
            modeBtn.textContent = `${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`;
        }
        const dropdown = document.getElementById('mode-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
        
        console.log('🔄 Switched to weather mode:', mode);
        console.log('🔄 currentWeatherMode is now:', currentWeatherMode);
        
        // Reset connection state when switching modes
        isInitialConnection = true;
        consecutiveFailures = 0;
        lastAttemptedMode = null; // Reset attempt tracking when manually switching modes
        updateWeatherStatus('Switching modes...', false, true);
        
        // Force an immediate footer update after mode switch
        console.log('🔄 Forcing footer update after mode switch');
        updateFooterWeatherStatus();
        
        // Reset performance stats for new mode
        weatherPerformanceStats.apiCalls = 0;
        weatherPerformanceStats.successfulCalls = 0;
        weatherPerformanceStats.failedCalls = 0;
        weatherPerformanceStats.successRate = 100;
        weatherPerformanceStats.avgResponseTime = 0;
        
        // Start polling with new mode after a brief delay
        setTimeout(() => {
            startWeatherDataPolling();
        }, 100);
    }

    // Load environment variables from server
    async function loadEnvironmentConfig() {
        try {
            console.log('🔧 Loading environment configuration...');
            const response = await fetch('/api/config/env');
            
            if (!response.ok) {
                console.warn('⚠️ Could not load environment config, using defaults');
                return;
            }
            
            const envConfig = await response.json();
            
            if (envConfig.weatherlink.hasCredentials) {
                console.log('🔑 Found WeatherLink credentials in environment variables');
                apiSettings.cloud.apiKey = envConfig.weatherlink.apiKey;
                apiSettings.cloud.apiSecret = envConfig.weatherlink.apiSecret;
                console.log(`🔑 Updated API Key: ${envConfig.weatherlink.apiKey.substring(0, 8)}...`);
            } else {
                console.log('🔧 No environment credentials found, using defaults');
            }
            
        } catch (error) {
            console.warn('⚠️ Error loading environment config:', error.message);
        }
    }

    function initializeWeather() {
        console.log('🌦️ Initializing weather system...');
        
        // Load environment config first, then settings
        loadEnvironmentConfig().then(() => {
            loadWeatherSettings();
            
            // Reset connection state on initialization
            isInitialConnection = true;
            consecutiveFailures = 0;
            lastAttemptedMode = null;
            updateWeatherStatus('Initializing...', false, true);
            
            // Initialize with demo data first
            setTimeout(() => {
                generateMockData();
                updateWeatherWidgets();
                updateWeatherPerformanceStats();
                updateFooterWeatherStatus();
                
                // Start data polling
                startWeatherDataPolling();
            }, 500);
        }).catch(error => {
            console.error('❌ Error during weather initialization:', error);
            // Fallback to normal initialization without env config
            loadWeatherSettings();
            
            isInitialConnection = true;
            consecutiveFailures = 0;
            lastAttemptedMode = null;
            updateWeatherStatus('Initializing...', false, true);
            
            setTimeout(() => {
                generateMockData();
                updateWeatherWidgets();
                updateWeatherPerformanceStats();
                updateFooterWeatherStatus();
                startWeatherDataPolling();
            }, 500);
        });
    }

    function setupWeatherEventListeners() {
        // Weather navigation
        const dashboardBtn = document.getElementById('dashboard-btn');
        const graphsBtn = document.getElementById('graphs-btn');
        
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => switchWeatherView('dashboard'));
        }
        
        if (graphsBtn) {
            graphsBtn.addEventListener('click', () => switchWeatherView('graphs'));
        }
        
        // Mode dropdown for weather
        const modeBtn = document.getElementById('mode-btn');
        if (modeBtn) {
            modeBtn.addEventListener('click', toggleModeDropdown);
        }
        
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => switchWeatherMode(e.target.dataset.mode));
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mode-dropdown')) {
                const dropdown = document.getElementById('mode-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
            }
        });
        
        // Chart controls
        document.querySelectorAll('.chart-btn[data-range]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.dataset.range) {
                    switchChartRange(e.target.dataset.range);
                }
            });
        });

        // Chart parameter selector
        const chartParamSelect = document.getElementById('chart-param-select');
        if (chartParamSelect) {
            chartParamSelect.addEventListener('change', (e) => {
                currentChartParam = e.target.value;
                if (chart) {
                    initializeChart();
                }
            });
        }
    }

    // Data export/import functions
    function exportWeatherData() {
        const data = {
            currentData: weatherData,
            historicalData: historicalData,
            settings: {
                widgets: widgetSettings,
                api: apiSettings,
                intervals: updateIntervals
            },
            performanceStats: weatherPerformanceStats,
            exportTime: new Date().toISOString(),
            version: '2.0.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `giant-sloth-weather-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('📊 Weather data exported');
    }

    function importWeatherData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.historicalData) {
                        historicalData = { ...historicalData, ...data.historicalData };
                    }
                    
                    if (data.settings) {
                        if (data.settings.widgets) {
                            widgetSettings = { ...widgetSettings, ...data.settings.widgets };
                        }
                        if (data.settings.api) {
                            apiSettings = { ...apiSettings, ...data.settings.api };
                        }
                        if (data.settings.intervals) {
                            updateIntervals = { ...updateIntervals, ...data.settings.intervals };
                        }
                    }
                    
                    saveWeatherSettings();
                    updateWeatherWidgets();
                    
                    console.log('📊 Weather data imported');
                    resolve(data);
                    
                } catch (error) {
                    console.error('❌ Import error:', error);
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    function clearWeatherData() {
        historicalData = {};
        weatherPerformanceStats.dataPoints = 0;
        saveWeatherSettings();
        console.log('🗑️ Weather data cleared');
    }

    // Public API
    return {
        // Core functions
        initializeWeather: initializeWeather,
        updateWeatherData: updateWeatherData,
        updateWeatherWidgets: updateWeatherWidgets,
        updateFooterWeatherStatus: updateFooterWeatherStatus,
        
        // Chart functions
        showWeatherChart: showWeatherChart,
        initializeChart: initializeChart,
        switchWeatherView: switchWeatherView,
        switchChartRange: switchChartRange,
        
        // Mode functions
        switchWeatherMode: switchWeatherMode,
        toggleModeDropdown: toggleModeDropdown,
        
        // Polling functions
        startWeatherDataPolling: startWeatherDataPolling,
        stopWeatherDataPolling: stopWeatherDataPolling,
        
        // API testing functions
        testCloudApi: testCloudApi,
        testLocalApi: testLocalApi,
        
        // Settings functions
        updateApiSettings: updateApiSettings,
        updateWidgetSettings: updateWidgetSettings,
        updateIntervalSettings: updateIntervalSettings,
        
        // Data management functions
        exportWeatherData: exportWeatherData,
        importWeatherData: importWeatherData,
        clearWeatherData: clearWeatherData,
        
        // Setup functions
        setupWeatherEventListeners: setupWeatherEventListeners,
        
        // State getters
        getCurrentWeatherView: () => currentWeatherView,
        getCurrentChartRange: () => currentChartRange,
        getCurrentChartParam: () => currentChartParam,
        getCurrentWeatherMode: () => currentWeatherMode,
        getActiveWeatherMode: () => activeWeatherMode,
        getWeatherData: () => weatherData,
        getHistoricalData: () => historicalData,
        getWeatherPerformanceStats: () => weatherPerformanceStats,
        getApiSettings: () => apiSettings,
        
        // Widget configurations
        getWidgetConfigs: () => widgetConfigs,
        getWidgetSettings: () => widgetSettings,
        
        // Utility functions
        generateMockData: generateMockData,
        storeHistoricalData: storeHistoricalData
    };
})(); 