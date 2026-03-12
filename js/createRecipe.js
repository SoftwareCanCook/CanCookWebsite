const form = document.getElementById('create-recipe-form');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('recipe-name').value.trim();
    const cookTime = parseInt(document.getElementById('cook-time').value);
    const ingredientsText = document.getElementById('ingredients').value.trim();
    const instructionsText = document.getElementById('instructions').value.trim();
    
    if (!name || !cookTime || !ingredientsText || !instructionsText) {
        messageDiv.textContent = 'Please fill in all fields.';
        messageDiv.style.color = 'red';
        return;
    }
    
    const ingredients = ingredientsText.split('\n').map(item => item.trim()).filter(item => item);
    const instructions = instructionsText.split('\n').map(item => item.trim()).filter(item => item);
    
    const recipeData = {
        name,
        cookTime,
        ingredients,
        instructions
    };
    
    try {
        const response = await RecipesService.createRecipe(recipeData);
        messageDiv.textContent = 'Recipe created successfully!';
        messageDiv.style.color = 'green';
        form.reset();
        // Optionally redirect to [index.html](http://_vscodecontentref_/6) or the new recipe page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        messageDiv.textContent = 'Error creating recipe: ' + error.message;
        messageDiv.style.color = 'red';
    }
});