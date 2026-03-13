import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
    'controllers/paymentController.js',
    'controllers/silverAdjustmentController.js',
    'controllers/silverPaymentController.js',
    'controllers/billController.js'
].map(f => path.join(__dirname, f));

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf-8');
    
    // Patterns to remove transaction-related code
    content = content.replace(/const session = await mongoose\.startSession\(\);\s*session\.startTransaction\(\);/g, '');
    content = content.replace(/let session;\s*try\s*\{\s*session = await mongoose\.startSession\(\);\s*session\.startTransaction\(\);/g, 'try {');
    
    // Also cover the case where let session is defined, then later session = ...
    content = content.replace(/let session;/g, '');
    content = content.replace(/session = await mongoose\.startSession\(\);\s*session\.startTransaction\(\);/g, '');
    
    content = content.replace(/if\s*\(\w*\s*session\)\s*await\s*session\.abortTransaction\(\);/g, '');
    content = content.replace(/await\s*session\.abortTransaction\(\);/g, '');
    content = content.replace(/await\s*session\.commitTransaction\(\);/g, '');
    content = content.replace(/if\s*\(\w*\s*session\)\s*session\.endSession\(\);/g, '');
    content = content.replace(/session\.endSession\(\);/g, '');
    
    content = content.replace(/\.session\(session\)/g, '');
    content = content.replace(/\{ session \}/g, '{}');
    content = content.replace(/\(\{\}\)/g, '()'); // Change save({}) to save()

    // Specific to some files:
    content = content.replace(/try {\s*if \(session\) await session\.abortTransaction\(\);\s*} catch [^}]*}/g, '');
    
    fs.writeFileSync(f, content, 'utf-8');
    console.log(`Cleaned ${f}`);
});
console.log('Cleanup completed');
