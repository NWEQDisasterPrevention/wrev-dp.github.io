// Earthquake WebSocket Server
// This server fetches earthquake data from USGS and broadcasts updates to connected clients

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const url = require('url');

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Earthquake WebSocket Server');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store earthquake data
let earthquakeCache = {
    '1day': { lastFetched: 0, data: null },
    '7days': { lastFetched: 0, data: null },
    '30days': { lastFetched: 0, data: null }
};

// Store known earthquake IDs to detect new ones
let knownEarthquakeIds = new Set();

// Function to fetch earthquake data from USGS API
function fetchEarthquakeData(period, magnitude = 'all') {
    return new Promise((resolve, reject) => {
        const magnitudeFilter = magnitude === 'all' ? '' : `&minmagnitude=${magnitude}`;
        const apiUrl = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${period}.geojson${magnitudeFilter}`;
        
        console.log(`Fetching earthquake data from: ${apiUrl}`);
        
        https.get(apiUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    resolve(parsedData);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Function to check for new earthquakes
async function checkForNewEarthquakes() {
    try {
        // Fetch the latest 1-day data (most likely to have new earthquakes)
        const latestData = await fetchEarthquakeData('1day');
        
        // Check for new earthquakes
        const newEarthquakes = latestData.features.filter(feature => {
            return !knownEarthquakeIds.has(feature.id);
        });
        
        // Add new earthquake IDs to known set
        newEarthquakes.forEach(feature => {
            knownEarthquakeIds.add(feature.id);
        });
        
        // Update cache
        earthquakeCache['1day'].data = latestData;
        earthquakeCache['1day'].lastFetched = Date.now();
        
        // Broadcast new earthquakes to all clients
        if (newEarthquakes.length > 0) {
            console.log(`Found ${newEarthquakes.length} new earthquakes`);
            
            // Broadcast to all connected clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    newEarthquakes.forEach(earthquake => {
                        client.send(JSON.stringify({
                            type: 'newEarthquake',
                            earthquake: earthquake
                        }));
                    });
                }
            });
        } else {
            console.log('No new earthquakes found');
        }
    } catch (error) {
        console.error('Error checking for new earthquakes:', error);
    }
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'info',
        message: 'Connected to Earthquake WebSocket Server'
    }));
    
    // Handle messages from clients
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            // Handle data request
            if (data.type === 'requestData') {
                const period = data.period || '1day';
                const magnitude = data.magnitude || 'all';
                
                console.log(`Client requested ${period} data with magnitude ${magnitude}`);
                
                // Check if we have cached data that's less than 5 minutes old
                const cacheEntry = earthquakeCache[period];
                const cacheAge = Date.now() - cacheEntry.lastFetched;
                const cacheExpiry = 5 * 60 * 1000; // 5 minutes
                
                if (cacheEntry.data && cacheAge < cacheExpiry) {
                    console.log(`Sending cached ${period} data`);
                    
                    // Send cached data
                    ws.send(JSON.stringify({
                        type: 'fullData',
                        earthquakeData: cacheEntry.data
                    }));
                } else {
                    console.log(`Fetching fresh ${period} data`);
                    
                    // Fetch fresh data
                    try {
                        const freshData = await fetchEarthquakeData(period, magnitude);
                        
                        // Update cache
                        earthquakeCache[period].data = freshData;
                        earthquakeCache[period].lastFetched = Date.now();
                        
                        // Add all earthquake IDs to known set
                        freshData.features.forEach(feature => {
                            knownEarthquakeIds.add(feature.id);
                        });
                        
                        // Send data to client
                        ws.send(JSON.stringify({
                            type: 'fullData',
                            earthquakeData: freshData
                        }));
                    } catch (error) {
                        console.error('Error fetching earthquake data:', error);
                        
                        // Send error message to client
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Error fetching earthquake data'
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    // Handle disconnections
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Earthquake WebSocket Server running on port ${PORT}`);
    
    // Initialize by fetching data for all periods
    Promise.all([
        fetchEarthquakeData('1day'),
        fetchEarthquakeData('7days'),
        fetchEarthquakeData('30days')
    ]).then(([oneDayData, sevenDaysData, thirtyDaysData]) => {
        // Store in cache
        earthquakeCache['1day'].data = oneDayData;
        earthquakeCache['1day'].lastFetched = Date.now();
        
        earthquakeCache['7days'].data = sevenDaysData;
        earthquakeCache['7days'].lastFetched = Date.now();
        
        earthquakeCache['30days'].data = thirtyDaysData;
        earthquakeCache['30days'].lastFetched = Date.now();
        
        // Add all earthquake IDs to known set
        oneDayData.features.forEach(feature => {
            knownEarthquakeIds.add(feature.id);
        });
        
        sevenDaysData.features.forEach(feature => {
            knownEarthquakeIds.add(feature.id);
        });
        
        thirtyDaysData.features.forEach(feature => {
            knownEarthquakeIds.add(feature.id);
        });
        
        console.log(`Initialized with ${knownEarthquakeIds.size} known earthquakes`);
        
        // Start periodic checks for new earthquakes (every 30 seconds)
        setInterval(checkForNewEarthquakes, 30 * 1000);
    }).catch(error => {
        console.error('Error initializing earthquake data:', error);
    });
});