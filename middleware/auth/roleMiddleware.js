const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles;

    if (!userRoles || !userRoles.some(role => allowedRoles.includes(role))) {
      return res.status(403).json({ message: 'Zugriff verweigert: Rolle nicht ausreichend' });
    }

    next();
  };
};

export default requireRole;
