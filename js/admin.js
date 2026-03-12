// Admin Service
class AdminService {
    
    // Get all users
    static async getAllUsers() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.USER);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            return [];
        }
    }
    
    // Get all stores
    static async getAllStores() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.STORES);
        } catch (error) {
            console.error('Failed to fetch stores:', error);
            return [];
        }
    }
    
    // Update user details (role, store_id, etc.)
    static async updateUser(userId, userData) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.USER + '/' + userId, userData);
        } catch (error) {
            console.error('Failed to update user:', error);
            throw error;
        }
    }
    
    // Unlock a user account
    static async unlockUser(userId) {
        try {
            console.log('Attempting to unlock user:', userId);
            
            // Try different data formats that the backend might accept
            const dataFormats = [
                { isActive: 1, loginAttempts: 0, status: 1 },  // camelCase with status = 1
                { is_active: 1, login_attempts: 0, status: 1 }, // snake_case with status = 1
                { status: 1, login_attempts: 0 }, // minimal format
                { status: 1, loginAttempts: 0 }, // camelCase minimal
            ];
            
            for (let i = 0; i < dataFormats.length; i++) {
                try {
                    console.log(`Trying data format ${i + 1}:`, dataFormats[i]);
                    const result = await ApiService.put(API_CONFIG.ENDPOINTS.USER + '/' + userId, dataFormats[i]);
                    console.log('Unlock successful with format:', dataFormats[i]);
                    return result;
                } catch (error) {
                    console.log(`Format ${i + 1} failed:`, error.message);
                    if (i === dataFormats.length - 1) {
                        // Last attempt failed, throw error
                        throw error;
                    }
                    // Continue to next format
                }
            }
        } catch (error) {
            console.error('All unlock attempts failed:', error);
            throw error;
        }
    }
    
    // Create a new store
    static async createStore(storeData) {
        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.STORES, storeData);
        } catch (error) {
            console.error('Failed to create store:', error);
            throw error;
        }
    }
}

// Load and display all users
async function loadAllUsers() {
    if (!AuthService.requireRole(['admin'])) {
        return;
    }
    
    try {
        const response = await AdminService.getAllUsers();
        console.log('Raw API response:', response);
        
        // Handle different response structures
        const users = response.rows || response.data || response || [];
        console.log('Parsed users array:', users);
        
        // Also load stores for the dropdown
        const storesResponse = await AdminService.getAllStores();
        const stores = storesResponse.rows || storesResponse.data || storesResponse || [];
        console.log('Available stores:', stores);
        
        const table = document.getElementById('users-table');
        
        if (table && users && users.length > 0) {
            // Build table HTML
            let tableHTML = '<caption><strong>All Users - Admin Panel</strong></caption>';

            // Header row
            tableHTML += `
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Store</th>
                    <th>Status</th>
                    <th>Login Attempts</th>
                    <th>Actions</th>
                </tr>
            `;
            
            // Data rows
            users.forEach(user => {
                console.log('Processing user:', user);
                console.log('User status:', user.status, 'Type:', typeof user.status);
                console.log('User login_attempts:', user.login_attempts);
                
                // Check if account is locked - status = 0 means locked, status = 1 means active
                const isLocked = user.status === 0 || user.status === '0' || user.status === false;
                
                const rowStyle = isLocked ? 'style="background-color: #ffe6e6;"' : '';
                const statusColor = isLocked ? 'color: red; font-weight: bold;' : 'color: green;';
                const statusText = isLocked ? 'Locked' : 'Active';
                const loginAttempts = user.login_attempts || user.loginAttempts || 0;
                
                // Create store dropdown options
                let storeOptions = '<option value="">None</option>';
                stores.forEach(store => {
                    const selected = user.store_id == store.id ? 'selected' : '';
                    storeOptions += `<option value="${store.id}" ${selected}>${store.name}</option>`;
                });
                
                tableHTML += `
                    <tr ${rowStyle} id="user-row-${user.id}">
                        <td>${user.id}</td>
                        <td>
                            <span class="view-mode">${user.username || 'N/A'}</span>
                            <input type="text" class="edit-mode" value="${user.username || ''}" style="display:none; width: 100%;">
                        </td>
                        <td>
                            <span class="view-mode">${user.email || 'N/A'}</span>
                            <input type="email" class="edit-mode" value="${user.email || ''}" style="display:none; width: 100%;">
                        </td>
                        <td>
                            <span class="view-mode">${user.role || 'user'}</span>
                            <select class="edit-mode" style="display:none; width: 100%;">
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="groceryadmin" ${user.role === 'groceryadmin' ? 'selected' : ''}>Grocery Admin</option>
                            </select>
                        </td>
                        <td>
                            <span class="view-mode">${user.store_id ? getStoreName(stores, user.store_id) : 'N/A'}</span>
                            <select class="edit-mode" style="display:none; width: 100%;">
                                ${storeOptions}
                            </select>
                        </td>
                        <td style="${statusColor}">${statusText}</td>
                        <td>${loginAttempts}</td>
                        <td>
                            <button class="view-mode" onclick="editUser(${user.id})" style="background-color: #2196F3; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">Edit</button>
                            ${isLocked ? `<button class="view-mode" onclick="unlockUser(${user.id})" style="background-color: #4CAF50; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">Unlock</button>` : ''}
                            <button class="edit-mode" onclick="saveUser(${user.id})" style="display:none; background-color: #4CAF50; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">Save</button>
                            <button class="edit-mode" onclick="cancelEdit(${user.id})" style="display:none; background-color: #f44336; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">Cancel</button>
                        </td>
                    </tr>
                `;
            });
            
            table.innerHTML = tableHTML;
        } else if (table) {
            table.innerHTML = `
                <caption><strong>All Users</strong></caption>
                <tr><td colspan="8">No users found in the system.</td></tr>
            `;
        }
    } catch (error) {
        console.error('Failed to load all users:', error);
        const table = document.getElementById('users-table');
        if (table) {
            table.innerHTML = `
                <caption><strong>All Users</strong></caption>
                <tr><td colspan="8" style="color: red;">Error loading users: ${error.message}</td></tr>
            `;
        }
    }
}

// Helper function to get store name by ID
function getStoreName(stores, storeId) {
    const store = stores.find(s => s.id == storeId);
    return store ? store.name : `Store #${storeId}`;
}

// Edit user - show edit mode
function editUser(userId) {
    const row = document.getElementById(`user-row-${userId}`);
    if (row) {
        // Hide view mode, show edit mode
        row.querySelectorAll('.view-mode').forEach(el => el.style.display = 'none');
        row.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'inline-block');
    }
}

// Cancel edit - return to view mode
function cancelEdit(userId) {
    loadAllUsers(); // Reload to reset values
}

// Save user changes
async function saveUser(userId) {
    const row = document.getElementById(`user-row-${userId}`);
    if (!row) return;
    
    // Get new values
    const username = row.querySelector('td:nth-child(2) .edit-mode').value.trim();
    const email = row.querySelector('td:nth-child(3) .edit-mode').value.trim();
    const role = row.querySelector('td:nth-child(4) .edit-mode').value;
    const storeId = row.querySelector('td:nth-child(5) .edit-mode').value;
    
    if (!username || !email) {
        alert('Username and email are required');
        return;
    }
    
    try {
        const updateData = {
            username,
            email,
            role
        };
        
        // Only add store_id if role is groceryadmin
        if (role === 'groceryadmin') {
            if (!storeId) {
                alert('Grocery admins must be assigned to a store');
                return;
            }
            updateData.store_id = parseInt(storeId);
        } else {
            // Clear store_id for non-grocery roles
            updateData.store_id = null;
        }
        
        await AdminService.updateUser(userId, updateData);
        alert('User updated successfully!');
        loadAllUsers(); // Reload to show changes
    } catch (error) {
        console.error('Failed to save user:', error);
        alert('Failed to save user: ' + error.message);
    }
}

// Unlock a user account
async function unlockUser(userId) {
    if (!confirm('Are you sure you want to unlock this user account?')) {
        return;
    }
    
    try {
        await AdminService.unlockUser(userId);
        alert('User account unlocked successfully!');
        // Reload the users table
        loadAllUsers();
    } catch (error) {
        console.error('Failed to unlock user:', error);
        // Show the actual backend error message if available
        const errorMessage = error.message || error.toString();
        alert('Failed to unlock user: ' + errorMessage + '\n\nCheck the browser console for details.');
    }
}

// Load and display all stores
async function loadAllStores() {
    try {
        const response = await AdminService.getAllStores();
        const stores = response.rows || response.data || response || [];
        const table = document.getElementById('stores-table');
        
        if (table && stores && stores.length > 0) {
            let tableHTML = '<caption><strong>All Stores</strong></caption>';
            
            tableHTML += `
                <tr>
                    <th>ID</th>
                    <th>Store Name</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th>Assigned Admins</th>
                </tr>
            `;
            
            stores.forEach(store => {
                // Count users assigned to this store (will need to check from users list)
                tableHTML += `
                    <tr>
                        <td>${store.id}</td>
                        <td>${store.name || 'N/A'}</td>
                        <td>${store.address || 'N/A'}</td>
                        <td>${store.phone || 'N/A'}</td>
                        <td id="store-${store.id}-admins">-</td>
                    </tr>
                `;
            });
            
            table.innerHTML = tableHTML;
        } else if (table) {
            table.innerHTML = `
                <caption><strong>All Stores</strong></caption>
                <tr><td colspan="5">No stores in the system yet.</td></tr>
            `;
        }
    } catch (error) {
        console.error('Failed to load stores:', error);
        const table = document.getElementById('stores-table');
        if (table) {
            table.innerHTML = `
                <caption><strong>All Stores</strong></caption>
                <tr><td colspan="5" style="color: red;">Error loading stores: ${error.message}</td></tr>
            `;
        }
    }
}

// Handle adding a new store
async function handleAddStore() {
    const name = document.getElementById('storeName').value.trim();
    const address = document.getElementById('storeAddress').value.trim();
    const phone = document.getElementById('storePhone').value.trim();
    
    if (!name) {
        alert('Store name is required');
        return;
    }
    
    try {
        await AdminService.createStore({
            name,
            address: address || null,
            phone: phone || null
        });
        
        alert('Store added successfully!');
        
        // Clear form
        document.getElementById('storeName').value = '';
        document.getElementById('storeAddress').value = '';
        document.getElementById('storePhone').value = '';
        
        // Reload stores
        loadAllStores();
        loadAllUsers(); // Reload users to update store dropdown
    } catch (error) {
        console.error('Failed to add store:', error);
        alert('Failed to add store: ' + error.message);
    }
}

// Initialize admin page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        loadAllUsers();
        loadAllStores();
    }
});
