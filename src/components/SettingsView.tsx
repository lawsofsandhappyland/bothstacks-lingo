import type { UserStats } from '../types';
import { soundEffects } from '../lib/audio';

/**
 * Props for the SettingsView component.
 * @property {UserStats} stats - Current user statistics (XP, streak, lives).
 * @property {string} tutorModel - Currently selected Gemini model identifier.
 * @property {(model: string) => void} setTutorModel - Callback to update the tutor model selection.
 * @property {() => void} resetStats - Callback to reset user stats to default values.
 */
interface SettingsViewProps {
  stats: UserStats;
  tutorModel: string;
  setTutorModel: (model: string) => void;
  resetStats: () => void;
}

/**
 * Settings screen providing Gemini tutor model selection, a profile stats summary (XP, streak, lives),
 * and a reset-stats danger action.
 */
export default function SettingsView({ 
  stats, 
  tutorModel, 
  setTutorModel, 
  resetStats 
}: SettingsViewProps) {
  const handleReset = () => {
    if (confirm("Are you sure you want to reset your stats? This will set your XP to 0 and restore your 5 lives.")) {
      soundEffects.playHeartLost();
      resetStats();
      alert("Stats successfully reset!");
    }
  };

  return (
    <div className="animate-fade-in-up w-full max-w-lg px-4 py-8 mx-auto">
      <div className="retro-card bg-deep-violet text-ghost-white flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <picture className="animate-float">
            <source srcSet="/mascot-tinker.webp" type="image/webp" />
            <img src="/mascot-tinker.png" alt="Tinkering penguin" width={80} height={80} className="drop-shadow-lg" />
          </picture>
          <div>
            <h2 className="text-2xl font-black text-flame-orange tracking-tight">AJUSTES</h2>
            <p className="ui-label text-slate-grey">Configure your brand tutor</p>
          </div>
        </div>

        <hr className="border-void border-2" />

        {/* Gemini API Section */}
        <div className="flex flex-col gap-2">
          <label className="ui-label text-fuchsia-accent">AI Tutor Access</label>
          <p className="text-xs text-slate-grey mb-1">
            El Pingüino uses the server-side <span className="font-mono">GEMINI_API_KEY</span> environment variable. The browser never stores or receives your API key.
          </p>
          <p className="text-[10px] text-slate-grey mt-1">
            If the server is not configured, Tutor mode falls back to guided practice topics instead of exposing a client-side secret.
          </p>

          {/* Model selection dropdown */}
          <div className="flex flex-col gap-1.5 mt-3">
            <label className="ui-label text-electric-blue text-[10px]">Gemini Model Selection</label>
            <select
              value={tutorModel}
              onChange={(e) => { soundEffects.playTap(); setTutorModel(e.target.value); }}
              className="bg-void border-3 border-void rounded-xl px-4 py-2.5 text-ghost-white font-mono text-xs focus:outline-none focus:border-fuchsia-accent cursor-pointer"
            >
              <option value="gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live (Voice practice)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Text tutor fallback)</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Fastest & lowest cost)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Legacy fast model)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Lightweight & Efficient)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning & Detailed Grammar)</option>
            </select>
          </div>
        </div>

        <hr className="border-void border-2" />

        {/* Profile Stats Overview */}
        <div className="flex flex-col gap-3">
          <h3 className="ui-label text-electric-blue">Profile Stats Summary</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-void p-3 rounded-xl border-2 border-void">
              <span className="text-xl block">🎯</span>
              <span className="ui-label text-xs text-slate-grey">XP</span>
              <span className="font-mono font-black text-lg block text-flame-orange">{stats.xp}</span>
            </div>
            <div className="bg-void p-3 rounded-xl border-2 border-void">
              <span className="text-xl block">🔥</span>
              <span className="ui-label text-xs text-slate-grey">Streak</span>
              <span className="font-mono font-black text-lg block text-fuchsia-accent">{stats.streak} days</span>
            </div>
            <div className="bg-void p-3 rounded-xl border-2 border-void">
              <span className="text-xl block">❤️</span>
              <span className="ui-label text-xs text-slate-grey">Lives</span>
              <span className="font-mono font-black text-lg block text-electric-blue">{stats.lives}/5</span>
            </div>
          </div>
        </div>

        <hr className="border-void border-2" />

        {/* Danger Zone */}
        <div className="flex flex-col gap-3">
          <h3 className="ui-label text-red-500">Danger Zone</h3>
          <button
            onClick={handleReset}
            className="pill-button bg-red-600 border-red-950 text-ghost-white hover:bg-red-500"
          >
            Reset All Stats
          </button>
        </div>
      </div>
    </div>
  );
}
