import { S3Client } from "@aws-sdk/client-s3";
import { envConfig } from "@/config";

export const getS3Client = (): S3Client => {
    return new S3Client({
        region: envConfig.AWS_REGION,
    });
};
