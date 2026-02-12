const checkRole = (role) => {
    return (req, res, next) => {
        if (req.session && req.session.user && req.session.user.role === role) {
            return next();
        }
        return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    };
};

module.exports = { checkRole };
