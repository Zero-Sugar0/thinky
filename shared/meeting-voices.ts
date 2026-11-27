/**
 * Voices Thinky can speak with in a meeting: Deepgram Flux TTS English voices.
 * Each id is the exact model string sent to Deepgram.
 * Source: https://developers.deepgram.com/docs/flux-tts/voices
 */
export interface MeetingVoice {
  id: string;
  name: string;
  accent: string;
  gender: string;
  character: string;
  useCases: string;
}

export const MEETING_VOICES: MeetingVoice[] = [
  { id: "flux-hannah-en", name: "Hannah", accent: "American", gender: "Female", character: "Clear, confident, thoughtful, pleasant", useCases: "Casual chat, storytelling" },
  { id: "flux-kit-en", name: "Kit", accent: "British", gender: "Male", character: "Friendly, energetic, thoughtful, calm, helpful", useCases: "Customer service, narration" },
  { id: "flux-alexis-en", name: "Alexis", accent: "American", gender: "Female", character: "Clear, professional, calm, caring, empathetic", useCases: "Customer service, IVR" },
  { id: "flux-cliff-en", name: "Cliff", accent: "American", gender: "Male", character: "Deep, confident, calm, raspy, clear", useCases: "Financial services, narration" },
  { id: "flux-sienna-en", name: "Sienna", accent: "American", gender: "Female", character: "Clear, professional, calm, warm, caring", useCases: "Customer service, narration" },
  { id: "flux-cole-en", name: "Cole", accent: "American", gender: "Male", character: "Friendly, clear, interesting, energetic, engaging", useCases: "Customer service, IVR" },
  { id: "flux-brooke-en", name: "Brooke", accent: "American", gender: "Female", character: "Friendly, intelligent, fast, confident, energetic", useCases: "Healthcare, casual chat" },
  { id: "flux-colin-en", name: "Colin", accent: "British", gender: "Male", character: "Warm, friendly, trustworthy, confident, authoritative", useCases: "Customer service, financial services" },
  { id: "flux-gemma-en", name: "Gemma", accent: "British", gender: "Female", character: "Friendly, kind, approachable, caring, happy", useCases: "Customer service, IVR" },
  { id: "flux-haley-en", name: "Haley", accent: "American", gender: "Female", character: "Clear, professional, caring, calm, empathetic", useCases: "Customer service, financial services" },
  { id: "flux-heather-en", name: "Heather", accent: "American", gender: "Female", character: "Clear, engaging, energetic, friendly, thoughtful", useCases: "Customer service, IVR" },
  { id: "flux-miles-en", name: "Miles", accent: "American", gender: "Male", character: "Clear, calm, professional, confident, sincere", useCases: "Customer service, financial services" },
  { id: "flux-sean-en", name: "Sean", accent: "British", gender: "Male", character: "Friendly, kind, caring, calming", useCases: "IVR" },
  { id: "flux-bree-en", name: "Bree", accent: "American", gender: "Female", character: "Friendly, sweet, kind", useCases: "Customer service, casual chat" },
  { id: "flux-brittany-en", name: "Brittany", accent: "American", gender: "Female", character: "Confident, kind, soft", useCases: "Casual chat" },
  { id: "flux-bruce-en", name: "Bruce", accent: "American", gender: "Male", character: "Friendly, kind, natural, believable, engaged", useCases: "Customer service, IVR" },
  { id: "flux-conor-en", name: "Conor", accent: "British", gender: "Male", character: "Confident, deep, friendly, relaxed", useCases: "Customer service, IVR" },
  { id: "flux-donovan-en", name: "Donovan", accent: "American", gender: "Male", character: "Professional, calm, thoughtful", useCases: "IVR" },
  { id: "flux-drew-en", name: "Drew", accent: "American", gender: "Male", character: "Confident, relaxed, soft, young, calm", useCases: "Healthcare, financial services" },
  { id: "flux-elise-en", name: "Elise", accent: "American", gender: "Female", character: "Clear, professional, calm, caring, empathetic", useCases: "Customer service, financial services" },
  { id: "flux-jack-en", name: "Jack", accent: "British", gender: "Male", character: "Confident, thoughtful, friendly, professional, clear", useCases: "Customer service, storytelling" },
  { id: "flux-kai-en", name: "Kai", accent: "Singaporean", gender: "Male", character: "Clear, calm, professional, knowledgeable, caring", useCases: "Customer service, informative" },
  { id: "flux-kelsey-en", name: "Kelsey", accent: "American", gender: "Female", character: "Clear, professional, caring, calm, empathetic", useCases: "Customer service, financial services" },
  { id: "flux-maeve-en", name: "Maeve", accent: "Irish", gender: "Female", character: "Friendly, energetic, confident, gentle, calm", useCases: "Customer service, narration" },
  { id: "flux-marcelo-en", name: "Marcelo", accent: "Filipino", gender: "Male", character: "Clear, calm, professional, knowledgeable, caring", useCases: "Customer service, informative" },
  { id: "flux-marcus-en", name: "Marcus", accent: "American", gender: "Male", character: "Friendly, helpful, smooth, professional, kind", useCases: "Customer service, casual chat" },
  { id: "flux-meena-en", name: "Meena", accent: "Indian", gender: "Female", character: "Empathetic, professional, calm, reassuring", useCases: "Customer service, casual chat" },
  { id: "flux-meghan-en", name: "Meghan", accent: "American", gender: "Female", character: "Friendly, nice, energetic, kind, confident", useCases: "Healthcare, financial services" },
  { id: "flux-naveen-en", name: "Naveen", accent: "Indian", gender: "Male", character: "Clear, professional, knowledgeable, calm, caring", useCases: "Customer service, informative" },
  { id: "flux-paige-en", name: "Paige", accent: "American", gender: "Female", character: "Clear, professional, calm, comfortable, caring", useCases: "Customer service, financial services" },
  { id: "flux-priya-en", name: "Priya", accent: "Indian", gender: "Female", character: "Confident, empathetic, professional, calm, reassuring", useCases: "IVR" },
  { id: "flux-rufus-en", name: "Rufus", accent: "British", gender: "Male", character: "Friendly, confident, intelligent, gentle, enthusiastic", useCases: "Healthcare, storytelling" },
  { id: "flux-sharon-en", name: "Sharon", accent: "Australian", gender: "Female", character: "Formal, calm, relaxed, confident", useCases: "Healthcare, financial services" },
  { id: "flux-tanner-en", name: "Tanner", accent: "British", gender: "Male", character: "Professional, calm, confident", useCases: "Customer service" },
  { id: "flux-wade-en", name: "Wade", accent: "American", gender: "Male", character: "Warm, confident, clear, enthusiastic, friendly", useCases: "Customer service, casual chat" },
  { id: "flux-wes-en", name: "Wes", accent: "American", gender: "Male", character: "Thoughtful, friendly, warm, interesting", useCases: "Customer service, casual chat" },
];

export const DEFAULT_MEETING_VOICE = "flux-alexis-en";

export function isMeetingVoice(id: string): boolean {
  return MEETING_VOICES.some(voice => voice.id === id);
}
