"use strict";
const { sanitizeEntity } = require("strapi-utils");
const uuid = require("uuid");
const { format } = require("date-fns");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async update(ctx) {
    const { id } = ctx.params;
    const { finishedAt } = ctx.request.body;

    const entity = await strapi.services["trail-route"].update(
      { id },
      ctx.request.body
    );

    if (finishedAt) {
      const routesQuantity = await strapi.query("trail-parts").count();
      const trail = await strapi.query("trails").findOne({
        id: entity.trail.id,
      });

      const trailRoutesQuantity = trail.routes.length;
      const allRoutesAreCompleted = !trail.routes.some(
        (route) => !route.finishedAt
      );

      if (trailRoutesQuantity === routesQuantity && allRoutesAreCompleted) {
        const code = uuid.v4();
        const file = await strapi.services[
          "pdf-generator"
        ].generateCertificatePdf({
          name: trail.user.name,
          code,
          startDate: format(new Date(trail.startedAt), "dd/MM/yyyy"),
          finishDate: format(new Date(finishedAt), "dd/MM/yyyy"),
        });

        await Promise.all([
          strapi.services.trails.update(
            {
              id: trail.id,
            },
            {
              finishedAt,
            }
          ),
          strapi.services.certificate.create({
            file,
            code,
            trail: trail.id,
          }),
        ]);
      }
    }

    return sanitizeEntity(entity, { model: strapi.models["trail-route"] });
  },
};
