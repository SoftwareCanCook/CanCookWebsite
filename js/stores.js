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
}

// Open store popup and load items
async function openStorePopup(storeId) {
    if (!AuthService.isAuthenticated()) {
        alert('Please login to view store items and add to your pantry');
        return;
    }
    
    const user = AuthService.getUser();
    if (!user || user.role !== 'user') {
        alert('Only regular users can shop for pantry items');
        return;
    }
    
    try {
        // Get store details
        const storesResponse = await StoreService.getAllStores();
        const stores = storesResponse.rows || storesResponse.data || storesResponse || [];
        const store = stores.find(s => s.id == storeId);
        
        if (store) {
            currentStore = store;
            document.getElementById('storePopupTitle').textContent = store.name;
            document.getElementById('storePopupInfo').textContent = `${store.address || 'N/A'} | ${store.phone || 'N/A'}`;
        }
        
        // Get store items
        const itemsResponse = await StoreService.getStoreItems(storeId);
        const items = itemsResponse.rows || itemsResponse.data || itemsResponse || [];
        
        const itemsGrid = document.getElementById('storeItemsGrid');
        
        if (items.length > 0) {
            itemsGrid.innerHTML = items.map(item => {
                const imageUrl = item.image_url || item.imageUrl || 'apple.jpg';
                const price = parseFloat(item.price || 0);
                const stock = item.quantity || item.stock || 0;
                const unit = item.unit || 'units';
                const itemName = (item.name || '').replace(/'/g, "\\'");
                
                return `
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background: white;">
                        <img src="${imageUrl}" alt="${item.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;">
                        <h3 style="margin: 10px 0 5px; font-size: 16px;">${item.name}</h3>
                        <p style="color: #4CAF50; font-size: 18px; font-weight: bold; margin: 5px 0;">$${price.toFixed(2)}</p>
                        <p style="color: #666; font-size: 12px; margin: 5px 0;">${item.category || 'Uncategorized'}</p>
                        <p style="color: #999; font-size: 12px; margin: 5px 0;">Stock: ${stock} ${unit}</p>
                        <div style="margin-top: 10px; display: flex; gap: 5px; align-items: center; justify-content: center;">
                            <label style="font-size: 12px;">Qty:</label>
                            <input type="number" id="qty-${item.id}" value="1" min="1" max="${stock}" style="width: 50px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;">
                        </div>
                        <button onclick="addItemToPantry(${item.id}, '${itemName}', '${unit}', ${stock})" 
                                style="width: 100%; margin-top: 10px; background-color: #4CAF50; color: white; padding: 8px; border: none; border-radius: 4px; cursor: pointer;"
                                ${stock <= 0 ? 'disabled' : ''}>
                            ${stock > 0 ? 'Add to Pantry' : 'Out of Stock'}
                        </button>
                    </div>
                `;
            }).join('');
        } else {
            itemsGrid.innerHTML = '<p style="padding: 20px; text-align: center; grid-column: 1/-1;">No items available at this store yet.</p>';
        }
        
        // Show popup
        document.getElementById('storeItemsPopup').style.display = 'flex';
        
    } catch (error) {
        console.error('Failed to load store items:', error);
        alert('Failed to load store items');
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
        const user = AuthService.getUser();
        const itemData = {
            itemId: itemId,
            quantity: quantity,
            userId: user.id
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
        // Stores page is for regular users only
        if (!AuthService.requireRole(['user'])) {
            return;
        }
        loadStores();
    }
});
