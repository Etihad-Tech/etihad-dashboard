import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { aiApi, teamApi } from '../api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const teamToken = ref<string | null>(localStorage.getItem('team_token'))
  const username = ref<string | null>(localStorage.getItem('admin_username'))
  // AI-side role from /auth/login: 'admin' | 'flight' | 'qa' (null = team-only/legacy).
  // Drives which panels the dashboard shows; the API enforces it independently.
  const role = ref<string | null>(localStorage.getItem('ai_role'))

  const isAuthenticated = computed(() => !!token.value || !!teamToken.value)

  async function login(user: string, password: string): Promise<boolean> {
    const results = await Promise.allSettled([
      aiApi.post('/auth/login', { username: user, password }),
      teamApi.post('/api/auth/login', { username: user, password }),
    ])

    let success = false

    const aiResult = results[0]
    if (aiResult.status === 'fulfilled' && aiResult.value.data.token) {
      token.value = aiResult.value.data.token
      localStorage.setItem('token', aiResult.value.data.token)
      role.value = aiResult.value.data.role || 'admin'
      localStorage.setItem('ai_role', role.value as string)
      success = true
    }

    const teamResult = results[1]
    if (teamResult.status === 'fulfilled' && teamResult.value.data.token) {
      teamToken.value = teamResult.value.data.token
      localStorage.setItem('team_token', teamResult.value.data.token)
      success = true
    }

    if (success) {
      username.value = user
      localStorage.setItem('admin_username', user)
    }

    return success
  }

  function logout() {
    token.value = null
    teamToken.value = null
    username.value = null
    role.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('team_token')
    localStorage.removeItem('admin_username')
    localStorage.removeItem('ai_role')
  }

  return { token, teamToken, username, role, isAuthenticated, login, logout }
})
