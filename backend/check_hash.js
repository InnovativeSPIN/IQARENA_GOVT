import crypto from 'crypto';

const hash = crypto.createHash('sha256').update('102030').digest('hex');
console.log('SHA-256 hash of 102030:', hash);
