const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const errorMessage = document.getElementById('error-message');
const weatherResults = document.getElementById('weather-results');
const loadingIndicator = document.getElementById('loading');

// Current weather DOM elements
const cityNameEl = document.getElementById('city-name');
const currentDateEl = document.getElementById('current-date');
const currentIconEl = document.getElementById('current-icon');
const currentTempEl = document.getElementById('current-temp');
const currentDescEl = document.getElementById('current-desc');
const currentHumidityEl = document.getElementById('current-humidity');
const currentWindEl = document.getElementById('current-wind');
const forecastGrid = document.getElementById('forecast-grid');

// WMO Weather interpretation codes (Open-Meteo)
function getWeatherCondition(code) {
    let iconClass = 'fa-cloud';
    let description = 'Unknown';
    let color = '#ffffff';

    if (code === 0) {
        iconClass = 'fa-sun';
        description = 'Clear Sky';
        color = '#FFD700';
    } else if (code === 1 || code === 2) {
        iconClass = 'fa-cloud-sun';
        description = 'Partly Cloudy';
        color = '#FFD700';
    } else if (code === 3) {
        iconClass = 'fa-cloud';
        description = 'Overcast';
        color = '#d3d3d3';
    } else if (code >= 45 && code <= 48) {
        iconClass = 'fa-smog';
        description = 'Fog';
        color = '#b0c4de';
    } else if (code >= 51 && code <= 55 || code >= 56 && code <= 57) {
        iconClass = 'fa-cloud-rain';
        description = 'Drizzle';
        color = '#add8e6';
    } else if (code >= 61 && code <= 65 || code >= 66 && code <= 67) {
        iconClass = 'fa-cloud-showers-heavy';
        description = 'Rain';
        color = '#6495ed';
    } else if (code >= 71 && code <= 77) {
        iconClass = 'fa-snowflake';
        description = 'Snow';
        color = '#ffffff';
    } else if (code >= 80 && code <= 82) {
        iconClass = 'fa-cloud-showers-water';
        description = 'Rain Showers';
        color = '#4682b4';
    } else if (code >= 85 && code <= 86) {
        iconClass = 'fa-snowflake';
        description = 'Snow Showers';
        color = '#e0ffff';
    } else if (code >= 95 && code <= 99) {
        iconClass = 'fa-cloud-bolt';
        description = 'Thunderstorm';
        color = '#9370db';
    }

    return { iconClass, description, color };
}

// Format date string
function formatDate(dateStr) {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', options);
}

// Fetch geocoding
async function getCoordinates(city) {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
        throw new Error('City not found');
    }
    return data.results[0];
}

// Fetch weather
async function getWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetching failed');
    return await res.json();
}

// Main logic
async function searchWeather(city) {
    if (!city.trim()) return;

    // UI state updates
    errorMessage.style.display = 'none';
    weatherResults.style.display = 'none';
    loadingIndicator.style.display = 'flex';

    try {
        const location = await getCoordinates(city);
        const lat = location.latitude;
        const lon = location.longitude;
        const displayName = `${location.name}${location.country ? ', ' + location.country : ''}`;

        const weatherData = await getWeatherData(lat, lon);
        
        updateUI(displayName, weatherData);

        loadingIndicator.style.display = 'none';
        weatherResults.style.display = 'flex';
    } catch (error) {
        console.error(error);
        loadingIndicator.style.display = 'none';
        errorMessage.textContent = error.message === 'City not found' 
            ? 'City not found. Please check spelling.' 
            : 'Failed to fetch data. Please try again.';
        errorMessage.style.display = 'block';
    }
}

// Update DOM
function updateUI(cityName, data) {
    const current = data.current;
    if (!current) return;

    // --- Current Weather ---
    const currCondition = getWeatherCondition(current.weather_code);
    cityNameEl.textContent = cityName;
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    
    currentTempEl.textContent = `${Math.round(current.temperature_2m)}°`;
    currentDescEl.textContent = currCondition.description;
    
    currentIconEl.className = `fa-solid ${currCondition.iconClass} weather-main-icon`;
    currentIconEl.style.color = currCondition.color;

    currentHumidityEl.textContent = `${current.relative_humidity_2m}%`;
    currentWindEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;

    // --- 5 Day Forecast ---
    forecastGrid.innerHTML = '';
    const daily = data.daily;
    
    // We display indices 1 to 5 to show the NEXT 5 days, or 0 to 4 for today + next 4 days.
    // Let's do 0 to 4 (Today + 4 days). The daily array has max 7 days.
    for (let i = 0; i < 5; i++) {
        const dateStr = daily.time[i];
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const code = daily.weather_code[i];
        
        const condition = getWeatherCondition(code);
        const dayName = i === 0 ? 'Today' : formatDate(dateStr);

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="fc-day">${dayName}</div>
            <i class="fa-solid ${condition.iconClass} fc-icon" style="color: ${condition.color}"></i>
            <div class="fc-temps">
                <span class="fc-max">${maxTemp}°</span>
                <span class="fc-min">${minTemp}°</span>
            </div>
        `;
        forecastGrid.appendChild(card);
    }
}

// Event Listeners
searchBtn.addEventListener('click', () => {
    searchWeather(cityInput.value);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchWeather(cityInput.value);
    }
});

// Load default city on start
window.addEventListener('DOMContentLoaded', () => {
    searchWeather('London');
});
