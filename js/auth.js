// Authentication Service
const MAX_LOGIN_ATTEMPTS = 3;

class AuthService {

    // Login user
    static async login(username, password) {
        try {
            const response = await ApiService.post(API_CONFIG.ENDPOINTS.LOGIN, {
                username,
                password
            });

            console.log('Login response:', response);
            console.log('User data from backend:', response.user);

            // Store token and user info
            if (response.token) {
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                console.log('Stored user in localStorage:', localStorage.getItem('user'));
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
        const parsedUser = user ? JSON.parse(user) : null;
        console.log('Getting user from localStorage:', parsedUser);
        return parsedUser;
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

    // Require specific role (redirect if wrong role)
    static requireRole(allowedRoles) {
        if (!this.requireAuth()) {
            return false;
        }

        const user = this.getUser();
        if (!user || !allowedRoles.includes(user.role)) {
            alert('Access denied. You do not have permission to view this page.');
            // Redirect to appropriate page based on their actual role
            if (user && user.role == 'user') {
                window.location.href = 'index.html';
            } else if (user && user.role == 'admin') {
                window.location.href = 'admin.html';
            } else if (user && user.role == 'groceryadmin') {
                window.location.href = 'grocery.html';
            } else {
                window.location.href = 'login.html';
            }
            return false;
        }
        return true;
    }

    // Get current user's store ID (for grocery store users)
    static getStoreId() {
        const user = this.getUser();
        return user ? user.store_id : null;
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;

    try {
        const response = await AuthService.login(username, password);

        // Check if the account is locked
        if (response.user && response.user.status === 'locked') {
            alert('Your account has been locked due to too many failed login attempts. Please contact an administrator to unlock your account.');
            return;
        }

        // Redirect to the correct page after login
        // If user, then redirect to index.html
        // If admin, then redirect to admin.html
        // If grocery, then redirect to grocery.html
        const user = AuthService.getUser();
        if (user && user.role == 'user') {
            window.location.href = 'index.html';
        } else if (user && user.role == 'admin') {
            window.location.href = 'admin.html';
        } else if (user && user.role == 'groceryadmin') {
            window.location.href = 'grocery.html';
        }
    } catch (error) {
        // Check if the error message indicates the account is locked
        if (error.message.includes('locked') || error.message.includes('too many')) {
            alert('Your account has been locked due to too many failed login attempts. Please contact an administrator to unlock your account.');
        } else if (error.message.includes('Invalid credentials')) {
            alert('Login failed: Invalid username or password. Your account will be locked after 3 failed attempts.');
        } else {
            alert('Login failed: ' + error.message);
        }
    }
}

// Validate username (must be 1 to 8 lowercase characters)
function validateUsername(username) {
    const usernameRegex = /^[a-z]{1,8}$/;
    if (!usernameRegex.test(username)) {
        return {
            valid: false,
            message: 'Username must be 1 to 8 lowercase letters (a-z)'
        };
    }
    return { valid: true };
}

// Validate password (must be exactly 12 characters with at least 1 uppercase, 1 lowercase, 1 numeric, and 1 symbol)
function validatePassword(password) {
    if (password.length !== 12) {
        return {
            valid: false,
            message: 'Password must be exactly 12 characters long'
        };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase) {
        return {
            valid: false,
            message: 'Password must contain at least 1 uppercase letter'
        };
    }
    if (!hasLowercase) {
        return {
            valid: false,
            message: 'Password must contain at least 1 lowercase letter'
        };
    }
    if (!hasNumeric) {
        return {
            valid: false,
            message: 'Password must contain at least 1 number'
        };
    }
    if (!hasSymbol) {
        return {
            valid: false,
            message: 'Password must contain at least 1 symbol (!@#$%^&*()etc)'
        };
    }

    return { valid: true };
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;

    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');

    // Reset error messages
    if (usernameError) usernameError.style.display = 'none';
    if (passwordError) passwordError.style.display = 'none';

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
        if (usernameError) {
            usernameError.textContent = usernameValidation.message;
            usernameError.style.display = 'block';
        }
        alert(usernameValidation.message);
        return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        if (passwordError) {
            passwordError.textContent = passwordValidation.message;
            passwordError.style.display = 'block';
        }
        alert(passwordValidation.message);
        return;
    }

    try {
        await AuthService.signup(email, username, password);
        alert('Account created successfully! Your account is pending admin approval.');
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
}

// Update navbar based on auth status
function updateNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) {
        return;
    }

    const user = AuthService.getUser();
    if (user) {
        const welcomeMessage = `Welcome ${user.username}`;

        // Further adjust the navbar based on user role
        if (user.role == 'user') {
            // The user is a regular user, show index.html, pantry.html, stores.html, and logout
            navbar.innerHTML = `
                <div class="logo">Can Cook</div>
                <div>
                    <a href="index.html">Home</a>
                    <a href="pantry.html">Pantry</a>
                    <a href="stores.html">Grocery Stores</a>
                    <span style="color: white; margin-right: 10px;">${welcomeMessage}</span>
                    <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
                </div>
            `;
        } else if (user.role == 'admin') {
            // The user is an admin, only show logout and admin.html
            navbar.innerHTML = `
                <div class="logo">Can Cook</div>
                <div>
                    <a href="admin.html">Admin Panel</a>
                    <span style="color: white; margin-right: 10px;">${welcomeMessage}</span>
                    <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
                </div>
            `;
        } else if (user.role == 'groceryadmin') {
            // The user is a grocery store admin, only show logout and grocery.html
            navbar.innerHTML = `
                <div class="logo">Can Cook</div>
                <div>
                    <a href="grocery.html">Grocery Store Panel</a>
                    <span style="color: white; margin-right: 10px;">${welcomeMessage}</span>
                    <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
                </div>
            `;
        } else {
            // Fallback for users without a role or unrecognized role - treat as regular user
            navbar.innerHTML = `
                <div class="logo">Can Cook</div>
                <div>
                    <a href="index.html">Home</a>
                    <a href="pantry.html">Pantry</a>
                    <a href="stores.html">Grocery Stores</a>
                    <span style="color: white; margin-right: 10px;">${welcomeMessage}</span>
                    <a href="#" onclick="AuthService.logout(); return false;">Logout</a>
                </div>
            `;
        }
        return;
    }

    // Logged out navbar
    navbar.innerHTML = `
        <div class="logo">Can Cook</div>
        <div>
            <a href="index.html">Home</a>
            <a href="stores.html">Stores</a>
            <a href="login.html">Login</a>
        </div>
    `;
}

// Initialize auth UI on page load
document.addEventListener('DOMContentLoaded', updateNavbar);
