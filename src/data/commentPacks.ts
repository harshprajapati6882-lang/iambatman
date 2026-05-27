/**
 * 🔥 FIX #16: Comment pool / niche packs.
 *
 * Static, human-feeling comment libraries grouped by niche. Loaded into the
 * comments textarea from a "📦 Load pack" dropdown on the New Order page.
 *
 * Rules of thumb for realistic comments:
 *  • Short. Real comments are 1-6 words ~80% of the time.
 *  • Mostly emoji or short reactions.
 *  • Some typos / lowercase / missing punctuation.
 *  • Mix of languages where relevant.
 *  • Never sound like marketing copy.
 *
 * Add or edit a pack — that's it. The UI reads the export below.
 */

export interface CommentPack {
  id: string;
  label: string;
  emoji: string;
  description: string;
  comments: string[];
}

export const COMMENT_PACKS: CommentPack[] = [
  {
    id: "general",
    label: "Generic / mixed niche",
    emoji: "🌍",
    description: "Safe defaults that fit any post.",
    comments: [
      "🔥🔥🔥", "this is fire", "love this", "❤️❤️", "👏👏👏", "wow",
      "amazing", "first time seeing this", "how??", "underrated",
      "wait what", "no way 😭", "saving this", "shared with my friends",
      "bro 💀", "lol", "this hits different", "actually insane",
      "needed this today", "🫶", "send link pls", "💯", "okayyy",
      "let’s gooo", "so cool", "vibes", "this is the one", "🥹",
      "more of this pls", "👀", "respect", "talented af", "speechless",
    ],
  },
  {
    id: "instagram-reels",
    label: "Instagram reels",
    emoji: "📸",
    description: "Aesthetic, short, emoji-heavy.",
    comments: [
      "😍😍", "obsessed", "wait this is gorgeous", "🤌", "the aesthetic 🥺",
      "vibe check ✅", "outfit?? 👀", "where is this", "song name pls",
      "mother 😭", "stunning", "you ate", "let her cook", "10/10",
      "no thoughts just this", "screenshotting", "saved 💾", "👑",
      "iconic", "the way she moves 😩", "main character energy",
      "comfort post", "this lives in my head", "💗💗", "🩷",
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    emoji: "🎵",
    description: "Slang, very short, gen-z coded.",
    comments: [
      "fyp ❤️", "no bc same", "real", "the way i felt this", "💀💀💀",
      "skull", "im screaming", "stoppppp", "this is so me", "literally",
      "okayy bestie", "slayyy", "ate and left no crumbs", "iconic moment",
      "girl 😭", "we love to see it", "core memory", "comfort vid",
      "i needed this 🤍", "for me????", "fr fr", "say less", "based",
      "no cap", "bussin", "this rewired my brain",
    ],
  },
  {
    id: "youtube-short",
    label: "YouTube shorts",
    emoji: "▶️",
    description: "More words than TikTok, less emoji than IG.",
    comments: [
      "great content", "subscribed", "this channel is underrated",
      "algorithm finally did something right", "first!", "1 view but the song",
      "anyone in 2026?", "this deserves more views", "well explained",
      "thanks for sharing", "loved this short", "more like this please",
      "high quality", "instant subscribe", "the editing 🔥",
      "voice is so calming", "informative", "didn’t know that",
      "mind blown 🤯", "perfectly timed", "POV: youtube recommended this",
      "best 30 seconds of my day", "thumbnail got me",
    ],
  },
  {
    id: "youtube-long",
    label: "YouTube long-form",
    emoji: "🎬",
    description: "Longer, more sincere, fewer emoji.",
    comments: [
      "watched the whole thing, worth it.",
      "the production quality is insane.",
      "you explained this better than my professor lol.",
      "10 minute mark is gold.",
      "this is exactly what I was looking for, thank you.",
      "instantly subscribed, please keep making these.",
      "i’ve been binging your channel all weekend.",
      "the editing is top tier.",
      "the part about [topic] hit hard.",
      "underrated channel, you deserve a million subs.",
      "this should have way more views.",
      "the way you broke it down made it click for me.",
      "background music is perfect.",
      "saved to my playlist.",
      "needed this. thank you.",
    ],
  },
  {
    id: "fitness",
    label: "Fitness / gym",
    emoji: "💪",
    description: "Motivational, supplement-adjacent, lots of flexed biceps.",
    comments: [
      "💪💪", "form is clean", "what split?", "natty?",
      "PR loading…", "respect 🫡", "huge inspiration",
      "what's your routine?", "shredded 🔥", "getting back in the gym tmrw",
      "tutorial pls", "good mind muscle", "delts insane",
      "stack ?", "veins 😤", "monster", "no days off", "lock in 🔒",
      "needed this push", "next workout: ✅", "we eating tonight",
    ],
  },
  {
    id: "music",
    label: "Music / artist clips",
    emoji: "🎧",
    description: "Hyped, lyric-quoting, sharing.",
    comments: [
      "this song 🔥", "on repeat fr", "who produced this??",
      "lyrics hit", "playing at my funeral", "outro is insane",
      "needed this", "feeling this one", "vibes only",
      "spotify search ✅", "added to playlist", "underrated artist",
      "the beat drop 🤯", "first listen → 100th listen",
      "this is going viral", "tag your friends", "💿💿",
      "for the late night drives", "no skips",
    ],
  },
  {
    id: "food",
    label: "Food / recipes",
    emoji: "🍝",
    description: "Hungry comments, recipe asks.",
    comments: [
      "looks delicious", "recipe pls", "im hungry now 🥲",
      "saving for later 🤤", "i need this in my life",
      "making this tonight", "👨‍🍳👌", "absolute chef",
      "stomach is growling", "wow yummy", "how long to bake?",
      "ingredients list?", "this looks 10/10", "send some over",
      "drooling 🥵", "comfort food", "must try", "perfecto",
      "the plating 😍",
    ],
  },
  {
    id: "tech",
    label: "Tech / coding",
    emoji: "💻",
    description: "Slightly more technical, fewer emoji.",
    comments: [
      "great explanation", "this is so clean", "useful tip",
      "didn’t know about this api", "saving this for work",
      "stack pls?", "what theme is that", "vscode shortcuts 🙏",
      "needed this", "well documented", "instant subscribe",
      "took notes 📝", "your editor setup is insane",
      "small but mighty trick", "going to refactor my codebase now",
      "the goat 🐐", "perfect timing, just hit this bug",
      "subbed for more", "tutorial please",
    ],
  },
];

/** Get a pack by id. Falls back to the general pack. */
export function getPack(id: string): CommentPack {
  return COMMENT_PACKS.find((p) => p.id === id) || COMMENT_PACKS[0];
}

/**
 * Pick N comments from a pack without replacement.
 * If N > pack.length, allows repetition with shuffle.
 */
export function pickComments(packId: string, count: number, seed = Date.now()): string[] {
  const pack = getPack(packId);
  const pool = [...pack.comments];
  // Deterministic shuffle using seed so re-running with same seed gives same comments.
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const result: string[] = [];
  while (result.length < count) {
    result.push(pool[result.length % pool.length]);
  }
  return result;
}
