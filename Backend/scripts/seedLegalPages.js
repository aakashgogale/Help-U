/**
 * Seed starter Terms & Conditions and Privacy Policy.
 *
 * Both pages are admin-editable (Admin > Legal Pages). This only FILLS pages that are empty or
 * missing: it never overwrites content an admin has written, unless --force is passed.
 *
 * The text is a general starting draft written around how Help U works (bookings, payments, OTP
 * checks, cancellations, the data the apps collect). It is not legal advice: have it reviewed
 * against your registered business details before relying on it.
 *
 *   node scripts/seedLegalPages.js            # fill empty pages only
 *   node scripts/seedLegalPages.js --force    # overwrite both with this draft
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const LegalPage = require('../models/LegalPage');

const FORCE = process.argv.includes('--force');

const TERMS = `
<p><em>Please read these Terms carefully before using Help U. By creating an account or booking a service you agree to them.</em></p>

<h2>1. About Help U</h2>
<p>Help U ("we", "us") is a platform that connects customers with independent service professionals ("Professionals") for home and local services such as cleaning, repairs, appliance servicing, salon and other services. Help U provides the technology that lets you book, pay and track a service. The service itself is carried out by the Professional.</p>

<h2>2. Eligibility and your account</h2>
<ul>
  <li>You must be at least 18 years old and able to enter into a binding contract under Indian law.</li>
  <li>You must give accurate details (name, phone number, address) and keep them up to date.</li>
  <li>You are responsible for activity on your account. Keep your login details and the one-time codes (OTPs) we send you private.</li>
</ul>

<h2>3. Booking a service</h2>
<ul>
  <li>You can book a service for as soon as possible ("instant") or for a future time slot ("scheduled").</li>
  <li>A booking is confirmed when a Professional accepts it. Until then we search for a Professional near you; if none accepts in time, the booking is cancelled and you are not charged.</li>
  <li>Please be present, or have an adult present, at the address and time of the booking and give accurate access details and a landmark.</li>
  <li>Prices shown are for the service selected. The final amount can change if extra work, parts or materials are needed; the Professional will prepare a bill and you can review it before paying.</li>
</ul>

<h2>4. Pricing, fees and taxes</h2>
<ul>
  <li>The total shown at checkout includes the service price, a visiting charge where applicable, and applicable taxes such as GST.</li>
  <li>Additional services, spare parts and transport are billed separately in the bill the Professional prepares after inspecting the work. You are not obliged to approve work you do not agree to, but the visiting charge may still apply.</li>
  <li>Coupons and offers are subject to their own conditions and may be withdrawn at any time.</li>
</ul>

<h2>5. Payments</h2>
<ul>
  <li>You can pay online (through our payment partner) or pay the Professional in cash after the service, where cash is offered.</li>
  <li>Online payments are processed by third-party payment providers. We do not store your card or bank details.</li>
  <li>Do not pay the Professional outside the app for a booking made through Help U, except the cash payment the app asks you to collect and confirm.</li>
  <li>When the Professional finishes the work, you confirm payment using a one-time code. Share the code only after you are satisfied with the work and have paid.</li>
</ul>

<h2>6. Cancellations and rescheduling</h2>
<ul>
  <li>You can cancel a booking from the app. Cancelling before a Professional is assigned, or well before the scheduled time, is free.</li>
  <li>A cancellation fee may apply if you cancel after a Professional has been assigned or has arrived, because the Professional has already spent time and travel on your booking. Any fee is shown in the app and may be added to your next booking.</li>
  <li>If a Professional cancels or cannot attend, we will try to assign another one and you will not be charged for the cancelled visit.</li>
</ul>

<h2>7. Your responsibilities</h2>
<ul>
  <li>Treat Professionals with respect and provide a safe working environment.</li>
  <li>Do not ask a Professional to do anything unlawful or unsafe, and do not attempt to avoid our platform fees by dealing with a Professional directly.</li>
  <li>Do not misuse the app, post false reviews, or interfere with its operation.</li>
</ul>

<h2>8. Professionals</h2>
<p>Professionals are independent service providers, not our employees. We check documents and approve Professionals before they take bookings, but we do not control how a Professional performs the work. Professionals must follow our standards, including verifying their arrival with a code, and may be suspended or removed for poor conduct or repeated cancellations.</p>

<h2>9. Quality, complaints and disputes</h2>
<ul>
  <li>If you are not happy with a service, raise a complaint from the booking in the app within the period shown there, with photos or details if relevant.</li>
  <li>We will review the complaint with you and the Professional and may arrange a repeat visit, a partial or full refund, or another fair outcome at our discretion.</li>
  <li>Photos, videos and messages exchanged through the app may be used to resolve disputes.</li>
</ul>

<h2>10. Ratings and reviews</h2>
<p>You may rate a completed service and write a review. Reviews must be honest and must not contain abusive, unlawful or private information. We may remove reviews that break these rules.</p>

<h2>11. Plans, wallet and referrals</h2>
<p>If you buy a plan, use wallet credit or receive referral rewards, the conditions shown with that offer apply. Credits and rewards have no cash value unless the offer says so, and may expire or be withdrawn if misused.</p>

<h2>12. Limitation of liability</h2>
<p>To the extent permitted by law, Help U is not liable for indirect or consequential loss, or for loss arising from a Professional's actions beyond our reasonable control. Nothing in these Terms limits any right you have under applicable consumer protection law.</p>

<h2>13. Suspension and termination</h2>
<p>We may suspend or close an account that breaks these Terms, is used fraudulently, or puts others at risk. You may stop using the app and ask us to delete your account at any time, subject to any amounts you owe.</p>

<h2>14. Changes to these Terms</h2>
<p>We may update these Terms from time to time. The latest version is always available in the app, and continued use after an update means you accept it.</p>

<h2>15. Governing law and contact</h2>
<p>These Terms are governed by the laws of India. Disputes are subject to the courts of the city where Help U is registered, without affecting your rights under consumer protection law. For questions or complaints, contact us through <strong>Help &amp; Support</strong> in the app.</p>
`.trim();

const PRIVACY = `
<p><em>This policy explains what personal information Help U collects, why, and the choices you have. It applies to the customer and Professional apps.</em></p>

<h2>1. Information we collect</h2>
<ul>
  <li><strong>Account details:</strong> name, phone number, email address and a profile photo if you add one.</li>
  <li><strong>Addresses and location:</strong> the addresses you save, and your device location when you allow it, to find nearby Professionals and show the route. Professionals' live location is shared with the customer while a booking is in progress.</li>
  <li><strong>Booking information:</strong> the services you book, times, prices, bills, ratings, reviews and your notes.</li>
  <li><strong>Photos, videos and messages:</strong> media you attach to describe a problem, work photos taken by Professionals, and messages exchanged between customer and Professional through the app.</li>
  <li><strong>Payment information:</strong> the status and amount of payments. Card and bank details are handled by our payment partner and are not stored by us.</li>
  <li><strong>Professional verification details:</strong> for Professionals, identity and address documents, bank details for payouts, and skills and service areas.</li>
  <li><strong>Device and usage data:</strong> device type, app version, notification token, IP address and basic usage logs, used to keep the app working and secure.</li>
</ul>

<h2>2. How we use your information</h2>
<ul>
  <li>To create your account, match you with a Professional, complete bookings and process payments and payouts.</li>
  <li>To send booking updates, one-time codes, receipts and, if you allow, push notifications.</li>
  <li>To verify Professionals, prevent fraud and keep customers and Professionals safe.</li>
  <li>To handle support requests, complaints and disputes.</li>
  <li>To improve and secure our services, and to meet legal and tax obligations such as GST invoicing.</li>
</ul>

<h2>3. Who we share it with</h2>
<ul>
  <li><strong>The Professional or customer on your booking:</strong> the details needed to do the job, such as name, address, phone contact (which may be masked) and the service requested.</li>
  <li><strong>Service providers who help us run the app:</strong> for example payment processing, maps and location, cloud hosting and storage, SMS and push notifications. They may only use your data to provide their service to us.</li>
  <li><strong>Authorities:</strong> where required by law or to protect rights, safety and prevent fraud.</li>
</ul>
<p>We do not sell your personal information.</p>

<h2>4. Location</h2>
<p>We use your location only when you allow it in your device settings. You can turn it off at any time, but some features, such as finding nearby Professionals, may then not work.</p>

<h2>5. How long we keep it</h2>
<p>We keep your information while your account is active and as needed afterwards to resolve disputes, prevent fraud and meet legal, accounting and tax requirements. After that it is deleted or anonymised.</p>

<h2>6. Security</h2>
<p>We use reasonable technical and organisational measures to protect your information, including encrypted connections and access controls. No system is perfectly secure, so please also protect your device and one-time codes.</p>

<h2>7. Your choices and rights</h2>
<ul>
  <li>You can view and update your profile and saved addresses in the app.</li>
  <li>You can control notifications and location access in the app and in your device settings.</li>
  <li>You can ask us to access, correct or delete your personal information, and to withdraw consent, subject to legal requirements. Some information must be kept for legal or safety reasons.</li>
  <li>You can raise a privacy concern or complaint with us, and if it is not resolved you may approach the relevant data protection authority.</li>
</ul>

<h2>8. Children</h2>
<p>Our services are for adults. We do not knowingly collect personal information from anyone under 18.</p>

<h2>9. Changes to this policy</h2>
<p>We may update this policy from time to time. The latest version is always available in the app, and we will tell you about significant changes.</p>

<h2>10. Contact us</h2>
<p>For questions, requests or complaints about your privacy, contact us through <strong>Help &amp; Support</strong> in the app.</p>
`.trim();

const PAGES = [
  { slug: 'terms-and-conditions', title: 'Terms & Conditions', content: TERMS },
  { slug: 'privacy-policy', title: 'Privacy Policy', content: PRIVACY }
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const page of PAGES) {
    const existing = await LegalPage.findOne({ slug: page.slug });
    const hasContent = existing && String(existing.content || '').trim().length > 0;

    if (hasContent && !FORCE) {
      console.log(`${page.slug}: already has content (admin-written?), left untouched`);
      continue;
    }

    if (existing) {
      existing.title = existing.title || page.title;
      existing.content = page.content;
      existing.isActive = true;
      await existing.save();
    } else {
      await LegalPage.create({ ...page, isActive: true });
    }
    console.log(`${page.slug}: ${hasContent ? 'overwritten (--force)' : 'filled'} (${page.content.length} chars)`);
  }
};

run()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('FAILED:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
