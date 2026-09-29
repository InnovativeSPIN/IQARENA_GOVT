import React from 'react';
import { Lock, Check } from 'lucide-react';

export interface MilestoneItem {
  id: string;
  title: string;
  desc: string;
  isEarned: boolean;
  requirement: string;
  category: 'starter' | 'progress' | 'mastery' | 'streak' | 'excellence';
}

interface MilestoneCardProps {
  milestone: MilestoneItem;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D METALLIC BADGE ICONS (Ultra crisp SVG with metallic bevels, gradients & shine)
// ─────────────────────────────────────────────────────────────────────────────

const FirstTestBadgeSvg: React.FC<{ isEarned: boolean }> = ({ isEarned }) => {
  return (
    <svg viewBox="0 0 72 72" className="w-14 h-14 transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
      <defs>
        {/* Bronze / Emerald Metallic Gradients */}
        <radialGradient id="ft-metal" cx="36%" cy="32%" r="68%">
          <stop offset="0%" stopColor={isEarned ? "#fef08a" : "#e2e8f0"} />
          <stop offset="35%" stopColor={isEarned ? "#f59e0b" : "#94a3b8"} />
          <stop offset="70%" stopColor={isEarned ? "#b45309" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#78350f" : "#475569"} />
        </radialGradient>
        <linearGradient id="ft-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isEarned ? "#fef9c3" : "#f8fafc"} />
          <stop offset="50%" stopColor={isEarned ? "#d97706" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#92400e" : "#334155"} />
        </linearGradient>
        <linearGradient id="ft-inner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isEarned ? "#059669" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#064e3b" : "#334155"} />
        </linearGradient>
        <linearGradient id="ft-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isEarned ? "#dc2626" : "#64748b"} />
          <stop offset="50%" stopColor={isEarned ? "#ef4444" : "#94a3b8"} />
          <stop offset="100%" stopColor={isEarned ? "#b91c1c" : "#475569"} />
        </linearGradient>
      </defs>

      {/* Ribbons behind medallion */}
      <path d="M26 44 L20 66 L29 60 L35 66 L33 46 Z" fill="url(#ft-ribbon)" opacity={isEarned ? 0.95 : 0.6} />
      <path d="M46 44 L52 66 L43 60 L37 66 L39 46 Z" fill="url(#ft-ribbon)" opacity={isEarned ? 0.95 : 0.6} />

      {/* Outer beveled metallic rim */}
      <circle cx="36" cy="34" r="28" fill="url(#ft-rim)" />
      <circle cx="36" cy="34" r="25.5" fill="url(#ft-metal)" />
      {/* Recessed inner disc */}
      <circle cx="36" cy="34" r="20" fill="url(#ft-inner)" stroke={isEarned ? "#fef08a" : "#cbd5e1"} strokeWidth="1.2" />

      {/* Glossy top specular reflection highlight */}
      <path d="M20 28 A 18 18 0 0 1 52 28 A 18 8 0 0 0 20 28 Z" fill="#ffffff" opacity={isEarned ? 0.45 : 0.2} />

      {/* Center 3D Trophy / Medal Icon */}
      <g transform="translate(24, 21)" fill={isEarned ? "#fef08a" : "#e2e8f0"}>
        <path d="M4 3 h16 v5 c0 4.4 -3.6 8 -8 8 s-8 -3.6 -8 -8 V3 z" />
        <path d="M4 5 H1 c0 3 2 5 4 5 V5 z" />
        <path d="M20 5 h3 c0 3 -2 5 -4 5 V5 z" />
        <path d="M10 16 h4 v4 h-4 z" />
        <path d="M7 20 h10 v2 H7 z" />
        {/* Star imprint on trophy */}
        <polygon points="12,6.5 13.2,9 16,9.3 14,11.2 14.5,14 12,12.6 9.5,14 10,11.2 8,9.3 10.8,9" fill={isEarned ? "#d97706" : "#64748b"} />
      </g>
    </svg>
  );
};

const RisingStarBadgeSvg: React.FC<{ isEarned: boolean }> = ({ isEarned }) => {
  return (
    <svg viewBox="0 0 72 72" className="w-14 h-14 transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
      <defs>
        <radialGradient id="rs-metal" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={isEarned ? "#cffafe" : "#f1f5f9"} />
          <stop offset="40%" stopColor={isEarned ? "#38bdf8" : "#94a3b8"} />
          <stop offset="75%" stopColor={isEarned ? "#0284c7" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#0369a1" : "#334155"} />
        </radialGradient>
        <linearGradient id="rs-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isEarned ? "#e0f2fe" : "#ffffff"} />
          <stop offset="50%" stopColor={isEarned ? "#0ea5e9" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#0369a1" : "#1e293b"} />
        </linearGradient>
        <linearGradient id="rs-arrow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isEarned ? "#10b981" : "#94a3b8"} />
          <stop offset="100%" stopColor={isEarned ? "#34d399" : "#e2e8f0"} />
        </linearGradient>
      </defs>

      {/* Beveled Octagon / Starburst Base */}
      <polygon
        points="36,6 43,15 54,12 56,23 66,28 62,39 68,48 58,54 56,65 45,63 36,70 27,63 16,65 14,54 4,48 10,39 6,28 16,23 18,12 29,15"
        fill="url(#rs-rim)"
      />
      <circle cx="36" cy="37" r="23" fill="url(#rs-metal)" />
      
      {/* Specular gloss curve */}
      <path d="M22 31 A 15 15 0 0 1 50 31 A 15 7 0 0 0 22 31 Z" fill="#ffffff" opacity={isEarned ? 0.5 : 0.25} />

      {/* Upward Growth Graph + Rocket/Star overlay */}
      <g transform="translate(22, 23)">
        {/* Trend line / bar chart */}
        <rect x="3" y="19" width="4.5" height="7" rx="1.5" fill={isEarned ? "#bae6fd" : "#cbd5e1"} />
        <rect x="10" y="13" width="4.5" height="13" rx="1.5" fill={isEarned ? "#7dd3fc" : "#94a3b8"} />
        <rect x="17" y="7" width="4.5" height="19" rx="1.5" fill={isEarned ? "#38bdf8" : "#64748b"} />
        
        {/* Ascending energetic arrow */}
        <path
          d="M4 17 L12 11 L18 6 L25 1"
          stroke={isEarned ? "#fef08a" : "#f1f5f9"}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <polygon points="25,1 25,6 20,1" fill={isEarned ? "#fef08a" : "#f1f5f9"} />

        {/* Floating star particle */}
        <polygon points="23,9 24,11 26,11 24.5,12.5 25,14.5 23,13.5 21,14.5 21.5,12.5 20,11 22,11" fill={isEarned ? "#fef9c3" : "#e2e8f0"} />
      </g>
    </svg>
  );
};

const PersonalBestBadgeSvg: React.FC<{ isEarned: boolean }> = ({ isEarned }) => {
  return (
    <svg viewBox="0 0 72 72" className="w-14 h-14 transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
      <defs>
        {/* Rich Pure 24K Gold Gradients */}
        <radialGradient id="pb-metal" cx="35%" cy="30%" r="72%">
          <stop offset="0%" stopColor={isEarned ? "#fffbeb" : "#f8fafc"} />
          <stop offset="25%" stopColor={isEarned ? "#fde047" : "#e2e8f0"} />
          <stop offset="55%" stopColor={isEarned ? "#eab308" : "#94a3b8"} />
          <stop offset="85%" stopColor={isEarned ? "#ca8a04" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#854d0e" : "#334155"} />
        </radialGradient>
        <linearGradient id="pb-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isEarned ? "#fef9c3" : "#ffffff"} />
          <stop offset="30%" stopColor={isEarned ? "#eab308" : "#cbd5e1"} />
          <stop offset="70%" stopColor={isEarned ? "#ca8a04" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#713f12" : "#1e293b"} />
        </linearGradient>
      </defs>

      {/* Multi-layered Crown / Laurel Medallion */}
      <circle cx="36" cy="35" r="28" fill="url(#pb-rim)" />
      
      {/* Beaded rim pattern */}
      <circle cx="36" cy="35" r="25.5" fill="none" stroke={isEarned ? "#fef08a" : "#e2e8f0"} strokeWidth="1" strokeDasharray="2,2.5" />
      <circle cx="36" cy="35" r="23" fill="url(#pb-metal)" />

      {/* Glossy highlight */}
      <path d="M19 29 A 17 17 0 0 1 53 29 A 17 8 0 0 0 19 29 Z" fill="#ffffff" opacity={isEarned ? 0.6 : 0.25} />

      {/* 3D Star Crown in Center */}
      <g transform="translate(20, 19)" fill={isEarned ? "#ffffff" : "#f1f5f9"}>
        {/* Crown base */}
        <path
          d="M5 24 L27 24 L29 13 L21 17 L16 8 L11 17 L3 13 Z"
          fill={isEarned ? "#fef08a" : "#e2e8f0"}
          stroke={isEarned ? "#b45309" : "#64748b"}
          strokeWidth="1.2"
        />
        {/* Jewels on crown tips */}
        <circle cx="16" cy="8" r="2.2" fill={isEarned ? "#ef4444" : "#94a3b8"} />
        <circle cx="3" cy="13" r="1.8" fill={isEarned ? "#3b82f6" : "#94a3b8"} />
        <circle cx="29" cy="13" r="1.8" fill={isEarned ? "#3b82f6" : "#94a3b8"} />
        {/* Laurel wreath leaves at bottom */}
        <path d="M8 26 C12 28, 20 28, 24 26" stroke={isEarned ? "#a16207" : "#475569"} strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
};

const StreakBadgeSvg: React.FC<{ isEarned: boolean }> = ({ isEarned }) => {
  return (
    <svg viewBox="0 0 72 72" className="w-14 h-14 transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
      <defs>
        <radialGradient id="sk-metal" cx="38%" cy="30%" r="70%">
          <stop offset="0%" stopColor={isEarned ? "#ffedd5" : "#f8fafc"} />
          <stop offset="35%" stopColor={isEarned ? "#fb923c" : "#cbd5e1"} />
          <stop offset="70%" stopColor={isEarned ? "#ea580c" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#9a3412" : "#334155"} />
        </radialGradient>
        <linearGradient id="sk-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isEarned ? "#ffedd5" : "#ffffff"} />
          <stop offset="50%" stopColor={isEarned ? "#f97316" : "#94a3b8"} />
          <stop offset="100%" stopColor={isEarned ? "#7c2d12" : "#1e293b"} />
        </linearGradient>
        <linearGradient id="sk-flame" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={isEarned ? "#dc2626" : "#475569"} />
          <stop offset="45%" stopColor={isEarned ? "#f97316" : "#94a3b8"} />
          <stop offset="85%" stopColor={isEarned ? "#fde047" : "#e2e8f0"} />
        </linearGradient>
        <linearGradient id="sk-core" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={isEarned ? "#f59e0b" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#ffffff" : "#f1f5f9"} />
        </linearGradient>
      </defs>

      {/* Flame Crest Shield base */}
      <circle cx="36" cy="35" r="28" fill="url(#sk-rim)" />
      <circle cx="36" cy="35" r="24" fill="url(#sk-metal)" />

      {/* Gloss curve */}
      <path d="M20 28 A 16 16 0 0 1 52 28 A 16 7 0 0 0 20 28 Z" fill="#ffffff" opacity={isEarned ? 0.5 : 0.2} />

      {/* 3D Multi-stage Flame */}
      <g transform="translate(22, 17)">
        {/* Outer vigorous flame */}
        <path
          d="M14 3 C16 9, 23 12, 23 20 C23 27, 18 31, 14 31 C10 31, 5 27, 5 20 C5 14, 11 11, 12 7 C12 7, 9 9, 8 13 C7 11, 9 7, 14 3 Z"
          fill="url(#sk-flame)"
          stroke={isEarned ? "#ffedd5" : "#cbd5e1"}
          strokeWidth="0.8"
        />
        {/* Inner white-hot spark core */}
        <path
          d="M14 16 C16 19, 19 21, 19 25 C19 29, 16 30.5, 14 30.5 C12 30.5, 9 29, 9 25 C9 22, 12 20, 13 18 C13 18, 12 19, 11 21 C11 19, 12 17, 14 16 Z"
          fill="url(#sk-core)"
        />
      </g>
    </svg>
  );
};

const SubjectAceBadgeSvg: React.FC<{ isEarned: boolean }> = ({ isEarned }) => {
  return (
    <svg viewBox="0 0 72 72" className="w-14 h-14 transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
      <defs>
        {/* Sapphire / Diamond Medallion */}
        <radialGradient id="sa-metal" cx="35%" cy="30%" r="72%">
          <stop offset="0%" stopColor={isEarned ? "#e0e7ff" : "#f8fafc"} />
          <stop offset="35%" stopColor={isEarned ? "#818cf8" : "#cbd5e1"} />
          <stop offset="70%" stopColor={isEarned ? "#4f46e5" : "#64748b"} />
          <stop offset="100%" stopColor={isEarned ? "#312e81" : "#334155"} />
        </radialGradient>
        <linearGradient id="sa-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isEarned ? "#e0e7ff" : "#ffffff"} />
          <stop offset="50%" stopColor={isEarned ? "#6366f1" : "#94a3b8"} />
          <stop offset="100%" stopColor={isEarned ? "#3730a3" : "#1e293b"} />
        </linearGradient>
      </defs>

      {/* Faceted Diamond / Hexagon Outer Rim */}
      <polygon
        points="36,7 58,18 63,42 48,63 24,63 9,42 14,18"
        fill="url(#sa-rim)"
      />
      <circle cx="36" cy="35" r="23" fill="url(#sa-metal)" />

      {/* Target concentric rings */}
      <circle cx="36" cy="35" r="17" fill="none" stroke={isEarned ? "#e0e7ff" : "#cbd5e1"} strokeWidth="1.5" opacity="0.6" />
      <circle cx="36" cy="35" r="11" fill="none" stroke={isEarned ? "#fef08a" : "#e2e8f0"} strokeWidth="1.8" />
      <circle cx="36" cy="35" r="5" fill={isEarned ? "#fef08a" : "#e2e8f0"} />

      {/* Bullseye Arrow / Diamond Spark */}
      <g transform="translate(36, 35)">
        {/* Precision Crosshair Ticks */}
        <line x1="-20" y1="0" x2="-14" y2="0" stroke={isEarned ? "#c7d2fe" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="0" x2="20" y2="0" stroke={isEarned ? "#c7d2fe" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="0" y1="-20" x2="0" y2="-14" stroke={isEarned ? "#c7d2fe" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="0" y1="14" x2="0" y2="20" stroke={isEarned ? "#c7d2fe" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Gloss curve */}
      <path d="M21 28 A 15 15 0 0 1 51 28 A 15 7 0 0 0 21 28 Z" fill="#ffffff" opacity={isEarned ? 0.5 : 0.2} />
    </svg>
  );
};

export const MilestoneCard: React.FC<MilestoneCardProps> = ({ milestone }) => {
  const { id, title, desc, isEarned, requirement } = milestone;

  const renderBadge = () => {
    switch (id) {
      case 'first-test':
        return <FirstTestBadgeSvg isEarned={isEarned} />;
      case 'rising-star':
        return <RisingStarBadgeSvg isEarned={isEarned} />;
      case 'personal-best':
        return <PersonalBestBadgeSvg isEarned={isEarned} />;
      case 'streak':
        return <StreakBadgeSvg isEarned={isEarned} />;
      case 'subject-ace':
        return <SubjectAceBadgeSvg isEarned={isEarned} />;
      default:
        return <PersonalBestBadgeSvg isEarned={isEarned} />;
    }
  };

  return (
    <div
      tabIndex={0}
      role="article"
      aria-label={`${title} milestone: ${isEarned ? 'Earned' : 'Locked'}. ${desc}. Requirement: ${requirement}`}
      className={`group relative flex flex-col items-center text-center rounded-2xl p-4 sm:p-5 transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
        isEarned
          ? 'bg-gradient-to-b from-white via-amber-50/40 to-amber-100/30 border-amber-200/90 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-amber-300'
          : 'bg-slate-50/80 border-slate-200/80 shadow-xs hover:border-slate-300 hover:bg-slate-100/60'
      }`}
    >
      {/* Status Pill on Top Corner */}
      <div className="w-full flex items-center justify-between mb-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-colors ${
            isEarned
              ? 'bg-amber-100 text-amber-800 border border-amber-300/60'
              : 'bg-slate-200/70 text-slate-600 border border-slate-300/60'
          }`}
        >
          {isEarned ? (
            <>
              <Check className="w-2.5 h-2.5 text-amber-700 stroke-[3]" />
              Earned
            </>
          ) : (
            <>
              <Lock className="w-2.5 h-2.5 text-slate-500" />
              Locked
            </>
          )}
        </span>

        {/* Milestone Indicator Icon / Category dot */}
        <span
          className={`w-2 h-2 rounded-full ${
            isEarned ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]' : 'bg-slate-300'
          }`}
        />
      </div>

      {/* 3D Badge Centerpiece with animated subtle shine on hover */}
      <div className="relative my-1.5 flex items-center justify-center">
        {/* Ambient radial glow under earned badge */}
        {isEarned && (
          <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md scale-95 group-hover:scale-110 transition-transform duration-300" />
        )}
        <div className="relative z-10">{renderBadge()}</div>
      </div>

      {/* Title */}
      <h3
        className={`text-xs sm:text-sm font-semibold mt-2.5 tracking-tight line-clamp-1 transition-colors ${
          isEarned ? 'text-slate-900 group-hover:text-amber-900' : 'text-slate-600'
        }`}
      >
        {title}
      </h3>

      {/* Current Achievement stat or requirement snippet */}
      <p
        className={`text-[11px] leading-tight mt-1 line-clamp-1 font-medium ${
          isEarned ? 'text-amber-700 font-semibold' : 'text-slate-400'
        }`}
      >
        {desc}
      </p>

      {/* Explanatory unlock requirement badge / sub-caption */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 w-full flex items-center justify-center">
        <p className="text-[10px] text-slate-400 leading-tight group-hover:text-slate-600 transition-colors">
          {requirement}
        </p>
      </div>
    </div>
  );
};

export default MilestoneCard;
