import { COLORS, BRUTAL_BORDER_SM, BRUTAL_SHADOW_SM, DOTTED_RULE } from "./constants.js";
import { AccordionItem } from "./shared/ui.jsx";
import SmartPracticeExplainer from "./SmartPracticeExplainer.jsx";

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
          fontSize: "26px",
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
        Last updated: October 2026
      </p>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Overview</h3>
        <p>JackFlash is a math practice app designed for children. We take privacy seriously, especially when it comes to young users. This policy explains how the app handles data.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Data We Collect</h3>
        <p><strong>We do not collect any personal data.</strong> JackFlash has no user accounts and no login, and nothing your child does in the app is sent anywhere. The only exception is a parent's in-app purchase (see Purchases, below).</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Local Storage</h3>
        <p>All app data — including player profiles, practice progress, mastery scores, and settings — is stored only on your device. This data never leaves your device and is not accessible to us or any third party.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Children's Privacy (COPPA)</h3>
        <p>JackFlash is designed with children's privacy as a priority. We comply with the Children's Online Privacy Protection Act (COPPA) by design:</p>
        <p style={{ marginTop: "8px" }}>We do not collect, store, or share any personal information from children. No names, email addresses, photos, or location data are ever transmitted from the app. Player names and avatars chosen within the app are stored only on your device and are never sent to any server.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Purchases</h3>
        <p>Apple handles the payment for any in-app purchase; we never see card or billing details. We use RevenueCat to verify and restore purchases. It receives an anonymous, randomly generated ID for this installation (also when the app checks for past purchases) and which product was bought — never your child's name or practice data.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Analytics, Ads, and Tracking</h3>
        <p>There are none. JackFlash contains no analytics, advertising, or tracking, uses no cookies, and does not use the device's advertising identifier. Fonts are built into the app.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Data Deletion</h3>
        <p>Deleting a player removes their data. Deleting the app removes all JackFlash data from the device. No server-side copy of your child's data exists.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Changes to This Policy</h3>
        <p>If we make changes to this privacy policy, we will update the "Last updated" date above. Continued use of the app after changes constitutes acceptance of the updated policy.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Contact</h3>
        <p>If you have questions about this privacy policy, please contact us at <strong>adamlaserlab@gmail.com</strong>.</p>
      </div>
    </PageWrapper>
  );
}

export function TermsOfService({ onBack }) {
  return (
    <PageWrapper title="Terms of Service" onBack={onBack}>
      <p style={{ fontSize: "12px", opacity: 0.5, marginBottom: "16px", fontFamily: "'Space Mono', monospace" }}>
        Last updated: October 2026
      </p>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Acceptance of Terms</h3>
        <p>By using JackFlash, you agree to these Terms of Service. If you do not agree, please do not use the app. If you are a parent or guardian, you are responsible for your child's use of the app.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Description of Service</h3>
        <p>JackFlash is a math practice app for elementary-age children, using the Concrete-Pictorial-Abstract (CPA) approach of Singapore Math. Multiply &amp; Divide is free; other modules are optional one-time in-app purchases, each with part free to try.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Use of the App</h3>
        <p>JackFlash is provided for personal, non-commercial, educational use. You may not modify, distribute, or reverse-engineer the app. The app is intended for use by children under adult supervision.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Intellectual Property</h3>
        <p>All content, design, code, and branding of JackFlash are owned by Laser Lab Studio LLC. The JackFlash name, logo, and lightning bolt icon are trademarks of Laser Lab Studio LLC.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Data and Privacy</h3>
        <p>Your child's data is stored only on your device. We do not collect or store any personal information. Please see our Privacy Policy for full details.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Disclaimer</h3>
        <p>JackFlash is provided "as is" without warranties of any kind. While we strive to provide accurate educational content, we make no guarantees about learning outcomes. JackFlash is a supplemental practice tool and is not a substitute for classroom instruction.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Limitation of Liability</h3>
        <p>Laser Lab Studio LLC shall not be liable for any damages arising from the use or inability to use JackFlash, including loss of data stored on your device.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Changes to Terms</h3>
        <p>We reserve the right to update these terms at any time. Changes will be reflected by updating the "Last updated" date. Continued use of the app constitutes acceptance of updated terms.</p>
      </div>

      <div style={sectionStyle}>
        <h3 style={headingStyle}>Contact</h3>
        <p>Questions about these terms? Contact us at <strong>adamlaserlab@gmail.com</strong>.</p>
      </div>
    </PageWrapper>
  );
}

// AccordionItem and DOTTED_RULE now live in the shared design system:
//   src/shared/ui.jsx (AccordionItem) · src/constants.js (DOTTED_RULE)

export function HelpFAQ({ onBack }) {
  return (
    <PageWrapper title="How it Works" onBack={onBack}>
      <p style={{ fontSize: "13px", marginBottom: "16px", opacity: 0.75 }}>
        Tap any question to expand.
      </p>

      <AccordionItem title="What is JackFlash?" defaultOpen>
        <p style={{ margin: 0 }}>
          A math practice app for grades 2–5, built on the Concrete-Pictorial-Abstract (CPA) approach from Singapore Math. Your child sees each idea as a picture before it becomes numbers, so facts and methods are understood first and then remembered. The goal is math your child owns, not a race to answer first.
        </p>
      </AccordionItem>

      <AccordionItem title="What is the CPA approach?">
        <p style={{ margin: "0 0 8px" }}><strong>Concrete:</strong> your child handles the math directly — dot arrays for multiplication, fraction bars, place-value discs — to see what it actually means.</p>
        <p style={{ margin: "0 0 8px" }}><strong>Pictorial:</strong> the picture stays on screen and fades as the idea becomes familiar.</p>
        <p style={{ margin: 0 }}><strong>Abstract:</strong> numbers alone — once the concept is owned, the scaffolds step back, and the picture is always one tap away.</p>
      </AccordionItem>

      <AccordionItem title="Why teach multiplication and division together?">
        <p style={{ margin: 0 }}>
          They're inverse operations sharing the same fact families. Knowing 6 × 4 = 24 means your child also knows 24 ÷ 4 = 6 and 24 ÷ 6 = 4. Teaching them together builds deeper understanding than drilling them separately.
        </p>
      </AccordionItem>

      <AccordionItem title="What is Connections (the Capstone)?">
        <p style={{ margin: "0 0 8px" }}>
          Connections is JackFlash's <strong>capstone</strong> module. Where the other modules build one skill at a time, this one <strong>connects</strong> multiplication, division, and fractions using the bar model — the unifying tool of Singapore Math.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          Your child works on problems that genuinely tie the ideas together: finding a fraction of a quantity (½ of 12), two-step word problems, and a shuffle drill that mixes all three so they have to decide <em>which</em> operation to use — a skill that single-topic drilling never builds.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          It's deliberately the last stop: it assumes the foundations are already solid and rewards your child for putting them all together.
        </p>
        <p style={{ margin: 0 }}>
          <strong>Connections is coming in a later update.</strong>
        </p>
      </AccordionItem>

      <AccordionItem title="How will my child unlock Connections?">
        <p style={{ margin: "0 0 8px" }}>
          When it launches, two things will both have to be true — and one of them can't be bought:
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>1. It's unlocked in the Parent Zone.</strong>
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>2. Your child has mastered the foundations</strong> — all of Multiplication, Division, <em>and</em> Fractions.
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>Buying it won't be enough on its own.</strong> Even after purchase, Connections will stay locked until your child has mastered all three foundation skills — they earn their way in. Until then the module card will show a checklist of what's still left to master, filling in as each one is mastered.
        </p>
        <p style={{ margin: 0 }}>
          (Mastering Fractions, in turn, requires the Fractions module to be unlocked in the Parent Zone — so the foundations have to be in place first. Mastering them now means Connections opens the moment it arrives.)
        </p>
      </AccordionItem>

      <AccordionItem title="How does JackFlash pick what to practice?">
        <SmartPracticeExplainer />
      </AccordionItem>

      <AccordionItem title="Is JackFlash about answering fast?">
        <p style={{ margin: "0 0 8px" }}>
          No. Math isn't a race, and being the fastest isn't the goal. We do want facts to become automatic, the way you read a word without sounding it out, because a fact that comes from memory gets out of the way and leaves room for thinking.
        </p>
        <p style={{ margin: 0 }}>
          JackFlash never shows a timer, never ranks your child against anyone, and never says &ldquo;too slow.&rdquo; A wrong answer brings the picture back and your child tries again. The only comparison it makes is your child against their own last week: what they couldn&rsquo;t do on Tuesday and can do on Thursday.
        </p>
      </AccordionItem>
      <AccordionItem title="Can I see what my child is working on?">
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
          Yes. All progress is stored only on your device. No accounts, no tracking, no personal information collected. See the Privacy Policy for the full details.
        </p>
      </AccordionItem>

      <AccordionItem title="Something isn't working — what should I do?">
        <p style={{ margin: "0 0 8px" }}>
          Close the app completely and open it again (on the web, refresh the page). Progress is saved as your child goes, so nothing is lost.
        </p>
        <p style={{ margin: 0 }}>
          Still stuck? Email <strong>adamlaserlab@gmail.com</strong>.
        </p>
      </AccordionItem>

      <div style={DOTTED_RULE} />
    </PageWrapper>
  );
}
