export interface OnboardingSlide {
  icon: string;
  title: string;
  body: string;
}

export const onboardingSlides: OnboardingSlide[] = [
  { icon: '🐧', title: '¡Hola! Welcome to BothLingo', body: 'Learn conversational Spanish built for full-stack engineers, cloud architects, and pancake lovers. Your retro penguin tutor is ready.' },
  { icon: '🗺️', title: 'Follow the Camino', body: 'Work through the lesson path one node at a time. Each lesson you finish unlocks the next and earns you XP.' },
  { icon: '🔥', title: 'Build your streak', body: 'Practice every day to grow your streak, and earn streak freezes to protect it when life gets busy.' },
  { icon: '🏆', title: 'Earn Logros', body: 'Unlock achievements as you hit XP, streak, and lesson milestones. Ready to start learning?' },
];
