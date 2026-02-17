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
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;
    
    try {
        await AuthService.login(username, password);
        // Redirect to home page after successful login
        window.location.href = 'index.html';
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
        // Redirect to home page after successful signup
        window.location.href = 'index.html';
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
}

// Update navbar based on auth status
function updateNavbar() {
    const user = AuthService.getUser();
    const navbar = document.querySelector('.navbar');
    
    if (user && navbar) {
        // Find the login link and replace with user info and logout
        const loginLink = navbar.querySelector('a[href="login.html"]');
        if (loginLink) {
            loginLink.outerHTML = `
                <span style="color: white; margin-right: 10px;">Welcome, ${user.username}!</span>
                <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
            `;
        }
    }
}

// Initialize auth UI on page load
document.addEventListener('DOMContentLoaded', updateNavbar);
