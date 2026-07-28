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
      path: '/ai/hotels',
      name: 'AiHotels',
      component: () => import('../apps/ai/views/Hotels.vue'),
    },
    {
      path: '/ai/admins',
      name: 'AiAdmins',
      component: () => import('../apps/ai/views/Admins.vue'),
    },
    {
      path: '/ai/yonaltirish',
      name: 'AiInquiryRouting',
      component: () => import('../apps/ai/views/InquiryRouting.vue'),
    },
    {
      path: '/ai/qora-royxat',
      name: 'AiBlacklist',
      component: () => import('../apps/ai/views/Blacklist.vue'),
    },
    {
      path: '/ai/videos',
      name: 'AiVideos',
      component: () => import('../apps/ai/views/Videos.vue'),
    },
    {
      path: '/ai/redis',
      name: 'AiRedis',
      component: () => import('../apps/ai/views/Redis.vue'),
    },
    {
      path: '/ai/audit-log',
      name: 'AiAuditLog',
      component: () => import('../apps/ai/views/AuditLog.vue'),
    },
    {
      path: '/ai/nazorat',
      name: 'AiNazorat',
      component: () => import('../apps/ai/views/Nazorat.vue'),
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
const ROLE_HOME: Record<string, string> = { flight: '/ai/reyslar', qa: '/ai/qa', mingboshi: '/ai/ellikboshi', nazoratchi: '/ai/nazorat', nazoratchi_staff: '/ai/nazorat', nazoratchi_ellikboshi: '/ai/nazorat', admin: '/' }

// The three controller logins are identical to the router — same single panel; they
// differ only in WHICH population the API lets each of them read.
const NAZORATCHI_ROLES = ['nazoratchi', 'nazoratchi_staff', 'nazoratchi_ellikboshi']

// The mingboshi manages leaders, staff, inquiry routing, and the hotels list.
const MINGBOSHI_PATHS = ['/ai/ellikboshi', '/ai/staff', '/ai/yonaltirish', '/ai/hotels']
// The qa manager owns the knowledge base, the per-group hotel/tier setup
// (/ai/groups), AND the main Guruhlar page ('/') where the bots are started per
// group (needs a Turon team token — the login posts to both APIs to obtain one).
const QA_PATHS = ['/', '/ai/qa', '/ai/groups', '/ai/templates']

function roleAllows(path: string, role: string | null): boolean {
  if (role === 'flight') return path === '/ai/reyslar'
  if (role === 'qa') return QA_PATHS.includes(path)
  if (role === 'mingboshi') return MINGBOSHI_PATHS.includes(path)
  // A nazoratchi (controller) sees ONLY the Nazorat panel.
  if (role && NAZORATCHI_ROLES.includes(role)) return path === '/ai/nazorat'
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
  const gated = ['flight', 'qa', 'mingboshi', ...NAZORATCHI_ROLES]
  if (auth.isAuthenticated && auth.role && gated.includes(auth.role) && !roleAllows(to.path, auth.role)) {
    return home
  }
})

export default router
