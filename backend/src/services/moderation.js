/**
 * Moderation is the single most important file in this codebase.
 *
 * Every post (text or image) passes through here BEFORE it is even shown
 * to the posting child's own parent for review. Nothing reaches another
 * family's circle without also clearing a human parent's approval in
 * routes/posts.js - this module is the automated first pass, not the only
 * gate.
 *
 * MODERATION_PROVIDER=stub (default): a local keyword/heuristic check.
 * Good enough for local development. Do NOT rely on this alone in
 * production - wire a real provider before real children use this app:
 *   - Text: OpenAI Moderation endpoint, Perspective API, or similar
 *   - Images: Google Cloud Vision SafeSearch, AWS Rekognition
 * Both return a machine-checkable signal you can drop into the
 * `moderateText` / `moderateImage` functions below without touching
 * routes/posts.js at all.
 */

const BLOCKED_PATTERNS = [
  /\b(?:kill|hurt|hate)\s+(?:you|him|her|them)\b/i,
  /\b(?:sex|porn|nude|naked)\b/i,
  /\b(?:address|phone number|meet me|my school is)\b/i, // personal-info leakage guard
  /https?:\/\/\S+/i // no outbound links in a kid-authored post, ever
];

export async function moderateText(text = '') {
  if (process.env.MODERATION_PROVIDER === 'stub' || !process.env.MODERATION_PROVIDER) {
    const hit = BLOCKED_PATTERNS.find((pattern) => pattern.test(text));
    return {
      passed: !hit,
      reason: hit ? 'Matched a blocked pattern in the local safety check.' : null
    };
  }

  // TODO: call your real text moderation provider here, e.g.:
  // const res = await fetch('https://api.openai.com/v1/moderations', { ... });
  // return { passed: !res.flagged, reason: res.flagged ? res.categories : null };

  throw new Error(`Unknown MODERATION_PROVIDER: ${process.env.MODERATION_PROVIDER}`);
}

export async function moderateImage(mediaUrl) {
  if (process.env.MODERATION_PROVIDER === 'stub' || !process.env.MODERATION_PROVIDER) {
    // The stub cannot actually inspect image content. Treat every image as
    // "needs a human look" rather than silently passing it - fail closed,
    // not open.
    return { passed: false, reason: 'Local dev stub cannot screen image content - held for manual review.' };
  }

  // TODO: call your real image moderation provider here, e.g. Google Cloud
  // Vision SafeSearch, and fail closed on adult/violence/racy scores above
  // your chosen threshold.

  throw new Error(`Unknown MODERATION_PROVIDER: ${process.env.MODERATION_PROVIDER}`);
}
