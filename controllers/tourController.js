/* eslint-disable import/no-useless-path-segments */
/* eslint-disable node/no-unsupported-features/es-syntax */
const Tour = require('./../models/tourModel');
// const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MI = 3958.756;
const METERS_TO_MILES = 0.000621371;
const METERS_TO_KM = 0.001;

// Middleware to modify the query params
exports.aliasTop5 = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,ratingsAverage,difficulty,price,summary';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, {
  path: 'reviews',
});
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// Agrigation pipeline
exports.getTourStats = async (req, res, next) => {
  try {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      {
        $group: {
          _id: '$difficulty',
          // _id: null,
          numTours: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalRatings: { $sum: '$ratingsQuantity' },
          averageRatings: { $avg: '$ratingsAverage' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        $sort: { averagePrice: 1 },
      },
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMonthlyPlan = async (req, res, next) => {
  try {
    const year = +req.params.year;
    const plan = await Tour.aggregate([
      {
        $unwind: '$startDates',
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-1-1`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: {
            $month: '$startDates',
          },
          numTours: { $sum: 1 },
          tours: { $push: '$name' },
        },
      },
      {
        $addFields: { month: '$_id' },
      },
      {
        $project: { _id: 0 },
      },
      {
        $sort: { month: 1 },
      },
      // {
      //   $limit: 12,
      // },
    ]);

    res.status(201).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (err) {
    next(err);
  }
};

// DEALING WITH GEOSPATIAL DATA
exports.getToursWithin = async (req, res, next) => {
  try {
    //"/tours-within/:distance/center/:latlg&unit/:unit"
    //"/tours-within/20km/center/-40,45/unit=km"
    const { latlng, unit } = req.params;
    const distance = +req.params.distance;

    const [lat, lng] = latlng.split(',');

    if (!lat || !lng) {
      return next(
        AppError(
          'Please provide latitude and longitude in the format of lat,lng',
          400
        )
      );
    }

    // Mongo expects radius to be in rediance, hence the conversion
    // Radius of the Earth in Km => 6371
    // Radius of the Earth in mi => 3958.756
    const radius =
      unit === 'mi' ? distance / EARTH_RADIUS_MI : distance / EARTH_RADIUS_KM;

    // console.log(distance, lat, lng, unit);
    // console.log(radius);

    const tours = await Tour.find({
      startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    });

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: { data: tours },
    });
  } catch (err) {
    next(err);
  }
};

exports.getToursDistances = async (req, res, next) => {
  try {
    const { latlng, unit } = req.params;

    const [lat, lng] = latlng.split(',');

    if (!lat || !lng) {
      return next(
        AppError(
          'Please provide latitude and longitude in the format of lat,lng',
          400
        )
      );
    }

    const distances = await Tour.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng * 1, lat * 1],
          },
          distanceField: 'distance',
          distanceMultiplier: unit === 'km' ? METERS_TO_KM : METERS_TO_MILES,
        },
      },
      {
        $project: {
          name: 1,
          distance: 1,
        },
      },
    ]);

    res.status(200).json({
      status: 'success',
      results: distances.length,
      data: { data: distances },
    });
  } catch (err) {
    next(err);
  }
};
