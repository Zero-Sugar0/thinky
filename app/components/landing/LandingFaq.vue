<script setup lang="ts">
const openQuestion = ref(0);
const questions = [
  { question: "What is Thinky?", answer: "Thinky is a personal AI assistant designed to remember useful context and help you make progress across conversations and connected tools." },
  { question: "What can Thinky help me with?", answer: "Thinky can help you research, organize ideas, remember details you ask it to keep, and work through tasks using connected services." },
  { question: "Can Thinky join and speak in meetings?", answer: "Yes. Thinky can join supported video calls as a clearly identified AI participant, listen to the live conversation, and speak when invited or when a concise contribution would help. It also creates a transcript for follow-up." },
  { question: "Will it interrupt the people in the room?", answer: "Thinky is instructed to let people finish, avoid filling ordinary pauses, and keep its contributions brief. It should be transparent that it is an AI—not pretend to be a human attendee." },
  { question: "Does Thinky remember between conversations?", answer: "Thinky can keep useful long-term context so you can continue a thread later. You can manage the profile and memory information associated with your account." },
  { question: "Where can I use Thinky?", answer: "Use Thinky in the web app and connect supported messaging platforms and services from your account settings." },
];
</script>

<template>
  <section id="faq" class="border-t border-slate-200 bg-[#f7f8fa] px-5 py-20 sm:px-8 sm:py-28">
    <div class="mx-auto max-w-7xl">
      <div class="mx-auto max-w-2xl text-center">
        <p class="eyebrow">Good questions</p>
        <h2 class="section-title mt-4">A few things worth knowing.</h2>
        <p class="section-copy mt-4">A thoughtful assistant should be clear about what it can do—and how it shows up.</p>
      </div>
      <div class="mt-10 grid gap-3 md:grid-cols-2">
        <article v-for="(item, index) in questions" :key="item.question" class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <button type="button" class="flex w-full items-center justify-between gap-4 text-left" :aria-expanded="openQuestion === index" :aria-controls="`faq-answer-${index}`" @click="openQuestion = openQuestion === index ? -1 : index">
            <span class="text-sm font-semibold text-slate-900">{{ item.question }}</span>
            <span class="grid size-7 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500"><UIcon :name="openQuestion === index ? 'i-lucide-minus' : 'i-lucide-plus'" class="size-3.5"/></span>
          </button>
          <p v-if="openQuestion === index" :id="`faq-answer-${index}`" class="mt-3 max-w-xl text-sm leading-6 text-slate-500">{{ item.answer }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
