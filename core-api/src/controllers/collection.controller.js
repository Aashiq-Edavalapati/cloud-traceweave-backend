import httpStatus from 'http-status';
import { CollectionService } from '../services/collection.service.js';
import { workspaceService } from '../services/workspace.service.js';


const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const createCollection = catchAsync(async (req, res) => {
  const { name, parentId } = req.body;
  const { workspaceId } = req.params;
  const userId = req.user.id;

  const collection = await CollectionService.createCollection({
    workspaceId,
    name,
    parentId,
    userId,
  });

  res.status(httpStatus.CREATED).send(collection);
});

export const getCollectionsByWorkspace = catchAsync(async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  const collections =
    await CollectionService.getCollectionsByWorkspace(workspaceId, userId);

  res.status(httpStatus.OK).send(collections);
});

export const deleteCollection = catchAsync(async (req, res) => {
  const { collectionId } = req.params;
  const userId = req.user.id;

  const result =
    await CollectionService.softDeleteCollection(collectionId, userId);

  res.status(httpStatus.OK).send(result);
});

export const updateCollection = catchAsync(async (req, res) => {
  const { collectionId } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  const collection = await CollectionService.updateCollection(
    collectionId,
    { name },
    userId
  );

  res.status(httpStatus.OK).send(collection);
});

