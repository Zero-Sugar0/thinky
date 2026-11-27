<script setup lang="ts">
const menuOpen = ref(false);
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
    <div class="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
      <NuxtLink to="/" aria-label="Thinky home" class="flex items-center gap-2.5">
        <AppLogo class="size-8 text-[#2f6bff]" />
        <span class="text-[15px] font-semibold tracking-[-0.04em] text-slate-950">thinky</span>
      </NuxtLink>

      <nav aria-label="Main navigation" class="hidden items-center gap-8 text-[13px] font-medium text-slate-600 md:flex">
        <NuxtLink to="/capabilities" class="transition-colors hover:text-slate-950">What Thinky does</NuxtLink>
        <NuxtLink to="/meeting-assistant" class="transition-colors hover:text-slate-950">Meetings</NuxtLink>
        <NuxtLink to="/#how-it-works" class="transition-colors hover:text-slate-950">How it works</NuxtLink>
        <NuxtLink to="/#faq" class="transition-colors hover:text-slate-950">FAQ</NuxtLink>
      </nav>

      <div class="hidden items-center gap-4 md:flex">
        <NuxtLink to="/login" class="text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-950">Log in</NuxtLink>
        <UButton to="/login" color="primary" size="sm" class="rounded-full px-4 font-medium">Get started</UButton>
      </div>

      <UButton
        class="md:hidden"
        color="neutral"
        variant="ghost"
        :icon="menuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        :aria-expanded="menuOpen"
        aria-controls="mobile-navigation"
        @click="menuOpen = !menuOpen"
      />
    </div>

    <nav v-if="menuOpen" id="mobile-navigation" aria-label="Mobile navigation" class="grid gap-1 border-t border-slate-100 bg-white px-5 py-3 md:hidden">
      <NuxtLink to="/capabilities" class="rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" @click="menuOpen = false">What Thinky does</NuxtLink>
      <NuxtLink to="/meeting-assistant" class="rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" @click="menuOpen = false">Meetings</NuxtLink>
      <NuxtLink to="/#how-it-works" class="rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" @click="menuOpen = false">How it works</NuxtLink>
      <NuxtLink to="/login" class="mt-1 rounded-lg bg-[#2f6bff] px-3 py-2.5 text-center text-sm font-medium text-white" @click="menuOpen = false">Get started</NuxtLink>
    </nav>
  </header>
</template>
