// Logger stub for development/testing
const noop = () => {};
const logger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  child: () => logger,
};
module.exports = logger;
