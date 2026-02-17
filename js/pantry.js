// Pantry Service
class PantryService {
    
    // Get all pantry items
    static async getPantryItems() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY_ITEMS);
        } catch (error) {
            console.error('Failed to fetch pantry items:', error);
            return [];
        }
    }
    
    // Add item to pantry
    static async addItem(itemData) {
        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.ADD_PANTRY_ITEM, itemData);
        } catch (error) {
            console.error('Failed to add pantry item:', error);
            throw error;
        }
    }
    
    // Remove item from pantry
    static async removeItem(itemId) {
        try {
            return await ApiService.delete(API_CONFIG.ENDPOINTS.REMOVE_PANTRY_ITEM + itemId);
        } catch (error) {
            console.error('Failed to remove pantry item:', error);
            throw error;
        }
    }
    
    // Update item quantity
    static async updateItemQuantity(itemId, quantity) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.REMOVE_PANTRY_ITEM + itemId, {
                quantity
            });
        } catch (error) {
            console.error('Failed to update pantry item:', error);
            throw error;
        }
    }
}

// Load and display pantry items
async function loadPantryItems() {
    if (!AuthService.requireAuth()) {
        return;
    }
    
    try {
        const items = await PantryService.getPantryItems();
        const table = document.querySelector('.content table');
        
        if (table && items.length > 0) {
            // Group items by category
            const categories = {};
            items.forEach(item => {
                const category = item.category || 'Other';
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(item);
            });
            
            // Build table HTML
            const categoryNames = Object.keys(categories);
            const maxItems = Math.max(...categoryNames.map(cat => categories[cat].length));
            
            let tableHTML = '<caption><strong>Pantry Items</strong></caption>';
            
            // Header row
            tableHTML += '<tr>';
            categoryNames.forEach(cat => {
                tableHTML += `<th colspan="2">${cat}</th>`;
            });
            tableHTML += '</tr>';
            
            // Data rows
            for (let i = 0; i < maxItems; i++) {
                tableHTML += '<tr>';
                categoryNames.forEach(cat => {
                    const item = categories[cat][i];
                    if (item) {
                        tableHTML += `
                            <td>${item.name}</td>
                            <td>
                                ${item.quantity} ${item.unit}
                                <button onclick="removePantryItem(${item.id})" style="margin-left: 5px;">×</button>
                            </td>
                        `;
                    } else {
                        tableHTML += '<td></td><td></td>';
                    }
                });
                tableHTML += '</tr>';
            }
            
            table.innerHTML = tableHTML;
        } else if (table) {
            table.innerHTML = `
                <caption><strong>Pantry Items</strong></caption>
                <tr><td colspan="10">No items in your pantry yet. Visit stores to add items!</td></tr>
            `;
        }
    } catch (error) {
        console.error('Failed to load pantry items:', error);
    }
}

// Remove pantry item
async function removePantryItem(itemId) {
    if (confirm('Are you sure you want to remove this item?')) {
        try {
            await PantryService.removeItem(itemId);
            await loadPantryItems(); // Reload the pantry
        } catch (error) {
            alert('Failed to remove item: ' + error.message);
        }
    }
}

// Initialize pantry page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('pantry.html')) {
        loadPantryItems();
    }
});
