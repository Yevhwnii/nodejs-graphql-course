require('dotenv').config();

const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET_KEY;

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated');
    error.statusCode = 401;
    throw error;
  }
  // Since token is Bearer + token we split on whitespace and pick second item from that array
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, SECRET_KEY);
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }
  if (!decodedToken) {
    const error = new Error('Not authenticated');
    error.statusCode = 401;
    throw error;
  }
  req.userId = decodedToken.userId;
  next();
};
