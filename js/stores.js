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
    static async addToPantry(itemId, quantity = 1) {
        try {
            return await PantryService.addItem({
                storeItemId: itemId,
                quantity
            });
        } catch (error) {
            console.error('Failed to add item to pantry:', error);
            throw error;
        }
    }
}

/*/ Load and display stores
async function loadStores() {
    try {
        const stores = await StoreService.getAllStores();
        const content = document.querySelector('.content');
        
        if (stores.length > 0) {
            // Find the store containers section
            const storeContainers = content.querySelectorAll('.store-container');
            
            stores.forEach((store, index) => {
                if (storeContainers[index]) {
                    const container = storeContainers[index];
                    container.querySelector('h2').textContent = store.name;
                    container.querySelector('p').textContent = `${store.address} | Phone: ${store.phone}`;
                    container.querySelector('img').src = store.logoUrl || 'apple.jpg';
                    container.querySelector('a').href = `#store-${store.id}`;
                    container.querySelector('a').onclick = () => loadStoreItems(store.id);
                }
            });
        }
    } catch (error) {
        console.error('Failed to load stores:', error);
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
    } catch (error) {
        console.error('Failed to load all items:', error);
    }
}

// Add item to pantry from store
async function addItemToPantry(itemId, itemName) {
    try {
        await StoreService.addToPantry(itemId);
        alert(`${itemName} added to your pantry!`);
    } catch (error) {
        alert('Failed to add item to pantry: ' + error.message);
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
