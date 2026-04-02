// Store Service
class StoreService {

    // Get all stores
    static async getAllStores() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.STORES);
        } catch (error) {
            console.error('Failed to fetch stores:', error);
            return [];
        }
    }

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

let currentStore = null;

async function decrementStoreInventory(storeId, itemId, newStock) {
    const endpoint = `${API_CONFIG.ENDPOINTS.STORE_ITEMS}${storeId}/items/${itemId}`;
    const targetStock = Math.max(0, Number(newStock) || 0);

    try {
        return await ApiService.put(endpoint, { quantity: targetStock, stock: targetStock });
    } catch (firstError) {
        try {
            return await ApiService.put(endpoint, { stock: targetStock });
        } catch (secondError) {
            return await ApiService.put(endpoint, { quantity: targetStock });
        }
    }
}

// Load and display stores
async function loadStores() {
    try {
        const response = await StoreService.getAllStores();
        const stores = response.rows || response.data || response || [];
        const container = document.getElementById('storesContainer');

        if (!container) return;

        if (stores.length > 0) {
            let storesHTML = '';

            stores.forEach(store => {
                const logoUrl = store.logo_url
                    || store.logoUrl
                    || store.image_url
                    || store.imageUrl
                    || store.image
                    || 'apple.jpg';
                const address = store.address || 'N/A';
                const phone = store.phone || 'N/A';

                storesHTML += `
                    <div class="store-container" style="display: flex; align-items: center; border: 2px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px auto; background-color: #f9f9f9; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        <div class="card" style="width: 150px; height: 150px; margin-right: 20px; flex-shrink: 0;">
                            <img src="${logoUrl}" alt="${store.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                        </div>
                        <div class="store-description" style="flex: 1;">
                            <h2 style="margin: 0 0 10px 0; color: #2196F3;">${store.name}</h2>
                            <p style="margin: 5px 0; color: #666;"><strong>📍 Address:</strong> ${address}</p>
                            <p style="margin: 5px 0; color: #666;"><strong>📞 Phone:</strong> ${phone}</p>
                            <button onclick="openStorePopup(${store.id}, '${store.name}')" style="margin-top: 10px; background-color: #4CAF50; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">View Items</button>
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
}

// Load and display store items in popup
async function loadStoreItems(storeId, storeName) {
    if (!AuthService.requireAuth()) {
        return;
    }

    try {
        currentStore = { id: storeId, name: storeName };

        // Update popup title
        document.getElementById('storePopupTitle').textContent = `${storeName} - Inventory`;

        const response = await StoreService.getStoreItems(storeId);
        const rawItems = response.rows || response.data || response || [];
        const items = Array.isArray(rawItems) ? rawItems : [];
        const table = document.getElementById('storeItemsTable');

        if (table && items.length > 0) {
            // Build table HTML
            let tableHTML = `
                <tr style="background-color: #2196F3; color: white;">
                    <th style="padding: 10px; text-align: left;">Item Name</th>   
                    <th style="padding: 10px; text-align: left;">Category</th>
                    <th style="padding: 10px; text-align: left;">Unit</th>
                    <th style="padding: 10px; text-align: center;">Stock</th>
                    <th style="padding: 10px; text-align: center;">Action</th>
                </tr>
            `;

            // Data rows
            items.forEach(item => {
                const stock = item.stock || item.quantity || 0;
                const unit = item.unit || 'units';
                const name = item.name || 'Unknown';

                tableHTML += `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px;">${name}</td>
                        <td style="padding: 10px;">${item.category || 'N/A'}</td>
                        <td style="padding: 10px;">${unit}</td>
                        <td style="padding: 10px; text-align: center;">${stock}</td>
                        <td style="padding: 10px; text-align: center;">
                `;

                if (stock > 0) {
                    tableHTML += `
                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <input id="qty-${item.id}" type="number" min="1" max="${stock}" value="1" style="width: 70px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;" />
                            <button onclick="addItemToPantry(${storeId}, ${item.id}, '${name.replace(/'/g, "\\'")}', '${unit.replace(/'/g, "\\'")}', ${stock})" style="background-color: #4CAF50; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Add to Pantry</button>
                        </div>
                    `;
                } else {
                    tableHTML += `<button disabled style="background-color: #999; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: not-allowed; font-size: 12px;">Out of Stock</button>`;
                }

                tableHTML += `
                        </td>
                    </tr>
                `;
            });

            table.innerHTML = tableHTML;
        } else if (table) {
            table.innerHTML = `
                <tr><td colspan="5" style="padding: 20px; text-align: center; color: #999;">No items found in this store.</td></tr>
            `;
        }

        // Show popup
        document.getElementById('storeItemsPopup').style.display = 'flex';

    } catch (error) {
        console.error('Failed to load store items:', error);
        alert('Failed to load store items: ' + error.message);
    }
}

// Open store popup
function openStorePopup(storeId, storeName) {
    loadStoreItems(storeId, storeName);
}

// Close store popup
function closeStorePopup() {
    document.getElementById('storeItemsPopup').style.display = 'none';
    currentStore = null;
    return false;
}

// Add item to pantry from store
async function addItemToPantry(storeId, itemId, itemName, unit, stock) {
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const quantity = parseInt(qtyInput?.value, 10) || 1;

    if (quantity > stock) {
        alert(`Only ${stock} ${unit} available in stock`);
        return;
    }

    if (quantity < 1) {
        alert('Quantity must be at least 1');
        return;
    }

    try {
        const user = AuthService.getUser();
        const itemData = {
            itemId: itemId,
            quantity: quantity,
            userId: user.id,
            storeId: storeId
        };

        await StoreService.addToPantry(itemData);

        const remainingStock = Number(stock) - Number(quantity);
        await decrementStoreInventory(storeId, itemId, remainingStock);

        alert(`${quantity} ${unit} of ${itemName} added to your pantry!`);

        if (currentStore && String(currentStore.id) === String(storeId)) {
            await loadStoreItems(currentStore.id, currentStore.name);
        }
    } catch (error) {
        console.error('Failed to add item to pantry:', error);
        alert('Failed to add item to pantry: ' + (error.message || 'Unknown error'));
    }
}

// Initialize stores page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('stores.html')) {
        AuthService.requireAuth();
        loadStores();
    }
});
