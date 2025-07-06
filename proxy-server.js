// proxy-server.js - Enhanced CORS proxy for WeatherLink APIs
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 50783;

// Enhanced CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Api-Secret', 
        'X-Target-IP', 
        'X-Target-Port',
        'X-Timestamp',
        'X-Api-Signature'
    ],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files (weather station website)
app.use(express.static(__dirname));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
    next();
});

// WeatherLink v2 API signature generation
function generateApiSignature(apiKey, apiSecret, timestamp, parameters = {}) {
    // Sort parameters
    const sortedParams = Object.keys(parameters)
        .sort()
        .map(key => `${key}=${parameters[key]}`)
        .join('&');
    
    // Create data to sign
    const dataToSign = `api-key${apiKey}t${timestamp}${sortedParams ? sortedParams : ''}`;
    
    // Generate HMAC signature
    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(dataToSign)
        .digest('hex');
    
    return signature;
}

// Enhanced WeatherLink v2 Cloud API proxy
app.use('/api/cloud/*', async (req, res) => {
    try {
        const apiPath = req.originalUrl.replace('/api/cloud/', '');
        const targetUrl = `https://api.weatherlink.com/v2/${apiPath}`;
        
        console.log(`☁️ Proxying cloud API: ${req.method} ${targetUrl} (original: ${req.originalUrl}, path: ${apiPath})`);
        
        // Extract API credentials from headers or query
        const apiKey = req.headers['x-api-key'] || req.query['api-key'];
        const apiSecret = req.headers['x-api-secret'];
        
        if (!apiKey || !apiSecret) {
            return res.status(401).json({
                error: {
                    code: 401,
                    message: 'API key and secret are required'
                }
            });
        }
        
        // Generate timestamp and signature
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Include path parameters in signature calculation
        const allParams = { ...req.query };
        if (apiPath.includes('/')) {
            // For endpoints like current/209169, include station_id in params
            const pathParts = apiPath.split('/');
            if (pathParts[0] === 'current' && pathParts[1]) {
                allParams['station-id'] = pathParts[1];
            }
        }
        
        const signature = generateApiSignature(apiKey, apiSecret, timestamp, allParams);
        
        // Add required query parameters
        const queryParams = new URLSearchParams(req.query);
        queryParams.set('api-key', apiKey);
        queryParams.set('t', timestamp.toString());
        queryParams.set('api-signature', signature);
        
        // Prepare headers
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'Giant-Sloth-Weather-Station/2.0'
        };
        
        console.log(`☁️ API Key: ${apiKey.substring(0, 8)}...`);
        console.log(`☁️ Timestamp: ${timestamp}`);
        console.log(`☁️ Signature: ${signature.substring(0, 16)}...`);
        
        const https = require('https');
        const url = require('url');
        const fullUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + queryParams.toString();
        const parsedUrl = url.parse(fullUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: req.method,
            headers: headers,
            timeout: 10000 // 10 second timeout
        };
        
        const proxyReq = https.request(options, (proxyRes) => {
            res.status(proxyRes.statusCode);
            
            // Forward response headers
            Object.keys(proxyRes.headers).forEach(key => {
                res.setHeader(key, proxyRes.headers[key]);
            });
            
            let responseData = '';
            proxyRes.on('data', chunk => {
                responseData += chunk;
            });
            
            proxyRes.on('end', () => {
                try {
                    // Try to parse and enhance the response
                    const data = JSON.parse(responseData);
                    res.json(data);
                } catch (e) {
                    // If not JSON, send as-is
                    res.send(responseData);
                }
            });
            
            console.log(`☁️ Cloud API Response: ${proxyRes.statusCode} from ${targetUrl}`);
        });
        
        proxyReq.on('error', (error) => {
            console.error('Cloud API Proxy Error:', error.message);
            res.status(500).json({
                error: {
                    code: 500,
                    message: `Cloud API Error: ${error.message}`
                }
            });
        });
        
        proxyReq.on('timeout', () => {
            console.error('Cloud API Timeout');
            res.status(408).json({
                error: {
                    code: 408,
                    message: 'Cloud API request timeout'
                }
            });
        });
        
        // Send request body if present
        if (req.body && Object.keys(req.body).length > 0) {
            proxyReq.write(JSON.stringify(req.body));
        }
        
        proxyReq.end();
        
    } catch (error) {
        console.error('Cloud API Handler Error:', error.message);
        res.status(500).json({
            error: {
                code: 500,
                message: `Handler Error: ${error.message}`
            }
        });
    }
});

// Enhanced local WeatherLink Live API proxy
app.use('/api/weather/*', (req, res) => {
    const targetIP = req.query.ip || req.headers['x-target-ip'] || '192.168.1.100';
    const targetPort = req.query.port || req.headers['x-target-port'] || '80';
    const useHttps = req.query.https === 'true' || req.headers['x-use-https'] === 'true';
    
    const protocol = useHttps ? 'https' : 'http';
    const targetUrl = `${protocol}://${targetIP}:${targetPort}`;
    
    console.log(`🏠 Proxying local API: ${req.method} ${req.url} -> ${targetUrl}`);
    
    const proxy = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: {
            '^/api/weather': '/v1'
        },
        timeout: 5000, // 5 second timeout for local devices
        onError: (err, req, res) => {
            console.error('Local API Proxy Error:', err.message);
            res.status(500).json({
                error: {
                    code: 500,
                    message: `Local API Error: ${err.message}`,
                    details: {
                        target: targetUrl,
                        timeout: err.code === 'ECONNABORTED' ? true : false,
                        networkError: err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' ? true : false
                    }
                }
            });
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log(`🏠 Local API Request: ${req.method} ${req.url} -> ${targetUrl}${proxyReq.path}`);
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log(`🏠 Local API Response: ${proxyRes.statusCode} from ${targetUrl}`);
            
            // Add custom headers to identify the response source
            res.setHeader('X-Proxy-Source', 'local-api');
            res.setHeader('X-Target-Device', `${targetIP}:${targetPort}`);
        }
    });
    
    proxy(req, res);
});

// Network discovery endpoint for finding WeatherLink devices
app.get('/api/discover', async (req, res) => {
    const subnet = req.query.subnet || '192.168.1';
    const timeout = parseInt(req.query.timeout) || 2000;
    
    console.log(`🔍 Discovering WeatherLink devices on ${subnet}.x`);
    
    try {
        const devices = [];
        const promises = [];
        
        // Scan common ports and IPs
        for (let i = 1; i <= 254; i++) {
            const ip = `${subnet}.${i}`;
            
            // Check common WeatherLink ports
            [80, 8080, 443].forEach(port => {
                promises.push(
                    new Promise((resolve) => {
                        const net = require('net');
                        const socket = new net.Socket();
                        
                        socket.setTimeout(timeout);
                        
                        socket.on('connect', () => {
                            devices.push({
                                ip: ip,
                                port: port,
                                status: 'reachable',
                                protocol: port === 443 ? 'https' : 'http'
                            });
                            socket.destroy();
                            resolve();
                        });
                        
                        socket.on('timeout', () => {
                            socket.destroy();
                            resolve();
                        });
                        
                        socket.on('error', () => {
                            resolve();
                        });
                        
                        socket.connect(port, ip);
                    })
                );
            });
        }
        
        await Promise.all(promises);
        
        res.json({
            subnet: subnet,
            devicesFound: devices.length,
            devices: devices,
            scanTime: Date.now(),
            suggestion: devices.length === 0 ? 
                'No devices found. Check your network settings or try a different subnet.' :
                'Test connections to found devices using the settings panel.'
        });
        
    } catch (error) {
        console.error('Discovery error:', error);
        res.status(500).json({
            error: {
                code: 500,
                message: `Discovery failed: ${error.message}`
            }
        });
    }
});

// Test endpoint for API connections
app.post('/api/test/:type', async (req, res) => {
    const testType = req.params.type; // 'cloud' or 'local'
    const config = req.body;
    
    console.log(`🧪 Testing ${testType} API connection`);
    
    try {
        if (testType === 'cloud') {
            // Test WeatherLink v2 Cloud API
            const { apiKey, stationId, apiSecret } = config;
            
            if (!apiKey || !stationId || !apiSecret) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required cloud API credentials'
                });
            }
            
            const timestamp = Math.floor(Date.now() / 1000);
            const parameters = { 'station-id': stationId };
            const signature = generateApiSignature(apiKey, apiSecret, timestamp, parameters);
            
            const testUrl = `https://api.weatherlink.com/v2/current/${stationId}?api-key=${apiKey}&t=${timestamp}`;
            
            const https = require('https');
            const url = require('url');
            const parsedUrl = url.parse(testUrl);
            
            const options = {
                hostname: parsedUrl.hostname,
                port: 443,
                path: parsedUrl.path,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Api-Signature': signature
                },
                timeout: 10000
            };
            
            const testReq = https.request(options, (testRes) => {
                let responseData = '';
                testRes.on('data', chunk => responseData += chunk);
                testRes.on('end', () => {
                    if (testRes.statusCode === 200) {
                        res.json({
                            success: true,
                            message: 'Cloud API connection successful',
                            statusCode: testRes.statusCode,
                            responseTime: Date.now() - timestamp * 1000
                        });
                    } else {
                        res.json({
                            success: false,
                            error: `API returned status ${testRes.statusCode}`,
                            statusCode: testRes.statusCode,
                            response: responseData
                        });
                    }
                });
            });
            
            testReq.on('error', (error) => {
                res.json({
                    success: false,
                    error: `Connection failed: ${error.message}`
                });
            });
            
            testReq.on('timeout', () => {
                res.json({
                    success: false,
                    error: 'Connection timeout'
                });
            });
            
            testReq.end();
            
        } else if (testType === 'local') {
            // Test local WeatherLink device
            const { ip, port, https: useHttps } = config;
            
            if (!ip) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing IP address'
                });
            }
            
            const protocol = useHttps ? 'https' : 'http';
            const testUrl = `${protocol}://${ip}:${port || 80}/v1/current_conditions`;
            
            const startTime = Date.now();
            const requestModule = useHttps ? require('https') : require('http');
            const url = require('url');
            const parsedUrl = url.parse(testUrl);
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (useHttps ? 443 : 80),
                path: parsedUrl.path,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Giant-Sloth-Weather-Station/2.0'
                },
                timeout: 5000,
                rejectUnauthorized: false // Allow self-signed certificates
            };
            
            const testReq = requestModule.request(options, (testRes) => {
                let responseData = '';
                testRes.on('data', chunk => responseData += chunk);
                testRes.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    
                    if (testRes.statusCode === 200) {
                        try {
                            const data = JSON.parse(responseData);
                            res.json({
                                success: true,
                                message: 'Local API connection successful',
                                statusCode: testRes.statusCode,
                                responseTime: responseTime,
                                deviceInfo: {
                                    hasData: data && Object.keys(data).length > 0,
                                    dataFields: data ? Object.keys(data) : []
                                }
                            });
                        } catch (e) {
                            res.json({
                                success: true,
                                message: 'Device responded but data format unexpected',
                                statusCode: testRes.statusCode,
                                responseTime: responseTime,
                                rawResponse: responseData.substring(0, 200)
                            });
                        }
                    } else {
                        res.json({
                            success: false,
                            error: `Device returned status ${testRes.statusCode}`,
                            statusCode: testRes.statusCode,
                            responseTime: responseTime
                        });
                    }
                });
            });
            
            testReq.on('error', (error) => {
                const responseTime = Date.now() - startTime;
                res.json({
                    success: false,
                    error: `Connection failed: ${error.message}`,
                    responseTime: responseTime,
                    errorCode: error.code
                });
            });
            
            testReq.on('timeout', () => {
                res.json({
                    success: false,
                    error: 'Connection timeout',
                    responseTime: 5000
                });
            });
            
            testReq.end();
            
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid test type. Use "cloud" or "local"'
            });
        }
        
    } catch (error) {
        console.error(`Test ${testType} error:`, error);
        res.status(500).json({
            success: false,
            error: `Test failed: ${error.message}`
        });
    }
});

// Mock data endpoint for demo mode
app.get('/api/demo/current', (req, res) => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Generate realistic demo data
    const baseTemp = 26 + Math.sin((hour + minute/60) * Math.PI / 12) * 8;
    const isDay = hour >= 6 && hour <= 18;
    const cloudiness = Math.random();
    
    const demoData = {
        data: [{
            ts: Math.floor(now.getTime() / 1000),
            temp: Math.round((baseTemp + (Math.random() - 0.5) * 2) * 10) / 10,
            hum: Math.round(60 + cloudiness * 30 + (Math.random() - 0.5) * 10),
            bar: Math.round((1013 + (Math.random() - 0.5) * 20) * 10) / 10,
            wind_speed: Math.round((2 + Math.random() * 8) * 10) / 10,
            wind_dir: Math.round(Math.random() * 360),
            rain_rate: Math.round((cloudiness > 0.7 ? Math.random() * 5 : 0) * 10) / 10,
            uv: Math.round(Math.max(0, isDay ? (8 * Math.sin((hour - 6) * Math.PI / 12) * (1 - cloudiness * 0.7)) : 0) * 10) / 10,
            solar_rad: Math.round(Math.max(0, isDay ? (800 * Math.sin((hour - 6) * Math.PI / 12) * (1 - cloudiness * 0.8) + Math.random() * 100) : 0)),
            temp_in: Math.round((baseTemp - 2 + Math.random() * 2) * 10) / 10,
            hum_in: Math.round(45 + Math.random() * 20),
            battery_volt: Math.round((12 + Math.random() * 2) * 10) / 10
        }],
        generated_at: now.toISOString(),
        source: 'demo-mode'
    };
    
    console.log('📊 Generated demo data');
    res.json(demoData);
});

// API status endpoint with enhanced information
app.get('/api/status', (req, res) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
            seconds: Math.floor(uptime),
            formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
        },
        version: '2.0.0',
        memory: {
            used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
        },
        features: {
            localApi: true,
            cloudApi: true,
            cors: true,
            discovery: true,
            testing: true,
            demoMode: true
        },
        endpoints: {
            cloudProxy: '/api/cloud/*',
            localProxy: '/api/weather/*',
            discovery: '/api/discover',
            testing: '/api/test/:type',
            demo: '/api/demo/current',
            status: '/api/status',
            health: '/api/health'
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
            server: 'ok',
            memory: process.memoryUsage().heapUsed < 100 * 1024 * 1024 ? 'ok' : 'warning'
        }
    };
    
    res.json(health);
});

// Environment configuration endpoint
app.get('/api/config/env', (req, res) => {
    const envConfig = {
        weatherlink: {
            apiKey: process.env.SLOTH_WEATHERLINK_KEY || null,
            apiSecret: process.env.SLOTH_WEATHERLINK_SECRET || null,
            hasCredentials: !!(process.env.SLOTH_WEATHERLINK_KEY && process.env.SLOTH_WEATHERLINK_SECRET)
        },
        timestamp: new Date().toISOString()
    };
    
    console.log(`🔧 Environment config requested - has credentials: ${envConfig.weatherlink.hasCredentials}`);
    res.json(envConfig);
});

// Test endpoints
app.get('/api/test/cloud', async (req, res) => {
    try {
        const response = await fetch('http://localhost:50783/api/cloud/stations', {
            headers: {
                'X-Api-Key': 'u6boo3oegcazrzdz74hw3m3rrszdarbf',
                'X-Api-Secret': 'ivp7huetdpkjdlfwp9mtty7kinpln28i'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json({ 
                status: 'success', 
                message: 'Cloud API connection successful',
                station_count: data.stations?.length || 0,
                first_station: data.stations?.[0]?.station_name || 'Unknown'
            });
        } else {
            res.status(response.status).json({ 
                status: 'error', 
                message: `Cloud API returned ${response.status}` 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

app.get('/api/test/local', (req, res) => {
    res.json({ 
        status: 'info', 
        message: 'Local API test requires device IP configuration',
        note: 'Configure device IP in weather settings to test local connection'
    });
});

// Serve the weather station app on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: {
            code: 500,
            message: 'Internal server error',
            timestamp: new Date().toISOString()
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            code: 404,
            message: 'Endpoint not found',
            availableEndpoints: [
                '/api/cloud/*',
                '/api/weather/*', 
                '/api/discover',
                '/api/test/:type',
                '/api/demo/current',
                '/api/status',
                '/api/health'
            ]
        }
    });
});

// Start the server
const server = app.listen(PORT, () => {
    console.log('🌺'.repeat(50));
    console.log('🌺 Giant Sloth Orchard Weather Station v2.0');
    console.log('🌺'.repeat(50));
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🏠 Local API Proxy: http://localhost:${PORT}/api/weather/*`);
    console.log(`☁️ Cloud API Proxy: http://localhost:${PORT}/api/cloud/*`);
    console.log(`🔍 Network Discovery: http://localhost:${PORT}/api/discover`);
    console.log(`🧪 API Testing: http://localhost:${PORT}/api/test/[cloud|local]`);
    console.log(`📊 Demo Data: http://localhost:${PORT}/api/demo/current`);
    console.log(`❤️ Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📋 Status: http://localhost:${PORT}/api/status`);
    console.log('🌺'.repeat(50));
    console.log('🦥 Ready to serve weather data for the orchard!');
});

// Enhanced graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err) => {
        if (err) {
            console.error('❌ Error during server shutdown:', err);
            process.exit(1);
        }
        
        console.log('✅ Server closed successfully');
        console.log('🌺 Giant Sloth Orchard Weather Station stopped');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.log('⚠️ Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});