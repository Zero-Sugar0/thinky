<script setup lang="ts">
const openQuestion = ref(0);
const questions = [
  {
    question: "What is Thinky?",
    answer: "Thinky is a personal AI assistant that remembers your context and helps you move work forward. Talk to Thinky in chat or through the messaging tools you already use.",
  },
  {
    question: "What can Thinky help me with?",
    answer: "Thinky can answer questions, recall details you have shared, search the web, connect with your apps, and handle useful recurring tasks—with your direction and approval.",
  },
  {
    question: "Does Thinky remember between conversations?",
    answer: "Yes. Thinky can keep useful long-term context so you can pick up where you left off instead of starting from scratch each time.",
  },
  {
    question: "Where can I use Thinky?",
    answer: "Use Thinky in the web app and connect supported messaging platforms and services from your account settings.",
  },
  {
    question: "Will Thinky take actions without asking?",
    answer: "Thinky is designed to keep you in control. It can explain what it intends to do and ask for confirmation when an action needs your approval.",
  },
];
</script>

<template>
  <section id="faq" class="border-t border-white/10 px-5 py-20 sm:px-8 sm:py-28">
    <div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
      <div>
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">A few answers</p>
        <h2 class="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-5xl">
          Frequently asked
          <span class="block text-white/45">questions.</span>
        </h2>
        <p class="mt-5 max-w-xs text-sm leading-6 text-white/55">
          Still curious? Start a conversation with Thinky and find out what it can do for you.
        </p>
        <UButton to="/login" variant="link" color="neutral" class="mt-2 px-0 text-white underline underline-offset-4 hover:text-white/70">
          Talk to Thinky <UIcon name="i-lucide-arrow-up-right" class="size-3.5" />
        </UButton>
      </div>

      <div class="divide-y divide-white/10 border-y border-white/10">
        <article v-for="(item, index) in questions" :key="item.question" class="py-5 sm:py-6">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-5 text-left"
            :aria-expanded="openQuestion === index"
            @click="openQuestion = openQuestion === index ? -1 : index"
          >
            <span class="text-sm font-medium text-white/85 sm:text-base">{{ item.question }}</span>
            <span class="grid size-7 shrink-0 place-items-center rounded-full border border-white/15 text-white/65 transition-colors" :class="openQuestion === index ? 'border-white bg-white text-black' : ''">
              <UIcon :name="openQuestion === index ? 'i-lucide-minus' : 'i-lucide-plus'" class="size-3.5" />
            </span>
          </button>
          <div v-if="openQuestion === index" class="grid grid-rows-[1fr] pt-3">
            <p class="max-w-xl overflow-hidden text-sm leading-6 text-white/55">{{ item.answer }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
