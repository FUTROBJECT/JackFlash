import { useState } from "react";
import { COLORS, BRUTAL_BORDER_SM, BRUTAL_SHADOW_SM } from "./constants.js";

const linkStyle = {
  color: COLORS.blue,
  textDecoration: "underline",
  fontWeight: 600,
};

const sectionStyle = {
  marginBottom: "20px",
};

const headingStyle = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "16px",
  fontWeight: 700,
  color: COLORS.black,
  marginBottom: "8px",
};

const bodyStyle = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "14px",
  lineHeight: 1.7,
  color: COLORS.black,
};

function PageWrapper({ title, onBack, children }) {
  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "12px",
      border: BRUTAL_BORDER_SM,
      boxShadow: BRUTAL_SHADOW_SM,
      padding: "24px 20px",
      animation: "fadeSlideUp 0.2s ease both",
    }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "18px", padding: "4px 8px 4px 0",
          fontFamily: "'Space Mono', monospace", fontWeight: 700,
          color: COLORS.black,
        }}>
          ← Back
        </button>
        <h2 style={{
          fontFamily: "'Shrikhand', cursive",
          fontSize: "20px",
          fontWeight: 400,
          color: COLORS.black,
          margin: 0,
          flex: 1,
          textAlign: "center",
          paddingRight: "40px",
        }}>
          {title}
        </h2>
      </div>
      <div style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}

export function PrivacyPolicy({ onBack }) {
  return (
    <PageWrapper title="Privacy Policy" onBack={onBack}>
      <p style={{ fontSize: "12px", opacity: 0.5, marginBottom: "16px", fontFamily: "'Space Mono', monospace" }}>
        Last updated: April 2026
      </p>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Overview</h3>
        <p>JackFlash is a math practice app designed for children. We take privacy seriously, especially when it comes to young users. This policy explains how the app handles data.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Data We Collect</h3>
        <p><strong>We do not collect any personal data.</strong> JackFlash does not have user accounts, does not require login credentials, and does not transmit any information to external servers.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Local Storage</h3>
        <p>All app data — including player profiles, practice progress, mastery scores, and settings — is stored locally on your device using your browser's localStorage. This data never leaves your device and is not accessible to us or any third party.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Children's Privacy (COPPA)</h3>
        <p>JackFlash is designed with children's privacy as a priority. We comply with the Children's Online Privacy Protection Act (COPPA) by design:</p>
        <p style={{ marginTop: "8px" }}>We do not collect, store, or share any personal information from children. No names, email addresses, photos, or location data are ever transmitted from the app. Player names and avatars chosen within the app are stored only on your device and are never sent to any server.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Third-Party Services</h3>
        <p>JackFlash does not use any third-party analytics, advertising, or tracking services. We do not use cookies. The only external resource loaded is Google Fonts for typography.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Data Deletion</h3>
        <p>Since all data is stored locally in your browser, you can delete it at any time by clearing your browser's site data for this app. No server-side data exists to delete.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Changes to This Policy</h3>
        <p>If we make changes to this privacy policy, we will update the "Last updated" date above. Continued use of the app after changes constitutes acceptance of the updated policy.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Contact</h3>
        <p>If you have questions about this privacy policy, please contact us at <strong>hello@laserlabstudios.com</strong>.</p>
      </div>
    </PageWrapper>
  );
}

export function TermsOfService({ onBack }) {
  return (
    <PageWrapper title="Terms of Service" onBack={onBack}>
      <p style={{ fontSize: "12px", opacity: 0.5, marginBottom: "16px", fontFamily: "'Space Mono', monospace" }}>
        Last updated: April 2026
      </p>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Acceptance of Terms</h3>
        <p>By using JackFlash, you agree to these Terms of Service. If you do not agree, please do not use the app. If you are a parent or guardian, you are responsible for your child's use of the app.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Description of Service</h3>
        <p>JackFlash is a free, browser-based math practice application designed for elementary-age children. It provides multiplication and division fact practice using the Concrete-Pictorial-Abstract (CPA) approach aligned with Singapore Math methodology.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Use of the App</h3>
        <p>JackFlash is provided for personal, non-commercial, educational use. You may not modify, distribute, or reverse-engineer the app. The app is intended for use by children under adult supervision.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Intellectual Property</h3>
        <p>All content, design, code, and branding of JackFlash are owned by Laser Lab Studios LLC. The JackFlash name, logo, and lightning bolt icon are trademarks of Laser Lab Studios LLC.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Data and Privacy</h3>
        <p>All user data is stored locally on your device. We do not collect or store any personal information. Please see our Privacy Policy for full details.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Disclaimer</h3>
        <p>JackFlash is provided "as is" without warranties of any kind. While we strive to provide accurate educational content, we make no guarantees about learning outcomes. JackFlash is a supplemental practice tool and is not a substitute for classroom instruction.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Limitation of Liability</h3>
        <p>Laser Lab Studios LLC shall not be liable for any damages arising from the use or inability to use JackFlash, including loss of data stored in your browser's localStorage.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Changes to Terms</h3>
        <p>We reserve the right to update these terms at any time. Changes will be reflected by updating the "Last updated" date. Continued use of the app constitutes acceptance of updated terms.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Contact</h3>
        <p>Questions about these terms? Contact us at <strong>hello@laserlabstudios.com</strong>.</p>
      </div>
    </PageWrapper>
  );
}

// Collapsible accordion row — click header to expand/collapse
function AccordionItem({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border: BRUTAL_BORDER_SM,
      borderRadius: "8px",
      marginBottom: "10px",
      background: "white",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: open ? COLORS.yellow : "white",
          border: "none",
          borderBottom: open ? BRUTAL_BORDER_SM : "none",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          cursor: "pointer",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "14px",
          fontWeight: 700,
          color: COLORS.black,
          textAlign: "left",
          transition: "background 0.15s",
        }}
      >
        <span>{title}</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "18px",
          fontWeight: 700,
          lineHeight: 1,
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
        }}>
          +
        </span>
      </button>
      {open && (
        <div style={{
          padding: "14px 14px 16px",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "13.5px",
          lineHeight: 1.65,
          color: COLORS.black,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function HelpFAQ({ onBack }) {
  return (
    <PageWrapper title="How JackFlash Works" onBack={onBack}>
      <p style={{ fontSize: "13px", marginBottom: "16px", opacity: 0.75 }}>
        Tap any question to expand.
      </p>

      <AccordionItem title="What is JackFlash?" defaultOpen>
        <p style={{ margin: 0 }}>
          A math fact fluency app for grades 2–5. It helps kids master multiplication and division using the Concrete-Pictorial-Abstract (CPA) approach from Singapore Math — the same method used in top-performing classrooms worldwide.
        </p>
      </AccordionItem>

      <AccordionItem title="What is the CPA approach?">
        <p style={{ margin: "0 0 8px" }}><strong>Concrete:</strong> dot arrays show what multiplication actually means — groups of things.</p>
        <p style={{ margin: "0 0 8px" }}><strong>Pictorial:</strong> bar models (for division) show the total being split into equal parts.</p>
        <p style={{ margin: 0 }}><strong>Abstract:</strong> numbers alone — once the concept is owned, the scaffolds step back and speed builds.</p>
      </AccordionItem>

      <AccordionItem title="Why teach multiplication and division together?">
        <p style={{ margin: 0 }}>
          They're inverse operations sharing the same fact families. Knowing 6 × 4 = 24 means your child also knows 24 ÷ 4 = 6 and 24 ÷ 6 = 4. Teaching them together builds deeper understanding than drilling them separately.
        </p>
      </AccordionItem>

      <AccordionItem title="How does JackFlash pick what to practice?">
        <p style={{ margin: "0 0 10px" }}>
          Not randomly. Every problem is chosen based on what your child knows and what they're ready for next. Facts are sorted into five groups:
        </p>
        <p style={{ margin: "0 0 6px" }}><strong>New</strong> — introduced just 2–3 at a time, so no one gets overwhelmed.</p>
        <p style={{ margin: "0 0 6px" }}><strong>Learning</strong> — gotten right before but not yet mastered. Shows up often.</p>
        <p style={{ margin: "0 0 6px" }}><strong>Struggling</strong> — repeatedly wrong. Gets the most attention.</p>
        <p style={{ margin: "0 0 6px" }}><strong>Mastered</strong> — correct 3 times. Moves into long-term review.</p>
        <p style={{ margin: 0 }}><strong>Review-due</strong> — mastered facts whose review interval has come up.</p>
      </AccordionItem>

      <AccordionItem title="What does &ldquo;mastered&rdquo; mean?">
        <p style={{ margin: "0 0 8px" }}>
          A fact is mastered after 3 correct answers. The ⭐ counter in the header tracks mastered facts out of the total.
        </p>
        <p style={{ margin: 0 }}>
          Mastery isn't permanent — if your child misses a mastered fact during review, it drops back into the learning pool and needs to be re-mastered. This keeps the standard honest.
        </p>
      </AccordionItem>

      <AccordionItem title="How does spaced repetition work?">
        <p style={{ margin: "0 0 8px" }}>
          Once a fact is mastered, it comes back on a schedule that stretches over time:
        </p>
        <p style={{ margin: "0 0 4px" }}>• Next day → 3 days → 7 days → 14 days → 30 days</p>
        <p style={{ margin: 0 }}>
          Each correct review pushes the interval out. A miss resets it. This is how facts move from short-term into long-term memory.
        </p>
      </AccordionItem>

      <AccordionItem title="What happens when my child gets a problem wrong?">
        <p style={{ margin: 0 }}>
          The fact's mastery level drops by one, so it shows up more often. The visual scaffold (dot array or bar model) also appears automatically — helping your child see the math instead of guessing.
        </p>
      </AccordionItem>

      <AccordionItem title="Can I see what my child is struggling with?">
        <p style={{ margin: 0 }}>
          Yes. During practice, tap the chart icon to see mastery dots for every fact. In the Parent Zone, the &ldquo;Needs Practice&rdquo; section lists the specific facts with the lowest mastery — including ones your child hasn't attempted yet.
        </p>
      </AccordionItem>

      <AccordionItem title="Can multiple kids use the app?">
        <p style={{ margin: 0 }}>
          Yes — JackFlash supports multiple profiles. Each one tracks its own mastery, achievements, and daily streak independently. Add a new player from the profile picker.
        </p>
      </AccordionItem>

      <AccordionItem title="How do I reset my child's progress?">
        <p style={{ margin: 0 }}>
          Open the Parent Zone (gear icon on the profile page), go to the Children tab, select a profile, and use &ldquo;Reset Mastery.&rdquo;
        </p>
      </AccordionItem>

      <AccordionItem title="Is my child's data private?">
        <p style={{ margin: 0 }}>
          Yes. All progress is stored locally on your device. No accounts, no servers, no tracking, no personal information collected. See the Privacy Policy for the full details.
        </p>
      </AccordionItem>

      <AccordionItem title="Something isn't working — what should I do?">
        <p style={{ margin: "0 0 8px" }}>
          Try a hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows). If it still misbehaves, clearing your browser's site data will reset the app — but that also clears saved progress.
        </p>
        <p style={{ margin: 0 }}>
          Still stuck? Email <strong>hello@laserlabstudios.com</strong>.
        </p>
      </AccordionItem>
    </PageWrapper>
  );
}
