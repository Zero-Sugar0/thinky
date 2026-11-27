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

    <section class="border-y border-slate-200 bg-[#f7f8fa] px-5 py-4 sm:px-8">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-[13px] text-slate-600">One assistant for the parts of your day that connect.</p>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-slate-600">
          <span class="inline-flex items-center gap-1.5"><UIcon name="i-lucide-brain" class="size-3.5 text-[#2f6bff]" /> Keeps useful context</span>
          <span class="inline-flex items-center gap-1.5"><UIcon name="i-lucide-search" class="size-3.5 text-[#2f6bff]" /> Finds what matters</span>
          <span class="inline-flex items-center gap-1.5"><UIcon name="i-lucide-messages-square" class="size-3.5 text-[#2f6bff]" /> Joins the conversation</span>
        </div>
      </div>
    </section>

    <LandingSections />
    <LandingFaq />

    <section class="border-t border-slate-200 px-5 py-16 sm:px-8 sm:py-20">
      <div class="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-xl">
          <AppLogo class="size-8 text-[#2f6bff]" />
          <h2 class="mt-4 text-balance text-3xl font-medium leading-tight text-slate-950 sm:text-4xl">Make a little more room for the work that matters.</h2>
          <p class="mt-3 max-w-lg text-pretty text-[15px] leading-6 text-slate-600">Bring your context. Bring your questions. Thinky will meet you there.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <UButton to="/login" color="primary" size="lg" class="rounded-full px-5">Get started <UIcon name="i-lucide-arrow-up-right" class="size-4" /></UButton>
          <UButton to="/capabilities" color="neutral" variant="outline" size="lg" class="rounded-full border-slate-300 bg-white px-5">Explore capabilities</UButton>
        </div>
      </div>
    </section>

    <LandingFooter />
  </main>
</template>
