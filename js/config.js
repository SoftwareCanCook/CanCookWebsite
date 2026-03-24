// API Configuration
const API_CONFIG = {
    // Automatically detect environment and use appropriate backend URL
    BASE_URL: window.location.hostname === 'softwarecancook.github.io' 
        ? 'https://your-backend-url.com/api'  // TODO: Replace with your deployed backend URL
        : 'http://localhost:8080/api',        // Local development
    
    // API Endpoints
    ENDPOINTS: {
        // Auth endpoints
        LOGIN: '/auth/login',
        SIGNUP: '/auth/signup',
        LOGOUT: '/auth/logout',
        
        // Recipe endpoints
        RECIPES: '/recipes',
        RECIPE_BY_ID: '/recipes/',
        USER_RECIPES: '/recipes/user',
        SEARCH_RECIPES: '/recipes/search',
        CREATE_RECIPE: '/recipes',
        UPDATE_RECIPE: '/recipes/',
        DELETE_RECIPE: '/recipes/',
        SORT_RECIPES: '/recipes/sort',
        
        // Pantry endpoints
        PANTRY: '/pantry',
        PANTRY_ITEMS: '/pantry',
        ADD_PANTRY_ITEM: '/pantry',
        REMOVE_PANTRY_ITEM: '/pantry/',
        
        // Store endpoints
        STORES: '/stores',
        STORE_ITEMS: '/stores/',
        
        // Comment/Review endpoints
        COMMENTS: '/comments',
        ADD_COMMENT: '/comments',
        RATINGS: '/ratings',
        
        // User/Admin endpoints
        USER: '/users',
    },
    
    // Request timeout in milliseconds
    TIMEOUT: 30000,
};

// Helper function to get full URL
function getApiUrl(endpoint) {
    return API_CONFIG.BASE_URL + endpoint;
}
