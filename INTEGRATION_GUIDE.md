# CanCook - Frontend & Backend Integration Guide

## Overview
This project connects a static HTML/CSS/JavaScript frontend with a Spring Boot backend API. The frontend communicates with the backend via RESTful API calls using JWT authentication.

## Architecture

```
Frontend (HTML/CSS/JS)  ←→  Spring Boot Backend  ←→  Database
     Port: 5500                Port: 8080           (H2/MySQL)
```

## Frontend Structure

### JavaScript Files (`/js`)
- **config.js** - API endpoint configuration
- **api.js** - Core API service for HTTP requests
- **auth.js** - Authentication & authorization logic
- **recipes.js** - Recipe functionality
- **pantry.js** - Pantry management
- **stores.js** - Store and grocery item management

### HTML Pages
- **index.html** - Home page with recipe listings
- **login.html** - User login
- **signup.html** - User registration
- **pantry.html** - User's pantry items
- **stores.html** - Grocery stores and items

## Backend Setup (Spring Boot)

### 1. Create Spring Boot Project
```bash
# Using Spring Initializer or Maven
spring init --dependencies=web,data-jpa,security,h2,lombok \
  --group=com.cancook \
  --artifact=cancook-backend \
  --name=CanCookBackend \
  cancook-backend
```

### 2. Required Dependencies (`pom.xml`)
```xml
<dependencies>
    <!-- Spring Boot Starter Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Spring Boot Starter Data JPA -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    
    <!-- Spring Boot Starter Security -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    
    <!-- H2 Database (Development) -->
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    
    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### 3. Configuration Files
Copy the files from `/backend-config` to your Spring Boot project:
- `WebConfig.java` → `src/main/java/com/cancook/config/`
- `SecurityConfig.java` → `src/main/java/com/cancook/config/`
- `JwtTokenUtil.java` → `src/main/java/com/cancook/config/`
- `application.properties` → `src/main/resources/`

### 4. Create Entity Models

```java
// User.java
@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @OneToMany(mappedBy = "user")
    private List<PantryItem> pantryItems;
    
    @OneToMany(mappedBy = "user")
    private List<Recipe> recipes;
}

// Recipe.java
@Entity
@Table(name = "recipes")
@Data
public class Recipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String imageUrl;
    private String cookTime;
    private Double averageRating;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    @OneToMany(mappedBy = "recipe")
    private List<Ingredient> ingredients;
    
    @ElementCollection
    private List<String> instructions;
    
    @OneToMany(mappedBy = "recipe")
    private List<Comment> comments;
}

// PantryItem.java
@Entity
@Table(name = "pantry_items")
@Data
public class PantryItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String category;
    private Integer quantity;
    private String unit;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
}

// Store.java
@Entity
@Table(name = "stores")
@Data
public class Store {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String address;
    private String phone;
    private String logoUrl;
    
    @OneToMany(mappedBy = "store")
    private List<StoreItem> items;
}
```

### 5. Create REST Controllers

```java
// AuthController.java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Authenticate user and return JWT token
    }
    
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        // Register user and return JWT token
    }
}

// RecipeController.java
@RestController
@RequestMapping("/api/recipes")
public class RecipeController {
    
    @GetMapping
    public List<Recipe> getAllRecipes() { }
    
    @GetMapping("/{id}")
    public Recipe getRecipeById(@PathVariable Long id) { }
    
    @GetMapping("/user")
    public List<Recipe> getUserRecipes() { }
    
    @GetMapping("/search")
    public List<Recipe> searchRecipes(@RequestParam String q) { }
}

// PantryController.java
@RestController
@RequestMapping("/api/pantry")
public class PantryController {
    
    @GetMapping("/items")
    public List<PantryItem> getPantryItems() { }
    
    @PostMapping("/items")
    public PantryItem addItem(@RequestBody PantryItem item) { }
    
    @DeleteMapping("/items/{id}")
    public void removeItem(@PathVariable Long id) { }
}
```

## Running the Application

### Frontend
1. Use VS Code Live Server extension:
   ```
   Right-click on index.html → Open with Live Server
   ```
   Or use Python HTTP server:
   ```bash
   python -m http.server 5500
   ```

2. Access at: `http://localhost:5500`

### Backend
1. Navigate to Spring Boot project:
   ```bash
   cd cancook-backend
   ```

2. Run Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```

3. API available at: `http://localhost:8080/api`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

### Recipes
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/{id}` - Get recipe by ID
- `GET /api/recipes/user` - Get user's recipes
- `GET /api/recipes/search?q={query}` - Search recipes

### Pantry
- `GET /api/pantry/items` - Get user's pantry items
- `POST /api/pantry/items` - Add item to pantry
- `DELETE /api/pantry/items/{id}` - Remove item from pantry

### Stores
- `GET /api/stores` - Get all stores
- `GET /api/stores/{id}/items` - Get store items

## Configuration

### Change Backend URL
Edit `js/config.js`:
```javascript
const API_CONFIG = {
    BASE_URL: 'http://your-backend-url:8080/api',
    // ...
};
```

### Enable CORS for Different Origins
Edit `WebConfig.java`:
```java
.allowedOrigins(
    "http://localhost:3000",
    "https://your-frontend-domain.com"
)
```

## Security

### JWT Token Flow
1. User logs in → Backend returns JWT token
2. Frontend stores token in `localStorage`
3. All subsequent requests include token in `Authorization` header
4. Backend validates token and processes request

### Protected Routes
The frontend checks authentication before accessing:
- Pantry page
- User recipes
- Adding comments

## Testing

### Test API Endpoints
Use curl or Postman:
```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Get recipes (with token)
curl http://localhost:8080/api/recipes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Deployment

### Frontend
Deploy static files to:
- GitHub Pages
- Netlify
- Vercel

### Backend
Deploy Spring Boot to:
- Heroku
- AWS Elastic Beanstalk
- DigitalOcean App Platform

Update `API_CONFIG.BASE_URL` in production to point to deployed backend.

## Troubleshooting

### CORS Issues
- Verify backend CORS configuration includes frontend URL
- Check browser console for CORS errors
- Ensure `allowCredentials(true)` if using cookies

### Authentication Issues
- Check JWT token in localStorage
- Verify token expiration (24 hours default)
- Check Spring Security configuration

### API Not Responding
- Ensure backend is running on port 8080
- Check firewall rules
- Verify endpoint URLs match configuration

## Next Steps
1. Implement remaining entity models
2. Create repository interfaces
3. Implement service layer business logic
4. Add validation and error handling
5. Write unit tests
6. Add image upload functionality
7. Implement recipe rating system
