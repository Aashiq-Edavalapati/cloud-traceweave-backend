import express from 'express';
import authRoute from './auth.route.js';
import collectionRoute from './collection.route.js';
const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/collections',
    route: collectionRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;