import React from "react";
import "./GameMenu.css";

function GameMenu({ onStart }) {
  return (
    <div className="game-menu-overlay" role="dialog" aria-modal="true">
      {/* Background video */}
      <video
        className="menu-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="./video/space.mp4" type="video/mp4" />
      </video>

      {/* Content */}
      <div className="menu-content">
        <h1 className="menu-title">Galist</h1>
        <p className="menu-subtitle">Galaxy Linked List</p>

        <div className="menu-buttons">
          <button className="menu-btn primary" onClick={onStart}>
            Start Game
          </button>
          <button className="menu-btn">Tutorial</button>
          <button className="menu-btn">Leaderboards</button>
        </div>
      </div>
    </div>
  );
}

export default GameMenu;
