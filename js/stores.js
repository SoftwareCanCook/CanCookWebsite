// Store Service
class StoreService {
    
    /*/ Get all stores
    static async getAllStores() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.STORES);
        } catch (error) {
            console.error('Failed to fetch stores:', error);
            return [];
        }
    }*/
    
    // Get store items
    static async getStoreItems(storeId) {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.STORE_ITEMS + storeId + '/items');
        } catch (error) {
            console.error('Failed to fetch store items:', error);
            return [];
        }
    }
    
    // Add store item to pantry
    static async addToPantry(itemData) {
        try {
            return await PantryService.addItem(itemData);
        } catch (error) {
            console.error('Failed to add item to pantry:', error);
            throw error;
        }
    }
}

/*/ Load and display stores
async function loadStores() {
    try {
        const response = await StoreService.getAllStores();
        const stores = response.rows || response.data || response || [];
        const container = document.getElementById('storesContainer');
        
        if (!container) return;
        
        if (stores.length > 0) {
            let storesHTML = '';
            
            stores.forEach(store => {
                const logoUrl = store.logo_url || store.logoUrl || 'apple.jpg';
                const address = store.address || 'N/A';
                const phone = store.phone || 'N/A';
                
                storesHTML += `
                    <div class="store-container" style="display: flex; align-items: center; border: 2px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0; background-color: #f9f9f9; cursor: pointer; transition: transform 0.2s;" onclick="openStorePopup(${store.id})" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        <div class="card" style="width: 150px; height: 150px; margin-right: 20px; flex-shrink: 0;">
                            <img src="${logoUrl}" alt="${store.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                        </div>
                        <div class="store-description" style="flex: 1;">
                            <h2 style="margin: 0 0 10px 0; color: #2196F3;">${store.name}</h2>
                            <p style="margin: 5px 0; color: #666;"><strong>📍 Address:</strong> ${address}</p>
                            <p style="margin: 5px 0; color: #666;"><strong>📞 Phone:</strong> ${phone}</p>
                            <button style="margin-top: 10px; background-color: #4CAF50; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">View Items</button>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = storesHTML;
        } else {
            container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No stores available yet. Check back soon!</p>';
        }
    } catch (error) {
        console.error('Failed to load stores:', error);
        const container = document.getElementById('storesContainer');
        if (container) {
            container.innerHTML = '<p style="padding: 20px; color: red;">Error loading stores. Please try again later.</p>';
        }
    }
}*/

// Load and display store items in popup
async function loadStoreItems(storeId) {
    if (!AuthService.requireAuth()) {
        return;
    }
    
    try {
        const items = await GroceryService.getStoreItems(storeId);
        const table = document.querySelector('[id="${storeId}"] table');
        
        if (table && items.length > 0) {
            // Group items by category
            const categories = {};
            items.forEach(item => {
                const category = item.category || 'Other';
                if (!items[category]) {
                    items[category] = [];
                }
                items[category].push(item);
            });
            
            // Build table HTML
            const itemNames = Object.keys(items.name);
            let tableHTML = '<caption><strong>All Items</strong></caption>';
            const itemCount = items.rows.length;

            // Header row
            tableHTML += `
                <tr>
                    <th>ID</th>
                    <th>Store ID</th>
                    <th>Item Name</th>   
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Stock</th>
                </tr>
            `;

            // Data rows
            for (let i = 0; i < itemCount; i++) {
                tableHTML += '<tr>';
                itemNames.forEach(cat => {
                    const item = items[cat][i];
                    if (item) {
                        tableHTML += `
                            <td>${item.id}</td>
                            <td>${item.store_id}</td>
                            <td>${item.name}</td>
                            <td>${item.category}</td>
                            <td>${item.quantity}</td>
                            <td>${item.stock}
                        `;
                        if (item.stock > 0) {
                            tableHTML += '<button onclick="StoreService.addItemToPantry(${item.id}, ${item.name})" style="margin-left: 5px;" onclick="GroceryService.decrementStock(${item.storeId}, ${item.name})">Add One to Pantry</button></td>';
                        } else {
                            tableHTML += '<button>No Stock Remaining</button>';
                        }
                    } else {
                        tableHTML += '<td></td><td></td><td></td><td></td><td></td><td></td>';
                    }
                });
                tableHTML += '</tr>';
            }
            table.innerHTML = tableHTML;
        } else if (table) {
            table.innerHTML = `
                <caption><strong>All Items</strong></caption>
                <tr><td colspan="7">No items found in this store.</td></tr>
            `;
        }
        
        // Show popup
        document.getElementById('storeItemsPopup').style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to load all items:', error);
    }
}

// Close store popup
function closeStorePopup() {
    document.getElementById('storeItemsPopup').style.display = 'none';
    currentStore = null;
    return false;
}

// Add item to pantry from store
async function addItemToPantry(itemId, itemName, unit, stock) {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput.value) || 1;
    
    if (quantity > stock) {
        alert(`Only ${stock} ${unit} available in stock`);
        return;
    }
    
    if (quantity < 1) {
        alert('Quantity must be at least 1');
        return;
    }
    
    try {
        const itemData = {
            storeItemId: itemId,
            quantity: quantity,
            unit: unit
        };
        
        await StoreService.addToPantry(itemData);
        alert(`${quantity} ${unit} of ${itemName} added to your pantry!`);
    } catch (error) {
        console.error('Failed to add item to pantry:', error);
        alert('Failed to add item to pantry: ' + (error.message || 'Unknown error'));
    }
}

// Initialize stores page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('stores.html')) {
        // Select all .popup elements
        const popups = document.querySelectorAll('.popup');
        popups.forEach(popup => {
            popup.addEventListener('click', function() {
                // "this" refers to the specific popup that was clicked
                loadStoreItems(this.id);
            });
        });
    }
});
