<script setup lang="ts">
definePageMeta({ layout: false, prerender: true });
useSeoMeta({
  title: "Thinky — your personal AI assistant",
  description: "A personal AI assistant that remembers the context you choose, works across your tools, and can participate in meetings with you.",
  ogTitle: "Thinky — a little more room to think",
  ogDescription: "A personal AI assistant with continuity, useful tools, and a voice in the room when it helps.",
});
</script>

<template>
  <main class="marketing-page">
    <LandingHeader />
    <LandingHero />

    <section class="border-y border-slate-200 bg-[#f7f8fa] px-5 py-6 sm:px-8">
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p class="text-xs font-medium text-slate-500">One assistant for the parts of your day that connect.</p>
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500"><span class="inline-flex items-center gap-2"><UIcon name="i-lucide-brain" class="size-3.5 text-[#2f6bff]"/> Keeps useful context</span><span class="inline-flex items-center gap-2"><UIcon name="i-lucide-search" class="size-3.5 text-[#2f6bff]"/> Finds what matters</span><span class="inline-flex items-center gap-2"><UIcon name="i-lucide-messages-square" class="size-3.5 text-[#2f6bff]"/> Joins the conversation</span></div>
      </div>
    </section>

    <LandingSections />
    <LandingFaq />

    <section class="px-5 py-20 sm:px-8 sm:py-28">
      <div class="mx-auto max-w-4xl text-center">
        <AppLogo class="mx-auto size-10 text-[#2f6bff]" />
        <h2 class="mt-5 text-balance text-3xl font-medium leading-tight tracking-[-0.05em] text-slate-950 sm:text-5xl">Make a little more room<br class="hidden sm:block"> for the work that matters.</h2>
        <p class="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Bring your context. Bring your questions. Thinky will meet you there.</p>
        <div class="mt-7 flex flex-wrap justify-center gap-3"><UButton to="/login" color="primary" size="lg" class="rounded-full px-6">Get started <UIcon name="i-lucide-arrow-up-right" class="size-4"/></UButton><UButton to="/capabilities" color="neutral" variant="outline" size="lg" class="rounded-full border-slate-300 bg-white px-6">Explore capabilities</UButton></div>
      </div>
    </section>

    <LandingFooter />
  </main>
</template>
