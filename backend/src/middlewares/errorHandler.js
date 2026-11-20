// Custom Application Error
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Check for Prisma / PostgreSQL unreachable errors
  const isDbUnreachable =
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientRustPanicError' ||
    (err.code && typeof err.code === 'string' && err.code.startsWith('P1')) ||
    err.message?.includes("Can't reach database server") ||
    err.message?.includes('ECONNREFUSED');

  if (isDbUnreachable) {
    return res.status(503).json({
      message: 'Database not reachable. Check DATABASE_URL in backend/.env',
    });
  }

  // Prisma Unique Constraint Violation
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'A record with this unique value already exists.',
    });
  }

  // Prisma Record Not Found
  if (err.code === 'P2025') {
    return res.status(404).json({
      message: 'Record not found.',
    });
  }

  const statusCode = err.statusCode || 500;
  if (statusCode === 500) {
    console.error('Server error:', err);
  }

  return res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error' : err.message,
  });
}

export { AppError, notFound, errorHandler };
