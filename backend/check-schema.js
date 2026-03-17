const Database = require('better-sqlite3');
const db = new Database('./database/sqlite.db');
console.log('Users table schema:');
console.log(db.prepare("PRAGMA table_info(users)").all());
db.close();
