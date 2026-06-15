import axios from 'axios'

const BASE_URL = 'http://localhost:8000'

const api = axios.create({
    baseURL: BASE_URL
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('spoonchat_access_token')
    if(token) {
        config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
(response) => response,
async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      // 401 = token expired or invalid
      // _retry flag prevents infinite retry loops
    original._retry = true

    try {
        const refresh = localStorage.getItem('spoonchat_refresh_token')
        const response = await axios.post(`${BASE_URL}/api/auth/refresh/`, {
        refresh,
        })
        // Get a new access token using the refresh token
        const newAccess = response.data.access
        localStorage.setItem('spoonchat_access_token', newAccess)

        // Retry the original failed request with the new token
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
    } catch {
        // Refresh token also expired — force logout
        localStorage.clear()
        window.location.href = '/login'
    }
    }
    return Promise.reject(error)
    }
)

// Auth endpoints

export const authAPI = {
    register: (data) => api.post('/api/auth/register/', data),
    login: (data) => api.post('/api/auth/login/', data),
    getProfile: () => api.get('/api/auth/profile/'),
    uploadPublicKey: (publicKey) => api.post('/api/auth/profile/public_key/', { public_key: publicKey }),
    searchUsers: (q) => api.get(`/api/auth/users/search/?q=${encodeURIComponent(q)}`),
}

// chat endpoints

export const chatAPI = {
    getConversations: () => api.get('/api/chat/conversations/'),
    createConversation: (data) => api.post('/api/chat/conversations/', data),
    getMessages: (conversationId, limit = 50, offset = 0) =>
        api.get(`/api/chat/conversations/${conversationId}/messages/`, {
        params: { limit, offset },
        }),
    deleteConversation: (conversationId, forEveryone) =>
        api.delete(`/api/chat/conversations/${conversationId}/`, {
        data: { for_everyone: forEveryone } // Send the checkbox status to Django
    }),
}