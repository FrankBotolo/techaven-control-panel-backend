export class CatalogueError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.name = 'CatalogueError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function sendCatalogueError(res, error) {
  if (error instanceof CatalogueError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      code: error.code,
      data: null,
      ...(error.details ? { details: error.details } : {})
    });
  }
  console.error('Catalogue error:', error);
  return res.status(500).json({ success: false, message: 'Catalogue operation failed', code: 'CATALOGUE_ERROR', data: null });
}
