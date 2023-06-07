const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb',
});

pool.query(`SELECT title FROM properties LIMIT 10;`).then((response) => {
  console.log(response);
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const queryString = `
    SELECT * FROM users
    WHERE email = $1
    `;

  return pool
    .query(queryString, [email])
    .then((result) => result.rows[0] || null)
    .catch((error) => console.log(error.message));
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `
    SELECT * FROM users
    WHERE id = $1
    `;

  return pool
    .query(queryString, [id])
    .then((result) => result.rows[0] || null)
    .catch((error) => console.log(error.message));
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [user.name, user.email, user.password];

  return pool
    .query(queryString, values)
    .then((result) => result.rows[0])
    .catch((error) => console.log(error));
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
    SELECT properties.*, reservations.*, AVG(rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    AND end_date < now()::date
    GROUP BY properties.id, reservations.id
    ORDER BY start_date
    LIMIT $2;
  `;
  const values = [guest_id, limit];

  return pool
    .query(queryString, values)
    .then((result) => result.rows)
    .catch((error) => console.log(error));
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, AVG(property_reviews.rating) AS average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
  `;

  // Building the WHERE clause based on the provided options
  const whereClauses = [];
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    whereClauses.push(`city LIKE $${queryParams.length}`);
  }
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    whereClauses.push(`owner_id = $${queryParams.length}`);
  }
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night);
    whereClauses.push(`cost_per_night >= $${queryParams.length}`);
  }
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night);
    whereClauses.push(`cost_per_night <= $${queryParams.length}`);
  }
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    whereClauses.push(`rating >= $${queryParams.length}`);
  }

  if (whereClauses.length > 0) {
    queryString += `WHERE ${whereClauses.join(' AND ')} `;
  }

  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length + 1};
  `;

  queryParams.push(limit);

  return pool
    .query(queryString, queryParams)
    .then((result) => result.rows)
    .catch((error) => {
      console.error('Error executing getAllProperties:', error);
      throw error;
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = function (property) {
  const queryString = `
    INSERT INTO properties (
      owner_id, 
      title, 
      description, 
      thumbnail_photo_url, 
      cover_photo_url, 
      cost_per_night, 
      street, 
      city, 
      province, 
      post_code,
      country, 
      parking_spaces, 
      number_of_bathrooms, 
      number_of_bedrooms
      )
    VALUES (
      $1, 
      $2, 
      $3, 
      $4, 
      $5, 
      $6, 
      $7, 
      $8, 
      $9, 
      $10, 
      $11, 
      $12, 
      $13, 
      $14
    )
    RETURNING *
    `;

  const queryParams = [
    Number(property.owner_id),
    String(property.title),
    String(property.description),
    String(property.thumbnail_photo_url),
    String(property.cover_photo_url),
    String(property.cost_per_night),
    String(property.street),
    String(property.city),
    String(property.province),
    String(property.post_code),
    String(property.country),
    Number(property.parking_spaces),
    Number(property.number_of_bathrooms),
    Number(property.number_of_bedrooms),
  ];

  return pool
    .query(queryString, queryParams)
    .then((result) => result.rows[0])
    .catch((error) => console.log(error.message));
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
