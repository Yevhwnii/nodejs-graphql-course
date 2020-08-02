let io;

// Socket will be initialized as soon as server starts listening.
// Which means that when req will come to the controller, it is already will be accessible.
module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer);
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket not initialized');
    }
    return io;
  },
};
