const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Generating Prisma client...');
  execSync('npx prisma generate --schema prisma/schema.prisma', { 
    cwd: path.join(__dirname), 
    stdio: 'inherit' 
  });
  console.log('Prisma client generated successfully!');
} catch (error) {
  console.error('Error generating Prisma client:', error.message);
  process.exit(1);
}
