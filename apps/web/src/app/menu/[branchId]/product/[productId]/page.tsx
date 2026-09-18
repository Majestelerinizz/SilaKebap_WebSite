import ProductClient from "./ProductClient";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ branchId: string; productId: string }>;
}) {
  const { branchId, productId } = await params;
  return <ProductClient branchId={branchId} productId={productId} />;
}
