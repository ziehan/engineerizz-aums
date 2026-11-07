// AI Services error middleware skeleton
export const errorMiddleware = (err, req, res, next) => {
  res.status(500).json({ error: err.message });
};
