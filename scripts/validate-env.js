const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../src/environments/environment.prod.ts');
const content = fs.readFileSync(envPath, 'utf-8');

if (content.includes('REPLACE_ME')) {
  console.error('❌ environment.prod.ts contiene placeholders REPLACE_ME');
  console.error('   Reemplazá con las credenciales reales de Supabase antes de deployar.');
  process.exit(1);
}

console.log('✅ environment.prod.ts válido');
