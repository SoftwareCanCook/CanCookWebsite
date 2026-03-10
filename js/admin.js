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
    
    // Unlock a user account
    static async unlockUser(userId) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.USER + userId + '/' + '1');
        } catch (error) {
            console.error('Failed to unlock user:', error);
            throw error;
        }
    }
}

// Load and display all users
async function loadAllUsers() {
    if (!AuthService.requireAuth()) {
        return;
    }
    
    try {
        const users = await AdminService.getAllUsers();
        const table = document.querySelector('.content table');
        
        if (table && users.length > 0) {
            // Group items by category
            const roles = {};
            users.forEach(user => {
                const category = user.role || 'Other';
                if (!roles[category]) {
                    roles[category] = [];
                }
                roles[category].push(user);
            });
            
            // Build table HTML
            const roleNames = Object.keys(roles);
            let tableHTML = '<caption><strong>All Users</strong></caption>';
            const userCount = users.rows.length;

            // Header row
            tableHTML += `
                <tr>
                    <th>Email</th>
                    <th>Login Attempts</th>
                    <th>Password</th>   
                    <th>Role</th>
                    <th>Status</th>
                    <th>Username</th>
                </tr>
            `;
            
            // Data rows
            for (let i = 0; i < userCount; i++) {
                tableHTML += '<tr>';
                roleNames.forEach(cat => {
                    const user = roles[cat][i];
                    if (user) {
                        tableHTML += `
                            <td>${user.email}</td>
                            <td>${user.login_attempts}</td>
                            <td>${user.password}</td>
                            <td>${user.role}</td>
                            <td>${user.status}<button onclick="unlockUser(${user.id})" style="margin-left: 5px;">Unlock</button></td>
                            <td>${user.username}</td>
                        `;
                    } else {
                        tableHTML += '<td></td><td></td><td></td><td></td><td></td><td></td>';
                    }
                });
                tableHTML += '</tr>';
            }
            
            table.innerHTML = tableHTML;
        } else if (table) {
            table.innerHTML = `
                <caption><strong>All Users</strong></caption>
                <tr><td colspan="6">No users found in the system.</td></tr>
            `;
        }
    } catch (error) {
        console.error('Failed to load all users:', error);
    }
}

// Initialize admin page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        loadAllUsers();
    }
});
