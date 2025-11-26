let id = '19cd30b0c6ecce42193a56f591359c37';
let url = 'https://api.openweathermap.org/data/2.5/weather?units=metric&appid=' + id;
let forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast?units=metric&appid=' + id;
let oneCallUrl = 'https://api.openweathermap.org/data/2.5/onecall?units=metric&appid=' + id;

// DOM Elements
let form = document.querySelector("form");
let valueSearch = document.getElementById('name');
let cityName = document.getElementById('city-name');
let countryName = document.getElementById('country-name');
let stateCountry = document.getElementById('state-country');
let temp = document.getElementById('temp');
let weatherIcon = document.getElementById('weather-icon');
let wind = document.getElementById('wind');
let rain = document.getElementById('rain');
let mainContent = document.querySelector('.main-content');
let locateBtn = document.getElementById('locate-btn');
let peekMapBtn = document.getElementById('peek-map-btn');
let mapPanel = document.getElementById('map-panel');
let mapIframe = document.getElementById('map-iframe');
let closeMap = document.getElementById('close-map');

let lastCoords = null;
let lastWeatherData = null;
let lastOneCallData = null;
let showMoreRevealed = false;

form.addEventListener("submit", (e) => {
    e.preventDefault();  
    if(valueSearch.value != ''){
        searchWeather();
    }
});

// Sidebar locate / peek map handlers
if (locateBtn) {
    locateBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported by your browser');
            return;
        }
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            lastCoords = { lat, lon };
            // Reverse geocode to get state and country and a place name
            try {
                const r = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${id}`);
                const arr = await r.json();
                if (Array.isArray(arr) && arr.length) {
                    const place = arr[0];
                    const displayName = place.name || '';
                    const state = place.state || '';
                    const country = place.country || '';
                    // Update UI
                    cityName.innerText = displayName || cityName.innerText;
                    stateCountry.innerText = state ? `${state}, ${country}` : country;
                }
            } catch (err) {
                console.warn('Reverse geocode failed', err);
            }
            // Fetch weather by coordinates
            searchWeatherByCoords(lat, lon);
        }, (err) => {
            alert('Unable to retrieve location: ' + err.message);
        });
    });
}

if (peekMapBtn) {
    peekMapBtn.addEventListener('click', () => {
        if (!lastCoords) {
            alert('No coordinates available yet. Use the locate button or search a city first.');
            return;
        }
        showMap(lastCoords.lat, lastCoords.lon);
    });
}

if (closeMap) {
    closeMap.addEventListener('click', () => {
        mapPanel.classList.add('hidden');
        mapIframe.src = '';
    });
}

// Sidebar icon actions (workable buttons)
const sidebarButtons = document.querySelectorAll('.sidebar-btn');
if (sidebarButtons && sidebarButtons.length) {
    sidebarButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.dataset.action;
            if (!action) return;
            switch (action) {
                case 'focus-current':
                    document.querySelector('.current-weather')?.scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'scroll-air':
                    document.querySelector('.air-conditions')?.scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'scroll-hourly':
                    document.querySelector('.hourly-forecast')?.scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'toggle-forecast':
                    document.querySelector('.forecast-sidebar')?.classList.toggle('hidden');
                    break;
                case 'show-more':
                    document.querySelector('.see-more')?.scrollIntoView({ behavior: 'smooth' });
                    break;
                default:
                    console.log('Sidebar action:', action);
            }
        });
    });
}

const searchWeather = () => {
    fetch(url+'&q='+ valueSearch.value)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if(data.cod == 200){
                // Update current weather
                cityName.innerText = data.name;
                countryName.innerText = `Chance of rain: ${data.clouds.all}%`;
                temp.innerText = Math.round(data.main.temp);
                weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
                wind.innerText = Math.round(data.wind.speed);
                rain.innerText = data.clouds.all;
                // store last weather
                lastWeatherData = data;
                // Save coords
                lastCoords = { lat: data.coord.lat, lon: data.coord.lon };
                // Fetch one-call data (uv, dew point, sunrise/sunset)
                fetchOneCall(data.coord.lat, data.coord.lon);
                // Reverse geocode to retrieve state/country if possible
                reverseGeocodeAndSet(data.coord.lat, data.coord.lon);
                
                // Fetch forecast data
                fetchForecast(data.name);
            } else {
                alert('City not found!');
            }
            valueSearch.value = '';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error fetching weather data');
        });
}

// Search by coordinates (lat, lon)
const searchWeatherByCoords = (lat, lon) => {
    fetch(url + `&lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            if (data.cod === 200) {
                cityName.innerText = data.name;
                countryName.innerText = `Chance of rain: ${data.clouds.all}%`;
                temp.innerText = Math.round(data.main.temp);
                weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
                wind.innerText = Math.round(data.wind.speed);
                rain.innerText = data.clouds.all;
                // store last weather
                lastWeatherData = data;
                lastCoords = { lat: data.coord.lat, lon: data.coord.lon };
                fetchForecast(data.name);
                fetchOneCall(data.coord.lat, data.coord.lon);
            } else {
                alert('Weather for coordinates not found');
            }
        })
        .catch(err => console.error('coord weather error', err));
}

// Reverse geocode helper
const reverseGeocodeAndSet = async (lat, lon) => {
    try {
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${id}`);
        const arr = await res.json();
        if (Array.isArray(arr) && arr.length) {
            const place = arr[0];
            stateCountry.innerText = place.state ? `${place.state}, ${place.country}` : place.country || '';
        } else {
            stateCountry.innerText = '';
        }
    } catch (e) {
        console.warn('Reverse geocode failed', e);
    }
}

// Map display
const showMap = (lat, lon) => {
    if (!mapPanel || !mapIframe) return;
    const delta = 0.05;
    const minLon = lon - delta;
    const minLat = lat - delta;
    const maxLon = lon + delta;
    const maxLat = lat + delta;
    const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
    mapIframe.src = src;
    mapPanel.classList.remove('hidden');
}

const fetchForecast = (cityName) => {
    fetch(forecastUrl + '&q=' + cityName)
        .then(response => response.json())
        .then(data => {
            console.log('Forecast:', data);
            updateHourlyForecast(data.list.slice(0, 6));
            updateSevenDayForecast(data.list);
        })
        .catch(error => console.error('Forecast error:', error));
}

// Fetch One Call data for UV index, dew point, sunrise/sunset, etc.
const fetchOneCall = (lat, lon) => {
    fetch(oneCallUrl + `&lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts`)
        .then(res => res.json())
        .then(data => {
            if (!data || !data.current) return;
            // store one-call data for later reveal
            lastOneCallData = data;
            // if SEE MORE already revealed, populate immediately
            if (showMoreRevealed) {
                populateExtraCardsFromOneCall(data);
            }
        })
        .catch(err => console.warn('OneCall error', err));
}


// Populate extra cards using stored one-call data
const populateExtraCardsFromOneCall = (data) => {
    if (!data || !data.current) return;
    const cur = data.current;
    const feels = cur.feels_like;
    const uvRaw = cur.uvi !== undefined ? cur.uvi : (cur.uv || null);
    const uv = uvRaw !== null ? Math.round(uvRaw * 10) / 10 : '--';
    const dew = cur.dew_point !== undefined ? Math.round(cur.dew_point) : '--';
    const sunrise = cur.sunrise ? new Date(cur.sunrise * 1000) : null;
    const sunset = cur.sunset ? new Date(cur.sunset * 1000) : null;

    document.getElementById('feels_like').innerText = feels !== undefined ? Math.round(feels) + '°' : '--';
    document.getElementById('uv_index').innerText = uv;
    document.getElementById('dew_point').innerText = dew !== '--' ? dew + '°' : '--';
    if (sunrise && sunset) {
        const toTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('sunrise_sunset').innerText = toTime(sunrise) + ' / ' + toTime(sunset);
    }
}

// Clear extra cards to default placeholders
const clearExtraCards = () => {
    document.getElementById('feels_like').innerText = '--°';
    document.getElementById('uv_index').innerText = '--';
    document.getElementById('visibility').innerText = '-- km';
    document.getElementById('dew_point').innerText = '--°';
    document.getElementById('sunrise_sunset').innerText = '-- / --';
}
// SEE MORE button handler - reveal/hide extra cards
const seeMoreBtn = document.querySelector('.see-more');
if (seeMoreBtn) {
    seeMoreBtn.addEventListener('click', () => {
        showMoreRevealed = !showMoreRevealed;
        if (showMoreRevealed) {
            seeMoreBtn.innerText = 'HIDE';
            // reveal the extra cards container
            document.querySelector('.extra-cards')?.classList.remove('hidden');
            // populate visibility from last weather if available
            if (lastWeatherData && lastWeatherData.visibility !== undefined) {
                document.getElementById('visibility').innerText = (lastWeatherData.visibility/1000).toFixed(1) + ' km';
            }
            // populate other available fields from lastWeatherData as a fallback
            if (lastWeatherData) {
                // Feels like (available in current weather response)
                if (lastWeatherData.main && lastWeatherData.main.feels_like !== undefined) {
                    document.getElementById('feels_like').innerText = Math.round(lastWeatherData.main.feels_like) + '°';
                }
                // Sunrise / Sunset (available in current weather response sys)
                if (lastWeatherData.sys && lastWeatherData.sys.sunrise && lastWeatherData.sys.sunset) {
                    const toTime = (ts) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    document.getElementById('sunrise_sunset').innerText = toTime(lastWeatherData.sys.sunrise) + ' / ' + toTime(lastWeatherData.sys.sunset);
                }
                // Estimate dew point if temp and humidity available (Magnus formula)
                if (lastWeatherData.main && lastWeatherData.main.temp !== undefined && lastWeatherData.main.humidity !== undefined) {
                    const est = estimateDewPoint(lastWeatherData.main.temp, lastWeatherData.main.humidity);
                    document.getElementById('dew_point').innerText = Math.round(est) + '°';
                }
            }
            // if we already have one-call data, populate; otherwise fetch it
            if (lastOneCallData) {
                populateExtraCardsFromOneCall(lastOneCallData);
            } else if (lastCoords) {
                fetchOneCall(lastCoords.lat, lastCoords.lon);
            }
            // scroll into view the extra cards
            document.querySelector('.extra-cards')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            seeMoreBtn.innerText = 'SEE MORE';
            // hide the extra cards container
            document.querySelector('.extra-cards')?.classList.add('hidden');
            clearExtraCards();
        }
    });
}

// Estimate dew point from temperature and relative humidity (Magnus formula)
function estimateDewPoint(tempC, humidity) {
    // tempC in °C, humidity in %
    const a = 17.27;
    const b = 237.7; // °C
    const alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
    const dew = (b * alpha) / (a - alpha);
    return dew;
}
const updateHourlyForecast = (hourlyData) => {
    const hourlyScroll = document.querySelector('.hourly-scroll');
    hourlyScroll.innerHTML = '';
    
    hourlyData.forEach((item, index) => {
        const hour = new Date(item.dt * 1000);
        const time = hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        const hourItem = document.createElement('div');
        hourItem.className = 'hour-item';
        hourItem.innerHTML = `
            <span class="time">${time}</span>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="">
            <span class="hour-temp">${Math.round(item.main.temp)}°</span>
        `;
        hourlyScroll.appendChild(hourItem);
    });
}

const updateSevenDayForecast = (forecastData) => {
    const forecastList = document.querySelector('.forecast-list');
    forecastList.innerHTML = '';
    
    const dailyData = {};
    
    // Group by day
    forecastData.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateKey = date.toDateString();
        
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                day: day,
                temps: [],
                icon: item.weather[0].icon,
                description: item.weather[0].main
            };
        }
        dailyData[dateKey].temps.push(item.main.temp);
    });
    
    Object.entries(dailyData).slice(0, 7).forEach(([key, data]) => {
        const maxTemp = Math.round(Math.max(...data.temps));
        const minTemp = Math.round(Math.min(...data.temps));
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <span class="day">${data.day}</span>
            <img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="">
            <span class="forecast-condition">${data.description}</span>
            <span class="forecast-temp">${maxTemp}°/${minTemp}°</span>
        `;
        forecastList.appendChild(forecastItem);
    });
}

// Load default city on page load
const initApp = () => {
    valueSearch.value = 'Mohania, Bihar, India';
    
    stateCountry.innerText = 'Bihar, India';
    searchWeather();
}

initApp();