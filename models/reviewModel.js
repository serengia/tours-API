/* eslint-disable import/no-useless-path-segments */
const mongoose = require('mongoose');
const Tour = require('./../models/tourModel');

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'A review should not be empty.'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be greater than 0.'],
      max: [5, 'Rating must not be greater than 5.'],
      required: [true, 'Review must have a rating.'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensuring a user leaves only one review per tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avRating: { $avg: '$rating' },
      },
    },
  ]);

  // console.log(stats);

  // Saving stats data
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

// PASSING PROPERTY FROM PRE-MIDDLEWARE TO POST MIDDLE WARE
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // We are using .findOne() ti get access to the Review so as to call our static funtion in the next step
  this.r = await this.clone().findOne();
  // console.log('PREFOUND DOC::::', this.r);
  next();
});
// >>>>> NEXT MIDDLEWARE
reviewSchema.post(/^findOneAnd/, async function () {
  // Updating stats after/post delete
  this.r.constructor.calcAverageRatings(this.r.tour);
});

const fields = ['user'];

fields.forEach((f) =>
  reviewSchema.pre(/^find/, function (next) {
    this.populate({
      path: f,
      select: 'name',
    });
    next();
  })
);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
