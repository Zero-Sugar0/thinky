<script setup lang="ts">
const features = [
  { label: "Long-term memory", icon: "i-lucide-brain", class: "landing-feature--memory" },
  { label: "Works across your apps", icon: "i-lucide-panels-top-left", class: "landing-feature--apps" },
  { label: "Thoughtful automation", icon: "i-lucide-zap", class: "landing-feature--automation" },
  { label: "You stay in control", icon: "i-lucide-shield-check", class: "landing-feature--control" },
];
</script>

<template>
  <section class="landing-hero relative isolate overflow-hidden px-5 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
    <div class="landing-hero__glow" aria-hidden="true" />
    <div class="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
      <p class="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55 sm:text-xs">
        <span class="size-1.5 rounded-full bg-white/80" />
        Your always-on personal assistant
      </p>
      <h1 class="max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-white sm:text-7xl lg:text-[5.6rem]">
        A little more room
        <span class="block text-white/55">to think.</span>
      </h1>
      <p class="mt-6 max-w-xl text-pretty text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
        Thinky remembers what matters, works across the tools you already use, and takes care of the small things that keep your day moving.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <UButton to="/login" color="neutral" size="lg" class="rounded-full bg-white px-6 font-medium text-black hover:bg-white/90">
          Get started
          <template #trailing><UIcon name="i-lucide-arrow-up-right" class="size-4" /></template>
        </UButton>
        <UButton to="#how-it-helps" color="neutral" variant="outline" size="lg" class="rounded-full border-white/15 bg-white/[0.03] px-6 text-white hover:bg-white/[0.08]">
          Meet Thinky
        </UButton>
      </div>
    </div>

    <div class="landing-stage relative mx-auto mt-10 h-[19rem] max-w-5xl sm:mt-14 sm:h-[25rem]">
      <div class="landing-stage__orbit landing-stage__orbit--outer" aria-hidden="true" />
      <div class="landing-stage__orbit landing-stage__orbit--inner" aria-hidden="true" />
      <div class="landing-stage__core" aria-hidden="true">
        <div class="landing-stage__core-inner"><AppLogo class="size-24 text-white grayscale sm:size-32" /></div>
      </div>
      <div class="landing-stage__floor" aria-hidden="true" />
      <div v-for="feature in features" :key="feature.label" class="landing-feature" :class="feature.class">
        <UIcon :name="feature.icon" class="size-3.5 shrink-0 text-white/75" />
        <span>{{ feature.label }}</span>
      </div>
      <p class="absolute inset-x-0 bottom-1 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 sm:text-[10px]">
        Present when you need it. Quiet when you don’t.
      </p>
    </div>
  </section>
</template>

<style scoped>
.landing-hero__glow {
  position: absolute;
  z-index: -1;
  inset: -12rem 0 auto;
  height: 38rem;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 24%, rgb(255 255 255 / 8%), transparent 66%);
}
.landing-stage { isolation: isolate; }
.landing-stage__orbit {
  position: absolute;
  left: 50%;
  bottom: -18rem;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 50%;
  transform: translateX(-50%);
}
.landing-stage__orbit--outer { width: min(88vw, 58rem); height: min(88vw, 58rem); }
.landing-stage__orbit--inner { bottom: -13rem; width: min(66vw, 43rem); height: min(66vw, 43rem); border-color: rgb(255 255 255 / 7%); }
.landing-stage__core {
  position: absolute;
  left: 50%;
  bottom: -4rem;
  display: grid;
  width: 19rem;
  height: 19rem;
  place-items: start center;
  padding-top: 2.4rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 38%, rgb(255 255 255 / 15%), rgb(255 255 255 / 3%) 45%, transparent 70%);
  box-shadow: 0 -18px 100px rgb(255 255 255 / 9%);
  transform: translateX(-50%);
}
.landing-stage__core-inner {
  display: grid;
  width: 11rem;
  height: 11rem;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 2.5rem;
  background: linear-gradient(145deg, rgb(255 255 255 / 12%), rgb(255 255 255 / 2%));
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
}
.landing-stage__floor {
  position: absolute;
  right: -3rem;
  bottom: 0;
  left: -3rem;
  height: 5rem;
  background: linear-gradient(transparent, #080808 78%);
}
.landing-feature {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: .55rem;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 999px;
  background: rgb(15 15 16 / 90%);
  padding: .6rem .85rem;
  color: rgb(255 255 255 / 70%);
  font-size: .72rem;
  backdrop-filter: blur(12px);
  animation: landing-float 6s ease-in-out infinite;
}
.landing-feature--memory { top: 27%; left: 4%; }
.landing-feature--apps { top: 38%; right: 3%; animation-delay: -1.4s; }
.landing-feature--automation { top: 64%; left: 1%; animation-delay: -2.7s; }
.landing-feature--control { top: 68%; right: 0; animation-delay: -3.6s; }
@keyframes landing-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@media (max-width: 520px) {
  .landing-stage__core { width: 15rem; height: 15rem; bottom: -3rem; }
  .landing-stage__core-inner { width: 9rem; height: 9rem; border-radius: 2rem; }
  .landing-stage__core-inner :deep(svg) { width: 5rem; height: 5rem; }
  .landing-feature { gap: .4rem; padding: .48rem .65rem; font-size: .62rem; }
  .landing-feature--memory { left: 0; }
  .landing-feature--apps { right: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .landing-feature { animation: none; }
}
</style>
