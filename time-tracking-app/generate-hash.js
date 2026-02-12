const bcrypt = require('bcrypt');
const saltRounds = 10;

const passwords = ['admin123', 'user123'];

(async () => {
    for (const password of passwords) {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log(`Password: ${password} -> Hash: ${hash}`);
    }
})();
