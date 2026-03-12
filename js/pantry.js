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
    if (!AuthService.requireRole(['user'])) {
        return;
    }
    
    try {
        const response = await PantryService.getPantryItems();
        const items = response.rows || response.data || response || [];
        
        // Define the 5 required categories
        const categories = {
            'Produce': [],
            'Meats & Seafood': [],
            'Dairy': [],
            'Bakery': [],
            'Pantry Staples': []
        };
        
        // Group items by category
        items.forEach(item => {
            const category = item.category || 'Pantry Staples';
            if (categories[category]) {
                categories[category].push(item);
            } else {
                categories['Pantry Staples'].push(item);
            }
        });
        
        // Populate each category table
        populateCategoryTable('producTable', categories['Produce']);
        populateCategoryTable('meatsTable', categories['Meats & Seafood']);
        populateCategoryTable('dairyTable', categories['Dairy']);
        populateCategoryTable('bakeryTable', categories['Bakery']);
        populateCategoryTable('staplesTable', categories['Pantry Staples']);
        
    } catch (error) {
        console.error('Failed to load pantry items:', error);
    }
}

// Populate a category table with items
function populateCategoryTable(tableId, items) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    if (items.length === 0) {
        table.innerHTML = '<tr><td style="padding: 10px; color: #999;">No items in this category yet</td></tr>';
        return;
    }
    
    let tableHTML = `
        <tr>
            <th style="width: 60px;">Image</th>
            <th>Item Name</th>
            <th>Store</th>
            <th>Quantity</th>
            <th style="width: 100px;">Actions</th>
        </tr>
    `;
    
    items.forEach(item => {
        const imageUrl = item.image_url || item.imageUrl || 'apple.jpg';
        const storeName = item.store_name || item.storeName || 'Unknown Store';
        const quantity = item.quantity || 0;
        const unit = item.unit || 'units';
        
        tableHTML += `
            <tr>
                <td><img src="${imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td>${item.name || 'Unknown Item'}</td>
                <td>${storeName}</td>
                <td>${quantity} ${unit}</td>
                <td>
                    <button onclick="removePantryItem(${item.id})" style="background-color: #f44336; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">Remove</button>
                </td>
            </tr>
        `;
    });
    
    table.innerHTML = tableHTML;
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
