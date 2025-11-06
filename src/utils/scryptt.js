const crypto = require('crypto');

// Default configuration
const config = {
  keyLength: 64,
  memoryCost: 16384, // N parameter
  parallelization: 1,
  blockSize: 8
};

function hashToken(token = '') {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    
    crypto.scrypt(
      token,
      salt,
      config.keyLength,
      {
        N: config.memoryCost,
        p: config.parallelization,
        r: config.blockSize
      },
      (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt.toString('hex')}‽${derivedKey.toString('hex')}`);
      }
    );
  });
};

function verifyToken(token = '', hashString = '') {
  return new Promise((resolve, reject) => {
    const [saltHex, hashHex] = hashString.split('‽');
    const salt = Buffer.from(saltHex, 'hex');
    
    crypto.scrypt(
      token,
      salt,
      config.keyLength,
      {
        N: config.memoryCost,
        p: config.parallelization,
        r: config.blockSize
      },
      (err, derivedKey) => {
        if (err) reject(err);
        resolve(derivedKey.toString('hex') === hashHex);
      }
    );
  });
};

module.exports = {
  hashToken,
  verifyToken
};