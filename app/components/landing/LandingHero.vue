<template>
  <section class="overflow-hidden px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:pt-24">
    <div class="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
      <div class="max-w-xl">
        <p class="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700">
          <span class="size-1.5 rounded-full bg-[#2f6bff]" /> A personal assistant with continuity
        </p>
        <h1 class="mt-6 text-balance text-[2.9rem] font-medium leading-[1.04] tracking-[-0.065em] text-slate-950 sm:text-6xl lg:text-[4.5rem]">
          A little more room <span class="text-[#2f6bff]">to think.</span>
        </h1>
        <p class="mt-6 max-w-lg text-pretty text-base leading-7 text-slate-600 sm:text-[17px] sm:leading-8">
          Thinky remembers the context you choose to share, works across your tools, and can join the conversation when you need another thoughtful voice.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <UButton to="/login" color="primary" size="lg" class="rounded-full px-6 font-medium">Get started <UIcon name="i-lucide-arrow-up-right" class="size-4" /></UButton>
          <UButton to="#what-it-does" color="neutral" variant="outline" size="lg" class="rounded-full border-slate-300 bg-white px-6 font-medium text-slate-700">See what Thinky can do</UButton>
        </div>
        <div class="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <span>Meet Thinky on:</span>
          <span class="inline-flex items-center gap-1.5 text-slate-500"><UIcon name="i-lucide-globe-2" class="size-3.5"/> Web</span>
          <span class="inline-flex items-center gap-1.5 text-slate-500"><UIcon name="i-lucide-message-circle" class="size-3.5"/> Connected chats</span>
          <span class="inline-flex items-center gap-1.5 text-slate-500"><UIcon name="i-lucide-video" class="size-3.5"/> Meetings</span>
        </div>
      </div>

      <div class="relative mx-auto w-full max-w-[660px] lg:mx-0 lg:ml-auto">
        <div class="absolute -inset-5 rounded-[34px] bg-blue-50/70 blur-2xl" aria-hidden="true" />
        <div class="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_80px_-45px_rgba(15,23,42,0.35)]">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
            <div class="flex items-center gap-2.5"><AppLogo class="size-6 text-[#2f6bff]"/><span class="text-xs font-semibold text-slate-800">Thinky</span><span class="text-[11px] text-slate-400">· Personal assistant</span></div>
            <span class="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700"><span class="size-1.5 rounded-full bg-emerald-500"/> Ready</span>
          </div>
          <div class="grid min-h-[360px] sm:min-h-[410px] sm:grid-cols-[150px_1fr]">
            <aside class="hidden border-r border-slate-100 bg-slate-50/70 p-3 sm:block">
              <p class="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Your space</p>
              <div class="mt-1 space-y-1 text-[11px] text-slate-600">
                <div class="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-2 font-medium text-blue-700"><UIcon name="i-lucide-message-square" class="size-3.5"/> New chat</div>
                <div class="flex items-center gap-2 rounded-lg px-2.5 py-2"><UIcon name="i-lucide-video" class="size-3.5"/> Meetings</div>
                <div class="flex items-center gap-2 rounded-lg px-2.5 py-2"><UIcon name="i-lucide-brain" class="size-3.5"/> Memory</div>
              </div>
              <p class="mt-7 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Recent</p>
              <div class="mt-2 space-y-3 px-2 text-[10px] leading-4 text-slate-500"><p>Project Atlas timeline</p><p>Ideas for next week</p><p>Notes from the team</p></div>
            </aside>
            <div class="flex min-w-0 flex-col p-4 sm:p-6">
              <div class="mx-auto w-full max-w-md flex-1 space-y-5">
                <div class="pt-4 text-center sm:pt-7"><p class="text-sm font-semibold text-slate-900">What’s on your mind?</p><p class="mt-1 text-[11px] text-slate-400">A thought, a question, or a task to untangle.</p></div>
                <div class="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-xs leading-5 text-white">Help me prep for tomorrow’s project check-in. You know where we left off.</div>
                <div class="flex items-start gap-2.5">
                  <AppLogo class="mt-0.5 size-6 shrink-0 text-[#2f6bff]" />
                  <div class="min-w-0 rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-700">
                    <p>Of course. Last time, the team agreed to share the revised timeline before the check-in. Want a short agenda and the open questions?</p>
                    <div class="mt-3 flex flex-wrap gap-1.5"><span class="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500">Key decisions</span><span class="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500">Open questions</span></div>
                  </div>
                </div>
              </div>
              <div class="mt-5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <div class="flex min-h-10 items-center justify-between gap-3 px-2"><span class="text-xs text-slate-400">Ask Thinky anything…</span><span class="grid size-7 place-items-center rounded-lg bg-[#2f6bff] text-white"><UIcon name="i-lucide-arrow-up" class="size-4"/></span></div>
                <div class="flex items-center gap-3 px-2 pb-1 pt-1 text-[10px] text-slate-400"><span class="inline-flex items-center gap-1"><UIcon name="i-lucide-paperclip" class="size-3"/> Add context</span><span class="inline-flex items-center gap-1"><UIcon name="i-lucide-mic" class="size-3"/> Voice</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="absolute -bottom-5 right-4 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg sm:flex"><span class="grid size-7 place-items-center rounded-lg bg-blue-50 text-[#2f6bff]"><UIcon name="i-lucide-brain" class="size-4"/></span><span class="text-[11px] font-medium text-slate-700">Context, carried forward</span></div>
      </div>
    </div>
  </section>
</template>
