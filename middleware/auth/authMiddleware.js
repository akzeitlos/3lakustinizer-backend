import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Kein Token übergeben' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // enthält z. B. { id, email, roles }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Ungültiger oder abgelaufener Token' });
  }
};

export default authMiddleware;