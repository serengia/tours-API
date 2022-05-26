/* eslint-disable import/no-useless-path-segments */
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = (Model) => async (req, res, next) => {
  try {
    await Model.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateOne = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.createOne = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getOne = (Model, obj) => async (req, res, next) => {
  try {
    let doc;
    if (obj) {
      doc = await Model.findById(req.params.id).populate(obj);
    } else {
      doc = await Model.findById(req.params.id);
    }

    if (!doc) {
      return next(new AppError('There is no doc with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { data: doc },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAll = (Model) => async (req, res, next) => {
  try {
    //   Hack that will only work on getting reviews
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(req.query, Model.find(filter))
      .filter()
      .sort()
      .limitByFields()
      .pagination();

    // const doc = await features.query.explain();
    const doc = await features.query;
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  } catch (err) {
    next(err);
  }
};
