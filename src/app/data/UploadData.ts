import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3 = new S3Client({
	region: "auto", // Required by SDK but not used by R2
	// Provide your Cloudflare account ID
	endpoint: `https://4275a73b8815452861aa3bcd098c7119.r2.cloudflarestorage.com`,
	// Retrieve your S3 API credentials for your R2 bucket via API tokens (see: https://developers.cloudflare.com/r2/api/tokens)
	credentials: {
		accessKeyId: 'a47c26ff98678d23244362ea3759b9ec',
		secretAccessKey: '6e06ff8b721b39ddf4368662590c4e25a9247fe320c2e10e0f0f3495967b4943',
	},
});

export async function uploadSTL(
	file: File,
	bucket: string,
	key = `${crypto.randomUUID()}-${file.name}`,
): Promise<string> {
	if (!file.name.toLowerCase().endsWith(".stl")) {
		throw new Error("Only STL files can be uploaded.");
	}

	await S3.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: new Uint8Array(await file.arrayBuffer()),
			ContentType: "model/stl",
		}),
	);

	return getSignedUrl(
		S3,
		new GetObjectCommand({ Bucket: bucket, Key: key }),
		{ expiresIn: 3600 },
	);
}

