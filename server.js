const mongoose = require('mongoose');

const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(err.name);
  console.log(err.message);
  console.log('UNCAUGHT EXCEPTION. Shutting down...');

  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

mongoose
  .connect(process.env.DATABASE)
  .then(() => {
    //   console.log(con);
    console.log('DB successfully connected...');
  })
  .catch((err) => {
    console.log('ERROR connecting DB');
    console.log(err);
  });

const port = process.env.PORT;

const server = app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${port}`);
});

// Handling global unhandled promises (async)
process.on('unhandledRejection', (err) => {
  console.log(err.name);
  console.log(err.message);
  console.log('UNHUNDLED REJECTION. Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
