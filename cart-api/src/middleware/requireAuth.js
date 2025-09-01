const jwt = require('jsonwebtoken');

// Middleware to ensure requests include a valid JWT
module.exports = function requireAuth(req, res, next) {
  // Get authorization header (e.g., "Bearer <token>")
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  console.log("🔐 Auth header:", header);
  console.log("🔑 Extracted token:", token);
  // If no token is provided, reject the request
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    // Verify the token using the secret key
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user info to the request object
    req.user = { id: payload.sub, email: payload.email, role: payload.role };

    // Continue to the next middleware or route handler
    return next();
  } catch (e) {
    // Token is invalid or expired
    return res.status(401).json({ error: 'Invalid/Expired token' });
  }
};
