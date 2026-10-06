<template>
   <!-- The crew screens' language. Each label is written in its own language, so the
        reader who needs the other one can still find it. -->
   <div class="flex justify-end" dir="ltr">
      <div class="seg seg-sm" role="group" aria-label="Til / اللغة">
         <button type="button" :class="crewLang === 'uz' ? 'is-on' : ''" lang="uz"
            @click="setCrewLang('uz')">O'zbekcha</button>
         <button type="button" :class="crewLang === 'ar' ? 'is-on' : ''" lang="ar"
            @click="setCrewLang('ar')">العربية</button>
      </div>
   </div>
</template>

<script setup lang="ts">
import { crewLang, setCrewLang } from './crew'
</script>
