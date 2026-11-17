/**
 * test-styling-stepui1.cjs
 * Test suite for DentQ — STEP UI 1: FIX BROKEN STYLING
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
  }
}

console.log('=========================================================');
console.log('TEST SUITE: STEP UI 1 FIX BROKEN STYLING');
console.log('=========================================================\n');

// 1. Check src/app/layout.tsx
const layoutContent = fs.readFileSync(path.join(__dirname, 'src/app/layout.tsx'), 'utf8');
assert(layoutContent.includes('import "./globals.css"'), 'layout.tsx imports globals.css');
assert(layoutContent.includes('fonts.googleapis.com'), 'layout.tsx configures Google Fonts preconnect/link');
assert(layoutContent.includes('Noto+Sans+Thai') || layoutContent.includes('Noto Sans Thai'), 'layout.tsx includes Noto Sans Thai font');
assert(layoutContent.includes('font-sans') && layoutContent.includes('bg-slate-50'), 'layout.tsx applies font-sans and base layout classes to body');

// 2. Check src/app/globals.css
const globalsCss = fs.readFileSync(path.join(__dirname, 'src/app/globals.css'), 'utf8');
assert(globalsCss.includes('@tailwind base;') && globalsCss.includes('@tailwind components;') && globalsCss.includes('@tailwind utilities;'), 'globals.css includes Tailwind base, components, and utilities directives');
assert(globalsCss.includes('Noto Sans Thai'), 'globals.css defines Noto Sans Thai in body font-family');
assert(globalsCss.includes('--background') && globalsCss.includes('--foreground'), 'globals.css defines root CSS custom properties');

// 3. Check tailwind.config.ts
const tailwindConfig = fs.readFileSync(path.join(__dirname, 'tailwind.config.ts'), 'utf8');
assert(tailwindConfig.includes('./src/app/**/*.{js,ts,jsx,tsx,mdx}'), 'tailwind.config.ts content covers src/app');
assert(tailwindConfig.includes('./src/components/**/*.{js,ts,jsx,tsx,mdx}'), 'tailwind.config.ts content covers src/components');
assert(tailwindConfig.includes('Noto Sans Thai'), 'tailwind.config.ts fontFamily.sans includes Noto Sans Thai');
assert(tailwindConfig.includes('dental:') && tailwindConfig.includes('primary:'), 'tailwind.config.ts preserves dental theme color extensions');

// 4. Check postcss.config.js
const postcssConfig = fs.readFileSync(path.join(__dirname, 'postcss.config.js'), 'utf8');
assert(postcssConfig.includes('tailwindcss') && postcssConfig.includes('autoprefixer'), 'postcss.config.js configures tailwindcss and autoprefixer');

// 5. Check Next.js build CSS generation
const cssDir = path.join(__dirname, '.next/static/css');
const cssFiles = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).filter(f => f.endsWith('.css')) : [];
assert(cssFiles.length > 0, `Compiled CSS file exists in .next/static/css/ (found ${cssFiles.length} files)`);

if (cssFiles.length > 0) {
  const cssBundle = fs.readFileSync(path.join(cssDir, cssFiles[0]), 'utf8');
  assert(cssBundle.includes('Noto Sans Thai'), 'Generated CSS bundle includes Noto Sans Thai font');
  assert(cssBundle.includes('bg-slate-50'), 'Generated CSS bundle contains Tailwind utility bg-slate-50');
  assert(cssBundle.includes('text-teal-700') || cssBundle.includes('bg-teal-600'), 'Generated CSS bundle contains dental teal utility classes');
  assert(cssBundle.includes('rounded-3xl') || cssBundle.includes('rounded-2xl'), 'Generated CSS bundle contains card border radius classes');
}

// 6. Check Key Frontend Pages retain styles
const bookPage = fs.readFileSync(path.join(__dirname, 'src/app/book/page.tsx'), 'utf8');
assert(bookPage.includes('max-w-xl') && bookPage.includes('bg-white') && bookPage.includes('rounded-3xl'), 'Book page retains Tailwind modal/card styling');
assert(bookPage.includes('grid-cols-4') && bookPage.includes('border-teal-300'), 'Book page retains 4-step wizard styling');

const homePage = fs.readFileSync(path.join(__dirname, 'src/app/page.tsx'), 'utf8');
assert(homePage.includes('bg-slate-50') && homePage.includes('from-teal-50/40') && homePage.includes('bg-teal-600'), 'Home page retains hero and button styling');

const trackingPage = fs.readFileSync(path.join(__dirname, 'src/app/tracking/page.tsx'), 'utf8');
assert(trackingPage.includes('max-w-xl') && trackingPage.includes('rounded-3xl') && trackingPage.includes('bg-white'), 'Tracking page retains container styling');

const adminPage = fs.readFileSync(path.join(__dirname, 'src/app/admin/page.tsx'), 'utf8');
assert(adminPage.includes('LayoutDashboard') && adminPage.includes('grid') && adminPage.includes('bg-white'), 'Admin page retains dashboard grid styling');

console.log('\n=========================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log('=========================================================');

if (totalTests === passedTests) {
  console.log('\n>>> ALL STEP UI 1 STYLING TESTS PASSED! <<<');
  process.exit(0);
} else {
  console.error('\n>>> SOME TESTS FAILED! <<<');
  process.exit(1);
}
