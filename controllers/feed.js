const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');
const user = require('../models/user');

// Get all posts
exports.getPosts = async (req, res, next) => {
  // Status is important thing to send since based on it,
  // we can change interface on our client side

  // if undefined assign 1 to it
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  try {
    totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    res.status(200).json({
      message: 'Fetched posts',
      posts,
      totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Get single post
exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error('Could not find post');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({
        message: 'Post fetched',
        post,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
// Create post
exports.postPost = (req, res, next) => {
  const errors = validationResult(req);
  // If any validation errors
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  // If no image
  if (!req.file) {
    const error = new Error('No image provided');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path;
  let creator;
  const updatedImageUrl = imageUrl.replace('\\', '/');
  // Creation of post in db
  const post = new Post({
    title,
    content,
    imageUrl: updatedImageUrl,
    creator: req.userId,
  });
  post
    .save()
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then((result) => {
      // emit - sends message to all users
      // broadcast - sends message to all users but sender
      // we are sending this js object to all clients connected to the socket
      // so we can access it on the 'posts' channel and do whatever is needed on the client side
      // addPost in this case
      io.getIO().emit('posts', {
        action: 'create',
        post: {
          ...post._doc,
          creator: { _id: req.userId, name: creator.name },
        },
      });
      res.status(201).json({
        message: 'Post created successfully',
        post,
        creator: {
          _id: creator._id,
          name: creator.name,
        },
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
// Update post
exports.updatePost = (req, res, next) => {
  const errors = validationResult(req);
  // If any validation errors
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  // If no image set, url comes from req
  let imageUrl = req.body.image;
  // If image set, take it instead
  if (req.file) {
    imageUrl = req.file.path;
    imageUrl = imageUrl.replace('\\', '/');
  }
  if (!imageUrl) {
    const error = new Error('No file picked');
    error.statusCode = 422;
    throw error;
  }
  Post.findById(postId)
    .populate('creator')
    .then((post) => {
      if (!post) {
        const error = new Error('Could not find post');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator._id.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then((result) => {
      io.getIO().emit('posts', { action: 'update', post: result });
      res.status(200).json({
        message: 'Post updated',
        post: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error('Could not find post');
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not authorized!');
        error.statusCode = 403;
        throw error;
      }
      //Check logged in user
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(postId);
    })
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then((result) => {
      console.log(result);
      io.getIO().emit('posts', { action: 'delete', post: postId });
      res.status(200).json({
        message: 'Post deleted.',
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
