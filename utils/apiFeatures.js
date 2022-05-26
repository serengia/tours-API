/* eslint-disable node/no-unsupported-features/es-syntax */
class APIFeatures {
  constructor(queryObject, query) {
    this.queryObject = queryObject;
    this.query = query;
  }

  filter() {
    // 1. a) BASIC FILTERING
    const queryObj = { ...this.queryObject };
    const excludTerms = ['page', 'sort', 'limit', 'fields'];
    excludTerms.forEach((el) => delete queryObj[el]);

    // 1. b) ADVANCED FILTERING
    const queryString = JSON.stringify(queryObj).replace(
      /\b(gt|gte|lt|lte)\b/g,
      (match) => `$${match}`
    );

    const updatedQuery = JSON.parse(queryString);

    // Query without await to support mongoose query methods
    this.query = this.query.find(updatedQuery);

    return this;
  }

  sort() {
    // 2. SORTING, A method applied on the query - mongoose
    if (this.queryObject.sort) {
      //query.sort(price ratingsAverage)
      const sortBy = this.queryObject.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // Default: Sort by created time, descending to have the latest(ie. biggest dates first)
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitByFields() {
    // 3. FIELD LIMITING (PROJECTING), to save on bandwidth
    if (this.queryObject.fields) {
      //query.select(name price ratingsAverage)
      const fields = this.queryObject.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    // 4. PAGINATION
    //?page=2&limit=10 ; IF LIMIT===10 => page 1 => query.skip(0).limit(10); page 2 => query.skip(10).limit(10);
    const page = +this.queryObject.page || 1;
    const limit = +this.queryObject.limit || 100;
    const skipCount = (page - 1) * limit;

    this.query = this.query.skip(skipCount).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
