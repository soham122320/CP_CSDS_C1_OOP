/**
 * Mobile Touch Overlay (Dual Virtual Joysticks & Action Buttons)
 * for SHARD-4: BLACKOUT PROTOCOL
 */

import React from 'react';
import { touchControls } from '../input/touchControls.js';

export const MobileControlsOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 sm:hidden">
      {/* Visual Guide for Left Joystick (Movement) */}
      <div className="absolute bottom-12 left-8 w-28 h-28 rounded-full border-2 border-cyan-500/30 bg-cyan-950/15 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border border-cyan-400/50 bg-cyan-500/20" />
        <span className="absolute text-[9px] font-mono text-cyan-400/60 bottom-2">MOVE</span>
      </div>

      {/* Visual Guide for Right Joystick (Aim & Auto-Fire) */}
      <div className="absolute bottom-12 right-28 w-28 h-28 rounded-full border-2 border-red-500/30 bg-red-950/15 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border border-red-400/50 bg-red-500/20" />
        <span className="absolute text-[9px] font-mono text-red-400/60 bottom-2">AIM & FIRE</span>
      </div>

      {/* Action Buttons Cluster on Far-Right */}
      <div className="absolute bottom-8 right-4 flex flex-col items-center gap-2 pointer-events-auto">
        {/* Dodge / Dash Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchControls.triggerDodge();
          }}
          className="w-14 h-14 rounded-full bg-emerald-950/80 border-2 border-emerald-400 text-emerald-300 font-mono font-bold text-xs flex flex-col items-center justify-center active:scale-90 shadow-lg shadow-emerald-950/50"
        >
          <span>DODGE</span>
          <span className="text-[9px] text-emerald-400/70">ROLL</span>
        </button>

        {/* Class Skill Button [Q] */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchControls.triggerSkill();
          }}
          className="w-12 h-12 rounded-full bg-purple-950/80 border-2 border-purple-400 text-purple-300 font-mono font-bold text-[11px] flex flex-col items-center justify-center active:scale-90 shadow-lg shadow-purple-950/50"
        >
          <span>SKILL</span>
          <span className="text-[9px]">[Q]</span>
        </button>

        {/* Reload [R] */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchControls.triggerReload();
          }}
          className="w-11 h-11 rounded-full bg-gray-900/80 border border-gray-600 text-gray-200 font-mono font-bold text-[10px] flex items-center justify-center active:scale-90"
        >
          RELOAD
        </button>
      </div>

      {/* Action Buttons Cluster Left/Center */}
      <div className="absolute bottom-8 left-40 flex items-center gap-2 pointer-events-auto">
        {/* Interact / Revive / Hack [E] */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchControls.triggerInteract();
          }}
          className="w-13 h-13 rounded-full bg-cyan-950/80 border-2 border-cyan-400 text-cyan-300 font-mono font-bold text-xs flex flex-col items-center justify-center active:scale-90 shadow-lg"
        >
          <span>HACK</span>
          <span className="text-[9px]">REVIVE</span>
        </button>

        {/* Grenade [G] */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchControls.triggerGrenade();
          }}
          className="w-11 h-11 rounded-full bg-orange-950/80 border border-orange-400 text-orange-300 font-mono font-bold text-[10px] flex items-center justify-center active:scale-90"
        >
          GRENADE
        </button>

        {/* Crouch [C] */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchControls.toggleCrouch();
          }}
          className="w-11 h-11 rounded-full bg-gray-900/80 border border-amber-500/70 text-amber-300 font-mono font-bold text-[10px] flex items-center justify-center active:scale-90"
        >
          CROUCH
        </button>

        {/* Weapon Swap [1/2] */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            touchControls.triggerWeaponSwap();
          }}
          className="w-11 h-11 rounded-full bg-gray-900/80 border border-cyan-500/70 text-cyan-300 font-mono font-bold text-[10px] flex items-center justify-center active:scale-90"
        >
          SWAP
        </button>
      </div>
    </div>
  );
};
