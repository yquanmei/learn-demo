"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
  const { router, controller } = app;
  router.get("/api/test/get", controller.home.index);
  router.post("/api/test/post", controller.home.post);
};
