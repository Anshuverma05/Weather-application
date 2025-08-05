// Weather App JavaScript
class WeatherApp {
    constructor() {
        // API Configuration - Using free wttr.in API
        this.BASE_URL = 'https://wttr.in/';
        this.GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
        
        // Current state
        this.currentUnit = 'metric'; // metric for Celsius, imperial for Fahrenheit
        this.currentCity = '';
        this.weatherData = null;
        this.searchTimeout = null;
        
        // DOM Elements
        this.initializeElements();
        
        // Event Listeners
        this.bindEvents();
        
        // Initialize app
        this.showWelcomeState();
    }

    /**
     * Get weather icon URL based on condition
     */
    getWeatherIcon(condition) {
        const iconMap = {
            'sunny': '☀️',
            'clear': '☀️',
            'partly cloudy': '⛅',
            'cloudy': '☁️',
            'overcast': '☁️',
            'rainy': '🌧️',
            'light rain': '🌦️',
            'heavy rain': '🌧️',
            'thunderstorm': '⛈️',
            'snow': '❄️',
            'light snow': '🌨️',
            'heavy snow': '❄️',
            'fog': '🌫️',
            'mist': '🌫️'
        };
        
        const lowerCondition = condition.toLowerCase();
        for (const [key, icon] of Object.entries(iconMap)) {
            if (lowerCondition.includes(key)) {
                return icon;
            }
        }
        return '🌤️'; // default icon
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Input elements
        this.cityInput = document.getElementById('cityInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.tempToggle = document.getElementById('tempToggle');
        this.retryBtn = document.getElementById('retryBtn');

        // Section elements
        this.welcomeSection = document.getElementById('welcomeSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.errorSection = document.getElementById('errorSection');
        this.weatherSection = document.getElementById('weatherSection');

        // Weather display elements
        this.cityName = document.getElementById('cityName');
        this.countryName = document.getElementById('countryName');
        this.dateTime = document.getElementById('dateTime');
        this.weatherIcon = document.getElementById('weatherIcon');
        this.temperature = document.getElementById('temperature');
        this.temperatureUnit = document.getElementById('temperatureUnit');
        this.weatherDescription = document.getElementById('weatherDescription');
        this.feelsLike = document.getElementById('feelsLike');
        this.visibility = document.getElementById('visibility');
        this.humidity = document.getElementById('humidity');
        this.windSpeed = document.getElementById('windSpeed');
        this.pressure = document.getElementById('pressure');

        // Error display
        this.errorMessage = document.getElementById('errorMessage');
        
        // Suggestions dropdown
        this.suggestionsDropdown = document.getElementById('suggestionsDropdown');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Search functionality
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Temperature unit toggle
        this.tempToggle.addEventListener('click', () => this.toggleTemperatureUnit());

        // Retry button
        this.retryBtn.addEventListener('click', () => this.handleRetry());

        // Input validation and suggestions
        this.cityInput.addEventListener('input', () => {
            this.validateInput();
            this.handleInputChange();
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-wrapper')) {
                this.hideSuggestions();
            }
        });
        
        // Handle keyboard navigation
        this.cityInput.addEventListener('keydown', (e) => this.handleKeyNavigation(e));
    }

    /**
     * Validate search input
     */
    validateInput() {
        const input = this.cityInput.value.trim();
        const isValid = input.length > 0 && /^[a-zA-Z\s\-,.']+$/.test(input);
        
        this.searchBtn.disabled = !isValid;
        
        if (input.length > 0 && !isValid) {
            this.cityInput.style.borderColor = '#e17055';
        } else {
            this.cityInput.style.borderColor = '';
        }
        
        return isValid;
    }

    /**
     * Handle input change for suggestions
     */
    handleInputChange() {
        const query = this.cityInput.value.trim();
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }
        
        // Debounce the search
        this.searchTimeout = setTimeout(() => {
            this.fetchSuggestions(query);
        }, 300);
    }

    /**
     * Fetch city suggestions
     */
    async fetchSuggestions(query) {
        try {
            this.showSuggestionsLoading();
            
            const url = `${this.GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }
            
            const data = await response.json();
            this.displaySuggestions(data.results || []);
            
        } catch (error) {
            console.error('Suggestions fetch error:', error);
            this.hideSuggestions();
        }
    }

    /**
     * Display suggestions in dropdown
     */
    displaySuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        const suggestionsHtml = suggestions.map(suggestion => {
            const name = suggestion.name;
            const country = suggestion.country || '';
            const admin1 = suggestion.admin1 || '';
            
            let details = '';
            if (admin1 && country) {
                details = `${admin1}, ${country}`;
            } else if (country) {
                details = country;
            }
            
            return `
                <div class="suggestion-item" data-city="${name}" data-lat="${suggestion.latitude}" data-lon="${suggestion.longitude}">
                    <i class="fas fa-map-marker-alt suggestion-icon"></i>
                    <div class="suggestion-text">
                        <div class="suggestion-name">${name}</div>
                        ${details ? `<div class="suggestion-details">${details}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        this.suggestionsDropdown.innerHTML = suggestionsHtml;
        this.showSuggestions();
        
        // Bind click events to suggestions
        this.suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => this.selectSuggestion(item));
        });
    }

    /**
     * Show suggestions loading state
     */
    showSuggestionsLoading() {
        this.suggestionsDropdown.innerHTML = `
            <div class="suggestions-loading">
                <i class="fas fa-spinner fa-spin"></i>
                Loading suggestions...
            </div>
        `;
        this.showSuggestions();
    }

    /**
     * Show suggestions dropdown
     */
    showSuggestions() {
        this.suggestionsDropdown.classList.remove('hidden');
    }

    /**
     * Hide suggestions dropdown
     */
    hideSuggestions() {
        this.suggestionsDropdown.classList.add('hidden');
    }

    /**
     * Select a suggestion
     */
    selectSuggestion(item) {
        const cityName = item.dataset.city;
        this.cityInput.value = cityName;
        this.hideSuggestions();
        this.handleSearch();
    }

    /**
     * Handle keyboard navigation in suggestions
     */
    handleKeyNavigation(e) {
        const suggestions = this.suggestionsDropdown.querySelectorAll('.suggestion-item');
        if (suggestions.length === 0) return;
        
        const activeItem = this.suggestionsDropdown.querySelector('.suggestion-item.active');
        let activeIndex = activeItem ? Array.from(suggestions).indexOf(activeItem) : -1;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(suggestions, activeIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                this.highlightSuggestion(suggestions, activeIndex);
                break;
                
            case 'Enter':
                if (activeItem) {
                    e.preventDefault();
                    this.selectSuggestion(activeItem);
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }

    /**
     * Highlight a suggestion item
     */
    highlightSuggestion(suggestions, index) {
        suggestions.forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Handle search action
     */
    async handleSearch() {
        const city = this.cityInput.value.trim();
        
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        if (!this.validateInput()) {
            this.showError('Please enter a valid city name (letters, spaces, and basic punctuation only)');
            return;
        }

        this.currentCity = city;
        await this.fetchWeatherData(city);
    }

    /**
     * Handle retry action
     */
    async handleRetry() {
        if (this.currentCity) {
            await this.fetchWeatherData(this.currentCity);
        }
    }

    /**
     * Fetch weather data from wttr.in API
     */
    async fetchWeatherData(city) {
        this.showLoadingState();

        try {
            // Use wttr.in API which provides free weather data
            const url = `${this.BASE_URL}${encodeURIComponent(city)}?format=j1`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(await this.getErrorMessage(response.status));
            }

            const data = await response.json();
            this.weatherData = data;
            this.displayWeatherData(data);
            
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showError(error.message);
        }
    }

    /**
     * Get appropriate error message based on status code
     */
    async getErrorMessage(status) {
        switch (status) {
            case 401:
                return 'API key is invalid. Please check your configuration.';
            case 404:
                return 'City not found. Please check the spelling and try again.';
            case 429:
                return 'Too many requests. Please wait a moment and try again.';
            case 500:
            case 502:
            case 503:
                return 'Weather service is temporarily unavailable. Please try again later.';
            default:
                return 'Unable to fetch weather data. Please check your internet connection and try again.';
        }
    }

    /**
     * Display weather data from wttr.in API
     */
    displayWeatherData(data) {
        const current = data.current_condition[0];
        const nearest = data.nearest_area[0];
        
        // Location information
        this.cityName.textContent = nearest.areaName[0].value;
        this.countryName.textContent = nearest.country[0].value;
        this.dateTime.textContent = this.formatDateTime();

        // Weather icon (using emoji)
        const weatherDesc = current.weatherDesc[0].value;
        const weatherIcon = this.getWeatherIcon(weatherDesc);
        this.weatherIcon.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><text x="50%" y="50%" text-anchor="middle" dy=".35em" font-size="48">${weatherIcon}</text></svg>`;
        this.weatherIcon.alt = weatherDesc;

        // Temperature and description
        const tempC = parseInt(current.temp_C);
        const tempF = parseInt(current.temp_F);
        const displayTemp = this.currentUnit === 'metric' ? tempC : tempF;
        
        this.temperature.textContent = displayTemp;
        this.temperatureUnit.textContent = this.currentUnit === 'metric' ? '°C' : '°F';
        this.weatherDescription.textContent = weatherDesc;
        
        const feelsLikeC = parseInt(current.FeelsLikeC);
        const feelsLikeF = parseInt(current.FeelsLikeF);
        const displayFeelsLike = this.currentUnit === 'metric' ? feelsLikeC : feelsLikeF;
        this.feelsLike.textContent = `${displayFeelsLike}${this.currentUnit === 'metric' ? '°C' : '°F'}`;

        // Weather details
        this.visibility.textContent = `${current.visibility} km`;
        this.humidity.textContent = `${current.humidity}%`;
        this.windSpeed.textContent = this.formatWindSpeed(current.windspeedKmph, current.windspeedMiles);
        this.pressure.textContent = `${current.pressure} mb`;

        this.showWeatherState();
    }

    /**
     * Format wind speed based on unit system
     */
    formatWindSpeed(speedKmph, speedMiles) {
        if (this.currentUnit === 'metric') {
            return `${speedKmph} km/h`;
        } else {
            return `${speedMiles} mph`;
        }
    }

    /**
     * Format current date and time
     */
    formatDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return now.toLocaleDateString('en-US', options);
    }

    /**
     * Toggle temperature unit
     */
    async toggleTemperatureUnit() {
        const newUnit = this.currentUnit === 'metric' ? 'imperial' : 'metric';
        this.currentUnit = newUnit;
        
        // Update toggle button
        this.tempToggle.dataset.unit = newUnit;
        const tempUnits = this.tempToggle.querySelectorAll('.temp-unit');
        tempUnits.forEach(unit => unit.classList.remove('active'));
        
        if (newUnit === 'metric') {
            tempUnits[0].classList.add('active'); // °C
        } else {
            tempUnits[1].classList.add('active'); // °F
        }

        // Refresh weather data if available
        if (this.currentCity) {
            await this.fetchWeatherData(this.currentCity);
        }
    }

    /**
     * Show different app states
     */
    showWelcomeState() {
        this.hideAllSections();
        this.welcomeSection.classList.remove('hidden');
    }

    showLoadingState() {
        this.hideAllSections();
        this.loadingSection.classList.remove('hidden');
    }

    showWeatherState() {
        this.hideAllSections();
        this.weatherSection.classList.remove('hidden');
    }

    showError(message) {
        this.hideAllSections();
        this.errorMessage.textContent = message;
        this.errorSection.classList.remove('hidden');
    }

    hideAllSections() {
        this.welcomeSection.classList.add('hidden');
        this.loadingSection.classList.add('hidden');
        this.weatherSection.classList.add('hidden');
        this.errorSection.classList.add('hidden');
    }

    /**
     * Get user's location (optional enhancement)
     */
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (error) => {
                    reject(new Error('Unable to retrieve your location'));
                }
            );
        });
    }

    /**
     * Fetch weather by coordinates
     */
    async fetchWeatherByCoords(lat, lon) {
        this.showLoadingState();

        try {
            const url = `${this.BASE_URL}${lat},${lon}?format=j1`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(await this.getErrorMessage(response.status));
            }

            const data = await response.json();
            this.weatherData = data;
            this.currentCity = data.nearest_area[0].areaName[0].value;
            this.cityInput.value = this.currentCity;
            this.displayWeatherData(data);
            
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showError(error.message);
        }
    }
}

// Initialize the weather app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new WeatherApp();
    
    // Make app globally accessible for debugging
    window.weatherApp = app;
});

// Service Worker registration for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Utility functions
const utils = {
    /**
     * Debounce function to limit API calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Format temperature with appropriate precision
     */
    formatTemperature(temp, unit) {
        const rounded = Math.round(temp);
        const symbol = unit === 'metric' ? '°C' : '°F';
        return `${rounded}${symbol}`;
    },

    /**
     * Validate city name format
     */
    isValidCityName(cityName) {
        const trimmed = cityName.trim();
        return trimmed.length > 0 && 
               trimmed.length <= 100 && 
               /^[a-zA-Z\s\-,.']+$/.test(trimmed);
    },

    /**
     * Get weather condition class for styling
     */
    getWeatherClass(weatherCode) {
        if (weatherCode >= 200 && weatherCode < 300) return 'thunderstorm';
        if (weatherCode >= 300 && weatherCode < 400) return 'drizzle';
        if (weatherCode >= 500 && weatherCode < 600) return 'rain';
        if (weatherCode >= 600 && weatherCode < 700) return 'snow';
      }
    }