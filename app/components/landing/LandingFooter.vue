<template>
  <footer class="border-t border-slate-200 bg-white px-5 pb-8 pt-12 sm:px-8 sm:pt-16">
    <div class="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div>
        <NuxtLink to="/" aria-label="Thinky home" class="inline-flex items-center gap-2.5">
          <AppLogo class="size-8 text-[#111827]" />
          <span class="text-[15px] font-semibold tracking-[-0.04em] text-slate-950">thinky</span>
        </NuxtLink>
        <p class="mt-4 max-w-xs text-sm leading-6 text-slate-500">A little more room to think. An assistant that remembers the context and helps you move things forward.</p>
      </div>
      <div>
        <h2 class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Explore</h2>
        <div class="mt-4 grid gap-3 text-sm text-slate-600">
          <NuxtLink to="/capabilities" class="hover:text-slate-950">Capabilities</NuxtLink>
          <NuxtLink to="/meeting-assistant" class="hover:text-slate-950">Meeting assistant</NuxtLink>
          <NuxtLink to="/#how-it-works" class="hover:text-slate-950">How it works</NuxtLink>
        </div>
      </div>
      <div>
        <h2 class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Your space</h2>
        <div class="mt-4 grid gap-3 text-sm text-slate-600">
          <NuxtLink to="/login" class="hover:text-slate-950">Open Thinky</NuxtLink>
          <NuxtLink to="/login" class="hover:text-slate-950">Sign in</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-slate-950">Privacy</NuxtLink>
        </div>
      </div>
      <div>
        <h2 class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Built for thoughtful work</h2>
        <p class="mt-4 text-sm leading-6 text-slate-500">A personal assistant, not another place to keep up with.</p>
      </div>
    </div>
    <div class="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-slate-100 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>© {{ new Date().getFullYear() }} Thinky</span>
      <span>Present when you need it. Quiet when you don’t.</span>
    </div>
  </footer>
</template>
