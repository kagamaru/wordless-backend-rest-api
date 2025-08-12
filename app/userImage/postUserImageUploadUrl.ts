import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { envConfig } from "@/config";
import { BLACKLISTED } from "@/static/blackListIds";
import {
    createErrorResponse,
    createResponse,
    getItemFromDynamoDB,
    getS3Client,
    putToDynamoDB,
} from "@/utility";

const s3Client = getS3Client();
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

dayjs.locale("ja");

type PostUserImageRequestBody = {
    contentType: string;
    contentLength: number;
};

export const postUserImageUploadUrl = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    const bucket = envConfig.USER_IMAGE_BUCKET;

    if (!event.pathParameters?.userId || !event.body) {
        return createErrorResponse(400, { error: "IMG-01" }, originName);
    }

    const userId = event.pathParameters.userId;
    if (BLACKLISTED.has(userId)) {
        return createErrorResponse(400, { error: "IMG-02" }, originName);
    }

    let body: PostUserImageRequestBody;
    try {
        body = JSON.parse(event.body) as PostUserImageRequestBody;
    } catch {
        return createErrorResponse(400, { error: "IMG-03" }, originName);
    }

    const { contentType, contentLength } = body;

    if (
        !contentType ||
        typeof contentLength !== "number" ||
        contentLength <= 0 ||
        contentLength > MAX_BYTES
    ) {
        return createErrorResponse(400, { error: "IMG-04" }, originName);
    }

    if (!/^image\//.test(contentType)) {
        return createErrorResponse(400, { error: "IMG-05" }, originName);
    }

    const key = userId;
    const timestamp = dayjs().format("YYYYMMDDHHmmss");

    const putCmd = new PutObjectCommand({
        Bucket: bucket,
        Key: `userProfile/${key}_${timestamp}`,
        ContentType: contentType,
        // NOTE: no-cache は キャッシュが有効期限内であっても、毎回キャッシュが最新か判断する
        // NOTE: no-store は キャッシュを保存しない
        // NOTE: must-revalidate は 有効期限内であれば保存されたキャッシュを返し、有効期限切れの場合は問い合わせを行う
        CacheControl: "no-cache, no-store, must-revalidate",
    });

    let putUrl: string;
    try {
        // NOTE: 署名URLの有効期限は60秒とする
        putUrl = await getSignedUrl(s3Client, putCmd, { expiresIn: 60 });
    } catch (error) {
        return createErrorResponse(500, { error: "IMG-06" }, originName);
    }

    const publicUrl = `${envConfig.CLOUDFRONT_USER_IMAGE_URL}/userProfile/${encodeURIComponent(key)}_${timestamp}`;

    let fetchedUserName: string;
    try {
        const { userName } = await getItemFromDynamoDB(envConfig.USERS_TABLE, {
            userId,
        });
        fetchedUserName = userName as string;
    } catch (error) {
        if (error.message === "Cannot find item") {
            return createErrorResponse(
                404,
                {
                    error: "IMG-07",
                },
                originName,
            );
        }
        return createErrorResponse(
            500,
            {
                error: "IMG-08",
            },
            originName,
        );
    }

    try {
        await putToDynamoDB(envConfig.USERS_TABLE, {
            userId,
            userAvatarUrl: publicUrl,
            userName: fetchedUserName,
        });
    } catch (error) {
        return createErrorResponse(500, { error: "IMG-09" }, originName);
    }

    return createResponse(
        {
            putUrl,
            publicUrl,
        },
        originName,
    );
};
