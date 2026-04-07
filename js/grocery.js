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
    
    // Add a new item to the store
    static async addItem(storeId, itemData) {
        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.STORE_ITEMS + storeId + '/items', itemData);
        } catch (error) {
            console.error('Failed to add item:', error);
            throw error;
        }
    }
    
    // Update an item
    static async updateItem(storeId, itemId, itemData) {
        try {
            console.log('=== UPDATE ITEM (FULL EDIT) ===');
            console.log('Store ID:', storeId);
            console.log('Item ID:', itemId);
            console.log('Item Data:', itemData);
            const result = await ApiService.put(API_CONFIG.ENDPOINTS.STORE_ITEMS + storeId + '/items/' + itemId, itemData);
            console.log('=== UPDATE ITEM RESPONSE ===');
            console.log('Response:', result);
            console.log('Response.unit:', result.unit);
            console.log('Response.image:', result.image ? `${result.image.substring(0, 50)}...` : 'null');
            console.log('Response JSON:', JSON.stringify(result));
            return result;
        } catch (error) {
            console.error('Failed to update item:', error);
            throw error;
        }
    }
    
    // Update item quantity only
    static async updateItemQuantity(storeId, itemId, newQuantity) {
        try {
            console.log('=== UPDATE ITEM QUANTITY ===');
            console.log('Store ID:', storeId);
            console.log('Item ID:', itemId);
            console.log('New Quantity:', newQuantity);
            console.log('API URL:', API_CONFIG.ENDPOINTS.STORE_ITEMS + storeId + '/items/' + itemId);
            console.log('Request Body:', { quantity: newQuantity, stock: newQuantity });
            
            const result = await ApiService.put(API_CONFIG.ENDPOINTS.STORE_ITEMS + storeId + '/items/' + itemId, {
                quantity: newQuantity,
                stock: newQuantity
            });
            
            console.log('=== UPDATE RESPONSE ===');
            console.log('Response:', result);
            
            return result;
        } catch (error) {
            console.error('Failed to update quantity:', error);
            throw error;
        }
    }
    
    // Delete an item
    static async deleteItem(storeId, itemId) {
        try {
            return await ApiService.delete(API_CONFIG.ENDPOINTS.STORE_ITEMS + storeId + '/items/' + itemId);
        } catch (error) {
            console.error('Failed to delete item:', error);
            throw error;
        }
    }
}

// Category to unit mappings (as per requirements)
const CATEGORY_UNITS = {
    'Produce': ['lbs', 'oz', 'each', 'bunch', 'bag'],
    'Meats & Seafood': ['lbs', 'oz', 'each', 'package'],
    'Dairy': ['gallons', 'quarts', 'pints', 'oz', 'lbs', 'each'],
    'Bakery': ['each', 'package', 'dozen', 'loaf'],
    'Pantry Staples': ['lbs', 'oz', 'each', 'bag', 'box', 'can', 'bottle', 'jar']
};

const MAX_IMAGE_WIDTH = 400;
const MAX_IMAGE_HEIGHT = 400;
const IMAGE_RESIZE_PROXY = 'https://images.weserv.nl/';

function formatImageUrlTo400x400(imageUrl) {
    if (!imageUrl) return null;

    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return null;

    // Avoid re-wrapping URLs that are already using the resize proxy.
    if (trimmedUrl.startsWith(IMAGE_RESIZE_PROXY)) {
        return trimmedUrl;
    }

    const strippedProtocol = trimmedUrl.replace(/^https?:\/\//i, '');
    const resizedUrl = new URL(IMAGE_RESIZE_PROXY);
    resizedUrl.searchParams.set('url', strippedProtocol);
    resizedUrl.searchParams.set('w', String(MAX_IMAGE_WIDTH));
    resizedUrl.searchParams.set('h', String(MAX_IMAGE_HEIGHT));
    resizedUrl.searchParams.set('fit', 'cover');

    return resizedUrl.toString();
}

function getOriginalImageUrl(imageUrl) {
    if (!imageUrl) return null;

    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return null;

    if (!trimmedUrl.startsWith(IMAGE_RESIZE_PROXY)) {
        return trimmedUrl;
    }

    try {
        const proxyUrl = new URL(trimmedUrl);
        const rawUrlParam = proxyUrl.searchParams.get('url');
        if (!rawUrlParam) return trimmedUrl;

        if (/^https?:\/\//i.test(rawUrlParam)) {
            return rawUrlParam;
        }

        return `https://${rawUrlParam}`;
    } catch (error) {
        console.warn('Failed to extract original image URL from proxy URL:', error.message);
        return trimmedUrl;
    }
}

function validateImageDimensions(imageUrl) {
    return new Promise((resolve, reject) => {
        const testImage = new Image();

        testImage.onload = () => {
            const isValid = testImage.naturalWidth <= MAX_IMAGE_WIDTH && testImage.naturalHeight <= MAX_IMAGE_HEIGHT;
            resolve(isValid);
        };

        testImage.onerror = () => {
            reject(new Error('Unable to load image from URL.'));
        };

        testImage.src = imageUrl;
    });
}

// Update unit options based on category
function updateUnitOptions() {
    const category = document.getElementById('itemCategory').value;
    const unitSelect = document.getElementById('itemUnit');
    
    unitSelect.innerHTML = '<option value="">Select Unit</option>';
    
    if (category && CATEGORY_UNITS[category]) {
        CATEGORY_UNITS[category].forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            unitSelect.appendChild(option);
        });
    }
}

// Get the current grocery user's store ID
function getGroceryStoreId() {
    const user = AuthService.getUser();
    console.log('Current user:', user);
    return user ? user.store_id : null;
}

// Handle image upload
// Show item form for adding
function showItemForm() {
    document.getElementById('itemFormTitle').textContent = 'Add New Item';
    document.getElementById('itemForm').reset();
    document.getElementById('editItemId').value = '';
    document.getElementById('itemFormSection').style.display = 'block';
}

// Show item form for editing
function editItem(itemId, name, category, unit, quantity, image) {
    document.getElementById('itemFormTitle').textContent = 'Edit Item';
    document.getElementById('editItemId').value = itemId;
    document.getElementById('itemName').value = name;
    document.getElementById('itemCategory').value = category;
    updateUnitOptions();
    document.getElementById('itemUnit').value = unit;
    document.getElementById('itemQuantity').value = quantity;
    document.getElementById('itemImageUrl').value = getOriginalImageUrl(image) || '';
    document.getElementById('itemFormSection').style.display = 'block';
    
    // Scroll to form
    document.getElementById('itemFormSection').scrollIntoView({ behavior: 'smooth' });
}

// Cancel item form
function cancelItemForm() {
    document.getElementById('itemFormSection').style.display = 'none';
    document.getElementById('itemForm').reset();
}

// Save item (add or update)
async function saveItem() {
    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const unit = document.getElementById('itemUnit').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const imageUrl = document.getElementById('itemImageUrl').value.trim();
    
    // Validation
    if (!name || !category || !unit) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (isNaN(quantity) || quantity < 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const storeId = getGroceryStoreId();
    if (!storeId) {
        alert('Error: Store ID not found');
        return;
    }
    
    // Validate image URL (no base64, only http/https URLs or empty)
    if (imageUrl && !imageUrl.match(/^https?:\/\//i)) {
        alert('Please enter a valid image URL starting with http:// or https://\nOr leave blank for default image.');
        return;
    }

    const formattedImageUrl = formatImageUrlTo400x400(imageUrl);

    if (formattedImageUrl) {
        try {
            // Best-effort check only. Some remote images block client-side probing.
            await validateImageDimensions(formattedImageUrl);
        } catch (error) {
            console.warn('Image pre-validation failed, continuing with formatted URL:', error.message);
        }
    }
    
    const itemData = {
        name,
        category,
        unit,
        quantity,
        stock: quantity,
        image: imageUrl || null  // Store the original URL; resize formatting is applied on render.
    };
    
    console.log('=== SAVE ITEM CALLED ===');
    console.log('Item ID:', itemId, '(empty = new item)');
    console.log('Original image URL length:', imageUrl?.length || 0, 'chars');
    console.log('Formatted image URL length:', formattedImageUrl?.length || 0, 'chars');
    console.log('Item Data to save:', itemData);
    console.log('Item Data JSON:', JSON.stringify(itemData, null, 2));
    
    try {
        if (itemId) {
            // Update existing item
            console.log('=== CALLING UPDATE ITEM ===');
            const result = await GroceryService.updateItem(storeId, itemId, itemData);
            console.log('Update result:', result);
            alert('Item updated successfully!');
        } else {
            // Add new item
            console.log('=== CALLING ADD ITEM ===');
            await GroceryService.addItem(storeId, itemData);
            alert('Item added successfully!');
        }
        
        cancelItemForm();
        console.log('=== RELOADING ITEMS AFTER EDIT ===');
        await loadAllItems();
        console.log('=== RELOAD COMPLETE ===');
    } catch (error) {
        console.error('Failed to save item:', error);
        alert('Failed to save item: ' + error.message);
    }
}

// Load and display all items for the grocery admin's store
async function loadAllItems() {
    console.log('=== LOADING ALL ITEMS ===');
    
    if (!AuthService.requireRole(['groceryadmin'])) {
        return;
    }
    
    const storeId = getGroceryStoreId();
    console.log('Store ID:', storeId);
    
    if (!storeId) {
        const table = document.getElementById('itemsTable');
        if (table) {
            table.innerHTML = `
                <caption><strong>Store Items</strong></caption>
                <tr><td colspan="8" style="color: red;">Error: Store ID not found. Please contact an administrator to assign you to a store.</td></tr>
            `;
        }
        return;
    }
    
    try {
        // Load store details to show store name
        const storesResponse = await ApiService.get(API_CONFIG.ENDPOINTS.STORES);
        const stores = storesResponse.rows || storesResponse.data || storesResponse || [];
        const currentStore = stores.find(s => s.id == storeId);
        
        // Update page title with store name
        const contentHeader = document.querySelector('.content h1');
        if (contentHeader && currentStore) {
            contentHeader.textContent = `${currentStore.name} - Inventory Management`;
        }
        
        const response = await GroceryService.getStoreItems(storeId);
        console.log('Store items API response:', response);
        
        // Handle different response structures
        const items = response.rows || response.data || response || [];
        console.log('Parsed items array:', items);
        console.log('Number of items:', items.length);
        
        // Log each item's quantity/stock for debugging
        if (items.length > 0) {
            console.log('Sample item data:', items[0]);
        }
        
        // Group items by category for summary
        const categoryCount = {};
        items.forEach(item => {
            const cat = item.category || 'Other';
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        
        const table = document.getElementById('itemsTable');
        
        if (table) {
            // Build table HTML
            let tableHTML = '<caption><strong>Store Items Management</strong></caption>';
            
            // Show category summary
            const requiredCategories = ['Produce', 'Meats & Seafood', 'Dairy', 'Bakery', 'Pantry Staples'];
            const summary = requiredCategories.map(cat => {
                const count = categoryCount[cat] || 0;
                const color = count >= 3 ? '#4CAF50' : '#f44336';
                return `<span style=\"color: ${color}; font-weight: bold;\">${cat}: ${count}/3</span>`;
            }).join(' | ');
            
            tableHTML += `<tr><td colspan=\"6\" style=\"background-color: #f9f9f9; padding: 10px;\"><small>Category Status: ${summary}</small></td></tr>`;

            // Header row
            tableHTML += `
                <tr>
                    <th>Image</th>
                    <th>Name</th>   
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Stock</th>
                    <th>Actions</th>
                </tr>
            `;
            
            // Data rows
            if (items && items.length > 0) {
                items.forEach(item => {
                    const quantity = item.quantity || item.stock || 0;
                    const storedImageUrl = item.image || item.image_url || item.imageUrl || '';
                    const originalImageUrl = getOriginalImageUrl(storedImageUrl) || '';
                    const resizedImageUrl = formatImageUrlTo400x400(originalImageUrl);
                    const imageUrl = resizedImageUrl || originalImageUrl || 'apple.jpg';
                    const unit = item.unit || 'units';
                    
                    // Log item 2 specifically for debugging
                    if (item.id === 2) {
                        console.log(`=== RENDERING ITEM 2 (Onions) ===`);
                        console.log(`Quantity from data: ${quantity}`);
                        console.log(`Unit from data: ${unit}`);
                        console.log(`Original image from data: ${originalImageUrl ? originalImageUrl.substring(0, 50) + '...' : 'none'}`);
                        console.log(`Formatted image for render: ${imageUrl ? imageUrl.substring(0, 50) + '...' : 'none'}`);
                        console.log(`Full item JSON:`, JSON.stringify(item));
                    }
                    
                    tableHTML += `
                        <tr>
                            <td><img src=\"${imageUrl}\" data-original=\"${originalImageUrl.replace(/"/g, '&quot;')}\" alt=\"${item.name}\" onerror=\"if (this.dataset.original && this.src !== this.dataset.original) { this.src = this.dataset.original; } else { this.onerror = null; this.src = 'apple.jpg'; }\" style=\"width: 50px; height: 50px; object-fit: cover; border-radius: 4px;\"></td>
                            <td>${item.name || 'N/A'}</td>
                            <td>${item.category || 'N/A'}</td>
                            <td>${unit}</td>
                            <td>
                                <button onclick=\"updateQuantity(${item.id}, ${quantity - 1})\" style=\"padding: 2px 8px; margin: 0 2px;\">-</button>
                                <span style=\"margin: 0 10px; font-weight: bold;\">${quantity}</span>
                                <button onclick=\"updateQuantity(${item.id}, ${quantity + 1})\" style=\"padding: 2px 8px; margin: 0 2px;\">+</button>
                            </td>
                            <td>
                                <button onclick='editItem(${item.id}, \"${item.name.replace(/"/g, '&quot;')}\", \"${item.category}\", \"${unit}\", ${quantity}, \"${originalImageUrl.replace(/"/g, '&quot;')}\")' style=\"background-color: #2196F3; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px;\">Edit</button>
                                <button onclick=\"handleDeleteItem(${item.id})\" style=\"background-color: #f44336; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;\">Delete</button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tableHTML += `
                    <tr><td colspan=\"6\" style=\"text-align: center; padding: 20px;\">No items in your store yet. Add your first item using the button above!</td></tr>
                `;
            }
            
            table.innerHTML = tableHTML;
            console.log('=== TABLE HTML UPDATED ===');
            console.log(`Total rows rendered: ${items.length}`);
        }
    } catch (error) {
        console.error('Failed to load all items:', error);
        const table = document.getElementById('itemsTable');
        if (table) {
            table.innerHTML = `
                <caption><strong>Store Items</strong></caption>
                <tr><td colspan=\"6\" style=\"color: red;\">Error loading items: ${error.message}</td></tr>
            `;
        }
    }
}

// Handle updating item quantity
async function updateQuantity(itemId, newQuantity) {
    console.log('=== UPDATE QUANTITY CALLED ===');
    console.log('Item ID:', itemId);
    console.log('New Quantity:', newQuantity);
    
    if (newQuantity < 0) {
        alert('Quantity cannot be negative');
        return;
    }
    
    const storeId = getGroceryStoreId();
    console.log('Store ID from localStorage:', storeId);
    
    if (!storeId) {
        alert('Error: Store ID not found');
        return;
    }
    
    try {
        const result = await GroceryService.updateItemQuantity(storeId, itemId, newQuantity);
        console.log('Update successful, result:', result);
        
        console.log('Reloading items to verify update...');
        // Reload items to show updated quantity
        await loadAllItems();
        console.log('=== UPDATE COMPLETE ===');
    } catch (error) {
        console.error('Failed to update quantity:', error);
        alert('Failed to update quantity: ' + error.message);
    }
}

// Handle deleting an item
async function handleDeleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    const storeId = getGroceryStoreId();
    if (!storeId) {
        alert('Error: Store ID not found');
        return;
    }
    
    try {
        await GroceryService.deleteItem(storeId, itemId);
        alert('Item deleted successfully!');
        loadAllItems();
    } catch (error) {
        console.error('Failed to delete item:', error);
        alert('Failed to delete item: ' + error.message);
    }
}

// Initialize grocery page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('grocery.html')) {
        loadAllItems();
    }
});
