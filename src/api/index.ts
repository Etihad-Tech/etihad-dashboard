import axios, { type AxiosInstance } from 'axios'
import { useAuthStore } from '../stores/auth'

function createApi(baseURL: string, tokenKey: 'token' | 'teamToken' = 'token'): AxiosInstance {
   const instance = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' },
   })

   instance.interceptors.request.use((config) => {
      const auth = useAuthStore()
      const t = auth[tokenKey]
      if (t) {
         config.headers.Authorization = `Bearer ${t}`
      }
      return config
   })

   instance.interceptors.response.use(
      (response) => response,
      (error) => {
         if (error.response?.status === 401) {
            const auth = useAuthStore()
            auth.logout()
            window.location.href = '/login'
         }
         return Promise.reject(error)
      },
   )

   return instance
}

export const aiApi = createApi(
   import.meta.env.VITE_AI_API_URL || 'http://localhost:8000',
)

export const teamApi = createApi(
   import.meta.env.VITE_TEAM_API_URL || 'http://localhost:8001',
   'teamToken',
)

export default aiApi
