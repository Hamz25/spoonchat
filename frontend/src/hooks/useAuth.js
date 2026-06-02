import { useCallback } from 'react'
import { authAPI } from '../api'
import { initializeKeyPair, clearKeyPair } from '../crypto'
import useStore from '../store'

export function useAuth() {

    const { setCurrentUser } = useStore()
    const login = useCallback(async (username, password) => {
    // first get the tokens from the backend
        const response = await authAPI.login({username, password})
        const { access,refresh } = response.data

    // second save tokens to localStorage
    localStorage.setItem('spoonchat_access_token', access)
    localStorage.setItem('spoonchat_refresh_token', refresh)

    // third fetch user's profile and put it in a global state
    const profileResponse = await authAPI.getProfile()
    setCurrentUser(profileResponse.data)

    //step 4 initialize end2end encryption keys
    await initializeKeyPair(async(publicKey) => {
        await authAPI.uploadPublicKey(publicKey)
    })
    return profileResponse.data
    }, [setCurrentUser])
    const register = useCallback(async (username, email, password, password2) => {
        // Create the account on the Django backend
        const response = await authAPI.register({ 
            username, 
            email, 
            password, 
            password2,
        })

        // Extract tokens (Your RegisterView returns them inside a 'tokens' object)
        const { access, refresh } = response.data.tokens

        // Save auth tokens to localStorage
        localStorage.setItem('spoonchat_access_token', access)
        localStorage.setItem('spoonchat_refresh_token', refresh)

        // Initialize E2EE Keys AND upload the public key instantly
        await initializeKeyPair(async (publicKey) => {
            await authAPI.uploadPublicKey(publicKey)
        })

        // Save the new user to the global Zustand state
        setCurrentUser(response.data.user)
        
        return response.data.user
    }, [setCurrentUser])
    const logout = useCallback(() => {
        clearKeyPair()
        // remove the end2end encryption keys from localStorage
        localStorage.removeItem('spoonchat_access_token')
        localStorage.removeItem('spoonchat_refresh_token')
        setCurrentUser(null)
    }, [setCurrentUser])

    const restoreSession = useCallback(async () => {
        // check if there is a valid session already exists
        const token = localStorage.getItem('spoonchat_access_token')
        if(!token) return null
        
        try {
            const response = await authAPI.getProfile()
            setCurrentUser(response.data)
            // re-initialize keys in case it was cleared
            await initializeKeyPair(async(publicKey) => {
                await authAPI.uploadPublicKey(publicKey)
            })
            return response.data
        } catch {
            // Token might be expired or invalid, clear everything just in case
            localStorage.clear()
            return null
        }
    }, [setCurrentUser])

    return { login,register, logout, restoreSession }
}
