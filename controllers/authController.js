/* eslint-disable import/order */
/* eslint-disable import/no-useless-path-segments */
const crypto = require('crypto');
const { promisify } = require('util');
const User = require('./../models/userModel');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET_STRING, {
    expiresIn: process.env.JWT_EXPIRES_IN,
    // expiresIn: "120ms",
  });

const signAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expiresIn: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = async (req, res, next) => {
  try {
    // The line below has a flow where one can include a role of admin
    // const user = await User.create(req.body);
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    // Login users after creating an acc, (By signing a token and sending it to them)
    signAndSendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    //   1. Check is email & password exists
    const { email, password } = req.body;
    if (!email || !password)
      return next(new AppError('Please provide email and password', 400));

    //   2. Check if user exist & password is correct
    const foundUser = await User.findOne({ email }).select('+password');

    if (
      !foundUser ||
      !(await foundUser.correctPassword(password, foundUser.password))
    ) {
      return next(new AppError('Password or email is incorrect', 401));
    }

    // 3. Send token to client
    signAndSendToken(foundUser, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.protect = async (req, res, next) => {
  try {
    // 1. Get the token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.split(' ')[0] === 'Bearer'
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(new AppError('Please log in to get access', 401));
    // 2. Verify the token
    const decoded = await promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET_STRING
    );

    // 3. Check if the user still exists (i.e. They haven't deleted account)
    const user = await User.findById({ _id: decoded.id });
    if (!user) return next('User belonging to the token nolonger exist.', 401);

    // 4. Check if password was not changed after token was issued
    const changed = user.passwordChangedAfter(decoded.iat);
    if (changed) {
      return next(
        new AppError(
          'Password changed after the token was issued. Please log in again.',
          401
        )
      );
    }

    // 5. Grant access to next step
    req.user = user; //Info might be required in the next middleware
    next();
  } catch (err) {
    next(err);
  }
};

exports.restrictTo = function (...roles) {
  return (req, res, next) => {
    // Roles => ["admin", "lead-guide"]
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You don't have permission to perform this action.", 403)
      );
    }
    next();
  };
};

exports.forgotPassword = async (req, res, next) => {
  try {
    // 1. Find use based on the posted email
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return next(new AppError('There is no user with that email.', 404));

    // 2. Generate random token
    const resetToken = user.createPasswordRestToken();
    await user.save({ validateBeforeSave: false });

    // 3. Email the token to the users email
    try {
      const resetURL = `${req.protocal}://${req.get(
        'host'
      )}/api/v1/users/resetPassword/${resetToken}`;

      await sendEmail({
        email: req.body.email,
        subject: 'Resent password Token (Expires in 10min)',
        message: `You forgot your password? Submit a patch request with your new password and confirm password to: ${resetURL}.\nIf you did not forget your password, please ignore this email.`,
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError(
          'Unable to send a reset email at this time. Please try again letter',
          500
        )
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to your email',
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    // 1. Get the token and encrypt it
    const resetToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    // 2. Find the user by token, and check if token hasn't expired
    const user = await User.findOne({ passwordResetToken: resetToken });
    if (!user) {
      return next(new AppError('Invalid password reset token', 403));
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      return next(
        new AppError(
          'Your reset token has expired. Reset your password again if you want.',
          403
        )
      );
    }

    // 3. Update the password, and reset the passwordResetToken & passwordResetExpires
    if (!req.body.password || !req.body.passwordConfirm) {
      return next(
        new AppError(
          'Password and confirmPassword field should not be empty',
          400
        )
      );
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save(); //Used .save to makesure we re-run all the validators
    // 4. Update passwordChangedAt property
    //   DO THIS IN A MIDDLEWARE - userSchema
    // 5. Login the user by sending a login token
    signAndSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    // 1. Get the user
    const user = await User.findById(req.user._id).select('+password');

    // 2. Check if the current posted password is correct
    if (
      !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
      return next(new AppError('Your current password is wrong', 401));
    }
    // 3. update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // 4. Login the user with the updated password
    signAndSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};
