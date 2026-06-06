import { NextResponse } from 'next/server';

const BOOKS = [
  'genesis', 'exodus', 'psalms', 'proverbs', 'isaiah', 'jeremiah',
  'matthew', 'mark', 'luke', 'john', 'romans', 'corinthians',
  'galatians', 'ephesians', 'philippians', 'colossians', 'thessalonians',
  'timothy', 'hebrews', 'james', 'peter', 'revelation',
  'deuteronomy', 'joshua', 'job', 'ecclesiastes', 'song+of+solomon',
  'daniel', 'hosea', 'joel', 'amos', 'micah', 'habakkuk', 'zephaniah',
  'malachi', 'acts', 'titus', 'philemon', 'jude',
];

const CHAPTER_COUNTS: Record<string, number> = {
  genesis: 50, exodus: 40, psalms: 150, proverbs: 31, isaiah: 66,
  jeremiah: 52, matthew: 28, mark: 16, luke: 24, john: 21,
  romans: 16, corinthians: 16, galatians: 6, ephesians: 6,
  philippians: 4, colossians: 4, thessalonians: 5, timothy: 6,
  hebrews: 13, james: 5, peter: 5, revelation: 22,
  deuteronomy: 34, joshua: 24, job: 42, ecclesiastes: 12,
  daniel: 12, hosea: 14, acts: 28, titus: 3, jude: 1,
};

export async function GET() {
  try {
    // Pick a truly random book and chapter
    const book = BOOKS[Math.floor(Math.random() * BOOKS.length)];
    const maxChapter = CHAPTER_COUNTS[book] || 10;
    const chapter = Math.floor(Math.random() * maxChapter) + 1;

    const res = await fetch(
      `https://bible-api.com/${book}+${chapter}?translation=kjv`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) throw new Error('Bible API failed');

    const data = await res.json();
    const verses = data.verses || [];

    if (!verses.length) throw new Error('No verses');

    // Pick a random verse from the chapter
    const verse = verses[Math.floor(Math.random() * verses.length)];

    return NextResponse.json({
      text: verse.text.trim(),
      reference: `${data.reference} v.${verse.verse}`,
    });
  } catch {
    // Fallback
    const fallbacks = [
      { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
      { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", reference: "2 Timothy 1:7" },
      { text: "Trust in the Lord with all your heart and lean not on your own understanding.", reference: "Proverbs 3:5" },
      { text: "Now to him who is able to do immeasurably more than all we ask or imagine.", reference: "Ephesians 3:20" },
      { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
    ];
    const f = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return NextResponse.json(f);
  }
}
