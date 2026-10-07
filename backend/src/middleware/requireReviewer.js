const { sequelize } = require("../config/database");

const REVIEW_ROLES = ["reviewer", "admin"];

// Reviewer-only routes. Use after requireAuth. The role is read from the
// database on every request (not from the login cookie), so granting or
// removing reviewer rights takes effect immediately.
const requireReviewer = async (req, res, next) => {
  try {
    const rows = await sequelize.query(
      "SELECT role FROM users WHERE id = :id",
      { replacements: { id: req.user.id }, type: sequelize.QueryTypes.SELECT }
    );
    const role = rows[0] && rows[0].role;
    if (!REVIEW_ROLES.includes(role)) {
      return res.status(403).json({ error: "Reviewer access required." });
    }
    req.userRole = role;
    return next();
  } catch (err) {
    console.error("requireReviewer failed:", err.message);
    return res.status(500).json({ error: "Could not check permissions." });
  }
};

module.exports = { requireReviewer, REVIEW_ROLES };
