// Recipe Service
class RecipeService {

    static buildCommentPayload(recipeId, userId, comment, commentId = null) {
        const numericRecipeId = Number(recipeId);
        const numericUserId = Number(userId);
        const commentText = String(comment || '').trim();

        const payload = {
            recipe_id: numericRecipeId,
            recipeId: numericRecipeId,
            user_id: numericUserId,
            userId: numericUserId,
            comment_text: commentText,
            commentText: commentText,
            comment: commentText,
            text: commentText
        };

        if (commentId !== null && commentId !== undefined) {
            payload.comment_id = Number(commentId);
            payload.commentId = Number(commentId);
            payload.id = Number(commentId);
        }

        return payload;
    }

    static buildRatingPayload(recipeId, userId, rating) {
        const numericRecipeId = Number(recipeId);
        const numericUserId = Number(userId);
        const numericRating = Math.max(1, Math.min(5, Number(rating) || 0));

        return {
            recipeId: numericRecipeId,
            recipe_id: numericRecipeId,
            userId: numericUserId,
            user_id: numericUserId,
            rating: numericRating
        };
    }

    static async getAllRecipes() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.RECIPES);
        } catch (error) {
            console.error('Failed to fetch recipes:', error);
            return [];
        }
    }

    static async getUserRecipes() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.USER_RECIPES);
        } catch (error) {
            console.error('Failed to fetch user recipes:', error);
            return [];
        }
    }

    static async getRecipeById(id) {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.RECIPE_BY_ID + id);
        } catch (error) {
            console.error('Failed to fetch recipe:', error);
            throw error;
        }
    }

    static async createRecipe(recipeData) {
        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.CREATE_RECIPE, recipeData);
        } catch (error) {
            console.error('Failed to create recipe:', error);
            throw error;
        }
    }

    static async updateRecipe(id, recipeData) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.UPDATE_RECIPE + id, recipeData);
        } catch (error) {
            console.error('Failed to update recipe:', error);
            throw error;
        }
    }

    static async deleteRecipe(id) {
        try {
            return await ApiService.delete(API_CONFIG.ENDPOINTS.DELETE_RECIPE + id);
        } catch (error) {
            console.error('Failed to delete recipe:', error);
            throw error;
        }
    }

    static async searchRecipes(query) {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.SEARCH_RECIPES, { q: query });
        } catch (error) {
            console.error('Failed to search recipes:', error);
            return [];
        }
    }

    static async sortRecipes(sortBy = 'name') {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.SORT_RECIPES, { sortBy });
        } catch (error) {
            console.error('Failed to sort recipes:', error);
            return [];
        }
    }

    static async addComment(recipeId, userId, comment) {
        const payload = this.buildCommentPayload(recipeId, userId, comment);

        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.ADD_COMMENT, {
                recipeId: payload.recipeId,
                userId: payload.userId,
                commentText: payload.commentText
            });
        } catch (error) {
            console.error('Failed to add comment (primary payload):', error);

            try {
                return await ApiService.post(API_CONFIG.ENDPOINTS.ADD_COMMENT, {
                    recipe_id: payload.recipe_id,
                    user_id: payload.user_id,
                    comment_text: payload.comment_text
                });
            } catch (retryError) {
                console.error('Failed to add comment (fallback payload):', retryError);
                throw retryError;
            }
        }
    }

    static async updateComment(commentId, recipeId, userId, comment) {
        const numericCommentId = Number(commentId);
        const payload = this.buildCommentPayload(recipeId, userId, comment, numericCommentId);

        try {
            return await ApiService.put(`${API_CONFIG.ENDPOINTS.COMMENTS}/${numericCommentId}`, {
                recipeId: payload.recipeId,
                userId: payload.userId,
                commentText: payload.commentText
            });
        } catch (error) {
            console.error('Failed to update comment by id endpoint, trying fallback:', error);

            try {
                return await ApiService.put(`${API_CONFIG.ENDPOINTS.COMMENTS}/${numericCommentId}`, {
                    recipe_id: payload.recipe_id,
                    user_id: payload.user_id,
                    comment_text: payload.comment_text
                });
            } catch (retryError) {
                console.error('Failed to update comment fallback endpoint:', retryError);
                throw retryError;
            }
        }
    }

    static async addOrUpdateRating(recipeId, userId, rating) {
        const payload = this.buildRatingPayload(recipeId, userId, rating);

        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.RATINGS, {
                recipeId: payload.recipeId,
                userId: payload.userId,
                rating: payload.rating
            });
        } catch (error) {
            console.error('Failed to submit rating (primary payload):', error);

            try {
                return await ApiService.post(API_CONFIG.ENDPOINTS.RATINGS, {
                    recipe_id: payload.recipe_id,
                    user_id: payload.user_id,
                    rating: payload.rating
                });
            } catch (retryError) {
                console.error('Failed to submit rating (fallback payload):', retryError);
                throw retryError;
            }
        }
    }
}

// Load and display all recipes
let allPublicRecipesCache = [];

function renderAllRecipes(recipes, emptyMessage = 'No public recipes available yet. Create the first one!') {
    const container = document.getElementById('allRecipesContainer');
    if (!container) {
        return;
    }

    if (recipes.length > 0) {
        container.innerHTML = recipes.map(recipe => `
            <div class="card" onclick="showRecipeDetail(${recipe.id})">
                <img src="${recipe.image_url || recipe.imageUrl || 'apple.jpg'}" alt="${recipe.name}">
                <div class="overlay-text">
                    <a href="#popup">${recipe.name}</a>
                    <div style="font-size: 12px; margin-top: 5px;">by ${recipe.username || recipe.created_by || 'Unknown'}</div>
                    <div style="font-size: 12px;">★ ${recipe.average_rating || recipe.averageRating || '0.0'}</div>
                </div>
            </div>
        `).join('');
        return;
    }

    container.innerHTML = `<p style="padding: 20px;">${emptyMessage}</p>`;
}

async function ensureAllPublicRecipesCache() {
    if (Array.isArray(allPublicRecipesCache) && allPublicRecipesCache.length > 0) {
        return allPublicRecipesCache;
    }

    const response = await RecipeService.getAllRecipes();
    let recipes = response.rows || response.data || response || [];
    recipes = Array.isArray(recipes) ? recipes : [];

    allPublicRecipesCache = recipes.filter(recipe => {
        const isPublic = recipe.is_public !== undefined ? recipe.is_public : recipe.isPublic;
        return isPublic === true || isPublic === 1 || isPublic === '1' || isPublic === 'true';
    });

    return allPublicRecipesCache;
}

function matchesRecipeQuery(recipe, query) {
    const name = (recipe.name || '').toString().toLowerCase();
    const ingredientsSource = recipe.ingredients
        ?? recipe.ingredients_text
        ?? recipe.ingredient_list
        ?? recipe.ingredientList
        ?? recipe.recipe_ingredients
        ?? recipe.recipeIngredients
        ?? [];

    const ingredientLines = normalizeRecipeList(ingredientsSource).map(ing => {
        if (typeof ing === 'string') {
            return ing;
        }
        if (ing && typeof ing === 'object') {
            return [
                ing.name,
                ing.item_name,
                ing.ingredient_name,
                ing.itemName
            ].filter(Boolean).join(' ');
        }
        return String(ing || '');
    });

    const ingredientsText = ingredientLines.join(' ').toLowerCase();
    return name.includes(query) || ingredientsText.includes(query);
}

function filterRecipesByQuery(recipes, query) {
    if (!Array.isArray(recipes)) {
        return [];
    }

    const normalizedQuery = String(query || '').trim().toLowerCase();
    if (!normalizedQuery) {
        return recipes;
    }

    return recipes.filter(recipe => {
        const name = (recipe.name || '').toString().toLowerCase();
        const ingredientsText = normalizeRecipeList(
            recipe.ingredients
            ?? recipe.ingredients_text
            ?? recipe.ingredient_list
            ?? recipe.ingredientList
            ?? recipe.recipe_ingredients
            ?? recipe.recipeIngredients
            ?? []
        ).join(' ').toLowerCase();

        return name.includes(normalizedQuery) || ingredientsText.includes(normalizedQuery);
    });
}

async function loadAllRecipes() {
    try {
        const response = await RecipeService.getAllRecipes();
        console.log('All recipes response:', response);

        let recipes = response.rows || response.data || response || [];
        recipes = Array.isArray(recipes) ? recipes : [];

        recipes = recipes.filter(recipe => {
            const isPublic = recipe.is_public !== undefined ? recipe.is_public : recipe.isPublic;
            return isPublic === true || isPublic === 1 || isPublic === '1' || isPublic === 'true';
        });

        allPublicRecipesCache = [...recipes];
        renderAllRecipes(allPublicRecipesCache);
    } catch (error) {
        console.error('Failed to load all recipes:', error);
        const container = document.getElementById('allRecipesContainer');
        if (container) {
            container.innerHTML = '<p style="padding: 20px; color: red;">Error loading recipes</p>';
        }
    }
}

// Load and display user's recipes
let userRecipesCache = [];

function renderUserRecipes(recipes, options = {}) {
    const { hideHeaderWhenEmpty = true, emptyMessage = '' } = options;
    const container = document.getElementById('userRecipesContainer');
    const header = document.getElementById('yourRecipesHeader');
    const userSearchForm = document.getElementById('userSearchForm');

    if (!container) {
        return;
    }

    if (recipes.length > 0) {
        if (header) header.style.display = 'block';
        if (userSearchForm) userSearchForm.style.display = 'flex';
        container.innerHTML = recipes.map(recipe => `
            <div class="card" onclick="showRecipeDetail(${recipe.id})">
                <img src="${recipe.image_url || recipe.imageUrl || recipe.image || 'apple.jpg'}" alt="${recipe.name}">
                <div class="overlay-text">
                    <a href="#popup">${recipe.name}</a>
                    <div style="font-size: 12px; margin-top: 5px;">${(recipe.is_public !== undefined ? recipe.is_public : recipe.isPublic) ? 'Public' : 'Private'}</div>
                </div>
            </div>
        `).join('');
        return;
    }

    if (hideHeaderWhenEmpty) {
        if (header) header.style.display = 'none';
        if (userSearchForm) userSearchForm.style.display = 'none';
        container.innerHTML = '';
    } else {
        if (header) header.style.display = 'block';
        if (userSearchForm) userSearchForm.style.display = 'flex';
        container.innerHTML = emptyMessage || '<p style="padding: 20px;">No matching recipes found.</p>';
    }
}

async function loadUserRecipes() {
    if (!AuthService.isAuthenticated()) {
        return;
    }
    
    const user = AuthService.getUser();
    if (!user || user.role !== 'user') {
        return;
    }
    
    const container = document.getElementById('userRecipesContainer');
    const header = document.getElementById('yourRecipesHeader');
    if (!container) {
        return;
    }

    const isOwnedByUser = (recipe) => {
        const ownerId = recipe.user_id ?? recipe.userId ?? recipe.owner_id ?? recipe.ownerId;
        const ownerName = (recipe.username || recipe.created_by || recipe.owner || '').toString().toLowerCase();
        const currentUserId = user.id ?? user.userId;
        const currentUsername = (user.username || user.name || '').toString().toLowerCase();

        return String(ownerId) === String(currentUserId) || (!!currentUsername && ownerName === currentUsername);
    };

    try {
        let response;
        let recipes = [];

        try {
            response = await RecipeService.getUserRecipes();
            const fromUserEndpoint = response.rows || response.data || response || [];
            recipes = Array.isArray(fromUserEndpoint) ? fromUserEndpoint : [];
        } catch (userEndpointError) {
            console.warn('User recipes endpoint failed, using fallback owner filter:', userEndpointError);
        }

        // Fallback: build "Your Recipes" from all recipes and keep only current user's entries
        if (recipes.length === 0) {
            const allResponse = await RecipeService.getAllRecipes();
            const allRecipes = allResponse.rows || allResponse.data || allResponse || [];
            const allRecipesArray = Array.isArray(allRecipes) ? allRecipes : [];
            recipes = allRecipesArray.filter(isOwnedByUser);
        }

        userRecipesCache = recipes;
        renderUserRecipes(recipes);
    } catch (error) {
        console.error('Failed to load user recipes:', error);
    }
}

// Store current recipe ID for edit/delete operations
let currentRecipeId = null;
let currentRecipeData = null;
let currentUserCommentId = null;
let recipePantryItemsCache = [];
const selectedPantryIngredients = new Map();

function normalizeRecipeList(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (value === null || value === undefined) {
        return [];
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (parsed && typeof parsed === 'object') {
                return Object.values(parsed);
            }
        } catch (e) {
            // Not JSON; treat as newline-delimited text
        }

        return trimmed.split('\n').map(line => line.trim()).filter(Boolean);
    }

    if (typeof value === 'object') {
        return Object.values(value).filter(item => item !== null && item !== undefined);
    }

    return [];
}

const RECIPE_INGREDIENTS_CACHE_KEY = 'cancookRecipeIngredientsCache';

// Grocery items cache for ingredient name → itemId matching
let _groceryItemsCache = null;

async function fetchGroceryItems() {
    if (_groceryItemsCache) return _groceryItemsCache;
    const allItems = [];
    for (const storeId of [1, 2, 3]) {
        try {
            const items = await ApiService.get(`${API_CONFIG.ENDPOINTS.STORE_ITEMS}${storeId}/items`);
            const arr = Array.isArray(items) ? items : (items.data || items.rows || []);
            allItems.push(...arr);
        } catch (e) { /* store may not have items */ }
    }
    // Deduplicate by lowercase name — keep lowest id (store 1 first)
    const seen = new Set();
    _groceryItemsCache = allItems.filter(item => {
        const key = (item.name || '').toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return _groceryItemsCache;
}

const KNOWN_UNITS = new Set([
    'cup','cups','tsp','teaspoon','teaspoons','tbsp','tablespoon','tablespoons',
    'lb','lbs','pound','pounds','oz','ounce','ounces','ml','l','liter','liters',
    'g','gram','grams','kg','kilogram','kilograms','whole','each','clove','cloves',
    'slice','slices','bunch','can','cans','bottle','bottles','jar','jars',
    'pint','pints','quart','quarts','gallon','gallons','dozen','head','heads',
    'carton','cartons'
]);

function parseIngredientLine(line) {
    const parts = line.trim().split(/\s+/);
    let idx = 0;
    let quantity = 1;
    let unit = 'whole';

    if (idx < parts.length && /^\d+(\.\d+)?$|^\d+\/\d+$/.test(parts[idx])) {
        const raw = parts[idx];
        quantity = raw.includes('/') ? (parseInt(raw) / parseInt(raw.split('/')[1])) : parseFloat(raw);
        idx++;
    }
    if (idx < parts.length && KNOWN_UNITS.has(parts[idx].toLowerCase())) {
        unit = parts[idx];
        idx++;
    }
    const ingredientName = parts.slice(idx).join(' ').trim();
    return { quantity, unit, ingredientName };
}

function matchIngredientToItem(line, groceryItems) {
    const { quantity, unit, ingredientName } = parseIngredientLine(line);
    if (!ingredientName) return null;
    const nameLower = ingredientName.toLowerCase();
    const matched = groceryItems.find(item => {
        const itemName = (item.name || '').toLowerCase();
        return itemName === nameLower ||
               itemName.includes(nameLower) ||
               nameLower.includes(itemName);
    });
    if (!matched) return null;
    return {
        itemId: matched.id,
        quantityNeeded: quantity,
        measurementUnit: unit || matched.unit || 'whole',
        name: matched.name
    };
}

function resolveIngredientName(ing) {
    // Prefer explicit name fields first
    if (ing.name || ing.item_name || ing.ingredient_name || ing.itemName) {
        return ing.name || ing.item_name || ing.ingredient_name || ing.itemName;
    }
    // Fall back to looking up itemId in cache
    if (_groceryItemsCache && (ing.itemId || ing.item_id)) {
        const id = ing.itemId || ing.item_id;
        const found = _groceryItemsCache.find(g => g.id === id);
        if (found) return found.name;
    }
    return '';
}

function readRecipeIngredientsCache() {
    try {
        const raw = localStorage.getItem(RECIPE_INGREDIENTS_CACHE_KEY);
        if (!raw) {
            return { byId: {}, byUserAndName: {} };
        }
        const parsed = JSON.parse(raw);
        return {
            byId: parsed?.byId || {},
            byUserAndName: parsed?.byUserAndName || {}
        };
    } catch (error) {
        return { byId: {}, byUserAndName: {} };
    }
}

function writeRecipeIngredientsCache(cache) {
    localStorage.setItem(RECIPE_INGREDIENTS_CACHE_KEY, JSON.stringify(cache));
}

function saveRecipeIngredientsToCache({ recipeId, userId, recipeName, ingredientsText }) {
    const text = String(ingredientsText || '').trim();
    if (!text) {
        return;
    }

    const cache = readRecipeIngredientsCache();

    if (recipeId !== undefined && recipeId !== null && String(recipeId).trim() !== '') {
        cache.byId[String(recipeId)] = text;
    }

    if (userId !== undefined && userId !== null && recipeName) {
        const key = `${String(userId)}::${String(recipeName).trim().toLowerCase()}`;
        cache.byUserAndName[key] = text;
    }

    writeRecipeIngredientsCache(cache);
}

function getCachedRecipeIngredients(recipe, currentUser) {
    const cache = readRecipeIngredientsCache();

    const recipeId = recipe?.id ?? recipe?.recipe_id;
    if (recipeId !== undefined && recipeId !== null) {
        const byId = cache.byId[String(recipeId)];
        if (byId) {
            return byId;
        }
    }

    const ownerId = recipe?.user_id ?? recipe?.userId ?? currentUser?.id ?? currentUser?.userId;
    const recipeName = (recipe?.name || '').toString().trim().toLowerCase();
    if (ownerId !== undefined && ownerId !== null && recipeName) {
        const key = `${String(ownerId)}::${recipeName}`;
        return cache.byUserAndName[key] || '';
    }

    return '';
}

async function fetchUserPantryItemsForRecipeForm() {
    let pantryResponse;
    try {
        pantryResponse = await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY_ITEMS);
    } catch (itemsError) {
        console.warn('Pantry items endpoint failed for recipe picker, retrying with /pantry:', itemsError);
        pantryResponse = await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY);
    }

    const pantryItemsRaw = pantryResponse.rows || pantryResponse.data || pantryResponse.items || pantryResponse || [];
    const pantryItems = Array.isArray(pantryItemsRaw) ? pantryItemsRaw : [];

    let groceryItems = [];
    try {
        groceryItems = await fetchGroceryItems();
    } catch (error) {
        console.warn('Could not fetch grocery metadata for pantry picker:', error);
    }

    const groceryById = new Map(groceryItems.map(item => [String(item.id), item]));

    return pantryItems
        .map(row => {
            const pantryRowId = row.id;
            const itemId = row.itemId ?? row.item_id ?? row.itemID;
            const lookup = groceryById.get(String(itemId)) || {};
            const quantity = Number(row.quantity ?? 0);
            return {
                pantryRowId,
                itemId,
                quantity,
                name: row.name || row.item_name || row.itemName || lookup.name || `Item #${itemId}`,
                unit: row.unit || lookup.unit || 'units'
            };
        })
        .filter(item => item.pantryRowId !== undefined && item.pantryRowId !== null && item.quantity > 0);
}

function renderRecipePantryPicker() {
    const picker = document.getElementById('recipePantryPicker');
    if (!picker) {
        return;
    }

    if (recipePantryItemsCache.length === 0) {
        picker.innerHTML = '<p style="margin: 0; color: #666;">No pantry items available. Add items in Stores first.</p>';
        return;
    }

    picker.innerHTML = recipePantryItemsCache.map(item => {
        const selected = selectedPantryIngredients.get(String(item.pantryRowId));
        const selectedQty = selected?.quantity || 0;
        const remaining = Math.max(0, Number(item.quantity) - Number(selectedQty));
        const maxValue = Math.max(1, remaining);

        return `
            <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee; padding: 8px 4px;">
                <div style="flex: 1;">
                    <strong>${item.name}</strong>
                    <div style="font-size: 12px; color: #666;">Available: ${item.quantity} ${item.unit}${selectedQty > 0 ? ` • Selected: ${selectedQty}` : ''}</div>
                </div>
                <input id="recipe-pantry-qty-${item.pantryRowId}" type="number" min="1" max="${maxValue}" value="1" style="width: 70px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;" ${remaining === 0 ? 'disabled' : ''}>
                <button type="button" onclick="addPantryIngredientToRecipe(${item.pantryRowId})" style="background-color: #2196F3; color: white; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;" ${remaining === 0 ? 'disabled' : ''}>Use in Recipe</button>
            </div>
        `;
    }).join('');
}

async function loadRecipePantryPicker() {
    const picker = document.getElementById('recipePantryPicker');
    if (!picker) {
        return;
    }

    picker.innerHTML = '<p style="margin: 0; color: #666;">Loading pantry items...</p>';

    try {
        recipePantryItemsCache = await fetchUserPantryItemsForRecipeForm();
        renderRecipePantryPicker();
    } catch (error) {
        console.error('Failed to load pantry picker for recipe form:', error);
        picker.innerHTML = '<p style="margin: 0; color: #d32f2f;">Failed to load pantry items.</p>';
    }
}

function addPantryIngredientToRecipe(pantryRowId) {
    const pantryItem = recipePantryItemsCache.find(item => String(item.pantryRowId) === String(pantryRowId));
    if (!pantryItem) {
        alert('Pantry item not found. Please reload and try again.');
        return;
    }

    const qtyInput = document.getElementById(`recipe-pantry-qty-${pantryRowId}`);
    const requestedQty = Number.parseFloat(qtyInput?.value || '1');
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
        alert('Enter a valid quantity greater than 0.');
        return;
    }

    const currentSelected = selectedPantryIngredients.get(String(pantryRowId));
    const alreadySelectedQty = Number(currentSelected?.quantity || 0);
    const nextSelectedQty = alreadySelectedQty + requestedQty;
    if (nextSelectedQty > Number(pantryItem.quantity)) {
        alert(`You only have ${pantryItem.quantity} ${pantryItem.unit} available in your pantry.`);
        return;
    }

    selectedPantryIngredients.set(String(pantryRowId), {
        pantryRowId: pantryItem.pantryRowId,
        itemId: pantryItem.itemId,
        quantity: nextSelectedQty,
        unit: pantryItem.unit,
        name: pantryItem.name
    });

    const ingredientsTextarea = document.getElementById('recipeFormIngredients');
    if (ingredientsTextarea) {
        const line = `${requestedQty} ${pantryItem.unit} ${pantryItem.name}`.replace(/\s+/g, ' ').trim();
        const currentText = ingredientsTextarea.value.trim();
        ingredientsTextarea.value = currentText ? `${currentText}\n${line}` : line;
    }

    renderRecipePantryPicker();
}

function resetRecipePantrySelection() {
    selectedPantryIngredients.clear();
}

async function consumeSelectedPantryIngredients(userId) {
    if (selectedPantryIngredients.size === 0) {
        return;
    }

    const latestPantryItems = await fetchUserPantryItemsForRecipeForm();
    const latestByRowId = new Map(latestPantryItems.map(item => [String(item.pantryRowId), item]));

    for (const selection of selectedPantryIngredients.values()) {
        const pantryRow = latestByRowId.get(String(selection.pantryRowId));
        if (!pantryRow) {
            throw new Error(`Pantry item "${selection.name}" was not found anymore.`);
        }

        const requested = Number(selection.quantity || 0);
        const available = Number(pantryRow.quantity || 0);
        if (requested > available) {
            throw new Error(`Not enough ${selection.name} in pantry. Requested ${requested}, available ${available}.`);
        }

        const remaining = available - requested;
        if (remaining <= 0) {
            await ApiService.delete(API_CONFIG.ENDPOINTS.REMOVE_PANTRY_ITEM + pantryRow.pantryRowId);
        } else {
            await ApiService.put(API_CONFIG.ENDPOINTS.REMOVE_PANTRY_ITEM + pantryRow.pantryRowId, {
                quantity: remaining,
                userId,
                itemId: pantryRow.itemId
            });
        }
    }
}

function isRecipeOwnedByUser(recipe, user) {
    if (!recipe || !user) {
        return false;
    }

    const recipeOwnerId = recipe.user_id ?? recipe.userId ?? recipe.owner_id ?? recipe.ownerId ?? recipe.created_by_id ?? recipe.createdById;
    const userId = user.id ?? user.userId;

    if (recipeOwnerId !== undefined && userId !== undefined && String(recipeOwnerId) === String(userId)) {
        return true;
    }

    const recipeOwnerName = (recipe.username || recipe.created_by || recipe.owner || '').toString().trim().toLowerCase();
    const currentUsername = (user.username || user.name || '').toString().trim().toLowerCase();

    return !!recipeOwnerName && !!currentUsername && recipeOwnerName === currentUsername;
}

function isCommentOwnedByUser(comment, user) {
    if (!comment || !user) {
        return false;
    }

    const commentUserId = comment.user_id ?? comment.userId ?? comment.author_id ?? comment.authorId;
    const currentUserId = user.id ?? user.userId;

    if (commentUserId !== undefined && currentUserId !== undefined && String(commentUserId) === String(currentUserId)) {
        return true;
    }

    const commentUsername = (comment.username || comment.user_name || comment.author || comment.created_by || '').toString().trim().toLowerCase();
    const currentUsername = (user.username || user.name || '').toString().trim().toLowerCase();

    return !!commentUsername && !!currentUsername && commentUsername === currentUsername;
}

function getCommentId(comment) {
    return comment.id ?? comment.comment_id ?? comment.commentId;
}

// Show recipe detail in popup
async function showRecipeDetail(recipeId) {
    try {
        const response = await RecipeService.getRecipeById(recipeId);
        const rawRecipePayload = response.recipe ?? response.data ?? response;
        let recipe = Array.isArray(rawRecipePayload) ? (rawRecipePayload[0] || {}) : (rawRecipePayload || {});

        // Ingredients can come from separate keys or from joined row arrays
        const responseIngredients = response.ingredients
            ?? response.recipe_ingredients
            ?? response.recipeIngredients
            ?? response.data?.ingredients
            ?? response.data?.recipe_ingredients
            ?? response.data?.recipeIngredients;

        const combinedIngredients = responseIngredients ?? (Array.isArray(rawRecipePayload) ? rawRecipePayload : undefined);
        if (combinedIngredients !== undefined && recipe.ingredients === undefined && recipe.ingredients_text === undefined) {
            recipe = {
                ...recipe,
                ingredients: combinedIngredients
            };
        }
        
        currentRecipeId = recipeId;
        currentRecipeData = recipe;
        
        console.log('Recipe detail:', recipe);
        
        // Check if user can view this recipe
        const currentUser = AuthService.getUser();
        const isPublic = recipe.is_public !== undefined ? recipe.is_public : recipe.isPublic;
        const isOwner = isRecipeOwnedByUser(recipe, currentUser);
        
        // If recipe is private and user is not the owner, deny access
        if (!isPublic && !isOwner) {
            alert('This recipe is private and you do not have permission to view it.');
            return;
        }
        
        // Update popup content (support both legacy and current popup markup)
        const recipeImageEl = document.getElementById('recipeImage') || document.querySelector('#popup .recipe-image img');
        const recipeNameEl = document.getElementById('recipeName') || document.getElementById('name');
        const recipeCreatorEl = document.getElementById('recipeCreator');
        const recipeCookTimeEl = document.getElementById('recipeCookTime') || document.getElementById('cookTime');
        const recipeVisibilityEl = document.getElementById('recipeVisibility');

        if (recipeImageEl) {
            const recipeImageSrc = recipe.image_url
                || recipe.imageUrl
                || recipe.image
                || response.image_url
                || response.imageUrl
                || response.image
                || 'apple.jpg';
            recipeImageEl.src = recipeImageSrc;
        }
        if (recipeNameEl) {
            recipeNameEl.textContent = recipe.name || 'Untitled Recipe';
        }
        if (recipeCreatorEl) {
            recipeCreatorEl.textContent = recipe.username || recipe.created_by || 'Unknown';
        }
        if (recipeCookTimeEl) {
            recipeCookTimeEl.textContent = recipe.cook_time || recipe.cookTime || 'N/A';
        }
        if (recipeVisibilityEl) {
            recipeVisibilityEl.textContent = (recipe.is_public || recipe.isPublic) ? 'Public' : 'Private';
        }
        
        // Update rating
        const avgRating = parseFloat(recipe.average_rating || recipe.averageRating || 0);
        const ratingCount = parseInt(recipe.rating_count || recipe.ratingCount || 0);
        const ratingEl = document.getElementById('rating') || document.getElementById('averageRating');
        const ratingCountEl = document.getElementById('ratingCount');
        if (ratingEl) {
            ratingEl.textContent = avgRating.toFixed(1);
        }
        if (ratingCountEl) {
            ratingCountEl.textContent = `(${ratingCount} rating${ratingCount !== 1 ? 's' : ''})`;
        }
        
        const stars = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));
        const recipeStarsEl = document.getElementById('recipeStars') || document.getElementById('stars');
        if (recipeStarsEl) {
            recipeStarsEl.textContent = stars;
        }
        
        // Update ingredients
        const ingredientsSource = recipe.ingredients
            ?? recipe.ingredients_text
            ?? recipe.ingredient_list
            ?? recipe.ingredientList
            ?? recipe.recipe_ingredients
            ?? recipe.recipeIngredients
            ?? recipe.ingredient
            ?? [];
        // Pre-fetch grocery items so we can resolve itemId → name in display
        fetchGroceryItems().catch(() => {});

        let ingredients = normalizeRecipeList(ingredientsSource);
        if (ingredients.length === 0) {
            const cachedIngredients = getCachedRecipeIngredients(recipe, currentUser);
            ingredients = normalizeRecipeList(cachedIngredients);
        }
        const ingredientsList = document.getElementById('ingredientsList');
        if (ingredientsList && ingredients.length > 0) {
            ingredientsList.innerHTML = ingredients.map(ing => {
                if (typeof ing === 'string') {
                    return `<li>${ing}</li>`;
                } else {
                    const quantity = ing.quantityNeeded ?? ing.quantity ?? ing.quantity_needed ?? '';
                    const unit = ing.measurementUnit ?? ing.unit ?? ing.measurement_unit ?? '';
                    const name = resolveIngredientName(ing);
                    const formatted = `${quantity} ${unit} ${name}`.trim();
                    const fallbackText = formatted || Object.values(ing).filter(v => v !== null && v !== undefined).join(' ').trim();
                    return `<li>${fallbackText}</li>`;
                }
            }).join('');
        } else if (ingredientsList) {
            ingredientsList.innerHTML = '<li>No ingredients listed</li>';
        }
        
        // Update instructions
        const instructions = normalizeRecipeList(recipe.instructions);
        const instructionsList = document.getElementById('instructionsList');
        if (instructionsList && instructions.length > 0) {
            instructionsList.innerHTML = instructions.map((inst, index) => {
                let text = typeof inst === 'string' ? inst : inst?.step_text || inst?.instruction || String(inst || '');
                
                // Parse timer patterns [timer:15m] or [timer:2h30m]
                const timerPattern = /\[timer:(\d+h)?(\d+m)?\]/gi;
                text = text.replace(timerPattern, (match, hours, minutes) => {
                    const h = hours ? parseInt(hours) : 0;
                    const m = minutes ? parseInt(minutes) : 0;
                    const totalMinutes = h * 60 + m;
                    const timerLabel = hours ? `${h}${minutes ? ':' + m : 'h'}` : `${m}m`;
                    return `<button onclick="startTimer(${totalMinutes}, 'Step ${index + 1}')" style="background-color: #FF5722; color: white; padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 5px;">⏱ ${timerLabel}</button>`;
                });
                
                // Legacy timer support
                const timer = (typeof inst === 'object' && inst?.timer) ? ` <button onclick="startTimer(${inst.timer}, 'Step ${index + 1}')" style="background-color: #FF5722; color: white; padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">⏱ ${inst.timer}m</button>` : '';
                return `<li>${text}${timer}</li>`;
            }).join('');
        } else if (instructionsList) {
            instructionsList.innerHTML = '<li>No instructions listed</li>';
        }
        
        // Show edit/delete buttons if user owns this recipe
        const user = AuthService.getUser();
        const recipeActions = document.getElementById('recipeActions');
        if (recipeActions) {
            if (isRecipeOwnedByUser(recipe, user)) {
                recipeActions.style.display = 'block';
                const privacyBtn = document.getElementById('privacyToggleBtn');
                if (privacyBtn) {
                    privacyBtn.textContent = (recipe.is_public || recipe.isPublic) ? 'Make Private' : 'Make Public';
                }
            } else {
                recipeActions.style.display = 'none';
            }
        }
        
        // Show/hide add comment form
        const addCommentForm = document.getElementById('addCommentForm');
        const commentSubmitBtn = document.getElementById('commentSubmitBtn');
        const commentRatingEl = document.getElementById('commentRating');
        const commentTextEl = document.getElementById('commentText');
        if (addCommentForm) {
            if (user && user.role === 'user') {
                addCommentForm.style.display = 'block';
            } else {
                addCommentForm.style.display = 'none';
            }
        }
        
        // Update comments
        const comments = normalizeRecipeList(recipe.comments);
        const commentsList = document.getElementById('commentsList');
        if (commentsList && comments.length > 0) {
            // Sort comments by most recent first
            comments.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
            
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <strong>${comment.username || 'Anonymous'}</strong>
                        <span class="stars">${'★'.repeat(Math.max(0, Math.min(5, Number(comment.rating) || 0)))}${'☆'.repeat(5 - Math.max(0, Math.min(5, Number(comment.rating) || 0)))}</span>
                        <span style="color: #666; font-size: 12px; margin-left: 10px;">${new Date(comment.created_at || comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p>${comment.comment_text || comment.text || comment.comment}</p>
                </div>
            `).join('');
        } else if (commentsList) {
            commentsList.innerHTML = '<p>No comments yet. Be the first to leave a review!</p>';
        }

        currentUserCommentId = null;
        if (user && user.role === 'user' && comments.length > 0) {
            const currentUserComment = comments.find(comment => isCommentOwnedByUser(comment, user));
            if (currentUserComment) {
                currentUserCommentId = getCommentId(currentUserComment);
                if (commentRatingEl) {
                    const safeRating = Math.max(1, Math.min(5, Number(currentUserComment.rating) || 5));
                    commentRatingEl.value = String(safeRating);
                }
                if (commentTextEl) {
                    commentTextEl.value = currentUserComment.comment_text || currentUserComment.text || currentUserComment.comment || '';
                }
                if (commentSubmitBtn) {
                    commentSubmitBtn.textContent = 'Update Review';
                }
            } else {
                if (commentRatingEl) {
                    commentRatingEl.value = '5';
                }
                if (commentTextEl) {
                    commentTextEl.value = '';
                }
                if (commentSubmitBtn) {
                    commentSubmitBtn.textContent = 'Submit Review';
                }
            }
        } else if (commentSubmitBtn) {
            commentSubmitBtn.textContent = 'Submit Review';
        }
        
        // Show the popup
        document.getElementById('popup').style.display = 'flex';
    } catch (error) {
        console.error('Failed to load recipe details:', error);
        alert('Failed to load recipe details: ' + error.message);
    }
}

// Handle search form
async function handleSearch(event) {
    if (event) {
        event.preventDefault();
    }
    const searchForm = document.getElementById('searchForm');
    const searchInput = searchForm ? searchForm.querySelector('#site-search') : null;
    const searchQuery = (searchInput?.value || '').trim();

    if (!searchQuery) {
        renderAllRecipes(allPublicRecipesCache);
        return;
    }

    try {
        await ensureAllPublicRecipesCache();

        const filtered = filterRecipesByQuery(allPublicRecipesCache, searchQuery);
        renderAllRecipes(filtered, 'No recipes found matching your search.');
    } catch (error) {
        console.error('All recipes search failed:', error);
        renderAllRecipes([], 'Search failed. Please try again.');
    }
}

// Clear search and reload all recipes
function clearSearch() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = searchForm ? searchForm.querySelector('#site-search') : null;
    if (searchInput) {
        searchInput.value = '';
    }

    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.value = '';
    }

    renderAllRecipes(allPublicRecipesCache);
}

function clearUserRecipesSearch() {
    const input = document.getElementById('user-recipes-search');
    if (input) {
        input.value = '';
    }
    renderUserRecipes(userRecipesCache);
}

function handleUserRecipesSearch(event) {
    if (event) {
        event.preventDefault();
    }

    const query = (document.getElementById('user-recipes-search')?.value || '').trim().toLowerCase();
    if (!query) {
        renderUserRecipes(userRecipesCache);
        return;
    }

    const filtered = filterRecipesByQuery(userRecipesCache, query);

    renderUserRecipes(filtered, {
        hideHeaderWhenEmpty: false,
        emptyMessage: '<p style="padding: 20px;">No your-recipe results found.</p>'
    });
}

// Handle sort dropdown
async function handleSort() {
    const sortBy = document.getElementById('sortBy').value;
    
    if (!sortBy) {
        loadAllRecipes();
        return;
    }
    
    try {
        const response = await RecipeService.sortRecipes(sortBy);
        const recipes = response.rows || response.data || response || [];
        const container = document.getElementById('allRecipesContainer');
        
        if (container && recipes.length > 0) {
            container.innerHTML = recipes.map(recipe => `
                <div class="card" onclick="showRecipeDetail(${recipe.id})">
                    <img src="${recipe.image_url || recipe.imageUrl || 'apple.jpg'}" alt="${recipe.name}">
                    <div class="overlay-text">
                        <a href="#popup">${recipe.name}</a>
                        <div style="font-size: 12px; margin-top: 5px;">by ${recipe.username || 'Unknown'}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Sort failed:', error);
    }
}

// Show create recipe form
function showCreateRecipeForm() {
    document.getElementById('recipeFormTitle').textContent = 'Create New Recipe';
    document.getElementById('recipeForm').reset();
    document.getElementById('recipeFormId').value = '';
    document.getElementById('pantryCheckResult').style.display = 'none';
    resetRecipePantrySelection();
    loadRecipePantryPicker();
    document.getElementById('recipeFormPopup').style.display = 'flex';
}

// Close recipe form
function closeRecipeForm() {
    document.getElementById('recipeFormPopup').style.display = 'none';
    resetRecipePantrySelection();
}

// Close recipe popup
function closeRecipePopup() {
    document.getElementById('popup').style.display = 'none';
    currentRecipeId = null;
    currentRecipeData = null;
    currentUserCommentId = null;
}

// Edit current recipe
function editRecipe() {
    if (!currentRecipeData) {
        alert('No recipe data available');
        return;
    }
    
    // Populate form with current recipe data
    document.getElementById('recipeFormTitle').textContent = 'Edit Recipe';
    document.getElementById('recipeFormId').value = currentRecipeId;
    document.getElementById('recipeFormName').value = currentRecipeData.name;
    document.getElementById('recipeFormImage').value = currentRecipeData.image || currentRecipeData.image_url || currentRecipeData.imageUrl || '';
    document.getElementById('recipeFormCookTime').value = currentRecipeData.cook_time || currentRecipeData.cookTime || '';
    document.getElementById('recipeFormVisibility').value = (currentRecipeData.is_public !== undefined ? currentRecipeData.is_public : currentRecipeData.isPublic) ? 'public' : 'private';

    const ingredientsSource = currentRecipeData.ingredients
        ?? currentRecipeData.ingredients_text
        ?? currentRecipeData.ingredient_list
        ?? currentRecipeData.ingredientList
        ?? currentRecipeData.ingredient
        ?? getCachedRecipeIngredients(currentRecipeData, AuthService.getUser())
        ?? '';
    document.getElementById('recipeFormIngredients').value = normalizeRecipeList(ingredientsSource).join('\n');

    // instructions is often a plain newline-delimited string from the backend
    document.getElementById('recipeFormInstructions').value = currentRecipeData.instructions || '';
    resetRecipePantrySelection();
    loadRecipePantryPicker();
    
    // Close popup and show form
    closeRecipePopup();
    document.getElementById('recipeFormPopup').style.display = 'flex';
}

// Delete current recipe
async function deleteRecipe() {
    if (!currentRecipeId) {
        alert('No recipe selected');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
        return;
    }
    
    try {
        await RecipeService.deleteRecipe(currentRecipeId);
        alert('Recipe deleted successfully');
        closeRecipePopup();
        loadAllRecipes();
        loadUserRecipes();
    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete recipe: ' + error.message);
    }
}

// Toggle recipe privacy
async function toggleRecipePrivacy() {
    if (!currentRecipeId || !currentRecipeData) {
        alert('No recipe selected');
        return;
    }
    
    const currentVisibility = currentRecipeData.is_public || currentRecipeData.isPublic;
    const newVisibility = !currentVisibility;
    
    try {
        await RecipeService.updateRecipe(currentRecipeId, {
            is_public: newVisibility,
            isPublic: newVisibility
        });
        alert(`Recipe is now ${newVisibility ? 'public' : 'private'}`);
        // Reload current recipe and refresh list sections
        await showRecipeDetail(currentRecipeId);
        await loadAllRecipes();
        await loadUserRecipes();
    } catch (error) {
        console.error('Privacy toggle failed:', error);
        alert('Failed to update recipe privacy: ' + error.message);
    }
}

// Check pantry for required ingredients
async function checkPantryIngredients() {
    const ingredientsText = document.getElementById('recipeFormIngredients').value;
    const resultDiv = document.getElementById('pantryCheckResult');
    
    if (!ingredientsText.trim()) {
        resultDiv.style.display = 'block';
        resultDiv.style.backgroundColor = '#ffebee';
        resultDiv.innerHTML = 'Please enter ingredients first.';
        return;
    }
    
    try {
        // Get user's pantry items (support both /pantry/items and /pantry backend styles)
        let pantryResponse;
        try {
            pantryResponse = await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY_ITEMS);
        } catch (itemsError) {
            console.warn('Pantry items endpoint failed, retrying with /pantry:', itemsError);
            pantryResponse = await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY);
        }

        const pantryItemsRaw = pantryResponse.rows || pantryResponse.data || pantryResponse.items || pantryResponse || [];
        const pantryItems = Array.isArray(pantryItemsRaw) ? pantryItemsRaw : [];
        
        // Parse recipe ingredients
        const recipeIngredients = ingredientsText.split('\n').filter(line => line.trim());
        
        // Check which ingredients are missing
        const missing = [];
        const available = [];
        
        recipeIngredients.forEach(ingredient => {
            const ingredientLower = ingredient.toLowerCase();
            const found = pantryItems.some(item => {
                const itemName = (item.name || item.item_name || '').toLowerCase();
                return ingredientLower.includes(itemName) || itemName.includes(ingredientLower.split(' ').slice(-1)[0]);
            });
            
            if (found) {
                available.push(ingredient);
            } else {
                missing.push(ingredient);
            }
        });
        
        // Display result
        resultDiv.style.display = 'block';
        if (missing.length === 0) {
            resultDiv.style.backgroundColor = '#e8f5e9';
            resultDiv.innerHTML = `<strong>✓ All ingredients available in your pantry!</strong>`;
        } else {
            resultDiv.style.backgroundColor = '#fff3e0';
            resultDiv.innerHTML = `
                <strong>⚠ Warning: Some ingredients may be missing from your pantry:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    ${missing.map(ing => `<li>${ing}</li>`).join('')}
                </ul>
                <small>Note: You can still create the recipe, but you may need to add these items to your pantry first.</small>
            `;
        }
    } catch (error) {
        console.error('Pantry check failed:', error);
        resultDiv.style.display = 'block';
        resultDiv.style.backgroundColor = '#ffebee';
        resultDiv.innerHTML = 'Failed to check pantry. Please try again.';
    }
}

// Submit recipe form (create or update)
async function submitRecipe(event) {
    event.preventDefault();
    
    const recipeId = document.getElementById('recipeFormId').value;
    const name = document.getElementById('recipeFormName').value.trim();
    const imageUrlInput = document.getElementById('recipeFormImage').value.trim();
    const imageUrl = imageUrlInput || null;
    const visibility = document.getElementById('recipeFormVisibility').value;
    const ingredientsText = document.getElementById('recipeFormIngredients').value;
    const instructionsText = document.getElementById('recipeFormInstructions').value;

    if (!name) {
        alert('Recipe name is required.');
        return;
    }

    const user = AuthService.getUser();
    if (!user || !user.id) {
        alert('You must be logged in to create a recipe.');
        return;
    }

    const ingredientLines = ingredientsText.split('\n').map(l => l.trim()).filter(Boolean);
    const instructions = instructionsText.split('\n').filter(line => line.trim()).join('\n');

    if (ingredientLines.length === 0) {
        alert('Ingredients are required. Add at least one line.');
        return;
    }

    // Match typed ingredient lines to real grocery items for backend persistence
    let groceryItems = [];
    try {
        groceryItems = await fetchGroceryItems();
    } catch (e) {
        console.warn('Could not load grocery items for matching:', e);
    }

    const matchedIngredients = [];
    const unmatchedLines = [];
    for (const line of ingredientLines) {
        const matched = matchIngredientToItem(line, groceryItems);
        if (matched) {
            matchedIngredients.push(matched);
        } else {
            unmatchedLines.push(line);
        }
    }

    if (matchedIngredients.length === 0 && groceryItems.length > 0) {
        const proceed = confirm(
            `None of your ingredients matched items in the grocery database.\n\nIngredients must match grocery items (e.g. "Tomatoes", "Chicken Breast").\n\nProceed anyway? (ingredients may not save to database)`
        );
        if (!proceed) return;
    }

    // Plain text fallback for unmatched lines (for local cache display)
    const ingredientsPlainText = ingredientLines.join('\n');

    const recipeData = {
        userId: user.id,
        name,
        image: imageUrl || null,
        isPublic: visibility === 'public',
        ingredients: matchedIngredients.length > 0 ? matchedIngredients : null,
        instructions: instructions || null,
        timers: null
    };
    
    try {
        if (recipeId) {
            // Update existing recipe
            await RecipeService.updateRecipe(recipeId, recipeData);
            saveRecipeIngredientsToCache({
                recipeId,
                userId: user.id,
                recipeName: name,
                ingredientsText: ingredientsPlainText
            });
            alert('Recipe updated successfully!');
        } else {
            // Create new recipe
            const createdRecipe = await RecipeService.createRecipe(recipeData);
            const createdId = createdRecipe?.id || createdRecipe?.recipe?.id || createdRecipe?.data?.id;

            let pantryConsumptionWarning = null;
            try {
                await consumeSelectedPantryIngredients(user.id);
            } catch (consumeError) {
                console.error('Recipe created but pantry deduction failed:', consumeError);
                pantryConsumptionWarning = consumeError.message || 'Could not deduct pantry ingredients.';
            }

            saveRecipeIngredientsToCache({
                recipeId: createdId,
                userId: user.id,
                recipeName: name,
                ingredientsText: ingredientsPlainText
            });

            if (pantryConsumptionWarning) {
                alert(`Recipe created successfully, but pantry inventory was not fully updated: ${pantryConsumptionWarning}`);
            } else {
                alert('Recipe created successfully! Pantry items used for this recipe were deducted.');
            }
        }
        
        closeRecipeForm();
        loadAllRecipes();
        loadUserRecipes();
    } catch (error) {
        console.error('Failed to save recipe:', error);
        alert('Failed to save recipe: ' + error.message);
    }
}

// Submit comment/rating
async function submitComment(event) {
    event.preventDefault();
    
    if (!currentRecipeId) {
        alert('No recipe selected');
        return;
    }
    
    const rating = parseInt(document.getElementById('commentRating').value, 10);
    const comment = document.getElementById('commentText').value.trim();
    const user = AuthService.getUser();
    const userId = user?.id ?? user?.userId;

    if (!userId) {
        alert('You must be logged in to submit a review.');
        return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        alert('Please select a valid rating between 1 and 5.');
        return;
    }

    if (!comment) {
        alert('Please enter a comment before submitting.');
        return;
    }
    
    try {
        await RecipeService.addOrUpdateRating(currentRecipeId, userId, rating);

        if (currentUserCommentId !== null && currentUserCommentId !== undefined) {
            await RecipeService.updateComment(currentUserCommentId, currentRecipeId, userId, comment);
            alert('Review updated successfully!');
        } else {
            await RecipeService.addComment(currentRecipeId, userId, comment);
            alert('Review submitted successfully!');
        }
        
        // Reset form
        document.getElementById('commentRating').value = '5';
        document.getElementById('commentText').value = '';
        currentUserCommentId = null;
        
        // Reload recipe to show new comment
        showRecipeDetail(currentRecipeId);
    } catch (error) {
        console.error('Failed to submit comment:', error);
        alert('Failed to submit review: ' + error.message);
    }
}

// Initialize recipes page
document.addEventListener('DOMContentLoaded', () => {
    const allRecipesContainer = document.getElementById('allRecipesContainer');
    const searchForm = document.getElementById('searchForm');
    const userSearchForm = document.getElementById('userSearchForm');
    const siteSearchInput = document.getElementById('site-search');
    const userRecipesSearchInput = document.getElementById('user-recipes-search');

    if (allRecipesContainer) {
        // Load recipes
        loadAllRecipes();
        loadUserRecipes();

        // Show create button for logged-in users
        const user = AuthService.getUser();
        const createBtn = document.getElementById('createRecipeBtn');
        if (user && user.role === 'user' && createBtn) {
            createBtn.style.display = 'inline-block';
        }
    }

    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    if (siteSearchInput) {
        siteSearchInput.addEventListener('input', handleSearch);
    }

    if (userSearchForm) {
        userSearchForm.addEventListener('submit', handleUserRecipesSearch);
    }

    if (userRecipesSearchInput) {
        userRecipesSearchInput.addEventListener('input', handleUserRecipesSearch);
    }
});

// Timer functionality
let activeTimers = new Map();

function startTimer(minutes, label) {
    const timerId = Date.now();
    const endTime = Date.now() + (minutes * 60 * 1000);
    
    // Create timer notification
    const timerDiv = document.createElement('div');
    timerDiv.id = `timer-${timerId}`;
    timerDiv.style.cssText = `
        position: fixed;
        top: ${20 + (activeTimers.size * 70)}px;
        right: 20px;
        background-color: #FF5722;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 200px;
        font-family: Arial, sans-serif;
    `;
    timerDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${label}</div>
        <div id="timer-display-${timerId}" style="font-size: 24px; font-family: monospace;">00:00</div>
        <button onclick="cancelTimer(${timerId})" style="background-color: rgba(255,255,255,0.3); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px; font-size: 12px;">Cancel</button>
    `;
    document.body.appendChild(timerDiv);
    
    // Start countdown
    const interval = setInterval(() => {
        const remaining = endTime - Date.now();
        
        if (remaining <= 0) {
            clearInterval(interval);
            activeTimers.delete(timerId);
            
            // Play alert
            timerDiv.style.backgroundColor = '#4CAF50';
            timerDiv.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">${label}</div>
                <div style="font-size: 18px;">✅ Timer Complete!</div>
                <button onclick="dismissTimer(${timerId})" style="background-color: rgba(255,255,255,0.3); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Dismiss</button>
            `;
            
            // Play sound (simple beep using Web Audio API)
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.3;
                oscillator.start();
                setTimeout(() => oscillator.stop(), 200);
            } catch (e) {
                console.log('Audio not available');
            }
            
            // Show browser notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('CanCook Timer', {
                    body: `${label} - Timer finished!`,
                    icon: 'apple.jpg'
                });
            }
        } else {
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            const display = document.getElementById(`timer-display-${timerId}`);
            if (display) {
                display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }
    }, 100);
    
    activeTimers.set(timerId, { interval, timerDiv });
    
    // Request notification permission on first timer
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function cancelTimer(timerId) {
    const timer = activeTimers.get(timerId);
    if (timer) {
        clearInterval(timer.interval);
        timer.timerDiv.remove();
        activeTimers.delete(timerId);
        repositionTimers();
    }
}

function dismissTimer(timerId) {
    const timerDiv = document.getElementById(`timer-${timerId}`);
    if (timerDiv) {
        timerDiv.remove();
        repositionTimers();
    }
}

function repositionTimers() {
    let index = 0;
    activeTimers.forEach((timer, timerId) => {
        if (timer.timerDiv) {
            timer.timerDiv.style.top = `${20 + (index * 70)}px`;
            index++;
        }
    });
}
