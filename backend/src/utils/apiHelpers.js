import mongoose from 'mongoose';

export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
  });
};

export const requireFields = (body, fields) => {
  const missingField = fields.find((field) => body[field] === undefined || body[field] === null || body[field] === '');

  if (missingField) {
    const error = new Error(`${missingField} is required`);
    error.statusCode = 400;
    throw error;
  }
};

export const validateObjectId = (id, resourceName = 'Resource') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`${resourceName} not found`);
    error.statusCode = 404;
    throw error;
  }
};

export const findUserDocumentById = async (Model, id, userId, resourceName) => {
  validateObjectId(id, resourceName);

  const document = await Model.findOne({ _id: id, user: userId });

  if (!document) {
    const error = new Error(`${resourceName} not found`);
    error.statusCode = 404;
    throw error;
  }

  return document;
};

