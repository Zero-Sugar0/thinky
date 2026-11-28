<template>
  <section class="overflow-hidden px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:pt-24">
    <div class="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
      <div class="max-w-xl">
        <p class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-900">
          <span class="size-1.5 rounded-full bg-[#111827]" /> A personal assistant with continuity
        </p>
        <h1 class="mt-5 text-balance text-[2.35rem] font-medium leading-[1.08] text-slate-950 sm:text-5xl lg:text-[3.25rem]">
          A little more room <span class="text-[#111827]">to think.</span>
        </h1>
        <p class="mt-4 max-w-lg text-pretty text-[15px] leading-6 text-slate-600">
          Thinky remembers the context you choose to share, works across your tools, and can join the conversation when you need another thoughtful voice.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <UButton to="/login" color="primary" size="lg" class="rounded-full px-5 font-medium">Get started <UIcon name="i-lucide-arrow-up-right" class="size-4" /></UButton>
          <UButton to="#what-it-does" color="neutral" variant="outline" size="lg" class="rounded-full border-slate-300 bg-white px-5 font-medium text-slate-700">See what Thinky can do</UButton>
        </div>
        <div class="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <span>Meet Thinky on:</span>
          <span class="inline-flex items-center gap-1.5 text-slate-500"><UIcon name="i-lucide-globe-2" class="size-3.5"/> Web</span>
          <span class="inline-flex items-center gap-1.5 text-slate-500"><UIcon name="i-lucide-message-circle" class="size-3.5"/> Connected chats</span>
          <span class="inline-flex items-center gap-1.5 text-slate-500"><UIcon name="i-lucide-video" class="size-3.5"/> Meetings</span>
        </div>
      </div>

      <div class="relative mx-auto w-full max-w-[640px] lg:mx-0 lg:ml-auto">
        <div class="relative overflow-hidden rounded-none border border-slate-200 bg-white">
          <div class="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 sm:px-4">
            <div class="flex min-w-0 items-center gap-2">
              <AppLogo class="size-5 shrink-0 text-[#111827]" />
              <span class="text-[13px] font-medium text-slate-900">Thinky</span>
              <span class="truncate text-[12px] text-slate-500">Personal assistant</span>
            </div>
            <span class="flex shrink-0 items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              <span class="size-1.5 bg-emerald-500" /> Ready
            </span>
          </div>
          <div class="grid min-h-[340px] sm:min-h-[380px] sm:grid-cols-[148px_1fr]">
            <aside class="hidden border-r border-slate-200 bg-slate-50 p-3 sm:block">
              <p class="px-1.5 py-1.5 text-[12px] text-slate-500">Your space</p>
              <div class="mt-1 space-y-0.5 text-[12px] text-slate-700">
                <div class="flex items-center gap-2 bg-white px-2 py-1.5 font-medium text-slate-900">
                  <UIcon name="i-lucide-message-square" class="size-3.5 text-slate-500" /> New chat
                </div>
                <div class="flex items-center gap-2 px-2 py-1.5">
                  <UIcon name="i-lucide-video" class="size-3.5 text-slate-500" /> Meetings
                </div>
                <div class="flex items-center gap-2 px-2 py-1.5">
                  <UIcon name="i-lucide-brain" class="size-3.5 text-slate-500" /> Memory
                </div>
              </div>
              <p class="mt-6 px-1.5 text-[12px] text-slate-500">Recent</p>
              <div class="mt-1 space-y-2 px-1.5 text-[12px] leading-4 text-slate-600">
                <p>Project Atlas timeline</p>
                <p>Ideas for next week</p>
                <p>Notes from the team</p>
              </div>
            </aside>
            <div class="flex min-w-0 flex-col px-3 py-3 sm:px-4 sm:py-4">
              <div class="mx-auto flex w-full max-w-md flex-1 flex-col justify-end gap-2">
                <div class="mb-2">
                  <p class="text-[13px] font-medium text-slate-900">What’s on your mind?</p>
                  <p class="mt-0.5 text-[12px] leading-4 text-slate-500">A thought, a question, or a task to untangle.</p>
                </div>
                <div class="ml-auto w-fit max-w-[85%] bg-[#111827] px-2 py-1 text-[13px] leading-[1.35] text-white">
                  Help me prep for tomorrow’s project check-in.
                </div>
                <div class="flex w-full items-start">
                  <p class="max-w-[92%] text-[13px] leading-[1.4] text-slate-700">
                    Last time, the team agreed to share the revised timeline before the check-in. Want a short agenda and the open questions?
                  </p>
                </div>
                <div class="flex flex-wrap gap-1">
                  <span class="border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600">Key decisions</span>
                  <span class="border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600">Open questions</span>
                </div>
              </div>
              <div class="mt-3 border border-slate-200 bg-white p-1.5">
                <div class="flex min-h-9 items-center justify-between gap-3 px-1.5">
                  <span class="text-[13px] text-slate-400">Ask Thinky anything…</span>
                  <span class="grid size-7 place-items-center bg-[#111827] text-white">
                    <UIcon name="i-lucide-arrow-up" class="size-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
