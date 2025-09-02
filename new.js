const bcrypt = require('bcrypt');
const saltRounds = 15; // Adjust the work factor as needed (higher is more secure but slower)

bcrypt.hash('access-photo', saltRounds, function(err, hash) {
    if (err) {
        // Handle error
    } else {
        // Store the hash in your database
        console.log('Hashed password:', hash);
    }
});