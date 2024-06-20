import { useTranslation } from "react-i18next";
import { ActionFunction, json, LoaderFunction, redirect } from "@remix-run/node";
import EntityForm from "~/components/entities/EntityForm";
import NewPageLayout from "~/components/ui/layouts/NewPageLayout";
import { i18nHelper } from "~/locale/i18n.utils";
import { createEntity } from "~/utils/db/entities/entities.db.server";
import { createEntityPermissions } from "~/utils/db/permissions/permissions.db.server";
import EntityHelper from "~/utils/helpers/EntityHelper";
import { verifyUserHasPermission } from "~/utils/helpers/PermissionsHelper";
import Constants from "~/application/Constants";

export let loader: LoaderFunction = async ({ request }) => {
  await verifyUserHasPermission(request, "admin.entities.create");
  return json({});
};

type ActionData = {
  error?: string;
};
const badRequest = (data: ActionData) => json(data, { status: 400 });
export const action: ActionFunction = async ({ request }) => {
  const { t } = await i18nHelper(request);
  const form = await request.formData();
  const action = form.get("action")?.toString() ?? "";
  if (action === "create") {
    const name = form.get("name")?.toString() ?? "";
    const slug = form.get("slug")?.toString().toLowerCase() ?? "";
    // const order = Number(form.get("order"));
    const prefix = form.get("prefix")?.toString() ?? "";
    const title = form.get("title")?.toString() ?? "";
    const titlePlural = form.get("title-plural")?.toString() ?? "";
    const isAutogenerated = Boolean(form.get("is-autogenerated"));
    const hasApi = Boolean(form.get("has-api"));
    const icon = form.get("icon")?.toString() ?? "";
    const type = form.get("type")?.toString() ?? "";
    const active = Boolean(form.get("active"));

    const showInSidebar = Boolean(form.get("show-in-sidebar"));
    const hasTags = Boolean(form.get("has-tags"));
    const hasComments = Boolean(form.get("has-comments"));
    const hasTasks = Boolean(form.get("has-tasks"));
    const hasWorkflow = Boolean(form.get("has-workflow"));
    const hasActivity = Boolean(form.get("has-activity"));
    const hasBulkDelete = Boolean(form.get("has-bulk-delete"));

    const defaultVisibility = form.get("default-visibility")?.toString() ?? Constants.DEFAULT_ROW_VISIBILITY;

    const onCreated = form.get("onCreated")?.toString() ?? "redirectToOverview";
    const onEdit = form.get("onEdit")?.toString() ?? "editRoute";

    const errors = await EntityHelper.validateEntity({ tenantId: null, name, slug, order: null, prefix });
    if (errors.length > 0) {
      return badRequest({ error: errors.join(", ") });
    }
    try {
      const entity = await createEntity({
        name,
        slug,
        prefix,
        title,
        titlePlural,
        isAutogenerated,
        hasApi,
        icon,
        active,
        type,
        showInSidebar,
        hasTags,
        hasComments,
        hasTasks,
        hasWorkflow,
        hasActivity,
        hasBulkDelete,
        defaultVisibility,
        onCreated,
        onEdit,
      });

      await createEntityPermissions(entity);

      if (entity) {
        return redirect(`/admin/entities/${slug}/properties`);
      } else {
        return badRequest({ error: "Could not create entity" });
      }
    } catch (e: any) {
      return badRequest({ error: e.message });
    }
  } else {
    return badRequest({ error: t("shared.invalidForm") });
  }
};

export default function NewBlog() {
  const { t } = useTranslation();
  return (
    <NewPageLayout
      title={`${t("shared.create")} ${t("models.entity.object")}`}
      menu={[
        { title: t("models.entity.plural"), routePath: "/admin/entities" },
        { title: t("shared.new"), routePath: "/admin/entities/new" },
      ]}
    >
      <EntityForm />
    </NewPageLayout>
  );
}