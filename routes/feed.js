const express = require('express');
const { body } = require('express-validator');

const isAuth = require('../middleware/isAuth');
const feedController = require('../controllers/feed');

const router = express.Router();
// GET => /feed/posts - get all posts
router.get('/posts', isAuth, feedController.getPosts);
// POST => /feed/post - create post
router.post(
  '/post',
  isAuth,
  [
    body('title').trim().isLength({ min: 5 }),
    body('content').trim().isLength({ min: 5 }),
  ],
  feedController.postPost
);
// GET => /feed/post/postId - get single post
router.get('/post/:postId', isAuth, feedController.getPost);
// PUT => /feed/post/postId - update post
router.put(
  '/post/:postId',
  isAuth,
  [
    body('title').trim().isLength({ min: 5 }),
    body('content').trim().isLength({ min: 5 }),
  ],
  feedController.updatePost
);
// DELETE => /feed/post/postId - delete post
router.delete('/post/:postId', isAuth, feedController.deletePost);
module.exports = router;
