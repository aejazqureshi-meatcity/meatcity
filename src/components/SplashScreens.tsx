"use client";

import { useState } from 'react';

interface SplashScreensProps {
  onComplete: () => void;
}

export default function SplashScreens({ onComplete }: SplashScreensProps) {
  const [step, setStep] = useState(1);

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const skipSplash = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white px-6 py-6 font-primary justify-between">
      {/* Top Bar with dots & skip button */}
      <div className="flex justify-between items-center w-full mt-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-350 cursor-pointer ${
                step === s ? 'w-6 bg-gold' : 'w-2 bg-white/20'
              }`}
              onClick={() => setStep(s)}
            />
          ))}
        </div>
        {step < 3 && (
          <button 
            onClick={skipSplash}
            className="text-text-secondary text-sm font-bold tracking-wide hover:text-white transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-sm mx-auto my-8">
        {step === 1 && (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="relative w-32 h-32 mb-6">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="#D4AF37" strokeWidth="3" fill="#111" />
                <path d="M30 65V35L50 50L70 35V65" stroke="#D60000" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M50 50V68" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" />
                <circle cx="50" cy="30" r="5" fill="#D4AF37" />
              </svg>
            </div>
            <h1 className="text-white text-3xl font-extrabold tracking-tight mb-2">
              Meat <span className="text-gold">City</span>
            </h1>
            <div className="text-gold text-sm font-bold tracking-widest uppercase mb-6">"Meat That Matters"</div>
            <p className="text-text-secondary text-sm leading-relaxed max-w-[280px]">
              Navi Mumbai's premium source for farm-fresh, 100% Halal cuts.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="100" cy="100" r="80" fill="rgba(214, 0, 0, 0.05)" />
                <path d="M60 110C60 90 90 60 110 60C130 60 145 75 145 95C145 115 115 145 95 145C75 145 60 130 60 110Z" fill="#D60000" opacity="0.9" />
                <path d="M85 85C80 80 80 70 85 65C90 60 100 60 105 65C110 70 110 80 105 85C100 90 90 90 85 85Z" fill="#FFAAAA" />
                <path d="M125 75L150 50" stroke="white" strokeWidth="8" strokeLinecap="round" />
                <circle cx="150" cy="50" r="6" fill="white" />
                <rect x="70" y="115" width="60" height="24" rx="12" fill="#D4AF37" />
                <text x="100" y="131" fill="#111111" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="0.5">HALAL</text>
              </svg>
            </div>
            <h2 className="text-white text-2xl font-extrabold tracking-tight mb-3">Freshness Guaranteed</h2>
            <p className="text-text-secondary text-sm leading-relaxed max-w-[280px]">
              Every cut is hand-picked, hygienically packed, and delivered super cold.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="100" cy="100" r="80" fill="rgba(212, 175, 55, 0.05)" />
                <path d="M50 130H150" stroke="#111" strokeWidth="6" strokeLinecap="round" />
                <circle cx="70" cy="130" r="20" stroke="#111" strokeWidth="6" fill="white" />
                <circle cx="70" cy="130" r="8" fill="#D4AF37" />
                <circle cx="130" cy="130" r="20" stroke="#111" strokeWidth="6" fill="white" />
                <circle cx="130" cy="130" r="8" fill="#D4AF37" />
                <path d="M70 110H120L135 75H145" stroke="#D60000" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="55" y="65" width="45" height="40" rx="5" fill="#111111" stroke="#D4AF37" strokeWidth="2" />
                <path d="M77 85H60" stroke="#D4AF37" strokeWidth="2" />
                <text x="77" y="90" fill="#D4AF37" fontSize="6" fontWeight="bold" textAnchor="middle">MEAT CITY</text>
                <line x1="30" y1="80" x2="15" y2="80" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" />
                <line x1="35" y1="95" x2="20" y2="95" stroke="#D60000" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-white text-2xl font-extrabold tracking-tight mb-3">Super Fast Delivery</h2>
            <p className="text-text-secondary text-sm leading-relaxed max-w-[280px]">
              Quick and contactless delivery across Turbhe and Navi Mumbai.
            </p>
          </div>
        )}
      </div>

      {/* Footer / Action Button */}
      <div className="w-full max-w-sm mx-auto mb-6">
        <button
          onClick={nextStep}
          className="w-full py-4 bg-primary text-white font-extrabold text-sm uppercase tracking-wider rounded-[12px] shadow-lg transition-all duration-200 active:scale-[0.98] hover:bg-red-700"
        >
          {step === 3 ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
