// server/notes/merge.js
export function mergeNotes(chunkNotesArray) {
  // naive merge with dedupe, can be improved
  const valids = chunkNotesArray.slice();

  const title = valids.find(v => v.title && v.title.trim())?.title || "Notes";
  const tl_dr = valids.map(v => v.tl_dr || "").filter(Boolean).join(" ").slice(0, 400);
  const summary = valids.map(v => v.summary || "").filter(Boolean).join("\n\n");

  const sectionsMap = new Map();
  for (const v of valids) {
    for (const s of (v.sections || [])) {
      const key = (s.heading || "").trim().toLowerCase() || `section-${sectionsMap.size}`;
      if (!sectionsMap.has(key)) {
        sectionsMap.set(key, { heading: s.heading, summary: s.summary || "", bullets: s.bullets || [], important_quotes: s.important_quotes || [] });
      } else {
        const existing = sectionsMap.get(key);
        existing.summary += "\n\n" + (s.summary || "");
        existing.bullets = Array.from(new Set(existing.bullets.concat(s.bullets || [])));
        existing.important_quotes = Array.from(new Set(existing.important_quotes.concat(s.important_quotes || [])));
      }
    }
  }

  const sections = Array.from(sectionsMap.values()).map(s => ({
    heading: s.heading,
    summary: s.summary.trim(),
    bullets: s.bullets.slice(0, 200),
    important_quotes: s.important_quotes.slice(0, 20)
  }));

  const action_items = Array.from(new Set(valids.flatMap(v => v.action_items || []))).slice(0, 50);
  const questions = Array.from(new Set(valids.flatMap(v => v.questions || []))).slice(0, 200);

  const flashcardsMap = new Map();
  for (const f of valids.flatMap(v => v.flashcards || [])) {
    const key = (f.question || "").trim();
    if (!flashcardsMap.has(key)) flashcardsMap.set(key, f.answer || "");
  }
  const flashcards = Array.from(flashcardsMap.entries()).slice(0, 200).map(([q,a]) => ({ question: q, answer: a }));

  return { title, tl_dr, summary, sections, action_items, questions, flashcards };
}
