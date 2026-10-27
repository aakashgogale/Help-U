/**
 * Seed the Professional FAQ (the "worker-faq" page shown in the professional app).
 *
 * The customer and professional apps have separate FAQs. Both are admin-editable
 * (Admin > Legal & Help Pages > FAQ > Professional app). This only FILLS a page that is empty or
 * missing: it never overwrites questions an admin has written, unless --force is passed.
 *
 * No answer quotes a number an admin can change (free-cancellation time, penalty, minimum
 * withdrawal, cash limit...). They point to where the app shows the live value instead.
 *
 *   node scripts/seedWorkerFaq.js            # fill only if empty
 *   node scripts/seedWorkerFaq.js --force    # replace the questions with this draft
 */
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const LegalPage = require('../models/LegalPage');

const FORCE = process.argv.includes('--force');

const FAQS = [
  // Getting requests
  {
    question: 'How do I start getting booking requests?',
    answer: 'Your account must be approved, and you need to be online with your location set and your services selected. Requests near you appear as an alert; accept it to take the job.'
  },
  {
    question: 'Why did I not get a booking request?',
    answer: 'Requests go to approved, online professionals near the customer who offer that service. Instant requests are not sent while you are in the middle of another job, and scheduled requests skip slots that overlap a job you already have.'
  },
  {
    question: 'How do I go online or offline?',
    answer: 'Use the online switch at the top of your Dashboard. Instant requests only reach you while you are online. Requests for a future time can still reach you when you are offline, and wait in your pending list until you answer them.'
  },
  {
    question: 'How long do I have to accept a request?',
    answer: 'An instant request shows a countdown on the alert, and the search ends if nobody accepts in time. A request for a future time stays open until shortly before its slot. The first professional to accept gets the job, so answer quickly.'
  },
  {
    question: 'Why did a job disappear from my list?',
    answer: 'The customer cancelled it, another professional accepted it first, or the time to accept it ran out. Open the Jobs tab to see the jobs that are still yours.'
  },

  // Doing the job
  {
    question: 'How do I complete a job?',
    answer: "Verify your arrival with the customer's code, do the work, upload your work photos, prepare the bill, and then collect payment. For cash, ask the customer for their 4-digit code to confirm payment."
  },
  {
    question: 'Which codes do I ask the customer for?',
    answer: 'Two. When you arrive, ask for the arrival code to start the visit. For a cash payment, ask for the 4-digit payment code after they have paid you. Never share these codes yourself, and do not take payment outside the app.'
  },
  {
    question: 'How do I prepare the bill?',
    answer: 'Open the job and tap Generate Bill. Go through Advance, Services, Parts, Extras and Transport, then Review. The customer sees the bill only after you tap Send bill to customer on the Review step.'
  },
  {
    question: 'Can I ask the customer for an advance?',
    answer: 'Yes. In the Advance step of the bill you can request an advance with a reason, for example to buy parts. The customer pays it in their app, and it is deducted from the final amount they owe.'
  },
  {
    question: 'Why do I need to upload work photos?',
    answer: 'Photos of the finished work are needed before you can complete the job. They also help us resolve a complaint fairly if the customer raises one.'
  },

  // Payments and earnings
  {
    question: 'How does the customer pay me?',
    answer: 'On the Review step choose Collect Cash, where the customer gives you their 4-digit code after paying, or Online (QR), where they pay through their app. The job completes as soon as the payment is confirmed, and your screen updates by itself.'
  },
  {
    question: 'How do I get paid?',
    answer: 'When you complete a job, your earnings are added to your wallet. Online payments are credited to your earnings, and for cash jobs the platform share is added to your dues. You can withdraw your earnings from the Wallet once you reach the minimum amount shown in the app.'
  },
  {
    question: 'How do I withdraw my earnings?',
    answer: 'Open Wallet and choose withdraw, then enter the amount. The tax deducted and the amount you will receive are shown before you confirm. A minimum withdrawal amount applies, and it is shown in the app.'
  },
  {
    question: 'What is the cash limit?',
    answer: 'When you collect cash, the platform share is added to your dues. If your dues go above the cash limit you may not receive new cash bookings until you settle them from the Wallet.'
  },
  {
    question: 'How do I clear my dues?',
    answer: 'Open Wallet and pay your dues online. They reduce once the payment is verified, and you can receive cash bookings again when you are back under the cash limit.'
  },

  // Cancellations and problems
  {
    question: 'What happens if I cancel a booking?',
    answer: 'Please accept only jobs you can attend. If you cancel, the booking is offered to another professional, and repeated or late cancellations can lower your ranking, add penalties or lead to suspension.'
  },
  {
    question: 'Is there a penalty for cancelling?',
    answer: 'Cancelling an accepted job is free if you do it early enough, or right after accepting. Closer to the time of the job a penalty can apply. The exact times and amount are on the Cancellation Policy page, and the cancel screen shows the penalty before you confirm.'
  },
  {
    question: 'A customer complained about my job. What happens?',
    answer: 'Open Disputes from your Profile to see the complaint and its status. We review it with both sides and the photos on the job. If it is upheld, the outcome can include a refund to the customer and a penalty taken from your earnings.'
  },

  // Account
  {
    question: 'How are my ratings used?',
    answer: 'Customers can rate you after a job. Your rating, how often you accept and complete jobs, and how close you are to the customer affect how early you are offered new requests.'
  },
  {
    question: 'How do I change my bank details or address?',
    answer: 'Open your Profile and choose Bank Details & QR for payout details, or Manage Address for your address.'
  },
  {
    question: 'How does Refer & Earn work?',
    answer: 'Open Refer & Earn from your Profile and share your invite with other service partners. The reward is added to your wallet once the conditions shown on that page are met.'
  }
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await LegalPage.findOne({ slug: 'worker-faq' });
  if (existing && (existing.faqs || []).length > 0 && !FORCE) {
    console.log(`worker-faq already has ${existing.faqs.length} questions. Left unchanged (use --force to replace).`);
    return;
  }

  await LegalPage.findOneAndUpdate(
    { slug: 'worker-faq' },
    {
      $set: {
        title: existing?.title || 'Frequently Asked Questions',
        faqs: FAQS.map((f, i) => ({ ...f, order: i })),
        isActive: true
      }
    },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(`worker-faq ${existing ? 'updated' : 'created'} with ${FAQS.length} questions and published.`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
