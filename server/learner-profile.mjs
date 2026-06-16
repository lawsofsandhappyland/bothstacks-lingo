/**
 * The structured learner model for the VOICE tutor (Firestore-backed).
 *
 * The voice loop runs browser <-> Google directly, so unlike the ADK text agent
 * it cannot call a tool to update a CEFR level. Instead, after each voice session
 * the server extracts a profile delta from the transcript with a cheap Gemini
 * call, merges it into the stored profile, and on the next session bakes the
 * profile into the live persona so the tutor calibrates to the learner.
 */

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CEFR_SET = new Set(CEFR_LEVELS);
const MAX_FOCUS_AREAS = 8;
const EXTRACTION_MODEL = 'gemini-3.5-flash';

/** A fresh default profile for a learner with no history. */
export function defaultLearnerProfile() {
  return { cefrLevel: 'A1', focusAreas: [], goals: '', lastSessionSummary: '', sessionCount: 0 };
}

/** Coerce a stored/partial object into a well-formed profile. */
export function normalizeLearnerProfile(raw) {
  const base = defaultLearnerProfile();
  if (!raw || typeof raw !== 'object') return base;
  const level = String(raw.cefrLevel || '').toUpperCase();
  return {
    cefrLevel: CEFR_SET.has(level) ? level : base.cefrLevel,
    focusAreas: Array.isArray(raw.focusAreas)
      ? raw.focusAreas.map(a => String(a).trim()).filter(Boolean).slice(0, MAX_FOCUS_AREAS)
      : [],
    goals: typeof raw.goals === 'string' ? raw.goals.slice(0, 400) : '',
    lastSessionSummary: typeof raw.lastSessionSummary === 'string' ? raw.lastSessionSummary.slice(0, 600) : '',
    sessionCount: Number.isFinite(raw.sessionCount) && raw.sessionCount > 0 ? Math.floor(raw.sessionCount) : 0,
  };
}

/**
 * Apply an extraction delta to the current profile. Pure function.
 * delta: { cefrLevel?, addFocusAreas?: string[], resolvedFocusAreas?: string[], goals?, sessionSummary? }
 */
export function mergeLearnerProfile(current, delta) {
  const profile = normalizeLearnerProfile(current);
  const d = delta && typeof delta === 'object' ? delta : {};

  const nextLevel = String(d.cefrLevel || '').toUpperCase();
  if (CEFR_SET.has(nextLevel)) profile.cefrLevel = nextLevel;

  const resolved = new Set(
    (Array.isArray(d.resolvedFocusAreas) ? d.resolvedFocusAreas : [])
      .map(a => String(a).trim().toLowerCase())
      .filter(Boolean)
  );
  const focus = profile.focusAreas.filter(a => !resolved.has(a.toLowerCase()));
  for (const raw of (Array.isArray(d.addFocusAreas) ? d.addFocusAreas : [])) {
    const area = String(raw).trim();
    if (area && !focus.some(a => a.toLowerCase() === area.toLowerCase())) focus.push(area);
  }
  profile.focusAreas = focus.slice(0, MAX_FOCUS_AREAS);

  if (typeof d.goals === 'string' && d.goals.trim()) profile.goals = d.goals.trim().slice(0, 400);
  if (typeof d.sessionSummary === 'string' && d.sessionSummary.trim()) {
    profile.lastSessionSummary = d.sessionSummary.trim().slice(0, 600);
  }
  profile.sessionCount = profile.sessionCount + 1;
  return profile;
}

/** True when the profile carries real, persona-worthy signal. */
function hasProfileSignal(profile) {
  const p = normalizeLearnerProfile(profile);
  return p.sessionCount > 0 || p.focusAreas.length > 0 || Boolean(p.goals) || Boolean(p.lastSessionSummary) || p.cefrLevel !== 'A1';
}

/**
 * Render the structured profile as a persona block, or '' when there's no signal
 * (a brand-new learner just gets the base persona).
 */
export function formatLearnerProfileForPersona(profile) {
  if (!hasProfileSignal(profile)) return '';
  const p = normalizeLearnerProfile(profile);
  const focus = p.focusAreas.length ? p.focusAreas.join(', ') : '(none recorded yet)';
  const goals = p.goals || '(not stated yet, ask early)';
  const last = p.lastSessionSummary || '(no summary yet)';
  const returning = p.sessionCount > 0 ? `a returning learner (session ${p.sessionCount + 1})` : 'a new learner';
  return `This learner's current profile (you are talking to ${returning}):\n- CEFR level: ${p.cefrLevel}\n- Focus areas (what they're working on or struggle with): ${focus}\n- Goals: ${goals}\n- Last session: ${last}\n\nCalibrate every response to CEFR ${p.cefrLevel}: stretch them slightly beyond it, never overwhelm. Pick up from their focus areas and last session instead of starting cold.`;
}

/**
 * Build the extraction prompt: given the current profile + transcript, ask for a
 * STRICT JSON delta of what changed this session.
 */
function buildExtractionPrompt(current, transcript) {
  const p = normalizeLearnerProfile(current);
  return `You are analysing a Spanish tutoring voice session to update the learner's profile.\n\nCurrent profile:\n- CEFR level: ${p.cefrLevel}\n- Focus areas: ${p.focusAreas.join(', ') || '(none)'}\n- Goals: ${p.goals || '(unknown)'}\n\nTranscript (You = learner, Tutor = El Pinguino):\n${transcript}\n\nReturn STRICT JSON only, no markdown, with this exact shape:\n{\n  \"cefrLevel\": \"one of A1,A2,B1,B2,C1,C2 or empty string if unchanged. Only raise the level when the learner clearly sustains it.\",\n  \"addFocusAreas\": [\"short Spanish grammar/vocab weaknesses observed this session\"],\n  \"resolvedFocusAreas\": [\"previously-listed focus areas the learner has now clearly mastered\"],\n  \"goals\": \"the learner's stated learning goal if newly revealed, else empty string\",\n  \"sessionSummary\": \"one or two sentences on what was practised and what to do next time\"\n}\nUse empty string / empty arrays for anything you cannot determine. Be conservative.`;
}

/**
 * Extract a profile delta from a finished voice transcript and return the merged
 * profile. On any failure, returns the current profile merged with an empty delta
 * (which still increments sessionCount). Requires GEMINI_API_KEY.
 */
export async function extractLearnerProfile(turns, current) {
  const transcript = (Array.isArray(turns) ? turns : [])
    .filter(t => t && typeof t.text === 'string' && t.text.trim())
    .slice(0, 200)
    .map(t => `${t.speaker === 'tutor' ? 'Tutor' : 'You'}: ${t.text.slice(0, 600)}`)
    .join('\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !transcript) return mergeLearnerProfile(current, {});

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EXTRACTION_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildExtractionPrompt(current, transcript) }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) {
      console.warn('Profile extraction failed:', res.status);
      return mergeLearnerProfile(current, {});
    }
    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let delta = {};
    try { delta = JSON.parse(rawText); } catch { delta = {}; }
    return mergeLearnerProfile(current, delta);
  } catch (error) {
    console.warn('Profile extraction error:', String(error.message || error).slice(0, 160));
    return mergeLearnerProfile(current, {});
  }
}
