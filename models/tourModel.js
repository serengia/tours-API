/* eslint-disable prefer-arrow-callback */
const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name.'],
      unique: true,
      trim: true,
      minlength: [10, 'A tour must have a minimum of 10 characters'],
      maxlength: [50, 'A tour must have less than or equal to 50 characters'],
      // validate: [validator.isAlpha, 'Name must only contain letters with no white space'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'Tour must have duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Tour must have a max group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'Tour must have diffiluty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: "Difficulty must either: 'easy', 'medium', or 'difficult'",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'A rating must be geater than 0'],
      max: [5, 'A rating must not be greater than 5'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    discount: {
      type: Number,
      validate: {
        // This only works for NEW docs on creation
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount ({VALUE}) must be less than reqular price ',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    imageCover: {
      type: String,
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),

      // Hide a field from the schema
      select: false,
    },
    startDates: [Date],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],

      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],

    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// Vertual fields
tourSchema.virtual('durationInWeeks').get(function () {
  return this.duration / 7;
});

// Virtual Populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// 1. DOCUMENT MIDDLEWARE, runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// // [EMBEDING...]Only works for creating new documents, not updating
// tourSchema.pre('save', async function (next) {
//   const guidesPromiseArr = this.guides.map(
//     async (id) => await User.findById(id)
//   );
//   this.guides = await Promise.all(guidesPromiseArr);
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// 2. QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ isPrivate: { $ne: true } });
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// tourSchema.post(/^find/, function (doc, next) {
//   console.log(doc);
//   next();
// });

// 3. AGGRIGATE MIDDLEWARE

//CAN PREVENT GEO AGGRIGATION FORM WORKING, since (when defined) $geoNear: {} has the first in the aggrigetion
// But THERE IS A WALK AROUND WHERE YOU CAN CHECK IF $geoNear: {} extist and make it the first
/*
tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isPrivate: { $ne: true } } });
  // console.log(this.pipeline());
  next();
});

*/

const Tour = mongoose.model('Tour', tourSchema);
// Tour.createIndexes();

module.exports = Tour;
