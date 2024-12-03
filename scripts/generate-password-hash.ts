// scripts/generate-password-hash.ts
import * as bcrypt from 'bcrypt';

async function generateHash() {
  // get arguments passed to the script
  // process.argv[0] is the path to the Node.js executable
  // process.argv[1] is the path to the script being executed
  // process.argv[2] is the first argument passed by the user
  const password = process.argv[2];

  if (!password) {
    console.error('Usage: npm run generate-hash <votre_mot_de_passe>');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    console.log('Hash du mot de passe:', hash);
  } catch (error) {
    console.error('Erreur lors de la génération du hash:', error);
    process.exit(1);
  }
}

generateHash();
