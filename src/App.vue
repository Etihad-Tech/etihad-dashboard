<template>
  <router-view />
  <ConfirmDialog />
  <ToastHost />
</template>

<script setup lang="ts">
import ConfirmDialog from './components/ConfirmDialog.vue'
import ToastHost from './components/ToastHost.vue'
</script>
