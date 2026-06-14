import { useState, useEffect, useMemo, useRef } from 'react';
import type { Lesson, UserStats } from '../types';
import { soundEffects } from '../lib/audio';

/**
 * Props for the LessonRunner component.
 */
interface LessonRunnerProps {
  lesson: Lesson;
  stats: UserStats;
  onLessonComplete: (xpGained: number) => void;
  onLoseLife: () => void;
  onQuit: () => void;
}

function seededHash(value: string) {
  return [...value].reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function shuffleForExercise(items: string[], seedKey: string) {
  const shuffled = [...items];
  let seed = seededHash(seedKey);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function normalizeAnswer(value: string) {
  return value.replace(/[.,#!$%&;:{}=_`~()-]/g, "").toLowerCase();
}

/**
 * Renders and runs a single lesson's exercises, tracking answers and correctness,
 * managing remaining lives, and reporting completion and life-loss back to the parent.
 */
export default function LessonRunner({ lesson, stats, onLessonComplete, onLoseLife, onQuit }: LessonRunnerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // For Word Bank exercise
  const [arrangedWords, setArrangedWords] = useState<string[]>([]);
  
  // For Matching Pairs exercise
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]); // Spanish words matched
  const [mismatchedLeft, setMismatchedLeft] = useState<string | null>(null);
  const [mismatchedRight, setMismatchedRight] = useState<string | null>(null);

  // General checking states
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [lessonFailed, setLessonFailed] = useState(false);
  const [lessonFinished, setLessonFinished] = useState(false);

  // Confetti canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const currentExercise = lesson.exercises[currentIdx];
  const progressPercent = (currentIdx / lesson.exercises.length) * 100;

  // Sound triggering on load
  useEffect(() => {
    soundEffects.playTap();
  }, []);

  // Matching pair shuffles are deterministic per exercise for easier testing.
  const shuffledLeft = useMemo(() => {
    return currentExercise.type === 'matching'
      ? shuffleForExercise(currentExercise.leftPairs || [], `${currentExercise.id}-left`)
      : [];
  }, [currentExercise]);

  const shuffledRight = useMemo(() => {
    return currentExercise.type === 'matching'
      ? shuffleForExercise(currentExercise.rightPairs || [], `${currentExercise.id}-right`)
      : [];
  }, [currentExercise]);

  const resetExerciseState = () => {
    setMatchedPairs([]);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMismatchedLeft(null);
    setMismatchedRight(null);
    setSelectedOption(null);
    setArrangedWords([]);
    setIsAnswerChecked(false);
    setIsAnswerCorrect(false);
  };

  const recordIncorrectAttempt = () => {
    soundEffects.playIncorrect();
    soundEffects.playHeartLost();
    onLoseLife();

    if (stats.lives <= 1) {
      setLessonFailed(true);
    }
  };

  const evaluateMatch = (leftWord: string, rightWord: string) => {
    const isCorrectMatch = currentExercise.matchingMap?.[leftWord] === rightWord;

    if (isCorrectMatch) {
      setMatchedPairs(prev => prev.includes(leftWord) ? prev : [...prev, leftWord]);
      setSelectedLeft(null);
      setSelectedRight(null);
      soundEffects.playTap();
      return;
    }

    setMismatchedLeft(leftWord);
    setMismatchedRight(rightWord);
    recordIncorrectAttempt();

    window.setTimeout(() => {
      setMismatchedLeft(null);
      setMismatchedRight(null);
      setSelectedLeft(null);
      setSelectedRight(null);
    }, 800);
  };

  const handleSelectLeft = (word: string) => {
    if (matchedPairs.includes(word) || isAnswerChecked) return;
    soundEffects.playTap();
    setSelectedLeft(word);

    if (selectedRight) {
      evaluateMatch(word, selectedRight);
    }
  };

  const handleSelectRight = (word: string) => {
    if (isAnswerChecked) return;
    soundEffects.playTap();
    setSelectedRight(word);

    if (selectedLeft) {
      evaluateMatch(selectedLeft, word);
    }
  };

  // Triggers canvas confetti upon completion
  useEffect(() => {
    if (lessonFinished && canvasRef.current) {
      soundEffects.playLevelUp();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      interface Particle {
        x: number;
        y: number;
        size: number;
        color: string;
        speedX: number;
        speedY: number;
        rotation: number;
        rotationSpeed: number;
      }

      const particles: Particle[] = [];
      const colors = ['#3B82F6', '#E839F6', '#FF8C42', '#9333EA', '#F1F0F3'];

      for (let i = 0; i < 150; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height + 20,
          size: Math.random() * 8 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: (Math.random() - 0.5) * 15,
          speedY: -Math.random() * 20 - 10,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10
        });
      }

      const animateConfetti = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let finished = true;

        particles.forEach(p => {
          p.x += p.speedX;
          p.y += p.speedY;
          p.speedY += 0.45; // gravity
          p.speedX *= 0.98; // air resistance
          p.rotation += p.rotationSpeed;

          if (p.y < canvas.height + 50) {
            finished = false;
          }

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        });

        if (!finished) {
          animationFrameRef.current = requestAnimationFrame(animateConfetti);
        }
      };

      animateConfetti();

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [lessonFinished]);

  // Click handler for word bank options
  const handleWordBankClick = (word: string) => {
    if (isAnswerChecked) return;
    soundEffects.playTap();
    setArrangedWords(prev => [...prev, word]);
  };

  const handleRemoveArrangedWord = (index: number) => {
    if (isAnswerChecked) return;
    soundEffects.playTap();
    setArrangedWords(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCheckAnswer = () => {
    if (isAnswerChecked) return;

    let correct = false;

    if (currentExercise.type === 'multiple-choice' || currentExercise.type === 'fill-blank') {
      correct = selectedOption === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'word-bank') {
      const cleanArranged = arrangedWords.map(normalizeAnswer).join(' ');
      const cleanCorrect = (currentExercise.correctWordOrder || []).map(normalizeAnswer).join(' ');
      correct = cleanArranged === cleanCorrect;
    } else if (currentExercise.type === 'matching') {
      // If we got here, all pairs are matched
      correct = matchedPairs.length === (currentExercise.leftPairs || []).length;
    }

    setIsAnswerCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      soundEffects.playCorrect();
    } else {
      soundEffects.playIncorrect();
      soundEffects.playHeartLost();
      onLoseLife();
      
      // If user is down to their last life and got this wrong, it was their final life.
      if (stats.lives <= 1) {
        setLessonFailed(true);
      }
    }
  };

  const handleContinue = () => {
    soundEffects.playTap();
    if (currentIdx + 1 < lesson.exercises.length) {
      resetExerciseState();
      setCurrentIdx(prev => prev + 1);
    } else {
      setLessonFinished(true);
    }
  };

  // UI helpers for mascot reaction image based on answer state
  const getMascotImage = () => {
    if (!isAnswerChecked) {
      return '/mascot.webp';
    }
    return isAnswerCorrect ? '/mascot-present.webp' : '/mascot-tinker.webp';
  };

  if (lessonFailed) {
    return (
      <div className="animate-fade-in-up w-full max-w-md mx-auto py-12 px-4 text-center">
        <div className="retro-card bg-deep-violet flex flex-col gap-6 items-center">
          <picture className="animate-float">
            <source srcSet="/mascot-tinker.webp" type="image/webp" />
            <img src="/mascot-tinker.png" alt="Sad mascot thinking" width={140} height={140} className="drop-shadow-xl" />
          </picture>
          
          <div>
            <h2 className="text-3xl font-black text-flame-orange tracking-tight">¡SE TERMINARON LAS VIDAS!</h2>
            <p className="ui-label text-xs text-slate-grey mt-1">Out of lives</p>
          </div>

          <p className="text-sm text-ghost-white/90 leading-relaxed">
            Don't worry! Every mistake is a compiler error that helps you debug your learning. Recover your lives in Settings and try again!
          </p>

          <button
            onClick={onQuit}
            className="pill-button pill-button-orange w-full"
          >
            RETURN TO PATH
          </button>
        </div>
      </div>
    );
  }

  if (lessonFinished) {
    return (
      <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center p-4">
        {/* Full screen canvas for Confetti */}
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50"></canvas>

        <div className="retro-card bg-deep-violet text-ghost-white max-w-md w-full p-8 text-center flex flex-col gap-6 items-center animate-fade-in-up relative z-10">
          <picture className="animate-float mb-2">
            <source srcSet="/mascot-wave.webp" type="image/webp" />
            <img src="/mascot-wave.png" alt="Cheerful mascot" width={160} height={160} className="drop-shadow-2xl" />
          </picture>

          <div>
            <span className="ui-label text-fuchsia-accent text-xs block mb-1">¡LECCIÓN COMPLETADA!</span>
            <h2 className="text-3xl font-black text-flame-orange tracking-tight">EXCELENTE TRABAJO</h2>
            <p className="ui-label text-slate-grey text-xs mt-1">Lesson Completed Successfully</p>
          </div>

          <p className="text-sm text-ghost-white/90">
            You successfully compiled all Spanish concepts in this lesson! The BothStacks Penguin is extremely proud.
          </p>

          {/* XP Rewards block */}
          <div className="w-full bg-void/50 border border-void p-4 rounded-2xl grid grid-cols-2 gap-4">
            <div>
              <span className="ui-label text-[10px] text-slate-grey block">TOTAL REWARD</span>
              <span className="font-mono font-black text-xl text-flame-orange">🎯 +{lesson.xpReward} XP</span>
            </div>
            <div>
              <span className="ui-label text-[10px] text-slate-grey block">CURRENT STREAK</span>
              <span className="font-mono font-black text-xl text-fuchsia-accent">🔥 {stats.streak} DAYS</span>
            </div>
          </div>

          <button
            onClick={() => onLessonComplete(lesson.xpReward)}
            className="pill-button pill-button-fuchsia w-full"
          >
            CONTINUE TO DASHBOARD
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl px-4 py-6 mx-auto flex flex-col min-h-[85vh] justify-between">
      {/* Top Header Runner Panel */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <button 
            onClick={onQuit}
            className="ui-label text-slate-grey hover:text-ghost-white bg-void border border-void rounded-full px-4 py-1.5 transition-colors"
          >
            ✕ QUIT
          </button>
          
          {/* Progress bar container */}
          <div className="flex-1 bg-void border-2 border-void h-5 rounded-full overflow-hidden relative">
            <div 
              className="bg-fuchsia-accent h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-sm font-black">
            <span>❤️</span>
            <span className="text-flame-orange">{stats.lives}</span>
          </div>
        </div>

        {/* Mascot & Prompt bubble section */}
        <div className="flex items-start gap-4 mb-6 bg-void/30 p-4 border border-void rounded-2xl">
          <picture className="flex-shrink-0 animate-float">
            <source srcSet={getMascotImage().replace('.png', '.webp')} type="image/webp" />
            <img src={getMascotImage()} alt="Lesson mascot response" width={70} height={70} />
          </picture>
          <div className="flex-1">
            <span className="ui-label text-[10px] text-fuchsia-accent block mb-1">INSTRUCTION</span>
            <p className="font-bold text-ghost-white text-base leading-snug">{currentExercise.instruction}</p>
          </div>
        </div>

        {/* Question Panel */}
        <div className="bg-void/40 border-3 border-void p-6 rounded-2xl shadow-[4px_4px_0_0_var(--color-void)] mb-6 text-center">
          <span className="ui-label text-[10px] text-slate-grey block mb-2">TARGET PHRASE</span>
          <h3 className="text-2xl font-black tracking-tight text-flame-orange leading-tight">{currentExercise.questionText}</h3>
        </div>

        {/* Exercise Body Options */}
        <div className="mb-6">
          
          {/* Multiple choice or Fill in the blank options */}
          {(currentExercise.type === 'multiple-choice' || currentExercise.type === 'fill-blank') && currentExercise.options && (
            <div className="flex flex-col gap-3">
              {currentExercise.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                return (
                  <button
                    key={idx}
                    onClick={() => { if (!isAnswerChecked) { soundEffects.playTap(); setSelectedOption(option); } }}
                    disabled={isAnswerChecked}
                    className={`retro-option-card ${isSelected ? 'selected' : ''} ${isAnswerChecked && option === currentExercise.correctAnswer ? 'correct' : ''}`}
                  >
                    <span className="font-mono ui-label text-slate-grey bg-void border border-void w-8 h-8 flex items-center justify-center rounded-lg">{String.fromCharCode(65 + idx)}</span>
                    <span className="flex-1 font-bold text-left">{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Word Bank sentence builder */}
          {currentExercise.type === 'word-bank' && currentExercise.wordBank && (
            <div className="flex flex-col gap-6">
              {/* Target arranged text slot box */}
              <div className="bg-void/60 border-2 border-dashed border-void min-h-[70px] p-3 rounded-2xl flex flex-wrap gap-2 items-center justify-center">
                {arrangedWords.length === 0 ? (
                  <span className="ui-label text-[10px] text-slate-grey select-none">Tap words to compile translation</span>
                ) : (
                  arrangedWords.map((word, idx) => (
                    <button
                      key={idx}
                      disabled={isAnswerChecked}
                      onClick={() => handleRemoveArrangedWord(idx)}
                      className="retro-word-pill"
                    >
                      {word}
                    </button>
                  ))
                )}
              </div>

              {/* Source word pool */}
              <div className="flex flex-wrap gap-2.5 justify-center mt-2">
                {currentExercise.wordBank.map((word, idx) => {
                  // Count how many times this specific word is used in arrangedWords to handle duplicates correctly
                  const countInArranged = arrangedWords.filter(w => w === word).length;
                  const countInBank = currentExercise.wordBank!.filter(w => w === word).length;
                  const isUsed = countInArranged >= countInBank;

                  return (
                    <button
                      key={idx}
                      onClick={() => !isUsed && handleWordBankClick(word)}
                      disabled={isUsed || isAnswerChecked}
                      className={`retro-word-pill ${isUsed ? 'used' : ''}`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vocabulary Pair Matching */}
          {currentExercise.type === 'matching' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Left Spanish Words column */}
              <div className="flex flex-col gap-3">
                <span className="ui-label text-[10px] text-slate-grey text-center mb-1">Spanish</span>
                {shuffledLeft.map((word, idx) => {
                  const isMatched = matchedPairs.includes(word);
                  const isSelected = selectedLeft === word;
                  const isMismatched = mismatchedLeft === word;

                  return (
                    <button
                      key={idx}
                      disabled={isMatched || isAnswerChecked}
                      onClick={() => handleSelectLeft(word)}
                      className={`retro-option-card py-3 px-4 text-sm justify-center ${isSelected ? 'selected' : ''} ${isMatched ? 'correct opacity-40 pointer-events-none' : ''} ${isMismatched ? 'bg-red-900 border-red-500' : ''}`}
                    >
                      <span className="font-bold text-center">{word}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right English Words column */}
              <div className="flex flex-col gap-3">
                <span className="ui-label text-[10px] text-slate-grey text-center mb-1">English</span>
                {shuffledRight.map((word, idx) => {
                  // Find Spanish equivalent to see if it is matched
                  const spanishEquiv = Object.keys(currentExercise.matchingMap || {}).find(key => currentExercise.matchingMap![key] === word);
                  const isMatched = spanishEquiv ? matchedPairs.includes(spanishEquiv) : false;
                  const isSelected = selectedRight === word;
                  const isMismatched = mismatchedRight === word;

                  return (
                    <button
                      key={idx}
                      disabled={isMatched || isAnswerChecked}
                      onClick={() => handleSelectRight(word)}
                      className={`retro-option-card py-3 px-4 text-sm justify-center ${isSelected ? 'selected' : ''} ${isMatched ? 'correct opacity-40 pointer-events-none' : ''} ${isMismatched ? 'bg-red-900 border-red-500' : ''}`}
                    >
                      <span className="font-bold text-center">{word}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Dynamic Feedback Control Drawer */}
      <div className="mt-auto">
        {!isAnswerChecked ? (
          <button
            onClick={handleCheckAnswer}
            disabled={
              (currentExercise.type === 'multiple-choice' || currentExercise.type === 'fill-blank') 
                ? !selectedOption 
                : currentExercise.type === 'word-bank' 
                  ? arrangedWords.length === 0 
                  : matchedPairs.length < (currentExercise.leftPairs || []).length
            }
            className={`pill-button pill-button-fuchsia w-full py-4 text-base ${
              ((currentExercise.type === 'multiple-choice' || currentExercise.type === 'fill-blank') ? !selectedOption : currentExercise.type === 'word-bank' ? arrangedWords.length === 0 : matchedPairs.length < (currentExercise.leftPairs || []).length)
                ? 'opacity-40 cursor-not-allowed shadow-none transform-none'
                : ''
            }`}
          >
            {currentExercise.type === 'matching' ? "MATCH ALL PAIRS" : "CHECK ANSWER"}
          </button>
        ) : (
          <div className={`retro-card p-5 animate-fade-in-up flex flex-col gap-4 border-3 border-void ${isAnswerCorrect ? 'bg-green-950 border-green-800' : 'bg-red-950 border-red-800'}`}>
            <div className="flex justify-between items-center">
              <div>
                <h4 className={`text-2xl font-black tracking-tight ${isAnswerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isAnswerCorrect ? "¡CORRECTO!" : "¡INCORRECTO!"}
                </h4>
                <p className="ui-label text-[10px] text-slate-grey mt-0.5">
                  {isAnswerCorrect ? "Great job, code compiles" : "Grammar syntax error"}
                </p>
              </div>
              <span className="text-3xl">{isAnswerCorrect ? "🎉" : "🐛"}</span>
            </div>

            {!isAnswerCorrect && (
              <div className="bg-void/50 border border-void p-3 rounded-xl">
                <span className="ui-label text-[10px] text-slate-grey block">CORRECT SYNTAX</span>
                <p className="font-bold text-sm text-ghost-white">{
                  currentExercise.type === 'word-bank' 
                    ? (currentExercise.correctWordOrder || []).join(' ')
                    : currentExercise.correctAnswer
                }</p>
              </div>
            )}

            <button
              onClick={handleContinue}
              className={`pill-button w-full py-4 text-base ${isAnswerCorrect ? 'pill-button-orange' : 'bg-void text-ghost-white border-void'}`}
            >
              CONTINUE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
