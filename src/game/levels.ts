/**
 * Data-driven level + story definitions. Edit text/numbers here to retune the
 * campaign without touching engine code.
 */

export interface StoryBeat {
  speaker: string;
  text: string;
}

export interface LevelDef {
  name: string;
  rows: number;
  cols: number;
  enemyHp: number;
  /** Horizontal swarm speed multiplier. */
  speed: number;
  /** Probability (per enemy, per second) of firing. */
  fireRate: number;
  /** Bullet speed multiplier for this level. */
  bulletSpeed: number;
  isBoss?: boolean;
  story: StoryBeat[];
  /** Names for enemy types in this level (cycles through rows) */
  enemyNames?: string[];
}

export const SKIP_TEXT = "I'll read the syllabus later.";

export const INTRO: StoryBeat[] = [
  { speaker: 'NARRATOR', text: 'The year is 2026.\n\nYou just got your admission letter to IET DAVV.\nYou\'ve never even seen the campus.' },
  { speaker: 'NARRATOR', text: 'You survived JEE.\nYou survived counselling rounds.\nYou survived your parents asking\n"Beta, branch konsi mili?"' },
  { speaker: 'NARRATOR', text: 'You packed your bags.\nYou said goodbye to home-cooked food.\nYou entered the hostel.\n\nThat was your first mistake.' },
  { speaker: 'YOU', text: 'Wait... the mess serves THIS as dinner?\nAnd what do you mean attendance is mandatory?\nAND there\'s a quiz TOMORROW?!' },
  { speaker: 'NARRATOR', text: 'But now... a greater threat emerges.\n\nTHE ENGINEERING EXPERIENCE™\n\nArmed with nothing but WiFi and chai,\nyou must survive your first year.' },
  { speaker: 'YOU', text: 'They said college life would be fun.\nThey said "best 4 years of your life."\n\nThey lied.\n\nBut I\'m not going KT without a fight.' },
];

export const LEVELS: LevelDef[] = [
  {
    name: 'First Internals',
    rows: 2, cols: 5, enemyHp: 1, speed: 0.6, fireRate: 0.1, bulletSpeed: 0.8,
    enemyNames: ['STRICT PROF', 'SURPRISE QUIZ'],
    story: [
      { speaker: 'CLASSMATE', text: 'Bro EMERGENCY!\nStrict Prof is taking surprise quiz!\nHe hasn\'t even finished Chapter 1!' },
      { speaker: 'YOU', text: 'I literally came to college yesterday.\nI don\'t even know where my classroom is.\n\nBut if it has MCQs, I have luck.' },
      { speaker: 'CLASSMATE', text: 'Also the Time Management aliens are here.\nThey attack anyone who sleeps past 8 AM.\n\nSo basically... all of us.' },
    ],
  },
  {
    name: 'Assignment Avalanche',
    rows: 3, cols: 6, enemyHp: 1, speed: 0.8, fireRate: 0.25, bulletSpeed: 1.0,
    enemyNames: ['HOSTEL FOOD', 'CLUB ACTIVITY', 'ASSIGNMENT'],
    story: [
      { speaker: 'CLASSMATE', text: 'CODE RED! Three assignments due tomorrow!\nThe coding club wants you at a hackathon!\nAnd hostel food gave you food poisoning!' },
      { speaker: 'YOU', text: 'Three assignments. Two energy drinks.\nOne brain cell.\nAnd the WiFi just died.\n\nChallenge accepted.' },
      { speaker: 'CLASSMATE', text: 'WARNING: Externals approaching!\nThey brought VIVA questions!\n\n...and the lab assistant looks angry.' },
    ],
  },
  {
    // ===========================================================
    // FINAL BOSS — END SEMS
    // Intentionally near-unbeatable. Represents the accumulated
    // horror of end semester exams, backlogs, and CGPA destruction.
    // Do not "fix" the difficulty without product sign-off.
    // ===========================================================
    name: 'END SEMS',
    rows: 1, cols: 1, enemyHp: 999999, speed: 3.5, fireRate: 2.5, bulletSpeed: 2.2,
    isBoss: true,
    story: [
      { speaker: '???', text: 'I AM END SEMESTER EXAMS.\n\nI AM EVERY PAGE YOU DIDN\'T READ.\nEVERY CLASS YOU BUNKED.\nEVERY "I\'LL START FROM TOMORROW."' },
      { speaker: '???', text: 'YOUR ATTENDANCE IS 43%.\nYOUR CGPA TREMBLES BEFORE ME.\nYOUR BACKLOG LIST IS LONGER THAN\nYOUR SEMESTER.' },
      { speaker: 'YOU', text: 'Maybe.\nBut I once passed a viva by saying\n"Sir, it\'s an implementation detail."\n\nLet\'s dance, End Sems.' },
      { speaker: 'CLASSMATE', text: 'Bro, you sure about this?\nLast guy who fought End Sems\nis still in 3rd year.\n\n...for the 5th time.' },
    ],
  },
];

export const VICTORY: StoryBeat[] = [
  { speaker: 'YOU', text: 'Impossible...\nI cleared End Sems.\nWithout re-examination.\n\nMy CGPA... it\'s above 7. IT\'S ABOVE 7!' },
  { speaker: 'CLASSMATE', text: 'BRO WHAT.\nYou actually did it?!\nYou\'re literally the first person to\npass without a WhatsApp cheat group.' },
  { speaker: 'NARRATOR', text: 'And so the legend was born.\nFrom the chai stalls to the back benches,\nthey whispered a name...\n\nTHE GDGoC GOD MODE.' },
  { speaker: 'NARRATOR', text: 'But remember, young engineer...\n\nNext semester starts in 2 weeks.\n\n...and the syllabus is already uploaded.' },
];
