/**
 * Master Catalog Test Runner
 * Runs all Phase 5 test suites sequentially and reports summary
 * Run: node Backend/tests/runAllCatalogTests.js (or npm test / npm run test:catalog)
 */

const { fork } = require('child_process');
const path = require('path');

const testFiles = [
  'validators.test.js',
  'nestingRules.test.js',
  'dependencyCheck.test.js',
  'migrationIdempotency.test.js',
  'publicCatalog.test.js'
];

async function runTest(file) {
  return new Promise((resolve) => {
    const fullPath = path.join(__dirname, file);
    const child = fork(fullPath, [], { stdio: 'inherit' });

    child.on('close', (code) => {
      resolve({ file, success: code === 0 });
    });
  });
}

(async () => {
  console.log('====================================================');
  console.log('  Help-U Catalog & Hardening Test Suite (Phase 5)   ');
  console.log('====================================================\n');

  const results = [];
  for (const file of testFiles) {
    const res = await runTest(file);
    results.push(res);
  }

  console.log('\n====================================================');
  console.log('                 SUMMARY REPORT                     ');
  console.log('====================================================');

  let allPassed = true;
  for (const r of results) {
    const status = r.success ? 'PASSED ✅' : 'FAILED ❌';
    console.log(`  ${r.file.padEnd(32)}: ${status}`);
    if (!r.success) allPassed = false;
  }

  console.log('====================================================');
  if (allPassed) {
    console.log('🎉 ALL CATALOG TEST SUITES PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TEST SUITES FAILED.\n');
    process.exit(1);
  }
})();
