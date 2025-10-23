

module.exports.renderView = function (path = '', data = {}) {
  return (req, res, next) => {
    data.nonce = res.locals.nonce;
    try {
      res.render(path, data);
    }
    catch (error) {
      // Pass error to error handling middleware
      next({
        status: 500,
        message: `Error rendering view ${path}`,
        error: error
      });
    }
  };
}


module.exports.sendJson = function(res, status, success, message, data = null) {
  const response = {
    success,
    message,
    ...(data && { data })
  };
  return res.status(status).json(response);
};



module.exports.logError = (message = '', error = '') => console.error(message, error);

