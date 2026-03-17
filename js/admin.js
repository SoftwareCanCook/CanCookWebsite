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
            console.log('=== UPDATE USER API CALL ===');
            console.log('User ID:', userId);
            console.log('Update Data:', userData);
            console.log('API URL:', API_CONFIG.ENDPOINTS.USER + '/' + userId);
            
            const result = await ApiService.put(API_CONFIG.ENDPOINTS.USER + '/' + userId, userData);
            
            console.log('=== API RESPONSE ===');
            console.log('Response:', result);
            
            return result;
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
                { isActive: 1, loginAttempts: 0, status: 1 },
                { is_active: 1, login_attempts: 0, status: 1 },
                { status: 1, login_attempts: 0 },
                { status: 1, loginAttempts: 0 },
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
                        throw error;
                    }
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
    
    // Get pending accounts (accounts waiting for approval)
    static async getPendingAccounts() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.USER + '/pending');
        } catch (error) {
            console.error('Failed to fetch pending accounts:', error);
            return [];
        }
    }
    
    // Approve a pending account
    static async approveAccount(userId) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.USER + '/' + userId + '/approve', {
                approved: true,
                is_approved: true,
                status: 1
            });
        } catch (error) {
            console.error('Failed to approve account:', error);
            throw error;
        }
    }
    
    // Deny a pending account
    static async denyAccount(userId) {
        try {
            return await ApiService.delete(API_CONFIG.ENDPOINTS.USER + '/' + userId);
        } catch (error) {
            console.error('Failed to deny account:', error);
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
        const users = Array.isArray(response) ? response : (response.rows || response.data || response || []);
        console.log('Parsed users array:', users);
        
        // Also load stores for the dropdown
        const storesResponse = await AdminService.getAllStores();
        const stores = Array.isArray(storesResponse) ? storesResponse : (storesResponse.rows || storesResponse.data || storesResponse || []);
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
                console.log('=== USER DATA ===');
                console.log('User ID:', user.id, 'Username:', user.username);
                console.log('Role:', user.role);
                console.log('Store ID:', user.store_id, 'Type:', typeof user.store_id);
                console.log('Status:', user.status, 'Type:', typeof user.status);
                
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
    
    console.log('=== SAVE USER ===');
    console.log('User ID:', userId);
    console.log('Role:', role);
    console.log('Store ID:', storeId);
    
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
            console.log('Adding store_id to update:', updateData.store_id);
        } else {
            // Clear store_id for non-grocery roles
            updateData.store_id = null;
        }
        
        console.log('Calling AdminService.updateUser with:', updateData);
        const result = await AdminService.updateUser(userId, updateData);
        console.log('Update result:', result);
        
        alert('User updated successfully!');
        
        console.log('Reloading users to verify update...');
        await loadAllUsers(); // Reload to show changes
        
        console.log('=== SAVE COMPLETE ===');
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
        const stores = Array.isArray(response) ? response : (response.rows || response.data || response || []);
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
        loadPendingAccounts();
        loadAllUsers();
        loadAllStores();
    }
});

// Load and display pending accounts
async function loadPendingAccounts() {
    if (!AuthService.requireRole(['admin'])) {
        return;
    }
    
    try {
        const response = await AdminService.getPendingAccounts();
        const pendingAccounts = response.rows || response.data || response || [];
        
        const table = document.getElementById('pending-accounts-table');
        
        if (table) {
            if (pendingAccounts && pendingAccounts.length > 0) {
                let tableHTML = '<caption><strong>⏳ Accounts Awaiting Approval</strong></caption>';
                
                tableHTML += `
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Requested Role</th>
                        <th>Registered Date</th>
                        <th>Actions</th>
                    </tr>
                `;
                
                pendingAccounts.forEach(account => {
                    const registeredDate = account.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A';
                    
                    tableHTML += `
                        <tr style="background-color: #fff3e0;">
                            <td>${account.id}</td>
                            <td>${account.username || 'N/A'}</td>
                            <td>${account.email || 'N/A'}</td>
                            <td>${account.role || 'user'}</td>
                            <td>${registeredDate}</td>
                            <td>
                                <button onclick="approveAccount(${account.id})" style="background-color: #4CAF50; color: white; padding: 5px 15px; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">✓ Approve</button>
                                <button onclick="denyAccount(${account.id})" style="background-color: #f44336; color: white; padding: 5px 15px; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">✗ Deny</button>
                            </td>
                        </tr>
                    `;
                });
                
                table.innerHTML = tableHTML;
            } else {
                table.innerHTML = `
                    <caption><strong>Pending Account Approvals</strong></caption>
                    <tr><td style="padding: 15px; color: #4CAF50;">✓ No pending accounts. All registrations have been processed!</td></tr>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load pending accounts:', error);
        const table = document.getElementById('pending-accounts-table');
        if (table) {
            table.innerHTML = `
                <caption><strong>Pending Account Approvals</strong></caption>
                <tr><td style="color: red;">Error loading pending accounts: ${error.message}</td></tr>
            `;
        }
    }
}

// Approve a pending account
async function approveAccount(userId) {
    if (!confirm('Are you sure you want to approve this account?')) {
        return;
    }
    
    try {
        await AdminService.approveAccount(userId);
        alert('Account approved successfully! The user can now log in.');
        loadPendingAccounts();
        loadAllUsers();
    } catch (error) {
        console.error('Failed to approve account:', error);
        alert('Failed to approve account: ' + error.message);
    }
}

// Deny a pending account
async function denyAccount(userId) {
    if (!confirm('Are you sure you want to deny and delete this account request? This action cannot be undone.')) {
        return;
    }
    
    try {
        await AdminService.denyAccount(userId);
        alert('Account request denied and deleted.');
        loadPendingAccounts();
    } catch (error) {
        console.error('Failed to deny account:', error);
        alert('Failed to deny account: ' + error.message);
    }
}
