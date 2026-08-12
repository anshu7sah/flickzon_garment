import { getMaterials, getClothTypes, getFabricTypes } from "@/actions/materials";
import { getExtraDependencies } from "@/actions/extra-dependencies";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import MaterialsClient from "./materials-client";

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const [materialsData, clothTypes, fabricTypes, extraDependencies, session] = await Promise.all([
    getMaterials({
      page: Number(params.page ?? "1"),
      pageSize: Number(params.pageSize ?? "50"),
      search: params.search,
      type: params.type,
    }),
    getClothTypes(),
    getFabricTypes(),
    getExtraDependencies(),
    auth(),
  ]);
  const role = session?.user?.role as Role;

  const serializedMaterials = materialsData.data.map((m) => ({
    ...m,
    colors: (m.colors as string[]) ?? [],
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  const serializedClothTypes = clothTypes.map((ct) => ({
    ...ct,
    createdAt: ct.createdAt.toISOString(),
  }));

  const serializedFabricTypes = fabricTypes.map((ft) => ({
    ...ft,
    createdAt: ft.createdAt.toISOString(),
  }));

  const serializedExtraDependencies = extraDependencies.map((ed) => ({
    ...ed,
    createdAt: ed.createdAt.toISOString(),
  }));

  return (
    <MaterialsClient
      materials={serializedMaterials}
      total={materialsData.total}
      page={materialsData.page}
      pageSize={materialsData.pageSize}
      clothTypes={serializedClothTypes}
      fabricTypes={serializedFabricTypes}
      extraDependencies={serializedExtraDependencies}
      role={role}
      searchValue={params.search ?? ""}
    />
  );
}
