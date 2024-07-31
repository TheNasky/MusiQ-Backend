export const bodyCleaner = (...allowedFields) => {
  return (req, res, next) => {
    const filteredBody = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        filteredBody[field] = req.body[field];
      }
    });
    req.body = filteredBody;
    next();
  };
};
