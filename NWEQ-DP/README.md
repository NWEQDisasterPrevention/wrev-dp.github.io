# Real-time Earthquake Viewer

A web application that displays real-time earthquake data from around the world using the USGS Earthquake API and WebSockets for live updates.

## Features

- Real-time earthquake data visualization on an interactive map
- WebSocket connection for immediate updates when new earthquakes occur
- Filter earthquakes by time period (24 hours, 7 days, 30 days)
- Filter earthquakes by minimum magnitude
- Color-coded markers based on earthquake depth
- Size-coded markers based on earthquake magnitude
- Detailed information popups for each earthquake
- List of recent significant earthquakes
- Desktop notifications for significant earthquakes (magnitude 5.0+)
- Multiple map views (Street, Satellite, Terrain)

## Setup Instructions

### Prerequisites

- Node.js (v12 or higher)
- npm (comes with Node.js)

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```

### Running the Application

1. Start the WebSocket server:
   ```
   npm start
   ```
   This will start the server on port 8080.

2. Open `WorldwideMap.html` in your web browser
   - You can use any web server to serve the HTML file, or simply open it directly in your browser

3. The application will connect to the WebSocket server and start displaying earthquake data

## How It Works

- The client (browser) connects to the WebSocket server
- The server fetches earthquake data from the USGS API and sends it to the client
- The server checks for new earthquakes every 30 seconds
- When new earthquakes are detected, they are immediately sent to all connected clients
- The client displays the earthquakes on the map and in the list
- For significant earthquakes (magnitude 5.0+), desktop notifications are shown

## Fallback Mechanism

If WebSockets are not supported or the connection fails:
- The application will automatically fall back to traditional polling
- Data will be refreshed every 5 minutes
- The connection status indicator will show "Real-time updates inactive"

## Technologies Used

- JavaScript (ES6+)
- Leaflet.js for interactive mapping
- WebSockets for real-time communication
- Node.js for the server
- USGS Earthquake API for earthquake data