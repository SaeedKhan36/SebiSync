import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Lazily constructed: this module is reachable via static imports from
// server.ts (server -> router -> document -> ingestion/workflow ->
// ingestion/parser -> storage/r2), which ESM executes before server.ts's own
// dotenv.config() calls run. Reading process.env at call time (not module
// load time) avoids capturing empty values.
let client: S3Client | undefined;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint:
        process.env.R2_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return client;
}

function getBucket(): string {
  return process.env.R2_BUCKET_NAME ?? "";
}

export async function uploadObject(key: string, body: Buffer, contentType: string) {
  await getClient().send(
    new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

export function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const command = new PutObjectCommand({ Bucket: getBucket(), Key: key, ContentType: contentType });
  return getSignedUrl(getClient(), command, { expiresIn });
}

export function getPresignedDownloadUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(getClient(), command, { expiresIn });
}

export async function downloadObject(key: string): Promise<Buffer> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
  const byteArray = await result.Body!.transformToByteArray();
  return Buffer.from(byteArray);
}
