/**
 * Settings Modal
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import React, { useState } from 'react';
import { audio } from '../audio/proceduralAudio.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [masterVol, setMasterVol] = useState(80);
  const [sfxVol, setSfxVol] = useState(85);
  const [musicVol, setMusicVol] = useState(45);
  const [isMuted, setIsMuted] = useState(false);
  const [screenShake, setScreenShake] = useState(100);
  const [aimAssist, setAimAssist] = useState(true);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-gray-950 border border-cyan-500/80 rounded-xl shadow-2xl p-6 font-mono text-xs space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 rotate-45 inline-block" />
            <h2 className="text-sm font-bold text-cyan-400 tracking-wider">
              TACTICAL SETTINGS // AUDIO & DISPLAY
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2 py-0.5 bg-gray-800 rounded border border-gray-700"
          >
            ESC
          </button>
        </div>

        {/* Audio Sliders */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-gray-300 font-bold">
            <span>MASTER VOLUME</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const muted = audio.toggleMute();
                  setIsMuted(muted);
                }}
                className={`px-2 py-0.5 rounded text-[10px] ${
                  isMuted ? 'bg-red-950 text-red-400 border border-red-700' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {isMuted ? 'MUTED' : 'MUTE'}
              </button>
              <span className="w-8 text-right">{masterVol}%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVol}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMasterVol(val);
              audio.setMasterVolume(val / 100);
            }}
            className="w-full accent-cyan-400 bg-gray-800"
          />

          <div className="flex justify-between items-center text-gray-300 font-bold mt-2">
            <span>SFX & GUNFIRE</span>
            <span className="w-8 text-right">{sfxVol}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sfxVol}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSfxVol(val);
              audio.setSfxVolume(val / 100);
            }}
            className="w-full accent-cyan-400 bg-gray-800"
          />

          <div className="flex justify-between items-center text-gray-300 font-bold mt-2">
            <span>ADAPTIVE SYNTH MUSIC</span>
            <span className="w-8 text-right">{musicVol}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVol}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMusicVol(val);
              audio.setMusicVolume(val / 100);
            }}
            className="w-full accent-cyan-400 bg-gray-800"
          />
        </div>

        {/* Screen Shake Slider */}
        <div className="pt-2 border-t border-gray-800">
          <div className="flex justify-between items-center text-gray-300 font-bold mb-1">
            <span>SCREEN SHAKE INTENSITY</span>
            <span>{screenShake}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={screenShake}
            onChange={(e) => setScreenShake(Number(e.target.value))}
            className="w-full accent-cyan-400 bg-gray-800"
          />
        </div>

        {/* Mobile Aim Assist & Quality */}
        <div className="pt-2 border-t border-gray-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-bold">MOBILE AIM ASSIST</span>
            <button
              onClick={() => setAimAssist(!aimAssist)}
              className={`px-3 py-1 rounded font-bold ${
                aimAssist ? 'bg-cyan-950 text-cyan-400 border border-cyan-500' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {aimAssist ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-bold">GRAPHICS PROFILE</span>
            <div className="flex gap-1">
              {(['high', 'medium', 'low'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`px-2 py-0.5 rounded uppercase text-[10px] ${
                    quality === q
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-500'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-black font-bold rounded-lg mt-4 shadow-lg shadow-cyan-950/60"
        >
          CONFIRM & RESUME
        </button>
      </div>
    </div>
  );
};
