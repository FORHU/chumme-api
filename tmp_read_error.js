const fs = require('fs');

try {
  const content = fs.readFileSync('error.log', 'utf8');
  const lines = content.trim().split('\n');
  console.log("Last 20 lines of error.log:");
  console.log(lines.slice(-20).join('\n'));
} catch (e) {
  console.error(e);
}
