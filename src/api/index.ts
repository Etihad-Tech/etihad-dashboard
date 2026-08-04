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
         // A 401 from the LOGIN call is not an expired session — it means these
         // credentials are not valid for THIS api, which is normal and expected.
         //
         // The login posts to BOTH apis at once (see stores/auth.ts) because an admin
         // needs a token from each. Every other account exists on only one of them, so
         // the other api answers 401 — and this interceptor was then wiping the token
         // the good api had just issued and redirecting to /login. Whichever request
         // finished first decided whether the user got in, so a controller logging in
         // had to try several times before it stuck. Measured against prod: the team
         // api answers 401 in ~0.38s while the ai api issues the token in ~0.45s, so
         // the destructive branch usually won.
         //
         // Session expiry still logs out, which is the case this was written for.
         const isLoginCall = (error.config?.url || '').includes('/auth/login')
         if (error.response?.status === 401 && !isLoginCall) {
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
