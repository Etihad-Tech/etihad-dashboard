import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue'),
    },

    {
      path: '/ai',
      name: 'AiDashboard',
      component: () => import('../apps/ai/views/Dashboard.vue'),
    },
    {
      path: '/ai/messages',
      name: 'AiMessages',
      component: () => import('../apps/ai/views/Messages.vue'),
    },
    {
      path: '/ai/settings',
      name: 'AiSettings',
      component: () => import('../apps/ai/views/Settings.vue'),
    },
    {
      path: '/ai/templates',
      name: 'AiTemplates',
      component: () => import('../apps/ai/views/Templates.vue'),
    },
    {
      path: '/ai/qa',
      name: 'AiQa',
      component: () => import('../apps/ai/views/Qa.vue'),
    },
    {
      path: '/ai/reyslar',
      name: 'AiReyslar',
      component: () => import('../apps/ai/views/Reyslar.vue'),
    },
    {
      path: '/ai/staff',
      name: 'AiStaff',
      component: () => import('../apps/ai/views/Staff.vue'),
    },
    {
      path: '/ai/ellikboshi',
      name: 'AiEllikboshi',
      component: () => import('../apps/ai/views/Ellikboshi.vue'),
    },
    {
      path: '/ai/groups',
      name: 'AiGroups',
      component: () => import('../apps/ai/views/Groups.vue'),
    },
    {
      path: '/ai/redis',
      name: 'AiRedis',
      component: () => import('../apps/ai/views/Redis.vue'),
    },

    {
      path: '/team',
      name: 'TeamDashboard',
      component: () => import('../apps/team/views/Dashboard.vue'),
    },
    {
      path: '/team/trips',
      name: 'TeamTrips',
      component: () => import('../apps/team/views/trips/TripsList.vue'),
    },
    {
      path: '/team/trips/:id',
      name: 'TeamTripDetail',
      component: () => import('../apps/team/views/trips/TripDetail.vue'),
    },
    {
      path: '/team/trips/:tripId/posts/new',
      name: 'TeamPostNew',
      component: () => import('../apps/team/views/posts/PostEditor.vue'),
    },
    {
      path: '/team/trips/:tripId/posts/:postId/edit',
      name: 'TeamPostEdit',
      component: () => import('../apps/team/views/posts/PostEditor.vue'),
    },
    {
      path: '/team/templates',
      name: 'TeamTemplates',
      component: () => import('../apps/team/views/templates/TemplatesList.vue'),
    },
    {
      path: '/team/templates/:id',
      name: 'TeamTemplateDetail',
      component: () => import('../apps/team/views/templates/TemplateDetail.vue'),
    },
    {
      path: '/team/polls',
      name: 'TeamPolls',
      component: () => import('../apps/team/views/polls/PollsList.vue'),
    },
    {
      path: '/team/polls/responses',
      name: 'TeamPollResponses',
      component: () => import('../apps/team/views/polls/PollResponses.vue'),
    },
    {
      path: '/team/export',
      name: 'TeamExport',
      component: () => import('../apps/team/views/Export.vue'),
    },
  ],
})

// Where each role lands, and which paths it may reach. Managers (flight/qa) are
// confined to their one panel; admin (and team-only/legacy, role null) unchanged.
const ROLE_HOME: Record<string, string> = { flight: '/ai/reyslar', qa: '/ai/qa', mingboshi: '/ai/ellikboshi', admin: '/' }

function roleAllows(path: string, role: string | null): boolean {
  if (role === 'flight') return path === '/ai/reyslar'
  if (role === 'qa') return path === '/ai/qa'
  if (role === 'mingboshi') return path === '/ai/ellikboshi'
  return true
}

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.guest && !auth.isAuthenticated) {
    return '/login'
  }
  const home = ROLE_HOME[auth.role || ''] || '/'
  if (to.meta.guest && auth.isAuthenticated) {
    return home
  }
  if (auth.isAuthenticated && (auth.role === 'flight' || auth.role === 'qa' || auth.role === 'mingboshi') && !roleAllows(to.path, auth.role)) {
    return home
  }
})

export default router
