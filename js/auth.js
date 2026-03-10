// Authentication Service
class AuthService {
    
    // Login user
    static async login(username, password) {
        try {
            const response = await ApiService.post(API_CONFIG.ENDPOINTS.LOGIN, {
                username,
                password
            });
            
            // Store token and user info
            if (response.token) {
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            
            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }
    
    // Sign up new user
    static async signup(email, username, password) {
        try {
            const response = await ApiService.post(API_CONFIG.ENDPOINTS.SIGNUP, {
                email,
                username,
                password
            });
            
            // Automatically log in after signup
            if (response.token) {
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            
            return response;
        } catch (error) {
            console.error('Signup failed:', error);
            throw error;
        }
    }
    
    // Logout user
    static logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
    
    // Get authentication token
    static getToken() {
        return localStorage.getItem('authToken');
    }
    
    // Get current user
    static getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    
    // Check if user is authenticated
    static isAuthenticated() {
        return !!this.getToken();
    }
    
    // Require authentication (redirect if not logged in)
    static requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // Get current user's store ID (for grocery store users)
    static getStoreId() {
        const user = this.get();
        return user ? user.store_id : null;
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;
    
    try {
        await AuthService.login(username, password);
        // Redirect to the correct page after login
        // If user, then redirect to index.html
        // If admin, then redirect to admin.html
        // If grocery, then redirect to grocery.html
        const user = AuthService.getUser();
        if (user && user.role == 'user') {
            window.location.href = 'index.html';
        } else if (user && user.role == 'admin') {
            window.location.href = 'admin.html';
        } else if (user && user.role == 'grocery') {
            window.location.href = 'grocery.html';
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;
    
    try {
        await AuthService.signup(email, username, password);
        // Redirect to the home page after signup
        window.location.href = 'index.html';
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
}

// Update navbar based on auth status
function updateNavbar() {
    const user = AuthService.getUser();
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        // The user is initially logged out, show the logged out navbar
        navbar.innerHTML = `
            <div class="logo">Can Cook</div>
            <div>
                <a href="index.html">Home</a>
                <a href="stores.html">Stores</a>
                <a href="login.html">Login</a>
                <span style="color: white; margin-right: 10px;">Welcome, ${user.username}! You are a ${user.role}.</span>
            </div>
            <search>
                <form action="/search" method="get">
                    <input type="search" id="site-search" name="q" placeholder="Search" aria-label="Search for recipes">
                </form>
            </search>
        `;
    }

    if (user && navbar) {
        /*// Find the login link and replace with user info and logout
        const loginLink = navbar.querySelector('a[href="login.html"]');
        if (loginLink) {
            loginLink.outerHTML = `
                <span style="color: white; margin-right: 10px;">Welcome, ${user.username}!</span>
                <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
            `;
        }*/
        
        // Further adjust the navbar based on user role
        if (user.role == 'user') {
            // The user is a regular user, show index.html, pantry.html, stores.html, and logout
            navbar.innerHTML = `
                <div class="logo">Can Cook</div>
                <div>
                    <a href="index.html">Home</a>
                    <a href="pantry.html">Pantry</a>
                    <a href="stores.html">Grocery Stores</a>
                    <span style="color: white; margin-right: 10px;">Welcome, ${user.username}!</span>
                    <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
                </div>
                <search>
                    <form action="/search" method="get">
                        <input type="search" id="site-search" name="q" placeholder="Search" aria-label="Search for recipes">
                    </form>
                </search>
            `;
        } else if (user.role == 'admin') {
            // The user is an admin, only show logout and admin.html
            navbar.innerHTML = `
                <div class="logo">Can Cook</div>
                <div>
                    <a href="admin.html">Admin Panel</a>
                    <span style="color: white; margin-right: 10px;">Welcome, ${user.username}!</span>
                    <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
                </div>
            `;
        } else if (user.role == 'grocery') {
            // The user is a grocery store, only show logout and grocery.html
            navbar.innerHTML = `
                <div class="logo">Can Cook</div>
                <div>
                    <a href="grocery.html">Grocery Store Panel</a>
                    <span style="color: white; margin-right: 10px;">Welcome, ${user.username}!</span>
                    <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
                </div>
            `;
        }
    }
}

// Initialize auth UI on page load
document.addEventListener('DOMContentLoaded', updateNavbar);
