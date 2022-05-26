/* eslint-disable import/no-self-import */
/* eslint-disable import/no-useless-path-segments */
const AppError = require('../utils/appError');
const User = require('./../models/userModel');
const factory = require('./handlerFactory');

exports.getAllUsers = factory.getAll(User);
exports.createUser = factory.createOne(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.getMeMiddleware = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getMe = factory.getOne(User);

const filterFields = (obj, ...allowedFields) => {
  const filteredObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) filteredObject[el] = obj[el];
  });
  return filteredObject;
};

exports.updateMe = async (req, res, next) => {
  try {
    // 1. Return if user try to update password
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'Password should be updated on /updateMyPasswors route.',
          400
        )
      );
    }

    // 2. Filter out fields that are not allowed to be updated by a user
    const filteredObj = filterFields(req.body, 'name', 'email');
    // 3. Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      filteredObj,
      {
        runValidators: true,
        new: true,
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteMe = async (req, res, next) => {
  try {
    // 1. Get user to be deleted
    await User.findByIdAndUpdate({ _id: req.user._id }, { active: false });

    res.status(204).json({
      status: 'successD',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
