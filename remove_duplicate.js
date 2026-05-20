const fs = require('fs');
const filePath = 'app/src/screens/distributor/ProspectsScreen.js';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// Find the two ProfileView const declarations
const profileViewLines = [];
lines.forEach((l, i) => {
  if (l.includes("const ProfileView = ({ prospect, onBack, onUpdate, autoOpen, C }) =>")) {
    profileViewLines.push(i);
  }
});

console.log("ProfileView found at lines:", profileViewLines.map(x => x + 1));

if (profileViewLines.length < 2) {
  console.log("Only one ProfileView found, no duplicates to remove.");
  process.exit(0);
}

// The first one (old) starts at profileViewLines[0].
// We need to find where it ENDS - look for the closing "};" after it, 
// before the second ProfileView starts.
const firstStart = profileViewLines[0];
const secondStart = profileViewLines[1];

// Find the last "};" before secondStart, which closes the first ProfileView
let firstEnd = -1;
for (let i = secondStart - 1; i >= firstStart; i--) {
  if (lines[i].trim() === '};') {
    firstEnd = i;
    break;
  }
}

console.log(`Removing lines ${firstStart + 1} to ${firstEnd + 1} (the old duplicate ProfileView)`);

// Also remove the comment line before it (the "── Profile View ──" comment)
let removeFrom = firstStart;
if (firstStart > 0 && lines[firstStart - 1].includes('Profile View')) {
  removeFrom = firstStart - 1;
}
if (removeFrom > 0 && lines[removeFrom - 1].trim() === '') {
  removeFrom = removeFrom - 1;
}

// Remove the old duplicate (firstStart..firstEnd)
const newLines = [...lines.slice(0, removeFrom), ...lines.slice(firstEnd + 1)];
fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('✅ Duplicate ProfileView removed successfully!');

// Verify
const updated = fs.readFileSync(filePath, 'utf-8').split('\n');
const remaining = updated.filter(l => l.includes("const ProfileView = ({ prospect"));
console.log('Remaining ProfileView declarations:', remaining.length);
