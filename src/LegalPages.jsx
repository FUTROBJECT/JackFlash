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

export function HelpFAQ({ onBack }) {
  return (
    <PageWrapper title="Help & FAQ" onBack={onBack}>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>What is JackFlash?</h3>
        <p>JackFlash is a math fact fluency app for kids in grades 2-5. It helps children master multiplication and division facts through an approach based on Singapore Math's Concrete-Pictorial-Abstract (CPA) framework — the same method used in top-performing math classrooms worldwide.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>What is the CPA approach?</h3>
        <p style={{ marginBottom: "8px" }}><strong>Concrete:</strong> Visual arrays (dot grids) are always visible, so kids can count and see what multiplication means physically.</p>
        <p style={{ marginBottom: "8px" }}><strong>Pictorial:</strong> Arrays start visible but fade as your child masters each fact. The visual scaffold is there when needed, then steps back.</p>
        <p><strong>Abstract:</strong> Numbers only — like traditional flashcards. Your child has internalized the concept and is building speed.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Why does JackFlash teach multiplication and division together?</h3>
        <p>Because they're inverse operations that share the same fact families. If you know 6 × 4 = 24, you already know 24 ÷ 4 = 6 and 24 ÷ 6 = 4. Teaching them together builds deeper understanding and faster recall than drilling them separately.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>What do the bar diagrams mean?</h3>
        <p>For division problems, JackFlash shows a bar model (tape diagram) — a key Singapore Math visualization. The bar represents the total being divided, split into equal groups. Each segment shows the size of one group, helping kids see what division means concretely.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>What does "mastered" mean?</h3>
        <p>A fact is considered mastered when your child answers it correctly 3 times. The ⭐ counter in the header tracks how many facts have been mastered out of the total available. Mastered facts still appear occasionally to maintain recall, but the app prioritizes facts that need more practice.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>How does the app choose which problems to show?</h3>
        <p>JackFlash uses spaced repetition. Facts your child hasn't mastered yet appear more frequently. Facts that are already mastered come up less often but still cycle in to keep them fresh. This means practice time is always focused where it's needed most.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Is my child's data saved?</h3>
        <p>Yes — all progress is saved locally on your device in your browser's storage. It persists between sessions as long as you use the same browser and don't clear your site data. No data is ever sent to a server.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>How do I reset my child's progress?</h3>
        <p>Go to the Parent Zone (tap the gear icon on the profile page). Under the Children tab, select a profile and use the "Reset Mastery" option to start fresh.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Can multiple kids use the app?</h3>
        <p>Yes! JackFlash supports multiple player profiles. Each profile tracks its own mastery, achievements, and daily streak independently. Create new profiles from the profile picker screen.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>What grades is this for?</h3>
        <p>JackFlash is designed for grades 2-5 (ages 7-11), covering multiplication and division facts through 12. It works well as a supplement to any math curriculum.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Something isn't working — what should I do?</h3>
        <p>Try a hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows). If issues persist, clearing your browser's site data for JackFlash will reset the app. Note that this will also clear all saved progress.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Contact</h3>
        <p>Need more help? Reach us at <strong>hello@laserlabstudios.com</strong>.</p>
      </div>
    </PageWrapper>
  );
}
