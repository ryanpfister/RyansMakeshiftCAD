const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'caduser',
  password: 'R54WYazowIob6FNhICSzH2',
  database: 'cad'
});

// Event handler for connection errors
connection.on('error', (error) => {
  console.error('Error connecting to MySQL server:', error);
});

// Connect to MySQL server
connection.connect((error) => {
  if (error) {
    console.error('Error connecting to MySQL server:', error);
    return;
  }
  console.log('Connected to MySQL server!');
});


module.exports = connection;
