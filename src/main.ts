import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
   faChartLine,
   faComments,
   faGear,
   faRightFromBracket,
   faXmark,
   faBars,
   faEye,
   faDatabase,
   faCircle,
   faArrowLeft,
   faFileLines,
   faPlus,
   faPen,
   faTrash,
   faToggleOn,
   faToggleOff,
   faUsers,
   faPlane,
   faCalendar,
   faFileExport,
   faChartPie,
   faHome,
   faPaperPlane,
   faArrowsRotate,
   faLock,
   faUser,
   faCircleQuestion,
   faTag,
   faLocationDot,
   faUserDoctor,
   faPlaneArrival,
   faBroom,
   faUserShield,
   faVideo,
   faUserSlash,
   faHotel,
   faClockRotateLeft,
   faCircleCheck,
   faCircleExclamation,
   faCircleInfo,
   faGaugeHigh,
   faRankingStar,
   faListUl,
   faRotateRight,
   faBell,
   faCheck,
   faClock,
   faTriangleExclamation,
   faChevronRight,
   faMagnifyingGlass,
   faStar,
   faSliders,
   faChevronLeft,
} from '@fortawesome/free-solid-svg-icons'

library.add(
   faChartLine, faComments, faGear, faRightFromBracket, faXmark, faBars,
   faEye, faDatabase, faCircle, faArrowLeft, faFileLines, faPlus, faPen,
   faTrash, faToggleOn, faToggleOff, faUsers, faPlane, faCalendar,
   faFileExport, faChartPie, faHome, faPaperPlane, faArrowsRotate, faLock,
   faUser, faCircleQuestion, faTag, faLocationDot, faUserDoctor,
   faPlaneArrival, faBroom, faUserShield, faVideo, faUserSlash, faHotel,
   faClockRotateLeft, faCircleCheck, faCircleExclamation, faCircleInfo,
   faGaugeHigh, faRankingStar, faListUl, faRotateRight, faBell, faCheck,
   faClock, faTriangleExclamation, faChevronRight, faMagnifyingGlass,
   faSliders, faChevronLeft,
   faStar,
)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)
app.use(createPinia())
app.use(router)
app.mount('#app')
