// Recipe Service
class RecipeService {

    static buildCommentPayload(recipeId, userId, comment, commentId = null, rating = null) {
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

        if (rating !== null && rating !== undefined) {
            payload.rating = Number(rating);
        }

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

    static async addComment(recipeId, userId, comment, rating = null) {
        const payload = this.buildCommentPayload(recipeId, userId, comment, null, rating);

        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.ADD_COMMENT, {
                recipeId: payload.recipeId,
                userId: payload.userId,
                commentText: payload.commentText,
                ...(rating !== null && { rating: payload.rating })
            });
        } catch (error) {
            console.error('Failed to add comment (primary payload):', error);

            try {
                return await ApiService.post(API_CONFIG.ENDPOINTS.ADD_COMMENT, {
                    recipe_id: payload.recipe_id,
                    user_id: payload.user_id,
                    comment_text: payload.comment_text,
                    ...(rating !== null && { rating: payload.rating })
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

        const verifyPersisted = async () => {
            try {
                const rows = await this.getRatingsForRecipe(payload.recipe_id);
                const row = rows.find(entry => String(entry?.user_id ?? entry?.userId ?? '') === String(payload.user_id));
                if (!row) {
                    return false;
                }
                const stored = Number(row.rating);
                return Number.isFinite(stored) && Math.abs(stored - Number(payload.rating)) < 0.001;
            } catch (error) {
                console.warn('Rating verification fetch failed:', error);
                return false;
            }
        };

        const attempts = [
            async () => ApiService.post(API_CONFIG.ENDPOINTS.RATINGS, {
                recipe_id: payload.recipe_id,
                user_id: payload.user_id,
                rating: payload.rating
            }),
            async () => ApiService.post(API_CONFIG.ENDPOINTS.RATINGS, {
                recipeId: payload.recipeId,
                userId: payload.userId,
                rating: payload.rating
            }),
            async () => ApiService.put(API_CONFIG.ENDPOINTS.RATINGS, {
                recipe_id: payload.recipe_id,
                user_id: payload.user_id,
                rating: payload.rating
            }),
            async () => ApiService.put(API_CONFIG.ENDPOINTS.RATINGS, {
                recipeId: payload.recipeId,
                userId: payload.userId,
                rating: payload.rating
            })
        ];

        let lastError = null;
        for (const attempt of attempts) {
            try {
                const result = await attempt();
                const persisted = await verifyPersisted();
                if (persisted) {
                    return result;
                }
                console.warn('Rating request returned but row not persisted yet, trying next strategy.');
            } catch (error) {
                lastError = error;
                console.warn('Rating write attempt failed:', error);
            }
        }

        throw lastError || new Error('Failed to persist rating.');
    }

    static async getCommentsForRecipe(recipeId) {
        const numericRecipeId = Number(recipeId);
        const sameRecipe = (row) => String(
            row?.recipe_id
            ?? row?.recipeId
            ?? row?.recipe?.id
            ?? row?.recipeIdFk
            ?? ''
        ) === String(numericRecipeId);

        const extractRows = (response) => {
            const raw = response?.rows
                ?? response?.data?.rows
                ?? response?.content
                ?? response?.data?.content
                ?? response?.data
                ?? response?.comments
                ?? response;
            return (Array.isArray(raw) ? raw : []).filter(item => item && typeof item === 'object');
        };

        try {
            const response = await ApiService.get(API_CONFIG.ENDPOINTS.COMMENTS, { recipe_id: numericRecipeId });
            const rows = extractRows(response);
            if (rows.length > 0) return rows;
            const filtered = rows.filter(sameRecipe);
            if (filtered.length > 0) return filtered;
            if (rows.length > 0 && rows.every(sameRecipe)) return rows;
        } catch (error) {
            console.warn('Failed comment fetch with recipe_id query:', error);
        }

        try {
            const response = await ApiService.get(API_CONFIG.ENDPOINTS.COMMENTS, { recipeId: numericRecipeId });
            const rows = extractRows(response);
            if (rows.length > 0) return rows;
            const filtered = rows.filter(sameRecipe);
            if (filtered.length > 0) return filtered;
            if (rows.length > 0 && rows.every(sameRecipe)) return rows;
        } catch (error) {
            console.warn('Failed comment fetch with recipeId query:', error);
        }

        try {
            const response = await ApiService.get(API_CONFIG.ENDPOINTS.COMMENTS);
            return extractRows(response).filter(sameRecipe);
        } catch (error) {
            console.warn('Failed fallback comment fetch:', error);
            return [];
        }
    }

    static async getRatingsForRecipe(recipeId) {
        const numericRecipeId = Number(recipeId);
        const sameRecipe = (row) => String(
            row?.recipe_id
            ?? row?.recipeId
            ?? row?.recipe?.id
            ?? row?.recipeIdFk
            ?? ''
        ) === String(numericRecipeId);

        const extractRows = (response) => {
            const raw = response?.rows
                ?? response?.data?.rows
                ?? response?.content
                ?? response?.data?.content
                ?? response?.data
                ?? response?.ratings
                ?? response;
            return (Array.isArray(raw) ? raw : []).filter(item => item && typeof item === 'object');
        };

        try {
            const response = await ApiService.get(API_CONFIG.ENDPOINTS.RATINGS, { recipe_id: numericRecipeId });
            const rows = extractRows(response);
            if (rows.length > 0) return rows;
            const filtered = rows.filter(sameRecipe);
            if (filtered.length > 0) return filtered;
            if (rows.length > 0 && rows.every(sameRecipe)) return rows;
        } catch (error) {
            console.warn('Failed rating fetch with recipe_id query:', error);
        }

        try {
            const response = await ApiService.get(API_CONFIG.ENDPOINTS.RATINGS, { recipeId: numericRecipeId });
            const rows = extractRows(response);
            if (rows.length > 0) return rows;
            const filtered = rows.filter(sameRecipe);
            if (filtered.length > 0) return filtered;
            if (rows.length > 0 && rows.every(sameRecipe)) return rows;
        } catch (error) {
            console.warn('Failed rating fetch with recipeId query:', error);
        }

        try {
            const response = await ApiService.get(API_CONFIG.ENDPOINTS.RATINGS);
            return extractRows(response).filter(sameRecipe);
        } catch (error) {
            console.warn('Failed fallback rating fetch:', error);
            return [];
        }
    }
}

// Load and display all recipes
let allPublicRecipesCache = [];
let recipeUserLookupCache = null;
const SEEDED_USER_FALLBACK_BY_ID = {
    '1': 'admin',
    '2': 'groceryadmin',
    '3': 'groceryadmin2',
    '4': 'johndoe',
    '5': 'janedoe',
    '6': 'chefmike',
    '7': 'bakerlisa'
};

function getNestedRecipeCreatorLabel(recipe) {
    const nestedUser = recipe?.user || recipe?.creator || recipe?.author || recipe?.createdBy || recipe?.created_by_user;
    const nestedLabel = nestedUser?.username
        || nestedUser?.user_name
        || nestedUser?.name
        || nestedUser?.full_name
        || nestedUser?.display_name
        || '';

    if (nestedLabel) {
        return String(nestedLabel).trim();
    }

    const directLabel = recipe?.username
        || recipe?.user_name
        || recipe?.created_by
        || recipe?.createdBy
        || recipe?.owner
        || recipe?.author
        || recipe?.created_by_name
        || recipe?.createdByName
        || '';

    return String(directLabel).trim();
}

function buildRecipeUserLookup(users) {
    const byId = new Map();
    const byUsername = new Map();

    (Array.isArray(users) ? users : []).forEach(user => {
        if (!user || typeof user !== 'object') {
            return;
        }

        const userId = user.id ?? user.userId ?? user.user_id;
        const username = (user.username || user.user_name || user.name || '').toString().trim();

        if (userId !== undefined && userId !== null) {
            byId.set(String(userId), username);
        }

        if (username) {
            byUsername.set(username.toLowerCase(), username);
        }
    });

    return { byId, byUsername };
}

function extractApiRows(response) {
    const raw = response?.rows
        ?? response?.data?.rows
        ?? response?.data?.content
        ?? response?.data?.users
        ?? response?.data?.recipes
        ?? response?.data
        ?? response?.content
        ?? response?.users
        ?? response?.recipes
        ?? response;

    return Array.isArray(raw) ? raw : [];
}

async function getRecipeUserLookup() {
    if (recipeUserLookupCache) {
        return recipeUserLookupCache;
    }

    const fallbackLookup = buildRecipeUserLookup(
        Object.entries(SEEDED_USER_FALLBACK_BY_ID).map(([id, username]) => ({ id, username }))
    );

    try {
        const response = await ApiService.get(API_CONFIG.ENDPOINTS.USER);
        const users = extractApiRows(response);
        const lookup = buildRecipeUserLookup(users);

        // If endpoint is inaccessible for regular users, keep seeded IDs as fallback.
        for (const [id, username] of Object.entries(SEEDED_USER_FALLBACK_BY_ID)) {
            if (!lookup.byId.has(String(id))) {
                lookup.byId.set(String(id), username);
            }
        }

        recipeUserLookupCache = lookup;
    } catch (error) {
        console.warn('Failed to load recipe user lookup:', error);
        recipeUserLookupCache = fallbackLookup;
    }

    return recipeUserLookupCache;
}

async function resolveRecipeCreatorLabel(recipe) {
    const directLabel = getNestedRecipeCreatorLabel(recipe);
    if (directLabel) {
        return directLabel;
    }

    const recipeOwnerId = recipe?.user_id ?? recipe?.userId ?? recipe?.owner_id ?? recipe?.ownerId ?? recipe?.created_by_id ?? recipe?.createdById;
    if (recipeOwnerId === undefined || recipeOwnerId === null) {
        return 'Unknown';
    }

    const lookup = await getRecipeUserLookup();
    const byId = lookup.byId.get(String(recipeOwnerId));
    if (byId) {
        return byId;
    }

    return 'Unknown';
}

function renderAllRecipes(recipes, emptyMessage = 'No public recipes available yet. Create the first one!') {
    const container = document.getElementById('allRecipesContainer');
    if (!container) {
        return;
    }

    if (recipes.length > 0) {
        container.innerHTML = recipes.map(recipe => `
            <div class="card" onclick="showRecipeDetail(${recipe.id})">
                <img src="${recipe.image_url || recipe.imageUrl || recipe.image || 'apple.jpg'}" alt="${recipe.name}" width="300" height="300">
                <div class="overlay-text">
                    <a href="#popup">${recipe.name}</a>
                    <div style="font-size: 12px; margin-top: 5px;">by ${recipe.creatorLabel || getNestedRecipeCreatorLabel(recipe) || recipe.username || recipe.created_by || 'Unknown'}</div>
                    <div style="font-size: 12px;">${formatRecipeStars(getRecipeRatingSummary(recipe).average)} ${getRecipeRatingSummary(recipe).average.toFixed(1)}${getRecipeRatingSummary(recipe).count > 0 ? ` (${getRecipeRatingSummary(recipe).count})` : ''}</div>
                </div>
            </div>
        `).join('');
        return;
    }

    container.innerHTML = `<p style="padding: 20px;">${emptyMessage}</p>`;
}

function shuffleRecipes(recipes) {
    const shuffled = Array.isArray(recipes) ? [...recipes] : [];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
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

        const recipesWithRatings = await Promise.all(recipes.map(async (recipe) => {
            try {
                const ratingRows = await RecipeService.getRatingsForRecipe(recipe.id);
                const creatorLabel = await resolveRecipeCreatorLabel(recipe);
                const summary = {
                    average: computeAverageRatingFromRows(ratingRows),
                    count: ratingRows.length
                };

                return {
                    ...recipe,
                    creatorLabel,
                    average_rating: summary.average || recipe.average_rating || recipe.averageRating || 0,
                    averageRating: summary.average || recipe.average_rating || recipe.averageRating || 0,
                    rating_count: summary.count || recipe.rating_count || recipe.ratingCount || 0,
                    ratingCount: summary.count || recipe.rating_count || recipe.ratingCount || 0,
                    ratingSummary: summary
                };
            } catch (error) {
                console.warn(`Failed to load rating summary for recipe ${recipe.id}:`, error);
                return {
                    ...recipe,
                    creatorLabel: await resolveRecipeCreatorLabel(recipe),
                    ratingSummary: getRecipeRatingSummary(recipe)
                };
            }
        }));

        allPublicRecipesCache = shuffleRecipes(recipesWithRatings);
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
                <img src="${recipe.image_url || recipe.imageUrl || recipe.image || 'apple.jpg'}" alt="${recipe.name}" width="300" height="300">
                <div class="overlay-text">
                    <a href="#popup">${recipe.name}</a>
                    <div style="font-size: 12px; margin-top: 5px;">${recipe.isSavedReference ? 'Saved Public Recipe' : ((recipe.is_public !== undefined ? recipe.is_public : recipe.isPublic) ? 'Public' : 'Private')}</div>
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
        let ownRecipes = [];

        try {
            response = await RecipeService.getUserRecipes();
            const fromUserEndpoint = response.rows || response.data || response || [];
            ownRecipes = Array.isArray(fromUserEndpoint) ? fromUserEndpoint : [];
        } catch (userEndpointError) {
            console.warn('User recipes endpoint failed, using fallback owner filter:', userEndpointError);
        }

        // Fallback: build "Your Recipes" from all recipes and keep only current user's entries
        if (ownRecipes.length === 0) {
            const allResponse = await RecipeService.getAllRecipes();
            const allRecipes = allResponse.rows || allResponse.data || allResponse || [];
            const allRecipesArray = Array.isArray(allRecipes) ? allRecipes : [];
            ownRecipes = allRecipesArray.filter(isOwnedByUser);
        }

        const savedPublicRecipeIds = getSavedPublicRecipeIds(user.id);
        let savedPublicRecipes = [];
        if (savedPublicRecipeIds.length > 0) {
            const allResponse = await RecipeService.getAllRecipes();
            const allRecipes = allResponse.rows || allResponse.data || allResponse || [];
            const allRecipesArray = Array.isArray(allRecipes) ? allRecipes : [];
            const savedIdSet = new Set(savedPublicRecipeIds.map(id => String(id)));

            savedPublicRecipes = allRecipesArray
                .filter(recipe => {
                    const recipeId = recipe?.id ?? recipe?.recipe_id;
                    const recipeIsPublic = recipe?.is_public !== undefined ? recipe.is_public : recipe?.isPublic;
                    return savedIdSet.has(String(recipeId)) && !!recipeIsPublic;
                })
                .map(recipe => ({
                    ...recipe,
                    isSavedReference: true
                }));
        }

        const ownIds = new Set(ownRecipes.map(recipe => String(recipe?.id ?? recipe?.recipe_id)));
        const recipes = [
            ...ownRecipes,
            ...savedPublicRecipes.filter(recipe => !ownIds.has(String(recipe?.id ?? recipe?.recipe_id)))
        ];

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
const SAVED_PUBLIC_RECIPES_KEY = 'cancookSavedPublicRecipesByUser';

function getSavedPublicRecipesStorage() {
    try {
        const raw = localStorage.getItem(SAVED_PUBLIC_RECIPES_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
}

function setSavedPublicRecipesStorage(value) {
    localStorage.setItem(SAVED_PUBLIC_RECIPES_KEY, JSON.stringify(value));
}

function getSavedPublicRecipeIds(userId) {
    if (userId === undefined || userId === null) {
        return [];
    }

    const storage = getSavedPublicRecipesStorage();
    const ids = storage[String(userId)] || [];
    return Array.isArray(ids) ? ids.map(id => Number(id)).filter(Number.isFinite) : [];
}

function savePublicRecipeIdForUser(userId, recipeId) {
    if (userId === undefined || userId === null || recipeId === undefined || recipeId === null) {
        return false;
    }

    const storage = getSavedPublicRecipesStorage();
    const userKey = String(userId);
    const current = Array.isArray(storage[userKey]) ? storage[userKey] : [];
    const normalizedRecipeId = Number(recipeId);
    if (!Number.isFinite(normalizedRecipeId)) {
        return false;
    }

    const alreadyExists = current.some(id => Number(id) === normalizedRecipeId);
    if (alreadyExists) {
        return false;
    }

    storage[userKey] = [...current, normalizedRecipeId];
    setSavedPublicRecipesStorage(storage);
    return true;
}

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
        updateRecipeSubmitAvailability();
    } catch (error) {
        console.error('Failed to load pantry picker for recipe form:', error);
        picker.innerHTML = '<p style="margin: 0; color: #d32f2f;">Failed to load pantry items.</p>';
        updateRecipeSubmitAvailability();
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
    updateRecipeSubmitAvailability();
}

function resetRecipePantrySelection() {
    selectedPantryIngredients.clear();
    updateRecipeSubmitAvailability();
}

function updateRecipeSubmitAvailability() {
    const form = document.getElementById('recipeForm');
    if (!form) {
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) {
        return;
    }

    const recipeId = document.getElementById('recipeFormId')?.value;
    const isCreateMode = !recipeId;

    if (!isCreateMode) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.title = '';
        return;
    }

    const canCreate = selectedPantryIngredients.size > 0;
    submitBtn.disabled = !canCreate;
    submitBtn.style.opacity = canCreate ? '1' : '0.6';
    submitBtn.style.cursor = canCreate ? 'pointer' : 'not-allowed';
    submitBtn.title = canCreate ? '' : 'Add at least one ingredient from Your Pantry first.';
}

async function consumeSelectedPantryIngredients() {
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
                quantity: remaining
            });
        }
    }
}

async function validateRecipeCreationAgainstPantry(ingredientLines, matchedIngredients, unmatchedLines, groceryCatalogLoaded) {
    if (!groceryCatalogLoaded) {
        return {
            allowed: false,
            message: 'Unable to validate ingredients against pantry right now. Please try again in a moment.'
        };
    }

    if (unmatchedLines.length > 0) {
        return {
            allowed: false,
            message: `Recipe cannot be created because these ingredients did not match known items: ${unmatchedLines.join(', ')}.`
        };
    }

    if (matchedIngredients.length !== ingredientLines.length) {
        return {
            allowed: false,
            message: 'Recipe cannot be created until all ingredients are valid pantry items.'
        };
    }

    const pantryItems = await fetchUserPantryItemsForRecipeForm();
    const pantryByItemId = new Map();

    pantryItems.forEach(item => {
        const key = String(item.itemId);
        const current = pantryByItemId.get(key);
        const nextQty = Number(item.quantity || 0) + Number(current?.quantity || 0);
        pantryByItemId.set(key, {
            itemId: item.itemId,
            name: item.name,
            unit: item.unit,
            quantity: nextQty
        });
    });

    const neededByItemId = new Map();
    matchedIngredients.forEach(ingredient => {
        const key = String(ingredient.itemId);
        const current = neededByItemId.get(key);
        const nextQty = Number(ingredient.quantityNeeded || 0) + Number(current?.quantity || 0);
        neededByItemId.set(key, {
            itemId: ingredient.itemId,
            name: ingredient.name,
            unit: ingredient.measurementUnit || 'units',
            quantity: nextQty
        });
    });

    const shortages = [];
    for (const needed of neededByItemId.values()) {
        const available = pantryByItemId.get(String(needed.itemId));
        const availableQty = Number(available?.quantity || 0);
        if (availableQty < Number(needed.quantity || 0)) {
            shortages.push({
                name: needed.name,
                needed: Number(needed.quantity || 0),
                available: availableQty,
                unit: available?.unit || needed.unit || 'units'
            });
        }
    }

    if (shortages.length > 0) {
        const details = shortages
            .map(shortage => `${shortage.name} (need ${shortage.needed} ${shortage.unit}, have ${shortage.available})`)
            .join('; ');
        return {
            allowed: false,
            message: `Recipe cannot be created because pantry is missing required quantities: ${details}.`
        };
    }

    return {
        allowed: true,
        message: ''
    };
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

function buildRatingLookupByUser(ratings) {
    const byUserId = new Map();
    const byUsername = new Map();

    ratings.forEach(row => {
        const rating = Number(row?.rating);
        if (!Number.isFinite(rating) || rating <= 0) {
            return;
        }

        const userId = row?.user_id ?? row?.userId;
        if (userId !== undefined && userId !== null) {
            byUserId.set(String(userId), rating);
        }

        const username = (row?.username || row?.user_name || '').toString().trim().toLowerCase();
        if (username) {
            byUsername.set(username, rating);
        }
    });

    return { byUserId, byUsername };
}

function resolveCommentRating(comment, ratingLookup) {
    const inline = Number(comment?.rating);
    if (Number.isFinite(inline) && inline > 0) {
        return inline;
    }

    const userId = comment?.user_id ?? comment?.userId;
    if (userId !== undefined && userId !== null) {
        const byId = ratingLookup.byUserId.get(String(userId));
        if (Number.isFinite(byId) && byId > 0) {
            return byId;
        }
    }

    const username = (comment?.username || comment?.user_name || '').toString().trim().toLowerCase();
    if (username) {
        const byName = ratingLookup.byUsername.get(username);
        if (Number.isFinite(byName) && byName > 0) {
            return byName;
        }
    }

    return 0;
}

function computeAverageRatingFromRows(ratings) {
    const values = ratings
        .map(row => Number(row?.rating))
        .filter(value => Number.isFinite(value) && value > 0);

    if (values.length === 0) {
        return 0;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
}

function getRecipeRatingSummary(recipe) {
    const summary = recipe?.ratingSummary || {};
    const average = Number(summary.average ?? recipe?.average_rating ?? recipe?.averageRating ?? 0);
    const count = Number(summary.count ?? recipe?.rating_count ?? recipe?.ratingCount ?? 0);

    return {
        average: Number.isFinite(average) ? average : 0,
        count: Number.isFinite(count) ? count : 0
    };
}

function formatRecipeStars(average) {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(average) || 0)));
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

function parseCookTimeToMinutes(rawCookTime) {
    if (rawCookTime === null || rawCookTime === undefined) {
        return 0;
    }

    const value = String(rawCookTime).trim().toLowerCase();
    if (!value) {
        return 0;
    }

    // Support formats like "1:30" (hh:mm)
    const clockMatch = value.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
    if (clockMatch) {
        const hours = Number(clockMatch[1]) || 0;
        const mins = Number(clockMatch[2]) || 0;
        return (hours * 60) + mins;
    }

    let totalMinutes = 0;

    const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
    if (hourMatch) {
        totalMinutes += Math.round((Number(hourMatch[1]) || 0) * 60);
    }

    const minuteMatch = value.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)/);
    if (minuteMatch) {
        totalMinutes += Math.round(Number(minuteMatch[1]) || 0);
    }

    if (totalMinutes > 0) {
        return totalMinutes;
    }

    // Fallback for values like "45"
    const numericOnly = Number(value.replace(/[^\d.]/g, ''));
    if (Number.isFinite(numericOnly) && numericOnly > 0) {
        return Math.round(numericOnly);
    }

    return 0;
}

function inferRecipeMinutesFromInstructions(instructionsSource) {
    const instructions = normalizeRecipeList(instructionsSource);
    if (!Array.isArray(instructions) || instructions.length === 0) {
        return 0;
    }

    const timerPattern = /\[timer:(\d+h)?(\d+m)?\]/gi;
    let totalMinutes = 0;

    instructions.forEach(inst => {
        const text = typeof inst === 'string'
            ? inst
            : (inst?.step_text || inst?.instruction || '');

        timerPattern.lastIndex = 0;
        let match;
        while ((match = timerPattern.exec(text)) !== null) {
            const h = match[1] ? parseInt(match[1], 10) : 0;
            const m = match[2] ? parseInt(match[2], 10) : 0;
            totalMinutes += (h * 60) + m;
        }

        const legacy = Number(inst?.timer || 0);
        if (Number.isFinite(legacy) && legacy > 0) {
            totalMinutes += legacy;
        }
    });

    return totalMinutes;
}

async function buildPublicRecipeIngredientValidationInput(recipe) {
    const ingredientsSource = recipe?.ingredients
        ?? recipe?.ingredients_text
        ?? recipe?.ingredient_list
        ?? recipe?.ingredientList
        ?? recipe?.recipe_ingredients
        ?? recipe?.recipeIngredients
        ?? recipe?.ingredient
        ?? [];

    const normalizedIngredients = normalizeRecipeList(ingredientsSource);
    const ingredientLines = [];
    const matchedIngredients = [];
    const unmatchedLines = [];

    let groceryItems = [];
    try {
        groceryItems = await fetchGroceryItems();
    } catch (error) {
        console.warn('Could not load grocery items while validating public recipe ingredients:', error);
    }

    for (const ingredient of normalizedIngredients) {
        if (ingredient && typeof ingredient === 'object') {
            const itemId = ingredient.itemId ?? ingredient.item_id;
            const quantityNeeded = Number(ingredient.quantityNeeded ?? ingredient.quantity ?? ingredient.quantity_needed ?? 1) || 1;
            const measurementUnit = ingredient.measurementUnit ?? ingredient.unit ?? ingredient.measurement_unit ?? 'whole';
            const ingredientName = resolveIngredientName(ingredient);

            if (itemId !== undefined && itemId !== null) {
                ingredientLines.push(`${quantityNeeded} ${measurementUnit} ${ingredientName || `item-${itemId}`}`.trim());
                matchedIngredients.push({
                    itemId,
                    quantityNeeded,
                    measurementUnit,
                    name: ingredientName || `Item #${itemId}`
                });
                continue;
            }

            const fallbackLine = [quantityNeeded, measurementUnit, ingredientName].filter(Boolean).join(' ').trim();
            if (fallbackLine) {
                ingredientLines.push(fallbackLine);
                const matched = matchIngredientToItem(fallbackLine, groceryItems);
                if (matched) {
                    matchedIngredients.push(matched);
                } else {
                    unmatchedLines.push(fallbackLine);
                }
            }
            continue;
        }

        const line = String(ingredient || '').trim();
        if (!line) {
            continue;
        }

        ingredientLines.push(line);
        const matched = matchIngredientToItem(line, groceryItems);
        if (matched) {
            matchedIngredients.push(matched);
        } else {
            unmatchedLines.push(line);
        }
    }

    return {
        ingredientLines,
        matchedIngredients,
        unmatchedLines,
        groceryCatalogLoaded: groceryItems.length > 0
    };
}

async function addPublicRecipeToMyRecipes() {
    const user = AuthService.getUser();
    if (!user || user.role !== 'user') {
        alert('You must be logged in as a user to add public recipes.');
        return;
    }

    if (!currentRecipeData || !currentRecipeId) {
        alert('No recipe selected.');
        return;
    }

    const isPublic = currentRecipeData.is_public !== undefined ? currentRecipeData.is_public : currentRecipeData.isPublic;
    const isOwner = isRecipeOwnedByUser(currentRecipeData, user);

    if (!isPublic) {
        alert('Only public recipes can be added to your recipes.');
        return;
    }

    if (isOwner) {
        alert('This is already your recipe.');
        return;
    }

    try {
        const pantryValidationInput = await buildPublicRecipeIngredientValidationInput(currentRecipeData);
        const pantryValidation = await validateRecipeCreationAgainstPantry(
            pantryValidationInput.ingredientLines,
            pantryValidationInput.matchedIngredients,
            pantryValidationInput.unmatchedLines,
            pantryValidationInput.groceryCatalogLoaded
        );

        if (!pantryValidation.allowed) {
            alert(`You cannot save this public recipe because your pantry is missing required ingredients. ${pantryValidation.message}`);
            return;
        }
    } catch (validationError) {
        console.error('Failed to validate pantry for public recipe save:', validationError);
        alert('Could not check pantry ingredients right now. Please try again.');
        return;
    }

    const added = savePublicRecipeIdForUser(user.id, currentRecipeId);
    if (!added) {
        alert('This public recipe is already saved in your recipes.');
        return;
    }

    alert('Public recipe saved to your recipes. This stays linked to the original creator and updates automatically.');
    await loadUserRecipes();

    const publicActionButton = document.querySelector('#publicRecipeActions button');
    if (publicActionButton) {
        publicActionButton.textContent = 'Already Saved';
        publicActionButton.disabled = true;
        publicActionButton.style.opacity = '0.7';
        publicActionButton.style.cursor = 'not-allowed';
    }
}

// Build a lookup map of itemId to item metadata from all stores
async function buildItemLookup() {
    const itemLookup = {};
    
    try {
        const storesResponse = await ApiService.get(API_CONFIG.ENDPOINTS.STORES);
        const stores = storesResponse.rows || storesResponse.data || storesResponse || [];
        
        for (const store of stores) {
            const storeId = store.id || store.storeId;
            if (!storeId) continue;
            
            try {
                const itemsResponse = await ApiService.get(`${API_CONFIG.ENDPOINTS.STORE_ITEMS}${storeId}/items`);
                const items = itemsResponse.rows || itemsResponse.data || itemsResponse || [];
                
                for (const item of items) {
                    const itemId = item.id || item.itemId;
                    if (itemId && !itemLookup[itemId]) {
                        itemLookup[itemId] = {
                            name: item.name || item.itemName || `Item #${itemId}`,
                            unit: item.unit || item.measurementUnit || 'units',
                            category: item.category || '',
                            image: item.image || ''
                        };
                    }
                }
            } catch (storeError) {
                console.warn(`Could not fetch items for store ${storeId}:`, storeError);
            }
        }
    } catch (storesError) {
        console.warn('Could not fetch stores for item lookup:', storesError);
    }
    
    return itemLookup;
}

// Check which recipe ingredients the user has enough of in their pantry
async function checkRecipeIngredientAvailability(recipe) {
    if (!recipe) return { available: [], insufficient: [] };
    
    try {
        // Get normalized ingredients from the recipe
        const ingredientsSource = recipe?.ingredients
            ?? recipe?.ingredients_text
            ?? recipe?.ingredient_list
            ?? recipe?.ingredientList
            ?? recipe?.recipe_ingredients
            ?? recipe?.recipeIngredients
            ?? recipe?.ingredient
            ?? [];

        let ingredientTexts = [];
        if (typeof ingredientsSource === 'string') {
            ingredientTexts = ingredientsSource.split('\n').map(line => line.trim()).filter(line => line);
        } else {
            const normalized = normalizeRecipeList(ingredientsSource);
            ingredientTexts = normalized.map(ing => {
                if (typeof ing === 'string') {
                    return ing;
                } else {
                    const quantity = ing.quantityNeeded ?? ing.quantity ?? ing.quantity_needed ?? '';
                    const unit = ing.measurementUnit ?? ing.unit ?? ing.measurement_unit ?? '';
                    const name = resolveIngredientName(ing);
                    return `${quantity} ${unit} ${name}`.trim();
                }
            }).filter(text => text);
        }

        // Fetch user's pantry items
        const pantryResponse = await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY);
        const pantryItems = pantryResponse.rows || pantryResponse.data || pantryResponse || [];
        
        if (!Array.isArray(pantryItems)) {
            return { available: [], insufficient: ingredientTexts };
        }

        // Build item lookup from stores
        const itemLookup = await buildItemLookup();

        // Enrich pantry items with metadata from stores
        const enrichedPantryItems = pantryItems.map(row => {
            const itemId = row.itemId || row.item_id;
            const meta = itemLookup[itemId] || {};
            return {
                pantryRowId: row.id,
                itemId: itemId,
                quantity: Number(row.quantity || 0),
                name: meta.name || row.name || `Item #${itemId}`,
                unit: meta.unit || row.unit || 'units'
            };
        });

        const available = [];
        const insufficient = [];

        // Try to match recipe ingredients to pantry items
        for (const ingredientText of ingredientTexts) {
            const parsed = parseIngredientLine(ingredientText);
            const needQuantity = parsed.quantity;
            const needUnit = parsed.unit;
            const needName = parsed.ingredientName.toLowerCase();

            // Find ALL matching pantry items and score them
            const matches = [];
            for (const pantryItem of enrichedPantryItems) {
                const pantryNameLower = pantryItem.name.toLowerCase();
                
                // Simple fuzzy matching
                let score = 0;
                if (pantryNameLower === needName) score = 100;
                else if (pantryNameLower.includes(needName)) score = 50;
                else if (needName.includes(pantryNameLower)) score = 25;
                
                if (score > 0) {
                    matches.push({ ...pantryItem, score });
                }
            }

            if (matches.length === 0) {
                insufficient.push(ingredientText);
                continue;
            }

            // Sort matches by score (descending) to try best matches first
            matches.sort((a, b) => b.score - a.score);

            // Accumulate quantities across all matching pantry items
            let totalAvailable = 0;
            for (const match of matches) {
                totalAvailable += match.quantity;
            }

            if (totalAvailable < needQuantity) {
                insufficient.push(`${ingredientText} (have ${totalAvailable}${matches[0].unit}, need ${needQuantity}${needUnit})`);
                continue;
            }

            available.push(ingredientText);
        }

        return { available, insufficient };
    } catch (error) {
        console.error('Error checking ingredient availability:', error);
        return { available: [], insufficient: [] };
    }
}

// Cook recipe and consume pantry ingredients
async function cookRecipeAndConsumePantry() {
    const user = AuthService.getUser();
    if (!user || user.role !== 'user') {
        alert('You must be logged in as a user to cook recipes.');
        return;
    }

    if (!currentRecipeData || !currentRecipeId) {
        alert('No recipe selected.');
        return;
    }

    try {
        // Check ingredient availability first
        const availability = await checkRecipeIngredientAvailability(currentRecipeData);
        
        if (availability.insufficient && availability.insufficient.length > 0) {
            // Show popup with missing ingredients instead of cooking
            showMissingIngredientsPopup(availability.insufficient, availability.available);
            return;
        }
        
        // Get normalized ingredients from the recipe
        const ingredientsSource = currentRecipeData?.ingredients
            ?? currentRecipeData?.ingredients_text
            ?? currentRecipeData?.ingredient_list
            ?? currentRecipeData?.ingredientList
            ?? currentRecipeData?.recipe_ingredients
            ?? currentRecipeData?.recipeIngredients
            ?? currentRecipeData?.ingredient
            ?? [];

        let ingredientTexts = [];
        if (typeof ingredientsSource === 'string') {
            ingredientTexts = ingredientsSource.split('\n').map(line => line.trim()).filter(line => line);
        } else {
            const normalized = normalizeRecipeList(ingredientsSource);
            ingredientTexts = normalized.map(ing => {
                if (typeof ing === 'string') {
                    return ing;
                } else {
                    const quantity = ing.quantityNeeded ?? ing.quantity ?? ing.quantity_needed ?? '';
                    const unit = ing.measurementUnit ?? ing.unit ?? ing.measurement_unit ?? '';
                    const name = resolveIngredientName(ing);
                    return `${quantity} ${unit} ${name}`.trim();
                }
            }).filter(text => text);
        }

        if (ingredientTexts.length === 0) {
            alert('This recipe has no ingredients.');
            return;
        }

        // Fetch user's pantry items
        const pantryResponse = await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY);
        const pantryItems = pantryResponse.rows || pantryResponse.data || pantryResponse || [];
        
        if (!Array.isArray(pantryItems)) {
            alert('Could not load your pantry. Please try again.');
            return;
        }

        // Build item lookup from stores
        const itemLookup = await buildItemLookup();

        // Enrich pantry items with metadata from stores
        let enrichedPantryItems = pantryItems.map(row => {
            const itemId = row.itemId || row.item_id;
            const meta = itemLookup[itemId] || {};
            return {
                pantryRowId: row.id,
                itemId: itemId,
                quantity: Number(row.quantity || 0),
                name: meta.name || row.name || `Item #${itemId}`,
                unit: meta.unit || row.unit || 'units'
            };
        });

        let consumedItems = [];

        // Try to match recipe ingredients to pantry items
        for (const ingredientText of ingredientTexts) {
            const parsed = parseIngredientLine(ingredientText);
            let needQuantity = parsed.quantity;
            const needUnit = parsed.unit;
            const needName = parsed.ingredientName.toLowerCase();

            // Find ALL matching pantry items and score them
            const matches = [];
            for (const pantryItem of enrichedPantryItems) {
                const pantryNameLower = pantryItem.name.toLowerCase();
                
                // Simple fuzzy matching
                let score = 0;
                if (pantryNameLower === needName) score = 100;
                else if (pantryNameLower.includes(needName)) score = 50;
                else if (needName.includes(pantryNameLower)) score = 25;
                
                if (score > 0) {
                    matches.push({ ...pantryItem, score });
                }
            }

            if (matches.length === 0) {
                continue;
            }

            // Sort matches by score (descending) to consume from best matches first
            matches.sort((a, b) => b.score - a.score);

            // Consume from multiple pantry items until we have enough
            for (const match of matches) {
                if (needQuantity <= 0) break;

                const available = match.quantity;
                const quantityToUse = Math.min(needQuantity, available);

                consumedItems.push({
                    pantryRowId: match.pantryRowId,
                    name: match.name,
                    quantityUsed: quantityToUse,
                    availableQuantity: available
                });

                // Update the pantry item's remaining quantity
                const pantryItemIndex = enrichedPantryItems.findIndex(item => item.pantryRowId === match.pantryRowId);
                if (pantryItemIndex >= 0) {
                    enrichedPantryItems[pantryItemIndex].quantity -= quantityToUse;
                }

                needQuantity -= quantityToUse;
            }
        }

        if (consumedItems.length === 0) {
            alert('Could not match recipe ingredients to your pantry items.');
            return;
        }

        // Re-fetch current pantry state before updating
        const latestPantryResponse = await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY);
        const latestPantryItems = latestPantryResponse.rows || latestPantryResponse.data || latestPantryResponse || [];
        const latestPantryMap = new Map(latestPantryItems.map(item => [String(item.id), item]));

        // Remove consumed items from pantry
        for (const item of consumedItems) {
            const latestPantryItem = latestPantryMap.get(String(item.pantryRowId));
            if (!latestPantryItem) {
                console.warn(`Pantry item ${item.pantryRowId} not found, skipping`);
                continue;
            }

            const currentQuantity = Number(latestPantryItem.quantity || 0);
            const remaining = Math.max(0, currentQuantity - item.quantityUsed);
            
            if (remaining <= 0) {
                // Delete the item if quantity reaches 0 or below
                await ApiService.delete(API_CONFIG.ENDPOINTS.REMOVE_PANTRY_ITEM + item.pantryRowId);
            } else {
                // Update quantity
                await ApiService.put(API_CONFIG.ENDPOINTS.REMOVE_PANTRY_ITEM + item.pantryRowId, {
                    quantity: remaining
                });
            }
        }

        // Show success message
        const usedItemsList = consumedItems.map(i => `• ${i.name}`).join('\n');
        alert(`Great! Started cooking!\n\nUsed from your pantry:\n${usedItemsList}`);

        // Close recipe popup and refresh pantry if on pantry page
        closeRecipePopup();
        if (window.location.pathname.includes('pantry.html') && typeof loadPantryItems === 'function') {
            await loadPantryItems();
        }

    } catch (error) {
        console.error('Error consuming pantry ingredients:', error);
        alert('Error: ' + (error.message || 'Could not process recipe ingredients. Please try again.'));
    }
}

// Show popup for missing ingredients
function showMissingIngredientsPopup(insufficient, available) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = 'background: white; padding: 30px; border-radius: 8px; max-width: 500px; max-height: 70vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
    
    // Create content
    let content = '<h2 style="color: #f44336; margin-top: 0;">⚠️ Missing Ingredients</h2>';
    content += '<p>You don\'t have enough of some ingredients to cook this recipe.</p>';
    
    if (available && available.length > 0) {
        content += '<div style="margin-bottom: 20px;">';
        content += '<h3 style="color: #4CAF50; margin-bottom: 10px;">✓ You Have:</h3>';
        content += '<ul style="list-style-type: none; padding-left: 0; color: #666;">';
        available.forEach(item => {
            content += `<li style="margin: 5px 0; padding-left: 20px;">✓ ${item}</li>`;
        });
        content += '</ul>';
        content += '</div>';
    }
    
    if (insufficient && insufficient.length > 0) {
        content += '<div style="margin-bottom: 20px;">';
        content += '<h3 style="color: #f44336; margin-bottom: 10px;">✗ Missing or Insufficient:</h3>';
        content += '<ul style="list-style-type: none; padding-left: 0; color: #d32f2f;">';
        insufficient.forEach(item => {
            content += `<li style="margin: 5px 0; padding-left: 20px; font-weight: 500;">✗ ${item}</li>`;
        });
        content += '</ul>';
        content += '</div>';
    }
    
    content += '<p style="color: #666; font-size: 14px; margin-bottom: 20px;">Please add the missing ingredients to your pantry or adjust the recipe.</p>';
    
    modal.innerHTML = content;
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'background-color: #999; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';
    closeBtn.addEventListener('click', () => {
        overlay.remove();
    });
    
    // Create go to pantry button
    const pantryBtn = document.createElement('button');
    pantryBtn.textContent = 'Go to Pantry';
    pantryBtn.style.cssText = 'background-color: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';
    pantryBtn.addEventListener('click', () => {
        overlay.remove();
        window.location.href = 'pantry.html';
    });
    
    buttonContainer.appendChild(closeBtn);
    buttonContainer.appendChild(pantryBtn);
    modal.appendChild(buttonContainer);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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
        const recipeCookTimerActionEl = document.getElementById('recipeCookTimerAction');
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
            const creatorLabel = await resolveRecipeCreatorLabel(recipe);
            recipeCreatorEl.textContent = `by ${creatorLabel}`;
        }
        if (recipeCookTimeEl) {
            recipeCookTimeEl.textContent = recipe.cook_time || recipe.cookTime || 'N/A';
        }
        if (recipeCookTimerActionEl) {
            recipeCookTimerActionEl.innerHTML = '';
            const cookTimeRaw = recipe.cook_time || recipe.cookTime || '';
            let totalRecipeMinutes = parseCookTimeToMinutes(cookTimeRaw);

            if (totalRecipeMinutes <= 0) {
                totalRecipeMinutes = inferRecipeMinutesFromInstructions(recipe.instructions);
            }

            if (totalRecipeMinutes > 0) {
                const timerButton = document.createElement('button');
                timerButton.type = 'button';
                timerButton.textContent = `Start Recipe Timer (${totalRecipeMinutes}m)`;
                timerButton.style.cssText = 'background-color: #FF5722; color: white; padding: 8px 14px; border: none; border-radius: 4px; cursor: pointer;';
                timerButton.addEventListener('click', () => {
                    const recipeLabel = (recipe.name || 'Recipe').toString().trim() || 'Recipe';
                    startTimer(totalRecipeMinutes, `${recipeLabel} Total Time`);
                });
                recipeCookTimerActionEl.appendChild(timerButton);
            } else {
                recipeCookTimerActionEl.innerHTML = '<small style="color: #666;">No recipe timer detected. Add cook time or instruction timers like [timer:20m].</small>';
            }
        }
        if (recipeVisibilityEl) {
            recipeVisibilityEl.textContent = (recipe.is_public || recipe.isPublic) ? 'Public' : 'Private';
        }
        
        const fallbackComments = normalizeRecipeList(recipe.comments).filter(item => item && typeof item === 'object');
        const [comments, ratingRows] = await Promise.all([
            RecipeService.getCommentsForRecipe(recipeId),
            RecipeService.getRatingsForRecipe(recipeId)
        ]);
        const visibleComments = comments.length > 0 ? comments : fallbackComments;
        const ratingLookup = buildRatingLookupByUser(ratingRows);

        // Compute average rating from ratings first, then fall back to comment-linked ratings or recipe fields.
        const commentRatings = visibleComments
            .map(comment => resolveCommentRating(comment, ratingLookup))
            .filter(rating => Number.isFinite(rating) && rating > 0);
        const computedAverage = computeAverageRatingFromRows(ratingRows);
        const commentAverage = commentRatings.length > 0 ? commentRatings.reduce((a, b) => a + b, 0) / commentRatings.length : 0;

        // Update rating
        const avgRating = parseFloat((computedAverage > 0 ? computedAverage : (commentAverage > 0 ? commentAverage : (recipe.average_rating || recipe.averageRating || 0))) || 0);
        const ratingCount = parseInt((ratingRows.length > 0 ? ratingRows.length : (commentRatings.length > 0 ? commentRatings.length : (recipe.rating_count || recipe.ratingCount || 0))) || 0, 10);
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
        
        // Check ingredient availability for current user
        let insufficientIngredients = [];
        if (currentUser && currentUser.role === 'user') {
            const availability = await checkRecipeIngredientAvailability(recipe);
            insufficientIngredients = availability.insufficient || [];
        }
        
        const ingredientsList = document.getElementById('ingredientsList');
        if (ingredientsList && ingredients.length > 0) {
            ingredientsList.innerHTML = ingredients.map(ing => {
                let displayText = '';
                if (typeof ing === 'string') {
                    displayText = ing;
                } else {
                    const quantity = ing.quantityNeeded ?? ing.quantity ?? ing.quantity_needed ?? '';
                    const unit = ing.measurementUnit ?? ing.unit ?? ing.measurement_unit ?? '';
                    const name = resolveIngredientName(ing);
                    const formatted = `${quantity} ${unit} ${name}`.trim();
                    displayText = formatted || Object.values(ing).filter(v => v !== null && v !== undefined).join(' ').trim();
                }
                
                // Check if this ingredient is in the insufficient list
                const isInsufficient = insufficientIngredients.some(insuf => {
                    const inName = insuf.split('(')[0].trim().toLowerCase();
                    const displayLower = displayText.toLowerCase();
                    return displayLower.includes(inName) || inName.includes(displayLower);
                });
                
                const warningIcon = isInsufficient ? ' <span style="color: #f44336; font-weight: bold; margin-left: 8px;" title="Insufficient quantity in pantry">⚠️</span>' : '';
                return `<li>${displayText}${warningIcon}</li>`;
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
        const publicRecipeActions = document.getElementById('publicRecipeActions');
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
        if (publicRecipeActions) {
            const recipeIsPublic = recipe.is_public !== undefined ? recipe.is_public : recipe.isPublic;
            const canAddPublicRecipe = !!user && user.role === 'user' && !isRecipeOwnedByUser(recipe, user) && !!recipeIsPublic;
            publicRecipeActions.style.display = canAddPublicRecipe ? 'block' : 'none';

            const publicActionButton = publicRecipeActions.querySelector('button');
            if (publicActionButton) {
                const savedIds = user?.id ? getSavedPublicRecipeIds(user.id) : [];
                const isAlreadySaved = savedIds.some(id => String(id) === String(recipeId));
                publicActionButton.textContent = isAlreadySaved ? 'Already Saved' : 'Add to My Recipes';
                publicActionButton.disabled = isAlreadySaved;
                publicActionButton.style.opacity = isAlreadySaved ? '0.7' : '1';
                publicActionButton.style.cursor = isAlreadySaved ? 'not-allowed' : 'pointer';
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
        const commentsList = document.getElementById('commentsList');
        if (commentsList && visibleComments.length > 0) {
            // Sort comments by most recent first
            visibleComments.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
            
            // Debug: Log comment fields
            console.log('Sample comment object:', visibleComments[0]);
            console.log('All comment fields:', Object.keys(visibleComments[0]));
            
            commentsList.innerHTML = visibleComments.map(comment => {
                const commentRating = Math.max(0, Math.min(5, Number(resolveCommentRating(comment, ratingLookup)) || 0));
                return `
                <div class="comment">
                    <div class="comment-header">
                        <strong>${comment.username || comment.user_name || 'Anonymous'}</strong>
                        <span class="stars">${'★'.repeat(commentRating)}${'☆'.repeat(5 - commentRating)}</span>
                        <span style="color: #666; font-size: 12px; margin-left: 10px;">${new Date(comment.created_at || comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p>${comment.commentText || comment.comment_text || comment.text || comment.comment}</p>
                </div>
            `;
            }).join('');

        } else if (commentsList) {
            commentsList.innerHTML = '<p>No comments yet. Be the first to leave a review!</p>';
        }

        currentUserCommentId = null;
        if (commentRatingEl) {
            commentRatingEl.value = '5';
        }
        if (commentTextEl) {
            commentTextEl.value = '';
        }
        if (commentSubmitBtn) {
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
        container.innerHTML = recipes.map(recipe => recipeCardHTML(recipe)).join('');
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
    updateRecipeSubmitAvailability();
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
    updateRecipeSubmitAvailability();
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
                <small>You must add these items to your pantry before creating this recipe.</small>
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
    const cookTime = document.getElementById('recipeFormCookTime').value.trim();
    const visibility = document.getElementById('recipeFormVisibility').value;
    const ingredientsText = document.getElementById('recipeFormIngredients').value;
    const instructionsText = document.getElementById('recipeFormInstructions').value;

    if (!name) {
        alert('Recipe name is required.');
        return;
    }

    if (!cookTime) {
        alert('Cook time is required.');
        return;
    }

    const user = AuthService.getUser();
    if (!user || !user.id) {
        alert('You must be logged in to create a recipe.');
        return;
    }

    const normalizeRecipeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

    if (!recipeId) {
        try {
            const allRecipesResponse = await RecipeService.getAllRecipes();
            const existingRecipes = extractApiRows(allRecipesResponse);
            const normalizedTargetName = normalizeRecipeName(name);

            const duplicateExists = existingRecipes.some(recipe => {
                const existingName = recipe?.name || recipe?.recipe_name || recipe?.title;
                return normalizeRecipeName(existingName) === normalizedTargetName;
            });

            if (duplicateExists) {
                alert('Recipe has already been created.');
                return;
            }
        } catch (duplicateCheckError) {
            console.warn('Unable to verify duplicate recipe names before create:', duplicateCheckError);
        }
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

    if (recipeId) {
        if (matchedIngredients.length === 0 && groceryItems.length > 0) {
            const proceed = confirm(
                `None of your ingredients matched items in the grocery database.\n\nIngredients should match grocery items (e.g. "Tomatoes", "Chicken Breast").\n\nProceed with update anyway?`
            );
            if (!proceed) return;
        }
    } else {
        if (selectedPantryIngredients.size === 0) {
            alert('You must add at least one ingredient using Your Pantry before creating a recipe.');
            return;
        }

        try {
            const pantryValidation = await validateRecipeCreationAgainstPantry(
                ingredientLines,
                matchedIngredients,
                unmatchedLines,
                groceryItems.length > 0
            );

            if (!pantryValidation.allowed) {
                alert(pantryValidation.message);
                return;
            }
        } catch (validationError) {
            console.error('Failed to validate pantry requirements before recipe creation:', validationError);
            alert('Unable to verify pantry ingredients right now. Please try again.');
            return;
        }
    }

    // Plain text fallback for unmatched lines (for local cache display)
    const ingredientsPlainText = ingredientLines.join('\n');

    const recipeData = {
        userId: user.id,
        name,
        image: imageUrl || null,
        cookTime,
        cook_time: cookTime,
        isPublic: visibility === 'public',
        ingredients: matchedIngredients.length > 0 ? matchedIngredients : null,
        instructions: instructions || null,
        timers: null
    };
    
    try {
        if (recipeId) {
            // Update existing recipe
            await RecipeService.updateRecipe(recipeId, recipeData);

            let pantryConsumptionWarning = null;
            try {
                await consumeSelectedPantryIngredients();
            } catch (consumeError) {
                console.error('Recipe updated but pantry deduction failed:', consumeError);
                pantryConsumptionWarning = consumeError.message || 'Could not deduct pantry ingredients.';
            }

            saveRecipeIngredientsToCache({
                recipeId,
                userId: user.id,
                recipeName: name,
                ingredientsText: ingredientsPlainText
            });

            if (pantryConsumptionWarning) {
                alert(`Recipe updated successfully, but pantry inventory was not fully updated: ${pantryConsumptionWarning}`);
            } else if (selectedPantryIngredients.size > 0) {
                alert('Recipe updated successfully! Pantry items used for this edit were deducted.');
            } else {
                alert('Recipe updated successfully!');
            }
        } else {
            // Create new recipe
            const createdRecipe = await RecipeService.createRecipe(recipeData);
            const createdId = createdRecipe?.id || createdRecipe?.recipe?.id || createdRecipe?.data?.id;

            let pantryConsumptionWarning = null;
            try {
                await consumeSelectedPantryIngredients();
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

    const ratingPayloadTrace = {
        recipe_id: Number(currentRecipeId),
        user_id: Number(userId),
        rating: Number(rating)
    };
    const commentPayloadTrace = {
        recipe_id: Number(currentRecipeId),
        user_id: Number(userId),
        comment_text: comment
    };

    console.log('[Rating Submit] URL:', getApiUrl(API_CONFIG.ENDPOINTS.RATINGS));
    console.log('[Rating Submit] Payload:', ratingPayloadTrace);
    console.log('[Comment Submit] URL:', getApiUrl(API_CONFIG.ENDPOINTS.ADD_COMMENT));
    console.log('[Comment Submit] Payload:', commentPayloadTrace);
    
    try {
        // Submit comment with rating included - no need to submit rating separately
        await RecipeService.addComment(currentRecipeId, userId, comment, rating);
        alert('Review submitted successfully!');
        
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
