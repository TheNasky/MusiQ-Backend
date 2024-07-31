// Middleware to check if the user is an admin
export const isAdmin = (req, res, next) => {
  // Check if the user is logged in
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized - Admin access requires login" });
  }
  // Check if the user has the 'admin' role
  if (!req.user.roles || !req.user.roles.includes("Admin")) {
    return res.status(403).json({ success: false, message: "Forbidden - Admin access required" });
  }
  // User is an admin, proceed to the next middleware/route
  next();
};

// Middleware to check if the user is logged in
export const isLoggedIn = (req, res, next) => {
  // Check if the user is logged in
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized - Login required" });
  }
  // User is logged in, proceed to the next middleware/route
  next();
};
