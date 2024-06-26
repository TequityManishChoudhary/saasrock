import { json, LoaderFunction, redirect } from "@remix-run/node";
import { EntitiesApi } from "~/utils/api/EntitiesApi";
import { RowsApi } from "~/utils/api/RowsApi";
import UrlUtils from "~/utils/app/UrlUtils";
import EntityHelper from "~/utils/helpers/EntityHelper";
import { verifyUserHasPermission, getEntityPermission } from "~/utils/helpers/PermissionsHelper";
import RowsRequestUtils from "../utils/RowsRequestUtils";
import { createMetrics } from "~/modules/metrics/utils/MetricTracker";

export namespace Rows_Relationships {
  export type LoaderData = {
    entitiesData: { rowsData: RowsApi.GetRowsData }[];
    routes: EntitiesApi.Routes;
  };
  export let loader: LoaderFunction = async ({ request, params }) => {
    const { time, getServerTimingHeader } = await createMetrics({ request, params }, `[Rows_Relationships] ${params.entity}`);
    const { userId, tenantId, entity } = await RowsRequestUtils.getLoader({ request, params });
    await time(verifyUserHasPermission(request, getEntityPermission(entity, "view"), tenantId), "verifyUserHasPermission");
    if (!entity.isAutogenerated || entity.type === "system") {
      throw redirect(tenantId ? UrlUtils.currentTenantUrl(params, "404") : "/404");
    }

    const entitiesData: {
      rowsData: RowsApi.GetRowsData;
    }[] = [];

    async function getRowsData(entity: { id?: string; name?: string }) {
      return await RowsApi.getAll({
        entity,
        tenantId,
        userId,
        urlSearchParams: new URL(request.url).searchParams,
      });
    }
    await time(
      Promise.all(
        entity.parentEntities.map(async (relationship) => {
          entitiesData.push({
            rowsData: await getRowsData({ name: relationship.parent.name }),
          });
        })
      ),
      "parentEntities.getRowsData"
    );
    entitiesData.push({
      rowsData: await time(getRowsData({ name: entity.name }), "getRowsData"),
    });
    await time(
      Promise.all(
        entity.childEntities.map(async (relationship) => {
          entitiesData.push({
            rowsData: await getRowsData({ name: relationship.child.name }),
          });
        })
      ),
      "childEntities.getRowsData"
    );

    const data: LoaderData = {
      entitiesData: entitiesData.sort((a, b) => (a.rowsData.entity.order > b.rowsData.entity.order ? 1 : -1)),
      routes: EntityHelper.getNoCodeRoutes({ request, params }),
    };
    return json(data, { headers: getServerTimingHeader() });
  };
}
