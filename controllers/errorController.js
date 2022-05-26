/* eslint-disable import/no-useless-path-segments */
/* eslint-disable node/no-unsupported-features/es-syntax */
const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => new AppError(err.message, 400);

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleExpiredToken = () =>
  new AppError('Token expired. Please log in again', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    satus: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error. send to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      satus: err.status,
      message: err.message,
    });
    // Programming or other unkown errors. Don't leak details to the client
  } else {
    //   1. Log the error, for us developers
    console.error('ERROR 🔥', err);
    // 2. Send somehow generic error to client
    res.status(500).json({
      satus: 'error',
      message: 'Something went wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.log(process.env.NODE_ENV.trim() === 'production');

  if (process.env.NODE_ENV === 'development') {
    console.log('SERE TESTING - DEV...');
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV.trim() === 'production') {
    console.log('SERE TESTING - PROD...');

    // Deep copy
    //let error = JSON.parse(JSON.stringify(err));

    if (err.name === 'CastError') {
      err = handleCastErrorDB(err);
    }

    if (err.code === 11000) {
      err = handleDuplicateFieldsDB(err);
    }

    if (err.name === 'ValidationError') {
      err = handleValidationErrorDB(err);
    }
    if (err.name === 'JsonWebTokenError') {
      err = handleJWTError();
    }
    if (err.name === 'TokenExpiredError') {
      err = handleExpiredToken();
    }

    sendErrorProd(err, res);
  }

  next();
};
