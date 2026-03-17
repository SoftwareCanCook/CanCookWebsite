// Recipe Service
class RecipeService {
    
    // Get all recipes
    static async getAllRecipes() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.RECIPES);
        } catch (error) {
            console.error('Failed to fetch recipes:', error);
            return [];
        }
    }
    
    // Get user's recipes
    static async getUserRecipes() {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.USER_RECIPES);
        } catch (error) {
            console.error('Failed to fetch user recipes:', error);
            return [];
        }
    }
    
    // Get recipe by ID
    static async getRecipeById(id) {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.RECIPE_BY_ID + id);
        } catch (error) {
            console.error('Failed to fetch recipe:', error);
            throw error;
        }
    }
    
    // Create new recipe
    static async createRecipe(recipeData) {
        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.CREATE_RECIPE, recipeData);
        } catch (error) {
            console.error('Failed to create recipe:', error);
            throw error;
        }
    }
    
    // Update existing recipe
    static async updateRecipe(id, recipeData) {
        try {
            return await ApiService.put(API_CONFIG.ENDPOINTS.UPDATE_RECIPE + id, recipeData);
        } catch (error) {
            console.error('Failed to update recipe:', error);
            throw error;
        }
    }
    
    // Delete recipe
    static async deleteRecipe(id) {
        try {
            return await ApiService.delete(API_CONFIG.ENDPOINTS.DELETE_RECIPE + id);
        } catch (error) {
            console.error('Failed to delete recipe:', error);
            throw error;
        }
    }
    
    // Search recipes
    static async searchRecipes(query) {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.SEARCH_RECIPES, { q: query });
        } catch (error) {
            console.error('Failed to search recipes:', error);
            return [];
        }
    }
    
    // Sort recipes
    static async sortRecipes(sortBy = 'name') {
        try {
            return await ApiService.get(API_CONFIG.ENDPOINTS.SORT_RECIPES, { sortBy });
        } catch (error) {
            console.error('Failed to sort recipes:', error);
            return [];
        }
    }
    
    // Add comment to recipe
    static async addComment(recipeId, rating, comment) {
        try {
            return await ApiService.post(API_CONFIG.ENDPOINTS.ADD_COMMENT, {
                recipeId,
                rating,
                comment
            });
        } catch (error) {
            console.error('Failed to add comment:', error);
            throw error;
        }
    }
}

// Load and display all recipes
async function loadAllRecipes() {
    try {
        const response = await RecipeService.getAllRecipes();
        console.log('All recipes response:', response);
        
        // Handle different response structures
        let recipes = response.rows || response.data || response || [];
        
        // Filter to show only public recipes in the carousel
        // Private recipes should only be visible to their owner in "Your Recipes" section
        const currentUser = AuthService.getUser();
        recipes = recipes.filter(recipe => {
            const isPublic = recipe.is_public !== undefined ? recipe.is_public : recipe.isPublic;
            // Show if public, OR if it's the current user's recipe (handled in user recipes section)
            return isPublic === true || isPublic === 1 || isPublic === '1';
        });
        
        // Randomize recipes for carousel (as per requirements)
        const shuffled = recipes.sort(() => 0.5 - Math.random());
        
        const container = document.getElementById('allRecipesContainer');
        
        if (container) {
            if (shuffled.length > 0) {
                container.innerHTML = shuffled.map(recipe => `
                    <div class="card" onclick="showRecipeDetail(${recipe.id})">
                        <img src="${recipe.image_url || recipe.imageUrl || 'apple.jpg'}" alt="${recipe.name}">
                        <div class="overlay-text">
                            <a href="#popup">${recipe.name}</a>
                            <div style="font-size: 12px; margin-top: 5px;">by ${recipe.username || recipe.created_by || 'Unknown'}</div>
                            <div style="font-size: 12px;">★ ${recipe.average_rating || recipe.averageRating || '0.0'}</div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p style="padding: 20px;">No public recipes available yet. Create the first one!</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load all recipes:', error);
        const container = document.getElementById('allRecipesContainer');
        if (container) {
            container.innerHTML = '<p style="padding: 20px; color: red;">Error loading recipes</p>';
        }
    }
}

// Load and display user's recipes
async function loadUserRecipes() {
    if (!AuthService.isAuthenticated()) {
        return;
    }
    
    const user = AuthService.getUser();
    if (!user || user.role !== 'user') {
        return;
    }
    
    try {
        const response = await RecipeService.getUserRecipes();
        const recipes = response.rows || response.data || response || [];
        
        const container = document.getElementById('userRecipesContainer');
        const header = document.getElementById('yourRecipesHeader');
        
        if (recipes.length > 0 && container) {
            if (header) header.style.display = 'block';
            container.innerHTML = recipes.map(recipe => `
                <div class="card" onclick="showRecipeDetail(${recipe.id})">
                    <img src="${recipe.image_url || recipe.imageUrl || 'apple.jpg'}" alt="${recipe.name}">
                    <div class="overlay-text">
                        <a href="#popup">${recipe.name}</a>
                        <div style="font-size: 12px; margin-top: 5px;">${recipe.is_public || recipe.isPublic ? 'Public' : 'Private'}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load user recipes:', error);
    }
}

// Store current recipe ID for edit/delete operations
let currentRecipeId = null;
let currentRecipeData = null;

// Handle recipe image upload
function handleRecipeImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image file is too large. Maximum size is 5MB.');
        event.target.value = '';
        return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        // Store base64 in the URL field
        document.getElementById('recipeFormImage').value = e.target.result;
        console.log('Recipe image converted to base64');
    };
    reader.readAsDataURL(file);
}

// Show recipe detail in popup
async function showRecipeDetail(recipeId) {
    try {
        const response = await RecipeService.getRecipeById(recipeId);
        const recipe = response.recipe || response.data || response;
        
        currentRecipeId = recipeId;
        currentRecipeData = recipe;
        
        console.log('Recipe detail:', recipe);
        
        // Check if user can view this recipe
        const currentUser = AuthService.getUser();
        const isPublic = recipe.is_public !== undefined ? recipe.is_public : recipe.isPublic;
        const isOwner = currentUser && recipe.user_id === currentUser.id;
        
        // If recipe is private and user is not the owner, deny access
        if (!isPublic && !isOwner) {
            alert('This recipe is private and you do not have permission to view it.');
            return;
        }
        
        // Update popup content
        const popup = document.getElementById('popup');
        if (popup) {
            const recipePage = popup.querySelector('.recipe-page');
            
            recipePage.querySelector('.recipe-image img').src = recipe.imageUrl || 'apple.jpg';
            recipePage.querySelector('h1').textContent = recipe.name;
            recipePage.querySelector('.meta-info .value').textContent = recipe.cookTime;
            recipePage.querySelector('h3').textContent = recipe.averageRating || '0.0';
            
            // Update stars
            const stars = '★'.repeat(Math.round(recipe.averageRating || 0)) + '☆'.repeat(5 - Math.round(recipe.averageRating || 0));
            recipePage.querySelector('h4').textContent = stars;
            
            // Update ingredients
            const ingredientsList = recipePage.querySelector('.ingredients ul');
            ingredientsList.innerHTML = recipe.ingredients.map(ing => 
                `<li>${ing.name} - ${ing.quantity} ${ing.unit}</li>`
            ).join('');
            
            // Update instructions
            const instructionsList = recipePage.querySelector('.instructions ol');
            instructionsList.innerHTML = recipe.instructions.map(inst => 
                `<li>${inst}</li>`
            ).join('');
            
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <strong>${comment.username || 'Anonymous'}</strong>
                        <span class="stars">${'★'.repeat(comment.rating)}${'☆'.repeat(5 - comment.rating)}</span>
                        <span style="color: #666; font-size: 12px; margin-left: 10px;">${new Date(comment.created_at || comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p>${comment.comment_text || comment.text || comment.comment}</p>
                </div>
            `).join('');
        } else {
            commentsList.innerHTML = '<p>No comments yet. Be the first to leave a review!</p>';
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
    event.preventDefault();
    const searchQuery = document.getElementById('site-search').value;
    
    if (searchQuery.trim()) {
        try {
            const response = await RecipeService.searchRecipes(searchQuery);
            const recipes = response.rows || response.data || response || [];
            const container = document.getElementById('allRecipesContainer');
            
            if (container) {
                if (recipes.length > 0) {
                    container.innerHTML = recipes.map(recipe => `
                        <div class="card" onclick="showRecipeDetail(${recipe.id})">
                            <img src="${recipe.image_url || recipe.imageUrl || 'apple.jpg'}" alt="${recipe.name}">
                            <div class="overlay-text">
                                <a href="#popup">${recipe.name}</a>
                                <div style="font-size: 12px; margin-top: 5px;">by ${recipe.username || 'Unknown'}</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p style="padding: 20px;">No recipes found matching your search.</p>';
                }
            }
        } catch (error) {
            console.error('Search failed:', error);
            alert('Search failed: ' + error.message);
        }
    }
}

// Clear search and reload all recipes
function clearSearch() {
    document.getElementById('site-search').value = '';
    document.getElementById('sortBy').value = '';
    loadAllRecipes();
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
    document.getElementById('recipeFormPopup').style.display = 'flex';
}

// Close recipe form
function closeRecipeForm() {
    document.getElementById('recipeFormPopup').style.display = 'none';
}

// Close recipe popup
function closeRecipePopup() {
    document.getElementById('popup').style.display = 'none';
    currentRecipeId = null;
    currentRecipeData = null;
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
    document.getElementById('recipeFormImage').value = currentRecipeData.image_url || currentRecipeData.imageUrl || '';
    document.getElementById('recipeFormCookTime').value = currentRecipeData.cook_time || currentRecipeData.cookTime || '';
    document.getElementById('recipeFormVisibility').value = (currentRecipeData.is_public || currentRecipeData.isPublic) ? 'public' : 'private';
    
    // Format ingredients
    const ingredients = currentRecipeData.ingredients || [];
    const ingredientsText = ingredients.map(ing => {
        if (typeof ing === 'string') return ing;
        return `${ing.quantity || ''} ${ing.unit || ''} ${ing.name || ing.ingredient_name || ''}`.trim();
    }).join('\n');
    document.getElementById('recipeFormIngredients').value = ingredientsText;
    
    // Format instructions
    const instructions = currentRecipeData.instructions || [];
    const instructionsText = instructions.map(inst => {
        if (typeof inst === 'string') return inst;
        return inst.step_text || inst.instruction || '';
    }).join('\n');
    document.getElementById('recipeFormInstructions').value = instructionsText;
    
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
        // Reload the recipe
        showRecipeDetail(currentRecipeId);
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
        // Get user's pantry items
        const pantryResponse = await ApiService.get(API_CONFIG.ENDPOINTS.PANTRY_ITEMS);
        const pantryItems = pantryResponse.rows || pantryResponse.data || pantryResponse || [];
        
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
    const name = document.getElementById('recipeFormName').value;
    const imageUrl = document.getElementById('recipeFormImage').value;
    const cookTime = document.getElementById('recipeFormCookTime').value;
    const visibility = document.getElementById('recipeFormVisibility').value;
    const ingredientsText = document.getElementById('recipeFormIngredients').value;
    const instructionsText = document.getElementById('recipeFormInstructions').value;
    
    // Parse ingredients and instructions
    const ingredients = ingredientsText.split('\n').filter(line => line.trim()).map(line => {
        const parts = line.trim().split(' ');
        if (parts.length >= 2) {
            const quantity = parts[0];
            const rest = parts.slice(1).join(' ');
            return { quantity, name: rest };
        }
        return { quantity: '', name: line.trim() };
    });
    
    const instructions = instructionsText.split('\n').filter(line => line.trim());
    
    const recipeData = {
        name,
        image_url: imageUrl,
        imageUrl: imageUrl,
        cook_time: cookTime,
        cookTime: cookTime,
        is_public: visibility === 'public',
        isPublic: visibility === 'public',
        ingredients,
        instructions
    };
    
    try {
        if (recipeId) {
            // Update existing recipe
            await RecipeService.updateRecipe(recipeId, recipeData);
            alert('Recipe updated successfully!');
        } else {
            // Create new recipe
            await RecipeService.createRecipe(recipeData);
            alert('Recipe created successfully!');
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
    
    const rating = parseInt(document.getElementById('commentRating').value);
    const comment = document.getElementById('commentText').value;
    
    try {
        await RecipeService.addComment(currentRecipeId, rating, comment);
        alert('Review submitted successfully!');
        
        // Reset form
        document.getElementById('commentRating').value = '5';
        document.getElementById('commentText').value = '';
        
        // Reload recipe to show new comment
        showRecipeDetail(currentRecipeId);
    } catch (error) {
        console.error('Failed to submit comment:', error);
        alert('Failed to submit review: ' + error.message);
    }
}

// Initialize recipes page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
        // Load recipes
        loadAllRecipes();
        loadUserRecipes();
        
        // Show create button for logged-in users
        const user = AuthService.getUser();
        const createBtn = document.getElementById('createRecipeBtn');
        if (user && user.role === 'user' && createBtn) {
            createBtn.style.display = 'inline-block';
        }
        
        // Attach search handler
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', handleSearch);
        }
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
