import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PLAYERS } from './data';
import { PlayerData } from './types';
import { Search, ChevronRight, Volume2, VolumeX, Crosshair, Flag, CircleDot, User, Star, TrendingUp, Users, Trophy, X, Crown, Activity, Flame, AlertCircle, Mail, HelpCircle, Check, XCircle, Award, Medal, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';

// --- Assets ---
// Background Music
const AUDIO_URL = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3"; 
// Slide Transition Sound (Reliable Google Storage URL - 'Pop' sound)
const SFX_URL = "https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3";

// --- Constants ---
const FINES_DATA: Record<string, string> = {
  "Charlie Luke": "£16.50",
  "Chris Ryan": "£15.00",
  "Ben Andrews": "£13.00",
  "Alex Roberts": "£11.00",
  "Martyn Head": "£10.50",
  "Oliver Clarke": "£7.00",
  "Mick Dicken": "£4.50",
  "Max Chippett": "£4.00",
  "Ben Roberts": "£4.00",
  "Shane Looker": "£3.00"
};

// --- Helpers ---
const useSquadStats = () => {
  return useMemo(() => {
    let maxApps = 0;
    let maxGoals = 0;
    let badBoy = PLAYERS[0];
    let mostMoMs = PLAYERS[0];
    let scheduleSource = PLAYERS[0]; // Player with most games to determine correct order
    
    // Squad Record Calculation
    const teamRecord = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
    let biggestWin = { opponent: '', score: '', diff: -1 };
    const formGuide: string[] = []; // Stores 'W', 'D', 'L'

    // First pass: Find leaders and the player with most matches to use as Schedule Master
    PLAYERS.forEach(p => {
      const apps = p.Stats["M1 Apps."] || 0;
      const goals = p.Stats["M1 Goals"] || 0;
      const points = p.Stats["Card Points"] || 0;
      const moms = p.Stats["Man of the match"] || 0;

      if (apps > maxApps) {
        maxApps = apps;
        scheduleSource = p; // Use this player's match list as the master schedule
      }
      if (goals > maxGoals) maxGoals = goals;
      if (points > (badBoy.Stats["Card Points"] || 0)) badBoy = p;
      if (moms > (mostMoMs.Stats["Man of the match"] || 0)) mostMoMs = p;
    });

    const topScorers = PLAYERS.filter(p => (p.Stats["M1 Goals"] || 0) === maxGoals);
    const topScorerNames = topScorers.map(p => p.Name).join(" & ");

    // Use the Master Schedule to calculate team stats in correct chronological order
    scheduleSource.Matches.forEach(m => {
       const lowerGame = m.Game.toLowerCase();
       let result = 'D';
       let gf = 0;
       let ga = 0;
       let opponent = m.Game.split('(')[0].trim();

       const match = m.Game.match(/(\d+)-(\d+)/);
       if (match) {
         const s1 = parseInt(match[1]);
         const s2 = parseInt(match[2]);
         
         if (lowerGame.includes("won")) {
           result = 'W';
           gf = Math.max(s1, s2);
           ga = Math.min(s1, s2);
         } else if (lowerGame.includes("lost")) {
           result = 'L';
           gf = Math.min(s1, s2);
           ga = Math.max(s1, s2);
         } else {
           result = 'D';
           gf = s1;
           ga = s2;
         }
       }

       // Aggregations
       if (result === 'W') {
            teamRecord.wins++;
            const diff = gf - ga;
            if (diff > biggestWin.diff) {
                biggestWin = { opponent: opponent, score: `${gf}-${ga}`, diff };
            }
        } else if (result === 'L') teamRecord.losses++;
        else teamRecord.draws++;

        teamRecord.goalsFor += gf;
        teamRecord.goalsAgainst += ga;
        formGuide.push(result);
    });

    return { maxApps, topScorers, maxGoals, topScorerNames, badBoy, mostMoMs, teamRecord, totalGames: scheduleSource.Matches.length, biggestWin, formGuide };
  }, []);
};

// --- Sub-Components ---

const BackgroundMusic = ({ isPlaying, togglePlay }: { isPlaying: boolean, togglePlay: () => void }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Only render if a URL is actually provided
  if (!AUDIO_URL) return null;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Autoplay prevented:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <div className="fixed top-4 right-4 z-[60]">
      <audio ref={audioRef} src={AUDIO_URL} />
      <button 
        onClick={togglePlay}
        className="bg-black/40 backdrop-blur-md p-3 rounded-full hover:bg-orange-500/20 transition-all border border-white/10 group"
      >
        {isPlaying ? <Volume2 className="text-orange-500 w-5 h-5 group-hover:text-white" /> : <VolumeX className="text-slate-500 w-5 h-5 group-hover:text-white" />}
      </button>
    </div>
  );
};

const QuizSlide = ({ topScorers }: { topScorers: PlayerData[] }) => {
  // Fixed options as requested: Dudley, Swann, Ben Roberts, Barnardo
  const optionNames = ["James Dudley", "Richard Swann", "Ben Roberts", "Scott Barnardo"];
  const options = PLAYERS.filter(p => optionNames.includes(p.Name))
                         .sort((a, b) => a.Name.localeCompare(b.Name));

  const [found, setFound] = useState<string[]>([]);
  const [msg, setMsg] = useState<string>("Tap to guess the Top Scorer");
  const [showStats, setShowStats] = useState(false);

  const isGameComplete = found.length === topScorers.length;

  const handleGuess = (player: PlayerData) => {
    if (found.includes(player.Name) || isGameComplete) return;

    const isTop = topScorers.some(ts => ts.Name === player.Name);

    if (isTop) {
      const newFound = [...found, player.Name];
      setFound(newFound);
      
      if (newFound.length === topScorers.length) {
        setMsg("CORRECT! THE DEADLY DUO!");
        confetti({
           particleCount: 200,
           spread: 100,
           origin: { y: 0.6 },
           colors: ['#f97316', '#fbbf24', '#ffffff']
        });
        setTimeout(() => setShowStats(true), 1000);
      } else {
        setMsg("YES! But it's a TIE... Who is he sharing it with?");
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.8 } });
      }
    } else {
      setMsg(`Nope! ${player.Name} only has ${player.Stats["M1 Goals"] || 0} goals.`);
    }
  };

  return (
    <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.1),transparent_70%)]"></div>
      
      <div className="relative z-10 text-center w-full max-w-md mx-auto h-full flex flex-col justify-center">
        {!showStats ? (
          <>
            <motion.div
               initial={{ y: -20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="mb-8"
            >
               <div className="inline-block bg-orange-500/20 text-orange-500 px-4 py-1 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-4 border border-orange-500/30">
                  Trivia Time
               </div>
               <h2 className="text-4xl font-black text-white display-font mb-2">GUESS WHO?</h2>
               <motion.p 
                 key={msg}
                 initial={{ opacity: 0, y: 5 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-neutral-300 text-lg font-bold min-h-[3rem]"
               >
                 {msg}
               </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 gap-3">
               {options.map((option, idx) => {
                  const isFound = found.includes(option.Name);
                  const isTop = topScorers.some(ts => ts.Name === option.Name);
                  
                  let bgClass = "bg-neutral-800 hover:bg-neutral-700";
                  let borderClass = "border-white/5";
                  
                  if (isFound) {
                     bgClass = "bg-green-600";
                     borderClass = "border-green-400";
                  }

                  return (
                    <motion.button
                      key={option.Name}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleGuess(option)}
                      className={`w-full p-4 rounded-xl border ${borderClass} ${bgClass} transition-all duration-300 font-bold text-lg flex justify-between items-center group relative overflow-hidden`}
                      disabled={isFound}
                    >
                       <span className="relative z-10">{option.Name}</span>
                       {isFound && <Check className="w-5 h-5 text-white relative z-10" />}
                       {!isFound && <HelpCircle className="w-5 h-5 text-neutral-600 group-hover:text-white transition-colors relative z-10" />}
                    </motion.button>
                  );
               })}
            </div>
            {found.length > 0 && !isGameComplete && (
               <p className="mt-4 text-xs text-neutral-500 uppercase tracking-widest animate-pulse">Select the other top scorer</p>
            )}
          </>
        ) : (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900/90 border border-orange-500/30 rounded-3xl p-6 backdrop-blur-xl"
          >
            <div className="flex justify-center mb-4">
               <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase display-font mb-1">Joint Winners</h2>
            <div className="text-orange-500 text-6xl font-black display-font mb-6">{topScorers[0].Stats["M1 Goals"]} Goals</div>
            
            <div className="grid grid-cols-2 gap-4">
              {topScorers.map(p => (
                 <div key={p.Name} className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="text-xl font-bold text-white mb-1">{p.Name.split(' ')[1]}</div>
                    <div className="text-xs text-neutral-400 space-y-1">
                       <div className="flex justify-between"><span>Apps:</span> <span className="text-white">{p.Stats["M1 Apps."]}</span></div>
                       <div className="flex justify-between"><span>Open Play:</span> <span className="text-white">{p.Stats["Open Play Goals"] || 0}</span></div>
                       <div className="flex justify-between"><span>MoM:</span> <span className="text-white">{p.Stats["Man of the match"] || 0}</span></div>
                    </div>
                 </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};


// 1. Search Screen
interface SearchScreenProps {
  onSelect: (player: PlayerData) => void;
  onStartMusic: () => void;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ onSelect, onStartMusic }) => {
  const [query, setQuery] = useState('');

  const filteredPlayers = PLAYERS.filter((p) =>
    p.Name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="h-[100dvh] w-full bg-neutral-950 flex flex-col items-center p-4 md:p-6 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.15),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.05),transparent_40%)] pointer-events-none" />
      
      <div className="bg-noise" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10 flex flex-col h-full"
      >
        {/* Header Section - Shrinks if needed but stays visible */}
        <div className="mt-4 md:mt-8 mb-6 text-center shrink-0">
          <h1 className="text-4xl md:text-5xl font-black mb-2 text-white display-font tracking-tighter leading-none drop-shadow-xl">
            DUCHY<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">WRAPPED</span>
          </h1>
          <div className="inline-block mt-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-neutral-300 font-bold tracking-[0.2em] text-[10px] uppercase">Half Season Review</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4 group shrink-0">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="Search player name..."
            className="w-full pl-12 pr-4 py-4 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl text-lg text-white placeholder-neutral-600 focus:ring-2 focus:ring-orange-500/50 focus:outline-none focus:border-orange-500/50 transition-all shadow-2xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Scrollable Player List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 min-h-0 touch-pan-y">
          <div className="space-y-3">
            {filteredPlayers.map((player) => (
              <motion.button
                key={player["Squad Number"]}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onStartMusic();
                  onSelect(player);
                }}
                className="w-full p-3 bg-neutral-900/60 border border-white/5 rounded-xl flex items-center justify-between group transition-colors hover:border-orange-500/40 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-400 group-hover:bg-orange-500 group-hover:text-black transition-all font-mono">
                    {player["Squad Number"]}
                  </span>
                  <span className="font-bold text-base text-neutral-200 group-hover:text-white transition-colors text-left">{player.Name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-orange-500" />
              </motion.button>
            ))}
            {query && filteredPlayers.length === 0 && (
               <p className="text-neutral-500 text-center py-4">No players found.</p>
            )}
            {/* Added extra padding at bottom to ensure last item is visible above any browser chrome */}
            <div className="h-8"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// 2. Wrapped Slides Logic
interface WrappedProps {
  player: PlayerData;
  onClose: () => void;
}

const WrappedView: React.FC<WrappedProps> = ({ player, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Squad Context
  const squadStats = useSquadStats();

  // Stats extraction
  const stats = player.Stats;
  
  const totalApps = stats["M1 Apps."] || 0;
  const totalGoals = stats["M1 Goals"] || 0;
  const assists = stats["Assists"] || 0;
  const greenCards = stats["Green cards"] || 0;
  const yellowCards = stats["Yellow cards"] || 0;
  const mom = stats["Man of the match"] || 0;
  const totalInvolvement = totalGoals + assists;

  // Breakdown stats
  const openPlayGoals = stats["Open Play Goals"] || 0;
  const penaltyCornerGoals = stats["Penalty Corners"] || 0;
  const penaltyFlickGoals = stats["Penalty Flicks"] || 0;

  // Determine Special Award
  let specialAward = null;
  if (player.Name === "Martin Richards") {
    specialAward = { label: "NICKNAME ACQUIRED", text: "PORNSTAR", emoji: "👨🏻" };
  } else if (player.Name === "Mick Dicken") {
    specialAward = { label: "SQUAD RANKING", text: "MOST HANDSOME", emoji: "🤵" };
  } else if (player.Name === "Ben Andrews") {
    specialAward = { label: "SQUAD RANKING", text: "HANDSOME RUNNER UP", emoji: "🥈" };
  } else if (player.Name === "Ben Roberts") {
    specialAward = { label: "NICKNAME ACQUIRED", text: "MR BLOBBY", emoji: "🍬" };
  } else if (player.Name === "Ethan Allen") {
    specialAward = { label: "TECHNICAL ANALYSIS", text: "FLAPPY HANDS", emoji: "🧤" };
  } else if (["Tom Blewett", "Martyn Head", "Max Chippett", "Chris Ryan"].includes(player.Name)) {
    specialAward = { label: "MEDICAL ALERT", text: "HAIRLINE FRACTURE", emoji: "👨‍🦲" };
  } else if (player.Name === "Shane Looker") {
    specialAward = { label: "CELEBRITY LOOKALIKE", text: "JAY CARTWRIGHT", emoji: "🚌" };
  } else if (player.Name === "Phill Fordham") {
    specialAward = { label: "FASHION ALERT", text: "NICE SKORT", emoji: "👗" };
  } else if (player.Name === "Alex Roberts") {
    specialAward = { label: "MEDICAL ALERT", text: "DEVIL'S HAMSTRING", emoji: "🔥" };
  } else if (player.Name === "Scott Barnardo") {
    specialAward = { label: "LIFESTYLE", text: "MOUNTAIN MAN", emoji: "🏔️" };
  } else if (player.Name === "Richard Swann") {
    specialAward = { label: "JOB TITLE", text: "POSTMAN PAT", emoji: "📬" };
  }

  const downloadCard = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    if (cardRef.current) {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Duchy_HalfSeason_${player.Name.replace(' ', '_')}.png`;
      link.click();
    }
  };

  const playSfx = () => {
    // Create new audio instance for overlap support and reliability
    const audio = new Audio(SFX_URL);
    audio.volume = 0.5;
    audio.play().catch(e => console.log('SFX play failed', e));
  };

  const slides = [
    // Intro
    {
      id: 'intro',
      render: () => (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-black relative">
          <div className="absolute inset-0 bg-gradient-to-t from-orange-900/20 via-black to-black animate-pulse"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
          
          <h1 className="text-6xl md:text-8xl font-black text-white display-font uppercase leading-[0.85] relative z-10 drop-shadow-2xl">
            <motion.span 
              initial={{ x: -50, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="block"
            >
              {player.Name.split(' ')[0]}
            </motion.span>
            <motion.span 
              initial={{ x: 50, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 block"
            >
              {player.Name.split(' ')[1]}
            </motion.span>
          </h1>
          
          <motion.div 
             initial={{ y: 50, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.6 }}
             className="mt-12 bg-neutral-900/80 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 relative z-10 shadow-2xl"
          >
            <span className="text-lg font-bold text-neutral-300">Half Season Wrapped</span>
          </motion.div>
        </div>
      )
    },

    // --- EARLY SPECIAL SLIDES ---

    // Phil Fordham Skort Slide
    ...(player.Name === "Phill Fordham" ? [{
      id: 'skort',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(236,72,153,0.2),transparent_70%)]"></div>
           
           <div className="relative z-10 flex flex-col items-center text-center">
               <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="mb-8 relative"
               >
                  <div className="text-7xl md:text-8xl leading-none drop-shadow-2xl filter drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                      👗
                  </div>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
               >
                  <div className="bg-pink-500/20 border border-pink-500/40 text-pink-400 px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em]">
                     Kit Violation
                  </div>
                  <h1 className="text-5xl font-black text-white display-font mb-6 leading-tight">
                      REAL MEN<br/>WEAR <span className="text-pink-500">SKORTS</span>
                  </h1>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10"
               >
                  <p className="text-lg text-white font-bold italic">
                     "It's about freedom of movement, okay?"
                  </p>
               </motion.div>
           </div>
        </div>
      )
    }] : []),


    // Matches
    {
      id: 'matches',
      render: () => {
        const percentage = Math.round((totalApps / squadStats.maxApps) * 100);
        return (
        <div className="flex flex-col h-full p-6 bg-neutral-950 relative overflow-hidden">
          <div className="absolute right-[-100px] top-[-100px] w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] animate-pulse"></div>
          
          <h2 className="text-5xl font-black mb-8 max-w-xs leading-none text-white uppercase display-font relative z-10">
            Pitch<br/><span className="text-orange-600">Time</span>
          </h2>
          
          <div className="flex-1 flex flex-col justify-center items-center relative z-10">
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
               className="flex items-baseline"
             >
                <span className="text-8xl md:text-9xl font-black text-white display-font drop-shadow-[0_0_40px_rgba(249,115,22,0.4)]">
                   {totalApps}
                </span>
                <span className="text-3xl md:text-5xl font-bold text-neutral-500 ml-2">
                   /{squadStats.maxApps}
                </span>
             </motion.div>
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-neutral-900/50 backdrop-blur px-6 py-2 rounded-full border border-orange-500/30 mt-4"
             >
                <p className="text-lg md:text-xl font-bold text-orange-400 uppercase tracking-widest">Games Played</p>
             </motion.div>
             <p className="mt-4 text-neutral-400 font-medium">That's {percentage}% of the season.</p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-auto border-l-4 border-orange-500 pl-6 py-2 relative z-10"
          >
             <p className="text-neutral-500 text-xs uppercase font-bold mb-1 tracking-widest">Squad Status</p>
             <p className="text-white text-lg md:text-xl font-bold">
                {totalApps >= squadStats.maxApps - 2 ? "The First Name on the Sheet" : "Rotation Risk"}
             </p>
          </motion.div>
        </div>
      )}
    },
    // Team Season Stats
    {
      id: 'team_stats',
      render: () => {
        const { teamRecord, biggestWin, formGuide } = squadStats;
        
        return (
          <div className="flex flex-col h-full p-6 bg-neutral-900 relative overflow-hidden">
             {/* Swish background elements */}
             <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.1),transparent_50%)]"></div>
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="absolute -bottom-32 -left-32 w-96 h-96 border-2 border-dashed border-white/5 rounded-full"
             />

             <div className="relative z-10 mb-8">
                <motion.div 
                   initial={{ x: -50, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   className="inline-flex items-center gap-2 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 mb-4"
                >
                   <Users className="w-4 h-4 text-orange-500" />
                   <span className="text-orange-500 text-xs font-bold uppercase tracking-widest">The Squad</span>
                </motion.div>
                <h2 className="text-5xl font-black text-white uppercase display-font leading-none">
                   Season<br/>Report
                </h2>
             </div>

             <div className="flex-1 flex flex-col justify-start gap-6 relative z-10">
                
                {/* Highlight Stats */}
                <div className="grid grid-cols-3 gap-3">
                   <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="bg-neutral-800 p-3 rounded-xl flex flex-col items-center justify-center border-t-4 border-green-500"
                   >
                      <span className="text-2xl md:text-3xl font-black text-white">{teamRecord.wins}</span>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 mt-1">Wins</span>
                   </motion.div>
                   <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-neutral-800 p-3 rounded-xl flex flex-col items-center justify-center border-t-4 border-neutral-500"
                   >
                      <span className="text-2xl md:text-3xl font-black text-white">{teamRecord.draws}</span>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 mt-1">Draws</span>
                   </motion.div>
                   <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-neutral-800 p-3 rounded-xl flex flex-col items-center justify-center border-t-4 border-red-500"
                   >
                      <span className="text-2xl md:text-3xl font-black text-white">{teamRecord.losses}</span>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 mt-1">Losses</span>
                   </motion.div>
                </div>

                {/* Form Guide */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                   <h3 className="text-xs uppercase font-bold text-neutral-500 tracking-widest mb-3">Recent Form</h3>
                   <div className="flex gap-2">
                      {formGuide.slice(-5).map((result, i) => (
                        <div key={i} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-xs md:text-sm border-2 ${
                            result === 'W' ? 'bg-green-500/20 border-green-500 text-green-500' :
                            result === 'L' ? 'bg-red-500/20 border-red-500 text-red-500' :
                            'bg-neutral-500/20 border-neutral-500 text-neutral-400'
                        }`}>
                            {result}
                        </div>
                      ))}
                      {formGuide.length < 5 && Array(5 - formGuide.length).fill(0).map((_, i) => (
                          <div key={`empty-${i}`} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-neutral-800 bg-neutral-900"></div>
                      ))}
                   </div>
                </motion.div>

                {/* Biggest Win */}
                {biggestWin.diff > 0 && (
                    <motion.div 
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: 0.5 }}
                       className="bg-gradient-to-r from-neutral-800 to-neutral-900 p-4 rounded-2xl border border-white/5"
                    >
                       <h3 className="text-xs uppercase font-bold text-orange-500 tracking-widest mb-2 flex items-center gap-2">
                           <Crown className="w-4 h-4" /> Season Highlight
                       </h3>
                       <div className="flex justify-between items-end">
                          <div>
                             <p className="text-neutral-400 text-xs md:text-sm">Best Performance vs</p>
                             <p className="text-lg md:text-xl font-bold text-white truncate max-w-[150px]">{biggestWin.opponent}</p>
                             {biggestWin.opponent.includes("Truro") && (
                                <p className="text-orange-400 text-xs italic mt-1 font-bold">"Have it ye twats!"</p>
                             )}
                          </div>
                          <div className="text-2xl md:text-3xl font-black text-white">{biggestWin.score}</div>
                       </div>
                    </motion.div>
                )}

                {/* Goals Summary */}
                <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.6 }}
                   className="flex justify-between items-center bg-neutral-900/50 p-4 rounded-xl border border-white/5"
                >
                   <div>
                       <span className="block text-xl md:text-2xl font-black text-white">{teamRecord.goalsFor}</span>
                       <span className="text-[10px] uppercase text-neutral-500 font-bold">Goals For</span>
                   </div>
                   <div className="h-8 w-px bg-neutral-800"></div>
                   <div className="text-right">
                       <span className="block text-xl md:text-2xl font-black text-white">{teamRecord.goalsAgainst}</span>
                       <span className="text-[10px] uppercase text-neutral-500 font-bold">Goals Against</span>
                   </div>
                </motion.div>
             </div>
          </div>
        );
      }
    },

    // Trivia Slide (Before Goals)
    {
      id: 'guess_scorer',
      render: () => <QuizSlide topScorers={squadStats.topScorers} />
    },

    // Goals Breakdown
    {
      id: 'goals',
      render: () => {
         const hasGoals = totalGoals > 0;
         const hasAssistsOnly = totalGoals === 0 && assists > 0;
         const isTopScorer = squadStats.topScorers.some(p => p.Name === player.Name);
         const diff = squadStats.maxGoals - totalGoals;
         
         // Visual flourish if has goals or assists
         const showCelebration = hasGoals || hasAssistsOnly;

         return (
          <div className="flex flex-col h-full justify-between p-6 bg-black relative overflow-hidden">
             {/* Enhanced animated background */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(30,30,30,1),rgba(0,0,0,1))]"></div>
             {showCelebration && (
               <div className="absolute inset-0 z-0">
                 <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
                 <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
               </div>
             )}

             <div className="mt-8 relative z-10">
               <div className="inline-block bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border border-orange-500/20">
                  {player.Name}'s Stats
               </div>
               <h2 className="text-5xl font-black uppercase display-font mb-2 text-white leading-none tracking-tight drop-shadow-lg">
                  {hasGoals ? <><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500">Net</span><br/>Buster</> : hasAssistsOnly ? <><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Play</span><br/>Maker</> : <><span className="text-neutral-600">Oh</span><br/>Dear...</>}
               </h2>
             </div>

             <div className="self-center my-4 relative z-10 w-full flex-1 flex flex-col justify-center items-center">
               {hasGoals ? (
                 <div className="flex flex-col items-center w-full">
                   {/* Total Goal Count */}
                   <div className="relative mb-6 transform hover:scale-105 transition-transform duration-300 w-full text-center">
                      <motion.div
                         initial={{ scale: 0.5, opacity: 0 }}
                         animate={{ scale: 1, opacity: 1 }}
                         transition={{ type: "spring", stiffness: 200, damping: 10 }}
                         className="text-9xl md:text-[12rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-orange-500 to-orange-700 display-font relative z-10 drop-shadow-[0_0_25px_rgba(249,115,22,0.4)] w-full text-center"
                      >
                          {totalGoals}
                      </motion.div>
                      <div className="text-center text-white font-bold tracking-[0.3em] text-lg uppercase opacity-90 mt-2">YOUR SEASON TOTAL</div>
                   </div>

                   {/* Context */}
                   <div className="mb-6 bg-neutral-900/50 px-4 py-2 rounded-lg text-center border border-white/5 backdrop-blur-md max-w-sm">
                      {isTopScorer ? (
                        <p className="text-yellow-400 font-bold flex items-center gap-2 justify-center">
                           <Trophy className="w-4 h-4" /> You are Top Scorer!
                        </p>
                      ) : (
                        <p className="text-neutral-400 text-xs md:text-sm">
                           Chasing <span className="text-white font-bold">{squadStats.topScorerNames}</span> ({squadStats.maxGoals}). <br/>
                           Only {diff} more to go!
                        </p>
                      )}
                   </div>

                   {/* Breakdown Grid */}
                   <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-neutral-900 p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center shadow-lg"
                      >
                         <CircleDot className="w-5 h-5 text-blue-500 mb-2" />
                         <span className="text-xl md:text-2xl font-black text-white">{openPlayGoals}</span>
                         <span className="text-[9px] uppercase text-neutral-500 font-bold leading-tight mt-1">Open<br/>Play</span>
                      </motion.div>

                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-neutral-900 p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center shadow-lg"
                      >
                         <Crosshair className="w-5 h-5 text-orange-500 mb-2" />
                         <span className="text-xl md:text-2xl font-black text-white">{penaltyCornerGoals}</span>
                         <span className="text-[9px] uppercase text-neutral-500 font-bold leading-tight mt-1">Penalty<br/>Corner</span>
                      </motion.div>

                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-neutral-900 p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center shadow-lg"
                      >
                         <Flag className="w-5 h-5 text-green-500 mb-2" />
                         <span className="text-xl md:text-2xl font-black text-white">{penaltyFlickGoals}</span>
                         <span className="text-[9px] uppercase text-neutral-500 font-bold leading-tight mt-1">Penalty<br/>Flick</span>
                      </motion.div>
                   </div>
                 </div>
               ) : hasAssistsOnly ? (
                 <div className="flex flex-col items-center w-full">
                    <div className="relative mb-8 transform hover:scale-105 transition-transform duration-300 w-full text-center">
                      <motion.div
                         initial={{ scale: 0.5, opacity: 0 }}
                         animate={{ scale: 1, opacity: 1 }}
                         transition={{ type: "spring", stiffness: 200, damping: 10 }}
                         className="text-9xl md:text-[12rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 via-cyan-500 to-teal-600 display-font relative z-10 drop-shadow-[0_0_25px_rgba(56,189,248,0.4)] w-full text-center"
                      >
                          {assists}
                      </motion.div>
                      <div className="text-center text-white font-bold tracking-[0.3em] text-sm uppercase opacity-90 mt-2">Assists</div>
                    </div>
                    <div className="mb-6 bg-neutral-900/50 px-6 py-4 rounded-xl text-center border border-white/5 backdrop-blur-md max-w-xs">
                        <p className="text-white text-lg font-bold italic">"I prefer to create."</p>
                        <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest">Unselfish Play detected</p>
                    </div>
                 </div>
               ) : (
                 <div className="text-center">
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-9xl font-black text-neutral-800 display-font mb-4"
                    >
                      0
                    </motion.div>
                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-white/5">
                      <p className="text-white font-bold text-xl mb-2">Hard luck, mate.</p>
                      <p className="text-neutral-400 mt-2 text-sm italic">
                         "It's the taking part that counts... but scoring helps."
                      </p>
                      <p className="text-neutral-500 text-xs mt-4 uppercase tracking-widest font-bold">
                         Target for Part 2: Hit a barn door.
                      </p>
                    </div>
                 </div>
               )}
             </div>

             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-neutral-900/80 p-5 rounded-2xl border-t border-white/10 relative z-10"
             >
                <div className="flex justify-between items-center">
                   <div>
                      <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-bold">Involvements</div>
                      <div className="text-2xl md:text-3xl font-black text-white">{totalInvolvement}</div>
                   </div>
                   <div className="h-10 w-px bg-neutral-800"></div>
                   <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-bold">Assists</div>
                      <div className="text-2xl md:text-3xl font-black text-white">{assists}</div>
                   </div>
                </div>
             </motion.div>
          </div>
        );
      }
    },

    // Shane Looker Inbetweeners Slide (Moved Here)
    ...(player.Name === "Shane Looker" ? [{
      id: 'inbetweeners',
      render: () => (
        <div className="flex flex-col h-full justify-center p-0 bg-black relative overflow-hidden">
           {/* Background Image */}
           <div className="absolute inset-0 z-0">
               <img 
                  src="https://a1cf74336522e87f135f-2f21ace9a6cf0052456644b80fa06d4f.ssl.cf2.rackcdn.com/images/characters/large/800/Jay-Cartwright.The-Inbetweeners.webp" 
                  alt="Jay Cartwright"
                  className="w-full h-full object-cover opacity-60 scale-110"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
           </div>
           
           <div className="relative z-10 flex flex-col items-center justify-end h-full pb-16">
               <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center px-6"
               >
                  <div className="bg-yellow-400 text-black font-black uppercase tracking-tighter text-4xl px-4 py-2 rotate-2 inline-block mb-4 shadow-[5px_5px_0px_rgba(0,0,0,1)]">
                     BUS WANKER?
                  </div>
                  <h1 className="text-5xl font-black text-white display-font mb-4 drop-shadow-2xl">
                      UNCANNY<br/>RESEMBLANCE
                  </h1>
                  <p className="text-neutral-300 text-lg font-medium max-w-xs mx-auto bg-black/50 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                     "Completed it mate."
                  </p>
               </motion.div>
           </div>
        </div>
      )
    }] : []),

    // Man of the Match (MoM) Slide
    {
      id: 'mom',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
           {/* Gold/Orange spotlight background */}
           <div className="absolute top-0 left-0 w-full h-2/3 bg-gradient-to-b from-yellow-600/10 to-transparent"></div>
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.05),transparent_60%)]"></div>

           <div className="relative z-10 text-center flex flex-col items-center h-full justify-between py-12">
              <motion.div
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
              >
                  <h2 className="text-3xl font-black text-white uppercase display-font tracking-wider">
                      Match Impact
                  </h2>
              </motion.div>

              <div className="flex-1 flex flex-col justify-center items-center w-full">
                  {mom > 0 ? (
                      <>
                          <motion.div 
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                            className="relative mb-6"
                          >
                             <Star className="w-24 h-24 md:w-32 md:h-32 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                             <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-black text-yellow-950">{mom}</span>
                             </div>
                          </motion.div>
                          
                          <motion.h3 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-4xl font-black text-white uppercase display-font mb-2"
                          >
                              Man of the Match
                          </motion.h3>
                          
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mt-6 bg-neutral-900 border border-yellow-500/20 px-6 py-3 rounded-full"
                          >
                              <p className="text-yellow-200 font-bold uppercase tracking-widest text-xs">
                                  Awarded in {totalApps} Games
                              </p>
                          </motion.div>
                          <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest">(Squad Total: {squadStats.maxApps} games)</p>
                      </>
                  ) : (
                      <>
                           <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="w-32 h-32 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl"
                           >
                              <User className="w-16 h-16 text-neutral-600" /> 
                           </motion.div>
                           <h3 className="text-3xl font-black text-neutral-200 mb-4 uppercase display-font">Unsung Hero</h3>
                           <p className="text-lg text-neutral-400 max-w-xs mx-auto leading-relaxed">
                              No awards yet, but every team needs an engine. You kept us moving in your <span className="text-white font-bold">{totalApps}/{squadStats.maxApps} games</span>.
                           </p>
                      </>
                  )}
              </div>
              
              <div className="w-full">
                 <div className="flex justify-center items-center gap-2 text-neutral-600 text-xs font-bold uppercase tracking-[0.2em]">
                    <TrendingUp className="w-4 h-4" />
                    Half Season Report
                 </div>
              </div>
           </div>
        </div>
      )
    },
    // Discipline
    {
       id: 'cards',
       render: () => {
         const isNaughty = greenCards > 0 || yellowCards > 0;
         const badBoyName = squadStats.badBoy.Name;
         const badBoyPoints = squadStats.badBoy.Stats["Card Points"] || 0;
         const myPoints = player.Stats["Card Points"] || 0;
         
         return (
           <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black"></div>
              
              {isNaughty ? (
                 <>
                   <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                      <AlertCircle className="w-96 h-96 text-white" />
                   </div>
                   <h2 className="text-6xl font-black text-white mb-8 relative z-10 display-font uppercase tracking-tighter leading-[0.8]">
                      Sin<br/><span className="text-red-600">Bin</span>
                   </h2>

                    {myPoints < badBoyPoints ? (
                        <div className="mb-6 relative z-10 bg-neutral-900/50 px-4 py-2 rounded-lg border border-red-900/30">
                            <p className="text-neutral-400 text-sm text-center">
                                Not quite <span className="text-white font-bold">{badBoyName}</span> levels ({badBoyPoints} pts), but you're trying.
                            </p>
                        </div>
                    ) : (
                        <div className="mb-6 relative z-10 bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/30 animate-pulse">
                             <p className="text-red-400 text-sm text-center font-bold">
                                TEAM BAD BOY CONFIRMED
                             </p>
                        </div>
                    )}
                   
                   <div className="space-y-4 relative z-10 max-w-sm mx-auto w-full">
                      {greenCards > 0 && (
                        <motion.div 
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center justify-between bg-neutral-900/80 p-6 rounded-2xl border-l-4 border-green-500 shadow-lg backdrop-blur-sm"
                        >
                             <div className="text-left">
                                <span className="block text-3xl font-black text-white">{greenCards}</span>
                                <span className="text-[10px] uppercase text-green-500 font-bold tracking-widest">Green Cards</span>
                             </div>
                             <div className="w-8 h-12 bg-green-500 rounded shadow-lg transform rotate-12 opacity-80"></div>
                        </motion.div>
                      )}
                      
                      {yellowCards > 0 && (
                        <motion.div 
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center justify-between bg-neutral-900/80 p-6 rounded-2xl border-l-4 border-yellow-500 shadow-lg backdrop-blur-sm"
                        >
                             <div className="text-left">
                                <span className="block text-3xl font-black text-white">{yellowCards}</span>
                                <span className="text-[10px] uppercase text-yellow-500 font-bold tracking-widest">Yellow Cards</span>
                             </div>
                             <div className="w-8 h-12 bg-yellow-400 rounded shadow-lg transform -rotate-6 opacity-80"></div>
                        </motion.div>
                      )}
                   </div>
                   <p className="mt-12 text-center text-neutral-500 italic relative z-10 font-medium">"I barely touched him ref!"</p>
                 </>
              ) : (
                 <div className="text-center relative z-10">
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="w-32 h-32 bg-gradient-to-tr from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(249,115,22,0.3)]"
                    >
                       <Award className="w-16 h-16 text-white" />
                    </motion.div>
                    <h2 className="text-5xl font-black text-white mb-4 display-font uppercase">Saint</h2>
                    <p className="text-xl text-neutral-400 font-medium">0 Cards.</p>
                    <p className="text-sm text-neutral-500 mt-2">Meanwhile, {badBoyName} is collecting them for fun.</p>
                 </div>
              )}
           </div>
         )
       }
    },

    // --- LATE SPECIAL SLIDES ---
    
    // Richard Swann "Postman Pat"
    ...(player.Name === "Richard Swann" ? [{
      id: 'postman_pat',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-900 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.2),transparent_70%)]"></div>
           
           <div className="relative z-10 flex flex-col items-center text-center">
               <motion.div
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="mb-8"
               >
                  <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] border-4 border-yellow-400">
                    <Mail className="w-16 h-16 text-yellow-400" />
                  </div>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
               >
                   <h2 className="text-2xl font-bold text-neutral-400 mb-2">Service Status</h2>
                   <h1 className="text-5xl md:text-6xl font-black text-white display-font mb-6 leading-tight drop-shadow-lg">
                       POSTMAN<br/><span className="text-red-500">PAT</span>
                   </h1>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="max-w-xs bg-neutral-950/80 p-6 rounded-2xl border border-yellow-500/20 backdrop-blur-md"
               >
                  <p className="text-lg text-white font-medium italic leading-relaxed">
                     "Always sometimes maybe on time and can sometimes maybe pay but idk man ask me later."
                  </p>
                  <p className="text-xs text-neutral-500 mt-4 uppercase tracking-widest font-bold">
                     Delivery Not Guaranteed
                  </p>
               </motion.div>
           </div>
        </div>
      )
    }] : []),

    // Scott Barnardo Mountain Man Special
    ...(player.Name === "Scott Barnardo" ? [{
      id: 'mountain_man',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),transparent_70%)]"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="mb-8"
                >
                    <div className="text-7xl md:text-[8rem] leading-none filter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        🏔️
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="bg-neutral-800 border border-neutral-700 text-neutral-300 px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em]">
                        Lifestyle Award
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white display-font mb-6 italic">
                        MOUNTAIN<br/>MAN
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10"
                >
                    <p className="text-lg text-white font-medium italic">
                        "If he's not on the pitch, he's probably up a peak somewhere."
                    </p>
                </motion.div>
            </div>
        </div>
      )
    }] : []),

    // Martin Richards Special
    ...(player.Name === "Martin Richards" ? [{
      id: 'nickname',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.15),transparent_60%)]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-3xl animate-pulse"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="mb-8"
                >
                    <div className="text-7xl md:text-[8rem] leading-none filter drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                        👨🏻
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="bg-pink-500/10 border border-pink-500/20 text-pink-500 px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em]">
                        Status Update
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-400 mb-2">New Nickname Acquired</h2>
                    <h1 className="text-5xl md:text-6xl font-black text-white display-font text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-8 italic">
                        "PORNSTAR"
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10"
                >
                    <p className="text-lg text-white font-medium italic">
                        "It's a lifestyle, not just a nickname."
                    </p>
                </motion.div>
            </div>
        </div>
      )
    }] : []),
    // Mick Dicken Handsome Award
    ...(player.Name === "Mick Dicken" ? [{
      id: 'handsome',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.15),transparent_60%)]"></div>
           
           <div className="relative z-10 flex flex-col items-center text-center">
               <motion.div
                  initial={{ scale: 0, rotate: 10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="mb-6"
               >
                  <div className="text-7xl md:text-[8rem] leading-none drop-shadow-2xl filter drop-shadow-[0_0_20px_rgba(124,58,237,0.5)]">
                      🤵
                  </div>
               </motion.div>

               <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
               >
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-400 mb-2 uppercase tracking-widest">Official Squad Ranking</h2>
                  <h1 className="text-4xl md:text-5xl font-black text-white display-font mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      MOST HANDSOME<br/>MAN
                  </h1>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-neutral-900/80 p-6 rounded-2xl border border-white/10 max-w-xs backdrop-blur-md"
               >
                  <p className="text-xl text-white font-bold mb-2">
                     🥇 {player.Name}
                  </p>
                  <div className="h-px w-full bg-white/10 my-2"></div>
                  <p className="text-sm text-neutral-400">
                     🥈 Ben Andrews <br/>(Close, but not close enough)
                  </p>
               </motion.div>
           </div>
        </div>
      )
    }] : []),
    // Ben Andrews Handsome Award (2nd place)
    ...(player.Name === "Ben Andrews" ? [{
      id: 'handsome_2nd',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.15),transparent_60%)]"></div>
           
           <div className="relative z-10 flex flex-col items-center text-center">
               <motion.div
                  initial={{ scale: 0, rotate: 10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="mb-6"
               >
                  <div className="text-7xl md:text-[8rem] leading-none drop-shadow-2xl grayscale opacity-80 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      🤵
                  </div>
               </motion.div>

               <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
               >
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-400 mb-2 uppercase tracking-widest">Official Squad Ranking</h2>
                  <h1 className="text-4xl font-black text-white display-font mb-6 text-neutral-300">
                      HANDSOME<br/>RUNNER UP
                  </h1>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-neutral-900/80 p-6 rounded-2xl border border-white/10 max-w-xs backdrop-blur-md"
               >
                  <p className="text-xl text-neutral-300 font-bold mb-2">
                     🥈 {player.Name}
                  </p>
                  <div className="h-px w-full bg-white/10 my-2"></div>
                  <p className="text-sm text-neutral-400">
                     🥇 Mick Dicken <br/>(Just too handsome to beat)
                  </p>
               </motion.div>
           </div>
        </div>
      )
    }] : []),
    // Hairline Squad Special
    ...( ["Tom Blewett", "Martyn Head", "Max Chippett", "Chris Ryan"].includes(player.Name) ? [{
      id: 'hairline',
      render: () => {
        const isHead = player.Name === "Martyn Head";
        return (
          <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
             {/* Background */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),transparent_70%)]"></div>
             
             <div className="relative z-10 flex flex-col items-center text-center">
                 <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-8"
                 >
                    <div className="text-7xl md:text-[8rem] leading-none drop-shadow-2xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        👨‍🦲
                    </div>
                 </motion.div>

                 <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                 >
                     <div className="bg-neutral-800 border border-neutral-700 text-neutral-300 px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em]">
                        Advanced Analytics
                     </div>
                     <h2 className="text-2xl md:text-3xl font-bold text-neutral-500 mb-2">Hairline Trajectory</h2>
                     <h1 className="text-4xl md:text-5xl font-black text-white display-font mb-6 leading-tight">
                         IT'S NOT<br/><span className="text-red-600">LOOKING GOOD</span>
                     </h1>
                 </motion.div>

                 <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10 backdrop-blur-md"
                 >
                    {isHead ? (
                        <p className="text-lg text-white font-bold">
                           Official Ruling: <span className="text-orange-500">Worst in the Squad.</span><br/>
                           <span className="text-sm font-normal text-neutral-400 mt-2 block">The aero gains are marginal, Martyn. But we appreciate the dedication.</span>
                        </p>
                    ) : (
                        <p className="text-lg text-white font-medium">
                           The forehead is expanding faster than our goal difference.<br/>
                           <span className="text-sm font-normal text-neutral-400 mt-2 block">Time to book that flight to Turkey? 🇹🇷</span>
                        </p>
                    )}
                 </motion.div>
             </div>
          </div>
        )
      }
    }] : []),
    // Ethan Allen Flappy Hand Slide
    ...(player.Name === "Ethan Allen" ? [{
      id: 'flappy_hand',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1),transparent_60%)]"></div>
           
           <div className="relative z-10 flex flex-col items-center text-center">
               <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 10, scale: 1 }}
                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                  className="mb-8"
               >
                  <div className="text-7xl md:text-[8rem] leading-none drop-shadow-2xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                      🧤
                  </div>
               </motion.div>

               <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
               >
                   <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em]">
                      Defensive Analysis
                   </div>
                   <h2 className="text-2xl md:text-3xl font-bold text-neutral-500 mb-2">Goalkeeping Style</h2>
                   <h1 className="text-4xl md:text-5xl font-black text-white display-font mb-6 leading-tight">
                       THE FLAPPY<br/>HAND
                   </h1>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10"
               >
                  <p className="text-lg text-white font-bold">
                     "It's not a save, it's a remix."
                  </p>
                  <p className="text-sm text-neutral-400 mt-2">
                     Conceded: {player.Stats.Conceded || 0} (But who's counting?)
                  </p>
               </motion.div>
           </div>
        </div>
      )
    }] : []),

    // Ben Roberts Mr Blobby Slide
    ...(player.Name === "Ben Roberts" ? [{
      id: 'blobby',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.3),transparent_60%)]"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1.1, rotate: 10 }}
                    transition={{ type: "spring", bounce: 0.6, repeat: Infinity, repeatType: "mirror", duration: 1 }}
                    className="mb-8"
                >
                    <div className="text-7xl md:text-[8rem] leading-none drop-shadow-2xl filter drop-shadow-[0_0_20px_rgba(236,72,153,0.4)]">
                        🍬
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="bg-pink-400/20 border border-pink-400/40 text-pink-300 px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em]">
                        Icon Status
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-400 mb-2">New Nickname</h2>
                    <h1 className="text-5xl md:text-6xl font-black text-white display-font text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400 mb-8 drop-shadow-lg">
                        MR BLOBBY
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10"
                >
                    <p className="text-lg text-white font-medium italic">
                        "Blobby blobby blobby!"
                    </p>
                </motion.div>
            </div>
        </div>
      )
    }] : []),

    // Hamstring Slide (Phil & Alex)
    ...(["Phill Fordham", "Alex Roberts"].includes(player.Name) ? [{
      id: 'hamstring',
      render: () => (
        <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(239,68,68,0.2),transparent_70%)]"></div>
           
           <div className="relative z-10 flex flex-col items-center text-center">
               <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mb-8 relative"
               >
                  <Activity className="w-24 h-24 md:w-32 md:h-32 text-red-500" />
                  <div className="absolute -top-4 -right-4">
                     <Flame className="w-12 h-12 md:w-16 md:h-16 text-orange-500 animate-pulse" />
                  </div>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
               >
                   <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em]">
                      Injury Report
                   </div>
                   <h2 className="text-2xl md:text-3xl font-bold text-neutral-500 mb-2">Diagnosis Confirmed</h2>
                   <h1 className="text-4xl md:text-5xl font-black text-white display-font mb-6 leading-tight">
                       DEVIL'S<br/><span className="text-red-600">HAMSTRING</span>
                   </h1>
               </motion.div>

               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10"
               >
                  <p className="text-lg text-white font-medium">
                     "It went *ping* again."
                  </p>
                  <p className="text-sm text-neutral-400 mt-2">
                     Recommended Treatment: More pints, less sprinting.
                  </p>
               </motion.div>
           </div>
        </div>
      )
    }] : []),

    // Train Gap Jump (Everyone)
    {
       id: 'train_gap',
       render: () => {
         const believers = ["Martin Richards", "Shane Looker", "Mick Dicken", "Joe Bacon"];
         const isBeliever = believers.includes(player.Name);
         return (
           <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.1),transparent_70%)]"></div>
               
               <div className="relative z-10 flex flex-col items-center text-center">
                   <motion.div
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 100 }}
                      className="mb-8"
                   >
                      <div className="text-7xl md:text-[8rem] leading-none filter drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                          🚂
                      </div>
                   </motion.div>

                   <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                   >
                       <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em]">
                          The Great Debate
                       </div>
                       <h2 className="text-2xl font-bold text-neutral-400 mb-2">Train Station Gap Jump</h2>
                       <h1 className="text-4xl md:text-5xl font-black text-white display-font mb-6 leading-tight">
                           {isBeliever ? <span className="text-emerald-500">BELIEVER</span> : <span className="text-red-500">DOUBTER</span>}
                       </h1>
                   </motion.div>

                   <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10 backdrop-blur-md"
                   >
                      <p className="text-lg text-white font-bold">
                         {isBeliever 
                            ? "You believed Mick could jump the train station gap!" 
                            : "You didn't believe Mick could make the jump."}
                      </p>
                      {isBeliever && (
                         <p className="text-sm text-neutral-400 mt-2 italic">
                            "Physics is just a suggestion anyway."
                         </p>
                      )}
                      {!isBeliever && (
                         <p className="text-sm text-neutral-400 mt-2 italic">
                            "A healthy dose of skepticism (and concern for life)."
                         </p>
                      )}
                   </motion.div>
               </div>
           </div>
         );
       }
    },

    // Fines (New)
    {
      id: 'fines',
      render: () => {
        const debt = FINES_DATA[player.Name];
        const hasDebt = !!debt;

        return (
          <div className="flex flex-col h-full justify-center p-6 bg-neutral-950 relative overflow-hidden">
             {/* Background */}
             <div className={`absolute inset-0 ${hasDebt ? 'bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.15),transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.15),transparent_70%)]'}`}></div>
             
             <div className="relative z-10 flex flex-col items-center text-center">
                 <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="mb-8"
                 >
                    <div className="text-7xl md:text-[8rem] leading-none drop-shadow-2xl">
                        {hasDebt ? "💸" : "✅"}
                    </div>
                 </motion.div>

                 <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                 >
                     <div className={`border px-4 py-1 rounded-full inline-block mb-4 text-xs font-black uppercase tracking-[0.2em] ${hasDebt ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'}`}>
                        Fines Report
                     </div>
                     <h2 className="text-2xl font-bold text-neutral-400 mb-2">
                        {hasDebt ? "Outstanding Balance" : "Account Status"}
                     </h2>
                     <h1 className="text-5xl md:text-6xl font-black text-white display-font mb-6 leading-tight">
                         {hasDebt ? (
                           <span className="text-red-500">{debt}</span>
                         ) : (
                           <span className="text-emerald-500">PAID UP</span>
                         )}
                     </h1>
                 </motion.div>

                 <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="max-w-xs bg-neutral-900/80 p-6 rounded-2xl border border-white/10 backdrop-blur-md"
                 >
                    <p className="text-lg text-white font-bold italic">
                       {hasDebt 
                          ? "\"Get your wallet out.\""
                          : "\"The treasurer sleeps easy tonight.\""
                       }
                    </p>
                    {hasDebt && (
                        <p className="text-xs text-neutral-500 mt-2 uppercase tracking-widest font-black text-red-500 animate-pulse">
                           GIS YE MONEY KIDDA!
                        </p>
                    )}
                 </motion.div>
             </div>
          </div>
        );
      }
    },

    // Summary Card
    {
      id: 'summary',
      render: () => (
        <div className="flex flex-col h-full items-center justify-center p-6 bg-neutral-900 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          
          <div className="mb-6 text-center relative z-10 shrink-0">
             <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Half Season Complete</h2>
             <p className="text-neutral-400 text-sm">Thanks for playing.</p>
          </div>

          {/* THE CARD TO DOWNLOAD */}
          <div 
             ref={cardRef} 
             className="w-full max-w-sm aspect-[4/5] max-h-[60vh] bg-black text-white rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border border-neutral-800"
          >
             {/* Styling Elements for Card */}
             <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500 rounded-full blur-[100px] opacity-20 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-neutral-700 rounded-full blur-[80px] opacity-20 pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
             
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-4 md:mb-8">
                  <div>
                    <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-1">Duchy Hockey</div>
                    <div className="text-xs md:text-sm font-bold text-neutral-400">Half Season Review</div>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-orange-500 font-black text-lg md:text-xl shadow-lg border border-white/5">
                     {player["Squad Number"]}
                  </div>
                </div>
                
                <div>
                   <h1 className="text-4xl md:text-5xl font-black uppercase leading-[0.85] display-font mb-2 break-words">
                    {player.Name.split(' ').map((n, i) => (
                      <span key={i} className={i === 1 ? "text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600" : "text-white"}>{n}<br/></span>
                    ))}
                   </h1>
                </div>

                {specialAward && (
                   <div className="mt-4 flex items-center gap-3 bg-neutral-900/40 p-2 md:p-3 rounded-2xl border border-white/5 backdrop-blur-md">
                      <div className="text-2xl md:text-3xl">{specialAward.emoji}</div>
                      <div>
                         <div className="text-[8px] md:text-[10px] uppercase font-bold text-neutral-500 tracking-widest leading-tight">{specialAward.label}</div>
                         <div className="text-base md:text-lg font-black text-white leading-none mt-1">{specialAward.text}</div>
                      </div>
                   </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-2 md:gap-3 relative z-10 mt-auto">
                <div className="bg-neutral-900/60 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-sm">
                   <div className="text-2xl md:text-3xl font-black text-white">{totalApps}/{squadStats.maxApps}</div>
                   <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-neutral-500">Matches</div>
                </div>
                <div className="bg-neutral-900/60 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-sm">
                   <div className="text-2xl md:text-3xl font-black text-orange-500">{player.Name === "Ethan Allen" ? player.Stats.Conceded : totalGoals}</div>
                   <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-neutral-500">{player.Name === "Ethan Allen" ? "Goals Conceded" : "Goals"}</div>
                </div>
                <div className="bg-neutral-900/60 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-sm">
                   <div className="text-2xl md:text-3xl font-black text-yellow-500">{mom}</div>
                   <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-neutral-500">MoM</div>
                </div>
                <div className="bg-neutral-900/60 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-sm">
                   <div className="text-2xl md:text-3xl font-black text-white">{greenCards + yellowCards}</div>
                   <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-neutral-500">Cards</div>
                </div>
             </div>
          </div>
        </div>
      )
    }
  ];

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
     // Don't navigate if clicking an interactive element
     const target = e.target as HTMLElement;
     if (target.closest('button') || target.closest('a') || target.tagName === 'IFRAME') {
        return;
     }

     const width = e.currentTarget.offsetWidth;
     const x = e.nativeEvent.offsetX;
     
     if (x < width / 3) {
        if (currentSlide > 0) {
           setDirection(-1);
           setCurrentSlide(c => c - 1);
        }
     } else {
        if (currentSlide < slides.length - 1) {
           setDirection(1);
           setCurrentSlide(c => c + 1);
        } else {
           onClose();
        }
     }
  };

  useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
           if (currentSlide > 0) {
              setDirection(-1);
              setCurrentSlide(c => c - 1);
           }
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
           if (currentSlide < slides.length - 1) {
              setDirection(1);
              setCurrentSlide(c => c + 1);
           } else {
              onClose();
           }
        } else if (e.key === 'Escape') {
           onClose();
        }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, slides.length, onClose]);

  // Play sound when slide changes
  useEffect(() => {
     playSfx();
     if (slides[currentSlide].id === 'summary') {
        confetti({
           particleCount: 100,
           spread: 70,
           origin: { y: 0.6 }
        });
     }
  }, [currentSlide, slides]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div 
         className="w-full h-[100dvh] md:h-[85vh] md:max-w-sm md:rounded-3xl overflow-hidden relative shadow-2xl bg-neutral-900 border-neutral-800 md:border cursor-pointer flex flex-col"
         onClick={handleTap}
      >
         <div className="absolute top-2 left-2 right-2 z-50 flex gap-1 h-1">
            {slides.map((s, idx) => (
              <div key={s.id} className="flex-1 bg-white/20 rounded-full overflow-hidden">
                 <div className={`h-full bg-white transition-all duration-300 ${idx <= currentSlide ? 'w-full' : 'w-0'} ${idx === currentSlide ? 'opacity-100' : 'opacity-50'}`} />
              </div>
            ))}
         </div>

         <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 z-50 p-2 bg-black/20 backdrop-blur rounded-full text-white/80 hover:bg-black/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
         </button>

         <AnimatePresence initial={false} custom={direction}>
            <motion.div 
               key={currentSlide}
               custom={direction}
               initial={{ x: direction > 0 ? '100%' : '-100%' }}
               animate={{ x: 0 }}
               exit={{ x: direction > 0 ? '-100%' : '100%' }}
               transition={{ type: "spring", stiffness: 300, damping: 30 }}
               className="absolute inset-0 z-0 bg-neutral-950 flex flex-col"
            >
               <div className="w-full h-full flex-1 [&_button]:cursor-pointer [&_button]:relative [&_button]:z-50">
                  {slides[currentSlide].render()}
               </div>
            </motion.div>
         </AnimatePresence>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="bg-neutral-950 min-h-[100dvh] font-sans text-white overflow-hidden">
       <BackgroundMusic isPlaying={isPlaying} togglePlay={() => setIsPlaying(!isPlaying)} />
       <AnimatePresence mode="wait">
          {!selectedPlayer ? (
             <SearchScreen key="search" onSelect={(p) => setSelectedPlayer(p)} onStartMusic={() => setIsPlaying(true)} />
          ) : (
             <WrappedView key="wrapped" player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
          )}
       </AnimatePresence>
    </div>
  );
};

export default App;