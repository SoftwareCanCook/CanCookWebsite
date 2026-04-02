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
    
    // Add or update item in pantry (consolidates existing items)
    static async addOrUpdateItem(itemData) {
        try {
            // Get all current pantry items
            const response = await PantryService.getPantryItems();
            const pantryRows = response.rows || response.data || response || [];
            const items = Array.isArray(pantryRows) ? pantryRows : [];
            
            // Check if an item with the same itemId already exists
            const existingItem = items.find(item => 
                (item.itemId || item.item_id) === (itemData.itemId || itemData.item_id)
            );
            
            if (existingItem) {
                // Item already exists, update its quantity
                const currentQuantity = Number(existingItem.quantity || 0);
                const addedQuantity = Number(itemData.quantity || 0);
                const newQuantity = currentQuantity + addedQuantity;
                
                console.log(`Item already in pantry. Updating quantity from ${currentQuantity} to ${newQuantity}`);
                return await PantryService.updateItemQuantity(existingItem.id, newQuantity);
            } else {
                // Item doesn't exist, add it as new
                console.log('Item not in pantry. Adding as new item.');
                return await PantryService.addItem(itemData);
            }
        } catch (error) {
            console.error('Failed to add or update pantry item:', error);
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

// Build a Map of itemId -> item details by fetching items from all stores
async function buildItemLookup() {
    const lookup = {};
    try {
        const storesResp = await ApiService.get(API_CONFIG.ENDPOINTS.STORES);
        const storeList = storesResp.rows || storesResp.data || storesResp || [];
        const stores = Array.isArray(storeList) ? storeList : [];

        await Promise.all(stores.map(async store => {
            try {
                const itemsResp = await ApiService.get(`${API_CONFIG.ENDPOINTS.STORE_ITEMS}${store.id}/items`);
                const raw = itemsResp.rows || itemsResp.data || itemsResp || [];
                (Array.isArray(raw) ? raw : []).forEach(si => {
                    if (!lookup[si.id]) {
                        lookup[si.id] = {
                            name: si.name || si.item_name || `Item #${si.id}`,
                            category: si.category || 'Pantry Staples',
                            unit: si.unit || 'units',
                            image: si.image || si.image_url || si.imageUrl || null,
                            storeName: store.name || `Store #${store.id}`
                        };
                    }
                });
            } catch (_) { /* skip unavailable store */ }
        }));
    } catch (e) {
        console.warn('Could not build item lookup:', e);
    }
    return lookup;
}

// Load and display pantry items
async function loadPantryItems() {
    if (!AuthService.requireRole(['user'])) {
        return;
    }
    
    try {
        // Fetch pantry rows and item metadata in parallel
        const [response, itemLookup] = await Promise.all([
            PantryService.getPantryItems(),
            buildItemLookup()
        ]);

        const rawItems = response.rows || response.data || response || [];
        const pantryRows = Array.isArray(rawItems) ? rawItems : [];

        // Enrich each row with name/category/unit from the lookup
        const items = pantryRows.map(row => {
            const id = row.itemId || row.item_id;
            const meta = itemLookup[id] || {};
            return {
                id: row.id,
                itemId: id,
                name: row.name || row.item_name || row.itemName || meta.name || `Item #${id}`,
                category: row.category || row.item_category || meta.category || 'Pantry Staples',
                unit: row.unit || meta.unit || 'units',
                image_url: row.image_url || row.imageUrl || meta.image || null,
                store_name: row.store_name || row.storeName || meta.storeName || 'Unknown Store',
                quantity: row.quantity || 0
            };
        });
        
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
            const category = item.category;
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
