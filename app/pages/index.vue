<script setup lang="ts">
definePageMeta({
  layout: false,
  prerender: true,
});

useSeoMeta({
  title: "Thinky — your personal AI assistant",
  description: "A personal AI assistant that remembers what matters, works across your tools, and helps move your day forward.",
  ogTitle: "Thinky — your personal AI assistant",
  ogDescription: "A little more room to think. Meet your always-on personal assistant.",
});
</script>

<template>
  <main class="min-h-svh overflow-hidden bg-[#080808] text-white">
    <header class="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
      <NuxtLink to="/" aria-label="Thinky home" class="flex items-center gap-2.5">
        <AppLogo class="size-7 text-white grayscale" />
        <span class="text-sm font-semibold tracking-tight">Thinky</span>
      </NuxtLink>
      <nav aria-label="Main navigation" class="flex items-center gap-5 text-xs text-white/65 sm:gap-8 sm:text-sm">
        <NuxtLink to="#faq" class="transition-colors hover:text-white">FAQ</NuxtLink>
        <NuxtLink to="/login" class="transition-colors hover:text-white">Sign in</NuxtLink>
        <UButton to="/login" color="neutral" size="sm" class="rounded-full bg-white px-4 font-medium text-black hover:bg-white/85">
          Get started
        </UButton>
      </nav>
    </header>

    <LandingHero />

    <section id="how-it-helps" class="border-t border-white/10 bg-[#0d0d0d] px-5 py-16 sm:px-8 sm:py-24">
      <div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Less busywork, more you</p>
          <h2 class="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-4xl">
            The context is what makes an assistant useful.
          </h2>
        </div>
        <div class="grid gap-0 sm:grid-cols-2 sm:gap-x-10">
          <article class="border-t border-white/10 py-5">
            <UIcon name="i-lucide-brain" class="size-4 text-white/70" />
            <h3 class="mt-3 text-sm font-medium">Pick up where you left off</h3>
            <p class="mt-2 text-sm leading-6 text-white/50">Your preferences and ongoing context stay available across conversations.</p>
          </article>
          <article class="border-t border-white/10 py-5">
            <UIcon name="i-lucide-message-square-text" class="size-4 text-white/70" />
            <h3 class="mt-3 text-sm font-medium">Meet you in your workflow</h3>
            <p class="mt-2 text-sm leading-6 text-white/50">Chat on the web and connect the messaging apps and services you rely on.</p>
          </article>
          <article class="border-t border-white/10 py-5">
            <UIcon name="i-lucide-globe-2" class="size-4 text-white/70" />
            <h3 class="mt-3 text-sm font-medium">Find answers and take action</h3>
            <p class="mt-2 text-sm leading-6 text-white/50">Bring together web research, connected tools, and practical next steps.</p>
          </article>
          <article class="border-t border-white/10 py-5">
            <UIcon name="i-lucide-hand" class="size-4 text-white/70" />
            <h3 class="mt-3 text-sm font-medium">Stay in control</h3>
            <p class="mt-2 text-sm leading-6 text-white/50">Set the direction, review proposed actions, and make Thinky your own.</p>
          </article>
        </div>
      </div>
    </section>

    <LandingFaq />

    <footer id="contact" class="border-t border-white/10 px-5 pb-7 pt-8 sm:px-8 sm:pt-10">
      <div class="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <NuxtLink to="/" aria-label="Thinky home" class="flex items-center gap-2.5">
            <AppLogo class="size-6 text-white grayscale" />
            <span class="text-sm font-semibold">Thinky</span>
          </NuxtLink>
          <p class="mt-3 max-w-xs text-xs leading-5 text-white/50">A personal assistant for the things you think, plan, and do.</p>
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/65">
          <NuxtLink to="/login" class="hover:text-white">Get started</NuxtLink>
          <NuxtLink to="#faq" class="hover:text-white">FAQ</NuxtLink>
          <NuxtLink to="/login" class="hover:text-white">Sign in</NuxtLink>
        </div>
      </div>
      <div class="mx-auto mt-8 flex max-w-6xl justify-between border-t border-white/10 pt-4 font-mono text-[10px] text-white/40">
        <span>© {{ new Date().getFullYear() }} Thinky</span>
        <span>Made for more thoughtful days</span>
      </div>
      <div aria-hidden="true" class="landing-wordmark select-none">THINKY</div>
    </footer>
  </main>
</template>

<style scoped>
.landing-wordmark {
  overflow: hidden;
  height: clamp(5.2rem, 17vw, 14rem);
  margin: 1.2rem auto -4.5rem;
  color: transparent;
  background: linear-gradient(180deg, rgb(255 255 255 / 83%), rgb(255 255 255 / 6%));
  background-clip: text;
  font-size: clamp(6rem, 22vw, 21rem);
  font-weight: 700;
  letter-spacing: -.085em;
  line-height: .8;
  text-align: center;
  -webkit-background-clip: text;
}
@media (max-width: 640px) {
  .landing-wordmark { margin-bottom: -2.7rem; }
}
</style>
