// Grocery Service
class GroceryService {
    
    // Get store items
    static async getStoreItems(storeId) {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.STORE_ITEMS + storeId + '/items');
        } catch (error) {
            console.error('Failed to fetch store items:', error);
            return [];
        }
    }
    
    // Increment item stock
    static async incrementStock(store_id, name) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.STORE_ITEMS + store_id + '/' + name);
        } catch (error) {
            console.error('Failed to increment stock:', error);
            throw error;
        }
    }

    // Decrement item stock
    static async decrementStock(store_id, name) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.STORE_ITEMS + store_id + '/' + name);
        } catch (error) {
            console.error('Failed to decrement stock:', error);
            throw error;
        }
    }

    // Create a new item
    static async createItem(store_id, name, category, quantity, image, stock) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.STORE_ITEMS + store_id + '/' + name + '?category=' + category + '&quantity=' + quantity + '&image=' + image + '&stock=' + stock);
        } catch (error) {
            console.error('Failed to create item:', error);
            throw error;
        }
    }
}

// Load and display all items for the grocery admin's store
async function loadAllitems() {
    if (!AuthService.requireAuth()) {
        return;
    }
    
    try {
        const items = await GroceryService.getStoreItems(AuthService.getStoreId());
        const table = document.querySelector('.content table');
        
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

            // Create item row
            tableHTML += `
                <tr>
                    <td colspan="6">
                        <form id="createItemForm" onsubmit="GroceryService.createItem(${AuthService.getStoreId()}, name, category, quantity, image, stock)" style="display: inline-block;">
                            <input type="text" id="name" placeholder="Item Name" required>
                            <input type="text" id="category" placeholder="Category" required>
                            <input type="number" id="quantity" placeholder="Quantity" required>
                            <input type="text" id="image" placeholder="apple.png" required>
                            <input type="number" id="stock" placeholder="Stock Amount" required>
                            <button type="submit">Add Item</button>
                        </form>
                    </td>
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
                            <td>${item.stock}<button onclick="GroceryService.incrementStock(${item.store_id}, '${item.name}')" style="margin-left: 5px;">+</button><button onclick="GroceryService.decrementStock(${item.store_id}, '${item.name}')" style="margin-left: 5px;">-</button></td>
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
                <caption><strong>All Items</strong></caption>
                <tr><td colspan="7">No items found in your store.</td></tr>
            `;
        }
    } catch (error) {
        console.error('Failed to load all items:', error);
    }
}

// Initialize admin page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('grocery.html')) {
        loadAllItems();
    }
});
