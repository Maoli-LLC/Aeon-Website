// Auto-format blog content for consistent readability regardless of input format.
// Handles: smart quotes, weird whitespace, single vs double newlines, walls of text.

const SMART_QUOTES: Record<string, string> = {
  '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'",
  '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"',
  '\u2013': '-', '\u2014': '-', '\u2026': '...',
  '\u00A0': ' ',
};

function normalizeChars(s: string): string {
  return s.replace(/[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2013\u2014\u2026\u00A0]/g, c => SMART_QUOTES[c] || c);
}

// Split into sentences, keeping terminal punctuation. Preserves "Mr.", "U.S.", etc. roughly.
function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?]+[.!?]+(?:["')\]]+)?|\S[^.!?]*$/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out.length ? out : [text.trim()].filter(Boolean);
}

function groupSentences(sentences: string[], perPara = 3): string[] {
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += perPara) {
    paras.push(sentences.slice(i, i + perPara).join(' '));
  }
  return paras;
}

export function normalizeBlogContent(input: string | null | undefined): string {
  if (!input) return '';
  let text = String(input);

  text = text.replace(/\r\n?/g, '\n');
  text = normalizeChars(text);
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/ *\n */g, '\n');
  text = text.trim();

  if (!text) return '';

  // Already has paragraph breaks — clean up and keep structure.
  if (/\n{2,}/.test(text)) {
    const paragraphs = text.split(/\n{2,}/).map(p => {
      const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
      // Keep list-like lines as-is (each on its own line).
      const allListy = lines.length > 1 && lines.every(l => /^([\-*•]|\d+[.)])\s+/.test(l));
      if (allListy) return lines.join('\n');
      // Otherwise merge soft-wrapped lines into one paragraph.
      return lines.join(' ');
    }).filter(Boolean);
    return paragraphs.join('\n\n');
  }

  // Single newlines only: if every line looks like a sentence/heading/list, keep them as paragraphs.
  if (/\n/.test(text)) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const allListy = lines.length > 1 && lines.every(l => /^([\-*•]|\d+[.)])\s+/.test(l));
    if (allListy) return lines.join('\n');
    // Treat each non-empty line as its own paragraph (joined with blank line between).
    return lines.join('\n\n');
  }

  // One wall of text: split into sentences and group every 3 into a paragraph.
  const sentences = splitSentences(text);
  return groupSentences(sentences, 3).join('\n\n');
}

export function normalizeBlogExcerpt(input: string | null | undefined): string {
  if (!input) return '';
  let text = normalizeChars(String(input)).replace(/\r\n?/g, '\n');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

export function deriveExcerptFromContent(input: string | null | undefined, max = 220): string {
  if (!input) return '';
  const cleaned = normalizeChars(String(input)).replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastStop > 80) return slice.slice(0, lastStop + 1).trim();
  const lastSpace = slice.lastIndexOf(' ');
  return ((lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()) + '…';
}
