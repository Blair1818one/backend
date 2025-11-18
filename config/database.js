const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'GCDL',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool
    .getConnection()
    .then((connection) => {
        console.log('Connected Successfully to the GCDL database');
        connection.release();
    })
    .catch((err) => {
        console.error('GCDL database connection error: ' + err);
    });

module.exports = pool;