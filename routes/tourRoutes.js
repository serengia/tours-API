/* eslint-disable import/no-useless-path-segments */
const express = require('express');

const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
// const reviewController = require('./../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

router.use('/:tourId/reviews', reviewRouter);
router.use('/:tourId/reviews/:reviewId', reviewRouter);

// Param middleware
// router.param('id', tourController.checkID);
router
  .route('/top-5-cheaper')
  .get(tourController.aliasTop5, tourController.getAllTours);

router.get(
  '/tours-within/:distance/center/:latlng/unit/:unit',
  tourController.getToursWithin
);

router.get(
  '/distances/center/:latlng/unit/:unit',
  tourController.getToursDistances
);
// '/tours-within/:distance/center/:latlng/unit/:unit'
//"/?tours-within=20km&center=-40,45&unit=km"

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
