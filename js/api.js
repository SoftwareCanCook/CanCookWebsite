// Core API Service
class ApiService {
    
    // Generic GET request
    static async get(endpoint, params = {}) {
        try {
            const url = new URL(getApiUrl(endpoint));
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('GET request failed:', error);
            throw error;
        }
    }
    
    // Generic POST request
    static async post(endpoint, data = {}) {
        try {
            const response = await fetch(getApiUrl(endpoint), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('POST request failed:', error);
            throw error;
        }
    }
    
    // Generic PUT request
    static async put(endpoint, data = {}) {
        try {
            const response = await fetch(getApiUrl(endpoint), {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('PUT request failed:', error);
            throw error;
        }
    }
    
    // Generic DELETE request
    static async delete(endpoint) {
        try {
            const response = await fetch(getApiUrl(endpoint), {
                method: 'DELETE',
                headers: this.getHeaders(),
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('DELETE request failed:', error);
            throw error;
        }
    }
    
    // Get headers with authentication token
    static getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        const token = AuthService.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }
    
    // Handle API response
    static async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                message: 'An error occurred'
            }));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }
        
        // Check if response has content
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return response;
    }
}
