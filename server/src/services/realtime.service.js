let socketServer = null;

function setSocketServer(io) {
  socketServer = io;
}

function emitToAll(event, payload) {
  if (!socketServer) {
    return;
  }

  socketServer.emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!socketServer || !userId) {
    return;
  }

  socketServer.to(`user:${userId}`).emit(event, payload);
}

module.exports = {
  setSocketServer,
  emitToAll,
  emitToUser,
};
