import { localDayKey } from './dates';

const QUOTES = [
  "Every rep is a vote for who you're becoming.",
  "Discipline is choosing what you want most over what you want now.",
  "You don't get better on the days you feel good. You get better on the days you don't.",
  "It never gets easier. You just get stronger.",
  "Show up. That's ninety percent of it.",
  "Consistency is the highest form of genius.",
  "Motivation gets you started. Habit keeps you going.",
  "The only bad workout is the one that didn't happen.",
  "Your body can do it. It's your mind you have to convince.",
  "Small daily improvements lead to stunning long-term results.",
  "Make yourself proud.",
  "Be the person you needed when you were younger.",
  "Do it for the person you're becoming.",
  "Hard days are the best days.",
  "Don't stop when you're tired. Stop when you're done.",
  "The difference between who you are and who you want to be is what you do.",
  "Earn it.",
  "Your future self is watching.",
  "The mind gives up before the body does.",
  "Pain is temporary. Quitting lasts forever.",
  "Excuses don't burn calories.",
  "One more rep. Always one more.",
  "If you're tired of starting over, stop giving up.",
  "Fall seven times, stand up eight.",
  "Today's effort is tomorrow's strength.",
  "Consistency beats intensity.",
  "The hardest lift is getting off the couch.",
  "You've survived a hundred percent of your hardest days.",
  "The only person you're competing with is yesterday's version of you.",
  "Don't wish for it. Work for it.",
  "No days off from being great.",
  "One decision at a time. One rep at a time.",
  "The clock is ticking. Are you becoming the person you want to be?",
  "You never regret a workout.",
  "The grind never lies.",
  "You are what you repeatedly do.",
  "Progress is progress, no matter how small.",
  "Rise. That's the whole plan.",
  "Strong is a state of mind first.",
  "The work doesn't lie.",
  "Champions are made in the moments they want to quit.",
  "Iron sharpens iron. You sharpen you.",
  "Show up even when no one's watching. Especially then.",
  "Every day is a chance to be better than yesterday.",
  "Suffer now and live the rest of your life as a champion.",
  "The body achieves what the mind believes.",
  "Sweat is just weakness leaving the body.",
  "That's one more than yesterday.",
  "Ninety percent of success is just showing up, consistently.",
  "What you do today is who you are tomorrow.",
];

function hashCode(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getDailyQuote(userSeed: number): string {
  const today = localDayKey();
  const idx = hashCode(`${today}-${userSeed}`) % QUOTES.length;
  return QUOTES[idx];
}
