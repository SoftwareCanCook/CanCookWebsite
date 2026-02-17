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

// Load and display stores
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
}

// Load and display store items in popup
async function loadStoreItems(storeId) {
    if (!AuthService.isAuthenticated()) {
        alert('Please login to view store items');
        return;
    }
    
    try {
        const items = await StoreService.getStoreItems(storeId);
        const popup = document.querySelector(`#store-${storeId}`);
        
        if (popup && items.length > 0) {
            const itemsHTML = `
                <div class="store-items-grid">
                    ${items.map(item => `
                        <div class="store-item">
                            <img src="${item.imageUrl || 'apple.jpg'}" alt="${item.name}">
                            <h3>${item.name}</h3>
                            <p class="price">$${item.price.toFixed(2)}</p>
                            <p>${item.description || ''}</p>
                            <button onclick="addItemToPantry(${item.id}, '${item.name}')">
                                Add to Pantry
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Insert items after the title
            const content = popup.querySelector('.popup-content');
            const existingGrid = content.querySelector('.store-items-grid');
            if (existingGrid) {
                existingGrid.remove();
            }
            content.insertAdjacentHTML('beforeend', itemsHTML);
        }
    } catch (error) {
        console.error('Failed to load store items:', error);
        alert('Failed to load store items');
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
        loadStores();
    }
});
