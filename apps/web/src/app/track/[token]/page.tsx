import TrackTokenClient from "./TrackTokenClient";

export default async function TrackTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TrackTokenClient token={token} />;
}
