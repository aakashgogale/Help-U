const assert = require('assert');
const PartnerRegistrationField = require('../models/PartnerRegistrationField');
const Worker = require('../models/Worker');

async function testPartnerRegistrationFields() {
  console.log('Testing Partner Registration Fields schema and defaults...');

  // 1. Test model instantiation for text field
  const textField = new PartnerRegistrationField({
    fieldKey: 'experience_years',
    label: 'Years of Experience',
    type: 'number',
    section: 'profile',
    placeholder: 'e.g. 5',
    isRequired: true,
    order: 1
  });
  const textErr = textField.validateSync();
  assert.strictEqual(textErr, undefined, 'TextField should validate without errors');
  assert.strictEqual(textField.section, 'profile');
  assert.strictEqual(textField.isRequired, true);
  assert.strictEqual(textField.isActive, true);

  // 2. Test model instantiation for document upload field
  const docField = new PartnerRegistrationField({
    fieldKey: 'driving_license',
    label: 'Driving License',
    type: 'document',
    section: 'documents',
    helpText: 'Upload front and back photo',
    isRequired: false,
    order: 2
  });
  const docErr = docField.validateSync();
  assert.strictEqual(docErr, undefined, 'DocField should validate without errors');
  assert.strictEqual(docField.section, 'documents');
  assert.strictEqual(docField.type, 'document');

  // 3. Test Worker model customFields and customDocuments
  const worker = new Worker({
    name: 'Ramesh Kumar',
    email: 'ramesh.test@example.com',
    phone: '9876543210',
    aadhar: {
      number: '123456789012',
      document: 'https://cloudinary.com/aadhar-front.jpg',
      backDocument: 'https://cloudinary.com/aadhar-back.jpg'
    },
    pan: {
      number: 'ABCDE1234F',
      document: 'https://cloudinary.com/pan.jpg'
    },
    service: ['Electrician'],
    customFields: {
      experience_years: 5,
      gstin: '22AAAAA0000A1Z5',
      emergency_contact: 'Suresh Kumar - 9876543211'
    },
    customDocuments: [
      {
        fieldKey: 'driving_license',
        label: 'Driving License',
        url: 'https://cloudinary.com/dl.jpg',
        fileName: 'dl.jpg',
        fileType: 'image/jpeg'
      }
    ]
  });

  const workerErr = worker.validateSync();
  assert.strictEqual(workerErr, undefined, 'Worker with customFields and customDocuments should validate');
  assert.strictEqual(worker.customFields.experience_years, 5);
  assert.strictEqual(worker.customDocuments[0].fieldKey, 'driving_license');
  assert.strictEqual(worker.customDocuments[0].url, 'https://cloudinary.com/dl.jpg');

  console.log('✅ All Partner Registration Fields schema tests passed successfully!');
}

testPartnerRegistrationFields()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
