import React, { useEffect, useState } from "react";
import { COLORS, BRUTAL_SHADOW } from "./constants.js";

/**
 * AchievementPopup Component
 *
 * Displays a celebratory popup when an achievement is unlocked.
 * Features:
 * - Semi-transparent dark backdrop overlay
 * - Centered card with scale animation
 * - Achievement icon, name, and description
 * - Auto-dismiss after 3 seconds or on tap/click
 * - Confetti particle animation
 */
export default function AchievementPopup({ achievement, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.3s ease",
      }}
      onClick={handleDismiss}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes confettiFall {
          from {
            transform: translateY(-20px) translateX(var(--tx));
            opacity: 1;
          }
          to {
            transform: translateY(100vh) translateX(var(--tx));
            opacity: 0;
          }
        }

        .confetti-particle {
          position: fixed;
          pointer-events: none;
          animation: confettiFall linear forwards;
        }
      `}</style>

      {/* Confetti particles */}
      {Array.from({ length: 25 }).map((_, i) => {
        const randomX = (Math.random() - 0.5) * 300;
        const randomDelay = Math.random() * 0.3;
        const randomDuration = 2 + Math.random() * 0.5;
        const randomSize = 4 + Math.random() * 4;
        const colors = [
          COLORS.pink,
          COLORS.yellow,
          COLORS.blue,
          COLORS.green,
          COLORS.orange,
          COLORS.purple,
          COLORS.red,
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        return (
          <div
            key={i}
            className="confetti-particle"
            style={{
              "--tx": `${randomX}px`,
              left: "50%",
              top: "20%",
              width: `${randomSize}px`,
              height: `${randomSize}px`,
              backgroundColor: randomColor,
              borderRadius: Math.random() > 0.5 ? "50%" : "4px",
              border: `2px solid ${COLORS.black}`,
              animation: `confettiFall ${randomDuration}s linear ${randomDelay}s forwards`,
            }}
          />
        );
      })}

      {/* Modal card */}
      <div
        style={{
          backgroundColor: COLORS.cream,
          border: `3px solid ${COLORS.black}`,
          boxShadow: BRUTAL_SHADOW,
          borderRadius: "8px",
          padding: "40px",
          textAlign: "center",
          maxWidth: "400px",
          animation: "scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
      >
        {/* Achievement Icon */}
        <div
          style={{
            fontSize: "48px",
            marginBottom: "20px",
            animation: "scaleIn 0.6s ease 0.1s both",
          }}
        >
          {achievement.icon}
        </div>

        {/* Achievement Unlocked Header */}
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: COLORS.orange,
            marginBottom: "12px",
            animation: "scaleIn 0.6s ease 0.2s both",
          }}
        >
          Achievement Unlocked!
        </div>

        {/* Achievement Name */}
        <div
          style={{
            fontFamily: "'Shrikhand', serif",
            fontSize: "24px",
            fontWeight: 700,
            color: COLORS.black,
            marginBottom: "8px",
            animation: "scaleIn 0.6s ease 0.3s both",
          }}
        >
          {achievement.name}
        </div>

        {/* Achievement Description */}
        <div
          style={{
            fontSize: "14px",
            color: "#666",
            lineHeight: "1.5",
            animation: "scaleIn 0.6s ease 0.4s both",
          }}
        >
          {achievement.description}
        </div>
      </div>
    </div>
  );
}
