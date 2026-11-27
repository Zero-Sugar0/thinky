<script setup lang="ts">
const capabilities = [
  { icon: "i-lucide-brain", eyebrow: "A memory that helps", title: "Pick up the thread.", copy: "Thinky keeps useful context close, so a good conversation can keep getting better instead of starting over." },
  { icon: "i-lucide-workflow", eyebrow: "Work that moves", title: "From thought to done.", copy: "Research a question, connect your tools, and turn a scattered list of next steps into something you can act on." },
  { icon: "i-lucide-messages-square", eyebrow: "Where you already are", title: "One assistant, many places.", copy: "Bring Thinky into chat and connected apps, then pick up again wherever the next part of your day happens." },
];
const steps = [
  { number: "01", title: "Tell Thinky what matters", copy: "Start naturally. Share a goal, a question, or a detail you want to carry forward." },
  { number: "02", title: "Let context do its work", copy: "Thinky uses what you’ve shared and the tools you’ve connected to find a useful next step." },
  { number: "03", title: "Stay in the conversation", copy: "Review, redirect, or approve. You decide what happens next." },
];
</script>

<template>
  <section id="what-it-does" class="px-5 py-16 sm:px-8 sm:py-20">
    <div class="mx-auto max-w-7xl">
      <div class="mx-auto max-w-2xl text-center">
        <p class="eyebrow">A more useful kind of assistant</p>
        <h2 class="section-title mt-4">Built around your context,<br class="hidden sm:block"> not another prompt.</h2>
        <p class="section-copy mt-4">The little things add up: remembering a decision, finding the right detail, or helping a conversation move forward.</p>
      </div>

      <div class="mt-12 grid gap-4 md:grid-cols-3">
        <article v-for="(item, index) in capabilities" :key="item.title" class="feature-card group">
          <div class="flex items-center justify-between">
            <span class="chip">{{ item.eyebrow }}</span>
            <UIcon :name="item.icon" class="size-4 text-[#2f6bff]" />
          </div>
          <h3 class="mt-6 text-xl font-semibold tracking-[-0.04em] text-slate-950">{{ item.title }}</h3>
          <p class="mt-2 min-h-[4.5rem] text-sm leading-6 text-slate-500">{{ item.copy }}</p>
          <div v-if="index === 0" class="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-center gap-2 text-[11px] font-medium text-slate-400"><span class="size-1.5 rounded-full bg-[#2f6bff]" /> A note Thinky kept</div>
            <p class="mt-3 text-sm leading-5 text-slate-700">“Keep Tuesdays meeting-free for deep work.”</p>
            <p class="mt-2 text-[11px] text-slate-400">Saved from your conversation · just now</p>
          </div>
          <div v-else-if="index === 1" class="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-center gap-2"><span class="grid size-6 place-items-center rounded-lg bg-blue-100 text-[#2f6bff]"><UIcon name="i-lucide-search" class="size-3.5" /></span><span class="text-xs font-medium text-slate-700">Finding the useful detail</span></div>
            <div class="mt-3 space-y-2"><div class="h-2 w-full rounded-full bg-slate-200"/><div class="h-2 w-4/5 rounded-full bg-slate-200"/><div class="h-2 w-3/5 rounded-full bg-blue-100"/></div>
          </div>
          <div v-else class="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-start gap-2.5"><span class="grid size-7 shrink-0 place-items-center rounded-full bg-blue-100 text-[#2f6bff]"><UIcon name="i-lucide-bot" class="size-4" /></span><div class="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-xs leading-5 text-slate-600 shadow-sm">I’ve got the context. What would you like to do next?</div></div>
            <div class="mt-3 ml-9 flex gap-2"><span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500">Draft a reply</span><span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-500">Make a plan</span></div>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section id="meetings" class="border-y border-slate-200 bg-[#f7f8fa] px-5 py-16 sm:px-8 sm:py-20">
    <div class="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
      <div>
        <p class="eyebrow">A seat at the table</p>
        <h2 class="section-title mt-4">A meeting companion<br class="hidden sm:block"> that can speak up.</h2>
        <p class="section-copy mt-4">Thinky joins a call as itself, listens to the room, and can respond out loud when someone asks or a brief contribution would help. It isn’t there to impersonate a person—or to narrate every minute.</p>
        <ul class="mt-7 space-y-3 text-sm text-slate-600">
          <li class="flex gap-3"><UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-[#2f6bff]" /> Introduces itself clearly as an AI participant.</li>
          <li class="flex gap-3"><UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-[#2f6bff]" /> Hears the live conversation and can answer in a natural voice.</li>
          <li class="flex gap-3"><UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-[#2f6bff]" /> Leaves the room—and the floor—to people when it has nothing useful to add.</li>
        </ul>
        <UButton to="/meeting-assistant" color="primary" variant="link" class="mt-6 px-0 font-medium">Explore meeting participation <UIcon name="i-lucide-arrow-up-right" class="size-4" /></UButton>
      </div>
      <div class="relative">
        <img src="/thinky-meeting.png" alt="Colleagues listening and sharing ideas around a bright meeting table" class="aspect-[4/3] w-full rounded-[24px] object-cover shadow-[0_18px_60px_-36px_rgba(15,23,42,0.35)] outline outline-1 outline-black/10 -outline-offset-1">
        <div class="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-lg backdrop-blur sm:bottom-6 sm:left-6 sm:right-auto sm:w-[min(24rem,calc(100%-3rem))]">
          <div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2"><span class="relative grid size-8 place-items-center rounded-full bg-blue-50 text-[#2f6bff]"><UIcon name="i-lucide-audio-lines" class="size-4"/><span class="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500"/></span><div><p class="text-xs font-semibold text-slate-900">Thinky is listening</p><p class="text-[11px] text-slate-500">Live meeting · Google Meet</p></div></div><span class="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700">Ready when asked</span></div>
          <div class="mt-3 flex items-center gap-1.5" aria-label="Voice activity waveform"><span v-for="(height, index) in [10,16,9,22,13,18,8,15,11,20,12,16,8,14,10,19,12,8,16,11,20,14,9,17]" :key="index" class="w-1 rounded-full bg-blue-200" :style="{ height: `${height}px` }"/></div>
        </div>
      </div>
    </div>
  </section>

  <section id="how-it-works" class="px-5 py-16 sm:px-8 sm:py-20">
    <div class="mx-auto max-w-7xl">
      <div class="mx-auto max-w-2xl text-center">
        <p class="eyebrow">Simple by design</p>
        <h2 class="section-title mt-4">A little less starting over.</h2>
        <p class="section-copy mt-4">More continuity between the things you think about and the things you do.</p>
      </div>
      <ol class="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
        <li v-for="step in steps" :key="step.number" class="border-t border-slate-200 pt-5">
          <span class="font-mono text-xs text-[#2f6bff]">{{ step.number }}</span>
          <h3 class="mt-5 text-lg font-semibold tracking-[-0.03em] text-slate-950">{{ step.title }}</h3>
          <p class="mt-2 max-w-sm text-sm leading-6 text-slate-500">{{ step.copy }}</p>
        </li>
      </ol>
    </div>
  </section>

  <section class="px-5 pb-16 sm:px-8 sm:pb-20">
    <div class="mx-auto grid max-w-7xl overflow-hidden rounded-[28px] border border-slate-200 bg-white md:grid-cols-2">
      <div class="p-7 sm:p-10 lg:p-14">
        <p class="eyebrow">Room to think</p>
        <h2 class="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-[-0.05em] text-slate-950 sm:text-4xl">Useful context, without keeping score.</h2>
        <p class="mt-4 max-w-lg text-sm leading-6 text-slate-500">Your assistant should make the work feel lighter. Thinky can remember what you ask it to keep, work across conversations, and help you get from “I should” to a clear next step.</p>
        <div class="mt-7 flex flex-wrap gap-2"><span class="chip">Your direction</span><span class="chip">Connected tools</span><span class="chip">Human in control</span></div>
      </div>
      <div class="relative min-h-[280px] overflow-hidden bg-[#f7f8fa] p-6 sm:p-8">
        <div class="absolute right-5 top-5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-500">A few things Thinky knows</div>
        <div class="absolute left-[8%] top-[27%] w-[78%] rotate-[-3deg] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:left-[13%] sm:w-[70%]">
          <div class="flex items-center gap-2"><span class="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700"><UIcon name="i-lucide-calendar-days" class="size-4"/></span><span class="text-xs font-semibold text-slate-800">Keep Friday afternoons clear</span></div><p class="mt-2 pl-9 text-xs leading-5 text-slate-500">You use that time to wrap up the week and plan ahead.</p>
        </div>
        <div class="absolute left-[16%] top-[51%] w-[76%] rotate-[2deg] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:left-[21%] sm:w-[68%]">
          <div class="flex items-center gap-2"><span class="grid size-7 place-items-center rounded-lg bg-blue-50 text-[#2f6bff]"><UIcon name="i-lucide-users" class="size-4"/></span><span class="text-xs font-semibold text-slate-800">Project Atlas · next up</span></div><p class="mt-2 pl-9 text-xs leading-5 text-slate-500">Share the revised timeline with the team before Thursday.</p>
        </div>
        <div class="absolute bottom-[8%] right-[9%] rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700">Connected to your work</div>
      </div>
    </div>
  </section>

  <section class="border-y border-slate-200 bg-[#f7f8fa] px-5 py-14 sm:px-8 sm:py-16">
    <div class="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-[1fr_auto]">
      <div><p class="eyebrow">The right kind of helpful</p><h2 class="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-3xl">Built to be useful, not to take over.</h2><p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Thinky can research, remember, organize, and participate. You choose what to connect and when it’s time to act.</p></div>
      <UButton to="/capabilities" color="neutral" variant="outline" class="rounded-full border-slate-300 bg-white px-5">See all capabilities <UIcon name="i-lucide-arrow-up-right" class="size-4" /></UButton>
    </div>
  </section>
</template>
