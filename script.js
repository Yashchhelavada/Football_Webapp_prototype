// --- Theme Toggle ---
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Function to set theme
function setTheme(theme) {
    html.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
}

// Initialize theme based on localStorage or system preference
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(theme);
}

// Toggle theme and save preference
function toggleTheme() {
    const isDark = html.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
}

// Event listener for theme toggle button (only if it exists)
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Watch for system theme changes (if no user preference is set)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) { // Only react to system changes if user hasn't manually set a preference
        setTheme(e.matches ? 'dark' : 'light');
    }
});


// --- Mobile Menu Toggle for Secondary Nav ---
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const secondaryNavMobileMenu = document.getElementById('secondary-nav-mobile-menu');

if (mobileMenuToggle && secondaryNavMobileMenu) {
    mobileMenuToggle.addEventListener('click', () => {
        secondaryNavMobileMenu.classList.toggle('hidden');
        secondaryNavMobileMenu.classList.toggle('block'); // Use block for vertical stacking on mobile
    });
}


// --- API Configuration ---
// IMPORTANT: Replace 'YOUR_ACTUAL_API_TOKEN_HERE' with the API token you get from football-data.org
const API_KEY = '6853c5acb66147e2a80eda32be0931fd'; 
const API_BASE_URL = 'https://api.football-data.org/v4';


// --- Common Utility Functions ---
function getQueryParams() {
    const params = {};
    window.location.search.substring(1).split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
            params[key] = decodeURIComponent(value.replace(/\+/g, ' '));
        }
    });
    return params;
}

// Handles API errors and displays a message
function handleApiError(container, error) {
    container.innerHTML = `
        <div class="col-span-full text-center py-8">
            <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
            <p class="text-xl font-semibold text-gray-700 dark:text-gray-300">Error loading data</p>
            <p class="text-md text-gray-500 dark:text-gray-400 mt-2">${error.message}</p>
        </div>
    `;
}

// --- Home Page (index.html) Specific Logic ---
const matchesContainer = document.getElementById('matches-container');
const loadingSpinner = document.getElementById('loading');
const matchTickerContent = document.getElementById('match-ticker-content');
const featuredMatchContainer = document.getElementById('featured-match-container');
const liveMatchCount = document.getElementById('live-match-count');
const leagueFilter = document.getElementById('league-filter');

let allLiveMatches = []; // Stores all fetched live matches
const uniqueLeagues = new Set(); // Stores unique league names for filtering

// Fetch live matches from the API
async function fetchLiveMatches() {
    // Only attempt to update if these elements exist (i.e., we are on index.html)
    if (!matchesContainer || !matchTickerContent || !featuredMatchContainer || !liveMatchCount) {
        return; 
    }

    // Show loading states
    if (loadingSpinner) loadingSpinner.style.display = 'flex';
    matchesContainer.innerHTML = ''; 
    matchTickerContent.innerHTML = '<span class="font-bold mr-8">Fetching live updates...</span>';
    featuredMatchContainer.innerHTML = `
        <div class="p-6 text-center text-gray-500 dark:text-gray-400">
            <p>Loading featured match...</p>
        </div>
    `;
    liveMatchCount.textContent = '0';

    try {
        // Note: 'LIVE' status may return no matches if no games are currently in play globally.
        // During off-season, this will likely be empty.
        const response = await fetch(`${API_BASE_URL}/matches?status=LIVE`, {
            headers: { 'X-Auth-Token': API_KEY }
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Too many requests. Please wait a moment before trying again (API rate limit exceeded).');
            }
            if (response.status === 403) {
                 throw new Error('API Key invalid or not allowed to access live matches. Check your API key and permissions.');
            }
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        allLiveMatches = data.matches || []; // Store all fetched matches

        populateLeagueFilter(allLiveMatches);
        displayMatches(allLiveMatches); // Display all matches initially
        updateMatchTicker(allLiveMatches);
        updateFeaturedMatch(allLiveMatches);

    } catch (error) {
        console.error('Error fetching matches:', error);
        handleApiError(matchesContainer, error); // Use common error handler
        matchTickerContent.innerHTML = '<span class="font-bold mr-8 text-red-200">Error fetching live updates!</span>';
        featuredMatchContainer.innerHTML = `
            <div class="p-6 text-center text-gray-500 dark:text-gray-400">
                <p>Could not load featured match.</p>
            </div>
        `;
        liveMatchCount.textContent = '0';
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

// Populate the league filter dropdown with unique league names
function populateLeagueFilter(matches) {
    if (!leagueFilter) return;

    uniqueLeagues.clear();
    matches.forEach(match => {
        if (match.competition && match.competition.name) {
            uniqueLeagues.add(match.competition.name);
        }
    });

    leagueFilter.innerHTML = '<option value="all">All Leagues</option>';
    Array.from(uniqueLeagues).sort().forEach(league => {
        const option = document.createElement('option');
        option.value = league;
        option.textContent = league;
        leagueFilter.appendChild(option);
    });
}

// Display matches in the main grid
function displayMatches(matches) {
    if (!matchesContainer || !liveMatchCount) return;

    matchesContainer.innerHTML = '';
    liveMatchCount.textContent = matches.length;

    if (matches.length === 0) {
        matchesContainer.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="fas fa-futbol text-gray-400 text-5xl mb-4"></i>
                <p class="text-xl font-semibold text-gray-700 dark:text-gray-300">No live matches currently</p>
                <p class="text-md text-gray-500 dark:text-gray-400 mt-2">Check back later for updates.</p>
            </div>
        `;
        return;
    }
    
    matches.slice(0, 20).forEach(match => { 
        const matchCard = document.createElement('div');
        matchCard.className = 'match-card bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700';
        
        const matchDate = new Date(match.utcDate);
        const matchTime = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const competitionName = match.competition ? match.competition.name : 'Unknown League';
        const homeTeamName = match.homeTeam ? match.homeTeam.name : 'N/A';
        const awayTeamName = match.awayTeam ? match.awayTeam.name : 'N/A';
        const homeTeamCrest = match.homeTeam && match.homeTeam.crest ? match.homeTeam.crest : 'https://via.placeholder.com/50x50/cccccc/ffffff?text=HOME';
        const awayTeamCrest = match.awayTeam && match.awayTeam.crest ? match.awayTeam.crest : 'https://via.placeholder.com/50x50/cccccc/ffffff?text=AWAY';
        
        const homeScore = match.score.fullTime.home ?? '-';
        const awayScore = match.score.fullTime.away ?? '-';
        const statusText = match.status === 'IN_PLAY' ? 'LIVE' : match.status.replace(/_/g, ' ');
        const statusColor = match.status === 'IN_PLAY' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400';
        const matchMinute = match.status === 'IN_PLAY' && match.minute ? `(${match.minute}')` : '';

        matchCard.innerHTML = `
            <div class="p-4">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${competitionName}</span>
                    <span class="text-xs font-semibold ${statusColor} uppercase">
                        ${statusText} ${matchMinute}
                    </span>
                </div>
                <div class="flex justify-between items-center mb-4">
                    <div class="text-center w-1/3">
                        <img src="${homeTeamCrest}" alt="${homeTeamName}" class="h-12 w-12 object-contain mx-auto mb-2 filter dark:invert-0 light:invert-0">
                        <h3 class="font-semibold text-sm truncate text-gray-800 dark:text-gray-100">${homeTeamName}</h3>
                    </div>
                    <div class="text-center w-1/3">
                        <div class="text-2xl font-extrabold text-gray-900 dark:text-white">${homeScore} - ${awayScore}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${matchTime}</div>
                    </div>
                    <div class="text-center w-1/3">
                        <img src="${awayTeamCrest}" alt="${awayTeamName}" class="h-12 w-12 object-contain mx-auto mb-2 filter dark:invert-0 light:invert-0">
                        <h3 class="font-semibold text-sm truncate text-gray-800 dark:text-gray-100">${awayTeamName}</h3>
                    </div>
                </div>
                <div class="flex justify-around text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                    <button class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center">
                        <i class="fas fa-chart-line mr-1"></i>Stats
                    </button>
                    <button class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center">
                        <i class="fas fa-bell mr-1"></i>Notify
                    </button>
                    <button class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center">
                        <i class="fas fa-star mr-1"></i>Save
                    </button>
                </div>
            </div>
        `;
        
        matchesContainer.appendChild(matchCard);
    });
}

// Update the scrolling match ticker with live data
function updateMatchTicker(matches) {
    if (!matchTickerContent) return;

    if (matches.length === 0) {
        matchTickerContent.innerHTML = '<span class="font-bold mr-8">No live matches currently. Check back soon!</span>';
        matchTickerContent.style.animation = 'none'; 
        matchTickerContent.style.transform = 'translateX(0)';
        return;
    }
    
    matchTickerContent.style.animation = '';
    matchTickerContent.innerHTML = '';

    const staticText = document.createElement('span');
    staticText.className = "font-bold mr-8";
    staticText.textContent = "LIVE UPDATES:";
    matchTickerContent.appendChild(staticText);

    matches.forEach(match => {
        const homeTeamName = match.homeTeam ? match.homeTeam.name : 'N/A';
        const awayTeamName = match.awayTeam ? match.awayTeam.name : 'N/A';
        const homeScore = match.score.fullTime.home ?? '-';
        const awayScore = match.score.fullTime.away ?? '-';
        const minute = match.status === 'IN_PLAY' ? (match.minute ? `(${match.minute}')` : '(Live)') : '';

        const span = document.createElement('span');
        span.className = "mr-8";
        span.textContent = `${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName} ${minute}`;
        matchTickerContent.appendChild(span);
    });
    // Duplicate content for smooth, infinite scrolling
    matchTickerContent.innerHTML += matchTickerContent.innerHTML; 
}

// Update the prominent featured match section
function updateFeaturedMatch(matches) {
    if (!featuredMatchContainer) return;

    if (matches.length === 0) {
        featuredMatchContainer.innerHTML = `
            <div class="p-6 text-center text-gray-500 dark:text-gray-400">
                <p>No featured match available at the moment.</p>
            </div>
        `;
        return;
    }

    const featuredMatch = matches[0];
    const homeTeamName = featuredMatch.homeTeam ? featuredMatch.homeTeam.name : 'N/A';
    const awayTeamName = featuredMatch.awayTeam ? featuredMatch.awayTeam.name : 'N/A';
    const homeTeamCrest = featuredMatch.homeTeam && featuredMatch.homeTeam.crest ? featuredMatch.homeTeam.crest : 'https://via.placeholder.com/64x64/cccccc/ffffff?text=HOME';
    const awayTeamCrest = featuredMatch.awayTeam && featuredMatch.awayTeam.crest ? match.awayTeam.crest : 'https://via.placeholder.com/64x64/cccccc/ffffff?text=AWAY';
    const homeScore = featuredMatch.score.fullTime.home ?? '-';
    const awayScore = featuredMatch.score.fullTime.away ?? '-';
    const matchMinute = featuredMatch.status === 'IN_PLAY' ? (featuredMatch.minute ? `${featuredMatch.minute}'` : 'Live') : 'FT';
    const progress = featuredMatch.status === 'IN_PLAY' ? Math.min(100, (featuredMatch.minute / 90) * 100) : 100; 

    featuredMatchContainer.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <div class="text-center w-1/3">
                    <img src="${homeTeamCrest}" alt="${homeTeamName}" class="h-16 w-16 object-contain mx-auto mb-2 filter dark:invert-0 light:invert-0">
                    <h3 class="font-bold text-gray-900 dark:text-white text-lg">${homeTeamName}</h3>
                </div>
                <div class="text-center px-4 w-1/3">
                    <div class="text-5xl font-extrabold bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 px-8 py-3 rounded-xl shadow-inner">${homeScore} - ${awayScore}</div>
                    <div class="mt-3 text-lg font-semibold text-gray-600 dark:text-gray-300">${matchMinute}</div>
                </div>
                <div class="text-center w-1/3">
                    <img src="${awayTeamCrest}" alt="${awayTeamName}" class="h-16 w-16 object-contain mx-auto mb-2 filter dark:invert-0 light:invert-0">
                    <h3 class="font-bold text-gray-900 dark:text-white text-lg">${awayTeamName}</h3>
                </div>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progress}%"></div>
            </div>
            <div class="flex justify-between text-xs mt-2 text-gray-600 dark:text-gray-400 font-medium">
                <span>1H</span>
                <span>HT</span>
                <span>2H</span>
                <span>FT</span>
            </div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-around border-t border-gray-200 dark:border-gray-600">
            <button class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors flex items-center">
                <i class="fas fa-chart-line mr-2"></i>Stats
            </button>
            <button class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors flex items-center">
                <i class="fas fa-users mr-2"></i>Lineups
            </button>
            <button class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors flex items-center">
                <i class="fas fa-comment-alt mr-2"></i>Commentary
            </button>
        </div>
    `;
}

// Event listener for league filter change
if (leagueFilter) {
    leagueFilter.addEventListener('change', (event) => {
        const selectedLeague = event.target.value;
        if (selectedLeague === 'all') {
            displayMatches(allLiveMatches);
        } else {
            const filteredMatches = allLiveMatches.filter(match => 
                match.competition && match.competition.name === selectedLeague
            );
            displayMatches(filteredMatches);
        }
    });
}


// --- League Page (league.html) Specific Logic ---
const leagueTitleElement = document.getElementById('league-title');
const leagueHeaderNameElement = document.getElementById('league-header-name');
const leagueLogoElement = document.getElementById('league-logo');
const backButton = document.getElementById('back-button');

const leagueMatchesContainer = document.getElementById('league-matches-container');
const leagueTeamsContainer = document.getElementById('league-teams-container');
const leagueStandingsContainer = document.getElementById('league-standings-container');

const leagueMatchesLoading = document.getElementById('league-matches-loading');
const leagueTeamsLoading = document.getElementById('league-teams-loading');
const leagueStandingsLoading = document.getElementById('league-standings-loading');

// Handle back button click
if (backButton) {
    backButton.addEventListener('click', () => {
        window.history.back(); // Go back to the previous page
    });
}

// Function to fetch league details, teams, matches, and standings
async function loadLeagueDetails(leagueId, leagueName) {
    if (!leagueTitleElement) return; // Ensure we are on league.html

    leagueTitleElement.textContent = leagueName;
    if (leagueHeaderNameElement) leagueHeaderNameElement.textContent = leagueName;
    document.getElementById('page-title').textContent = `KickOff! - ${leagueName}`;

    // Update league logo (you might need to fetch this based on leagueId if not hardcoded)
    // For now, let's assume you have an image URL for the logo or derive it.
    // This API doesn't directly give a league crest from /competitions/{id}, so we'll use a placeholder or derive from common ones
    const leagueLogoMap = {
        39: 'https://media.api-sports.io/football/leagues/39.png', // Premier League
        140: 'https://media.api-sports.io/football/leagues/140.png', // La Liga
        135: 'https://media.api-sports.io/football/leagues/135.png', // Serie A
        78: 'https://media.api-sports.io/football/leagues/78.png', // Bundesliga
        61: 'https://media.api-sports.io/football/leagues/61.png' // Ligue 1
    };
    if (leagueLogoElement) {
        leagueLogoElement.src = leagueLogoMap[leagueId] || 'https://via.placeholder.com/48x48/0000FF/FFFFFF?text=L';
        leagueLogoElement.alt = `${leagueName} Logo`;
    }

    // Fetch and display matches
    fetchLeagueMatches(leagueId);
    
    // Fetch and display teams
    fetchLeagueTeams(leagueId);

    // Fetch and display standings
    fetchLeagueStandings(leagueId);

    setupTabs(); // Setup tab functionality
}

// Fetch and display matches for a specific league
async function fetchLeagueMatches(leagueId) {
    if (!leagueMatchesContainer || !leagueMatchesLoading) return;

    leagueMatchesLoading.style.display = 'flex';
    leagueMatchesContainer.innerHTML = ''; // Clear previous content

    try {
        // --- IMPORTANT MODIFICATION: Specifying an older season for free tier access ---
        // As of the current date (July 2025), major leagues are in their off-season.
        // The free tier of football-data.org often restricts access to the current season's data.
        // We are requesting data for the 2019 season, which is typically available on the free tier.
        const seasonToFetch = 2019; // You can try 2018 or another year if 2019 doesn't work for a specific league.

        const response = await fetch(`${API_BASE_URL}/competitions/${leagueId}/matches?season=${seasonToFetch}`, {
            headers: { 'X-Auth-Token': API_KEY }
        });

        if (!response.ok) {
            let errorMessage = `Failed to fetch league matches: ${response.status} ${response.statusText}.`;
            if (response.status === 429) {
                errorMessage = 'Too many requests. Please wait a moment before trying again (API rate limit exceeded).';
            } else if (response.status === 403) {
                errorMessage = `API Key restricted for Competition ID ${leagueId} and Season ${seasonToFetch}. This often means this data is not available on your free subscription plan or the league is not covered for this season.`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        const matches = data.matches || [];

        if (matches.length === 0) {
            leagueMatchesContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-info-circle text-gray-400 text-5xl mb-4"></i>
                    <p class="text-xl font-semibold text-gray-700 dark:text-gray-300">No matches found for this league for season ${seasonToFetch}.</p>
                    <p class="text-md text-gray-500 dark:text-gray-400 mt-2">This might be due to API restrictions for the free tier, or no matches in the specified season.</p>
                </div>
            `;
            return;
        }

        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700';

            const matchDate = new Date(match.utcDate);
            const dateStr = matchDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            const homeTeamName = match.homeTeam ? match.homeTeam.name : 'N/A';
            const awayTeamName = match.awayTeam ? match.awayTeam.name : 'N/A';
            const homeTeamCrest = match.homeTeam && match.homeTeam.crest ? match.homeTeam.crest : 'https://via.placeholder.com/40x40/cccccc/ffffff?text=H';
            const awayTeamCrest = match.awayTeam && match.awayTeam.crest ? match.awayTeam.crest : 'https://via.placeholder.com/40x40/cccccc/ffffff?text=A';

            const homeScore = match.score.fullTime.home ?? '-';
            const awayScore = match.score.fullTime.away ?? '-';
            const statusText = match.status.replace(/_/g, ' ');
            const statusClass = match.status === 'LIVE' || match.status === 'IN_PLAY' ? 'text-red-600 font-bold' : 'text-gray-500 dark:text-gray-400';

            matchCard.innerHTML = `
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm text-gray-500 dark:text-gray-400">${dateStr}, ${timeStr}</span>
                    <span class="text-xs uppercase ${statusClass}">${statusText}</span>
                </div>
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center w-5/12">
                        <img src="${homeTeamCrest}" alt="${homeTeamName}" class="h-8 w-8 object-contain mr-2 filter dark:invert-0 light:invert-0">
                        <span class="font-semibold text-gray-800 dark:text-gray-100 truncate">${homeTeamName}</span>
                    </div>
                    <div class="w-1/6 text-center font-bold text-lg text-gray-900 dark:text-white">${homeScore} - ${awayScore}</div>
                    <div class="flex items-center justify-end w-5/12">
                        <span class="font-semibold text-gray-800 dark:text-gray-100 text-right truncate">${awayTeamName}</span>
                        <img src="${awayTeamCrest}" alt="${awayTeamName}" class="h-8 w-8 object-contain ml-2 filter dark:invert-0 light:invert-0">
                    </div>
                </div>
            `;
            leagueMatchesContainer.appendChild(matchCard);
        });

    } catch (error) {
        console.error('Error fetching league matches:', error);
        handleApiError(leagueMatchesContainer, error);
    } finally {
        leagueMatchesLoading.style.display = 'none';
    }
}

// Fetch and display teams for a specific league
async function fetchLeagueTeams(leagueId) {
    if (!leagueTeamsContainer || !leagueTeamsLoading) return;

    leagueTeamsLoading.style.display = 'flex';
    leagueTeamsContainer.innerHTML = ''; // Clear previous content

    try {
        // Teams endpoint usually doesn't require a season parameter.
        const response = await fetch(`${API_BASE_URL}/competitions/${leagueId}/teams`, {
            headers: { 'X-Auth-Token': API_KEY }
        });

        if (!response.ok) {
            let errorMessage = `Failed to fetch league teams: ${response.status} ${response.statusText}.`;
            if (response.status === 429) {
                errorMessage = 'Too many requests. Please wait a moment before trying again (API rate limit exceeded).';
            } else if (response.status === 403) {
                errorMessage = `API Key restricted for this competition's teams. Check your subscription.`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        const teams = data.teams || [];

        if (teams.length === 0) {
            leagueTeamsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-users-slash text-gray-400 text-5xl mb-4"></i>
                    <p class="text-xl font-semibold text-gray-700 dark:text-gray-300">No teams found for this league.</p>
                </div>
            `;
            return;
        }

        teams.forEach(team => {
            const teamCard = document.createElement('div');
            teamCard.className = 'bg-white dark:bg-gray-900 rounded-lg shadow p-4 text-center border border-gray-200 dark:border-gray-700';
            const teamCrest = team.crest || 'https://via.placeholder.com/64x64/cccccc/ffffff?text=Team';

            teamCard.innerHTML = `
                <img src="${teamCrest}" alt="${team.name}" class="h-16 w-16 object-contain mx-auto mb-3 filter dark:invert-0 light:invert-0">
                <h3 class="font-bold text-gray-800 dark:text-gray-100 text-base sm:text-lg truncate">${team.name}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">${team.area ? team.area.name : ''}</p>
            `;
            leagueTeamsContainer.appendChild(teamCard);
        });

    } catch (error) {
        console.error('Error fetching league teams:', error);
        handleApiError(leagueTeamsContainer, error);
    } finally {
        leagueTeamsLoading.style.display = 'none';
    }
}

// Fetch and display standings for a specific league
async function fetchLeagueStandings(leagueId) {
    if (!leagueStandingsContainer || !leagueStandingsLoading) return;

    leagueStandingsLoading.style.display = 'flex';
    leagueStandingsContainer.innerHTML = ''; // Clear previous content

    try {
        // Standings endpoint usually doesn't require a season parameter by default for current standings.
        // However, if you're trying to get *past* season standings, you might need to add it.
        const response = await fetch(`${API_BASE_URL}/competitions/${leagueId}/standings`, {
            headers: { 'X-Auth-Token': API_KEY }
        });

        if (!response.ok) {
            let errorMessage = `Failed to fetch league standings: ${response.status} ${response.statusText}.`;
            if (response.status === 429) {
                errorMessage = 'Too many requests. Please wait a moment before trying again (API rate limit exceeded).';
            } else if (response.status === 403) {
                errorMessage = `API Key restricted for this competition's standings. Check your subscription.`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        // Standings structure can be complex, often an array of standings (e.g., total, home, away)
        // We usually want the 'total' or first table.
        const standings = data.standings && data.standings.length > 0 && data.standings[0].table ? data.standings[0].table : []; 

        if (standings.length === 0) {
            leagueStandingsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-list-alt text-gray-400 text-5xl mb-4"></i>
                    <p class="text-xl font-semibold text-gray-700 dark:text-gray-300">No standings data available for this league.</p>
                </div>
            `;
            return;
        }

        let standingsTableHTML = `
            <div class="overflow-x-auto bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team</th>
                            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">P</th>
                            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">W</th>
                            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">D</th>
                            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">L</th>
                            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">GF</th>
                            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">GA</th>
                            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">GD</th>
                            <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pts</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
        `;

        standings.forEach(row => {
            const teamCrest = row.team.crest || 'https://via.placeholder.com/20x20/cccccc/ffffff?text=T';
            standingsTableHTML += `
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${row.position}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                <div class="flex items-center">
                                    <img src="${teamCrest}" alt="${row.team.name}" class="h-6 w-6 rounded-full object-contain mr-3 filter dark:invert-0 light:invert-0">
                                    <span>${row.team.name}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">${row.playedGames}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">${row.won}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">${row.draw}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">${row.lost}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">${row.goalsFor}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">${row.goalsAgainst}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-300">${row.goalDifference}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-gray-100">${row.points}</td>
                        </tr>
            `;
        });

        standingsTableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        leagueStandingsContainer.innerHTML = standingsTableHTML;

    } catch (error) {
        console.error('Error fetching league standings:', error);
        handleApiError(leagueStandingsContainer, error);
    } finally {
        leagueStandingsLoading.style.display = 'none';
    }
}


// Function to handle tab switching
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active classes from all buttons and hide all contents
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-600', 'dark:border-blue-500', 'text-blue-600', 'dark:text-blue-500', 'bg-gray-50', 'dark:bg-gray-800');
                btn.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:text-blue-600', 'dark:hover:text-blue-500');
            });
            tabContents.forEach(content => content.classList.add('hidden'));

            // Add active classes to the clicked button and show its content
            button.classList.add('border-blue-600', 'dark:border-blue-500', 'text-blue-600', 'dark:text-blue-500', 'bg-gray-50', 'dark:bg-gray-800');
            button.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:text-blue-600', 'dark:hover:text-blue-500');

            const targetTab = button.dataset.tab;
            document.getElementById(`tab-content-${targetTab}`).classList.remove('hidden');
        });
    });

    // Automatically click the first tab to show its content initially
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}


// --- Global Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Initialize theme when the DOM is ready

    // Check if on the index.html page
    if (document.getElementById('matches-container')) {
        fetchLiveMatches(); // Initial fetch for live matches on homepage
        setInterval(fetchLiveMatches, 30000); // Refresh every 30 seconds
    }

    // Check if on the league.html page
    if (document.getElementById('league-title')) {
        const params = getQueryParams();
        const leagueId = params.id;
        const leagueName = params.name || 'Selected League';
        
        if (leagueId) {
            loadLeagueDetails(leagueId, leagueName);
        } else {
            document.getElementById('league-title').textContent = 'League Not Found';
            if (leagueMatchesContainer) handleApiError(leagueMatchesContainer, new Error('League ID not provided in URL.'));
            if (leagueTeamsContainer) handleApiError(leagueTeamsContainer, new Error('League ID not provided in URL.'));
            if (leagueStandingsContainer) handleApiError(leagueStandingsContainer, new Error('League ID not provided in URL.'));
            if (leagueMatchesLoading) leagueMatchesLoading.style.display = 'none';
            if (leagueTeamsLoading) leagueTeamsLoading.style.display = 'none';
            if (leagueStandingsLoading) leagueStandingsLoading.style.display = 'none';
        }
    }
});