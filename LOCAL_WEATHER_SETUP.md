# 🌤️ Local Weather Station Setup Guide

## Overview
Giant Sloth Orchard supports connecting to local WeatherLink devices on your network for real-time weather data. The site works completely standalone - no server required for basic functionality.

## Weather Modes Available

### 🎭 Demo Mode (Default)
- **Works**: ✅ Always works standalone
- **Data**: Realistic simulated weather data with daily patterns
- **Use**: Perfect for testing and demonstration
- **Setup**: No configuration needed

### 🏠 Local Mode
- **Works**: ✅ When you have a WeatherLink device on your network
- **Data**: Real-time data from your local weather station
- **Use**: Best for actual farm monitoring
- **Setup**: Requires local WeatherLink device configuration

### ☁️ Cloud Mode
- **Works**: ⚠️ Requires proxy server for CORS (optional)
- **Data**: Real-time data from WeatherLink Cloud API
- **Use**: When you want cloud-hosted weather data
- **Setup**: Requires API credentials and proxy server

## Setting Up Local Weather

### Step 1: Find Your WeatherLink Device
1. Make sure your WeatherLink device is connected to your network
2. Find the device's IP address:
   - Check your router's admin panel for connected devices
   - Look for "WeatherLink" or "Davis" devices
   - Common default IP: `192.168.1.100`

### Step 2: Configure in Giant Sloth Orchard
1. Open the Giant Sloth Orchard website
2. Click on "Weather" in the navigation
3. Click the ⚙️ settings button (gear icon)
4. In the "🏠 Local WeatherLink Device" section:
   - Enter your device's IP address (e.g., `192.168.1.100`)
   - Set the port (usually `80`)
   - Enable HTTPS if your device uses it (usually not needed)
5. Click "Test Local API" to verify connection
6. Close settings and switch to "Local Mode" in the weather dropdown

### Step 3: Switch to Local Mode
1. In the weather section, click the mode dropdown (shows "Demo Mode" by default)
2. Select "Local Mode"
3. The system will attempt to connect to your local device
4. If successful, you'll see "Connected - Local API" status

## Troubleshooting

### ❌ "CORS blocked" Error
**Problem**: Browser security prevents direct access to local device
**Solutions**:
1. **Try different IP/Port**: Some devices use different endpoints
2. **Use Auto Mode**: Let the system try different connection methods
3. **Use Proxy Server**: Run the included proxy server for advanced features

### ❌ "Device not found" Error
**Problem**: Cannot reach the WeatherLink device
**Solutions**:
1. **Check IP Address**: Verify the device IP in your router settings
2. **Check Network**: Ensure device and computer are on same network
3. **Check Device Status**: Verify WeatherLink device is powered and connected

### ❌ "No data received" Error
**Problem**: Device responds but sends no weather data
**Solutions**:
1. **Check Device Setup**: Ensure sensors are properly connected
2. **Wait for Data**: Some devices need time to collect initial readings
3. **Check Device Logs**: Look at device admin panel for errors

## Advanced: Using the Proxy Server

For advanced features and better compatibility, you can run the included proxy server:

```bash
# In the orchardsite directory
npm install
npm start
```

This enables:
- Better CORS handling for local devices
- Cloud API support with proper authentication
- Enhanced error reporting and debugging

## Network Requirements

### For Local Weather:
- WeatherLink device on same network as computer
- Device must support HTTP API (most modern WeatherLink devices do)
- No internet connection required

### For Cloud Weather:
- Internet connection required
- WeatherLink Cloud account and API credentials
- Proxy server recommended for best compatibility

## Supported Devices

### ✅ Confirmed Working:
- WeatherLink Live
- WeatherLink Console
- WeatherLink IP (newer models)

### ⚠️ May Work:
- Older WeatherLink IP devices (may need different ports/endpoints)
- Third-party Davis-compatible devices

### ❌ Not Supported:
- Serial-only weather stations
- Devices without network connectivity
- Non-Davis weather stations (different API format)

## Default Configuration

The system comes pre-configured with sensible defaults:
- **Local IP**: `192.168.1.100` (common WeatherLink default)
- **Port**: `80` (standard HTTP)
- **HTTPS**: Disabled (most local devices use HTTP)
- **Mode**: Demo (always works)

## Getting Help

If you're having trouble:
1. Try Demo Mode first to verify the interface works
2. Use the "Test Local API" button to diagnose connection issues
3. Check the browser console (F12) for detailed error messages
4. Verify your WeatherLink device is accessible from a web browser at `http://[device-ip]`

The weather system is designed to fail gracefully - if local weather doesn't work, it will fall back to demo mode automatically.