import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { postUserImageUploadUrl } from "@/app/userImage/postUserImageUploadUrl";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

const ddbMock = mockClient(DynamoDBDocumentClient);
let getSignedUrlMock: jest.Mock<any, any, any>;
const usersTableName = "users-table-offline";

jest.mock("@/config", () => ({
    envConfig: {
        USERS_TABLE: "users-table-offline",
        USER_IMAGE_BUCKET: "user-image-bucket-offline",
        CLOUDFRONT_USER_IMAGE_URL: "https://access-url.test",
    },
}));
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
    };
});
jest.mock("@aws-sdk/s3-request-presigner", () => {
    return {
        getSignedUrl: () => getSignedUrlMock(),
    };
});

const testSetUp = (setUp: { isUserDBSetup: "ok" | "fail" }): void => {
    const userDdbMock = ddbMock.on(PutCommand, {
        TableName: usersTableName,
        Item: {
            userId: "@a",
            userAvatarUrl: "https://access-url.test/userProfile/%40a",
        },
    });

    if (setUp.isUserDBSetup === "ok") {
        userDdbMock.resolves({});
    } else if (setUp.isUserDBSetup === "fail") {
        userDdbMock.rejects(new Error());
    }
};

beforeEach(() => {
    ddbMock.reset();
    getSignedUrlMock = jest
        .fn()
        .mockResolvedValue("https://signed-url.test/userProfile/%40a");
});

describe("正常系", () => {
    beforeEach(() => {
        testSetUp({
            isUserDBSetup: "ok",
        });
    });

    test("フォローしているユーザーと、フォローされているユーザーを取得する", async () => {
        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: {
                    userId: "@a",
                },
                body: JSON.stringify({
                    contentType: "image/png",
                    contentLength: 5242880,
                }),
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(
            JSON.stringify({
                putUrl: "https://signed-url.test/userProfile/%40a",
                publicUrl: "https://access-url.test/userProfile/%40a",
            }),
        );
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とIMG-01を返す", async () => {
        testSetUp({
            isUserDBSetup: "ok",
        });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                body: JSON.stringify({
                    contentType: "image/png",
                    contentLength: 100,
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "IMG-01",
            }),
        );
    });

    test("リクエストのuserIdが空の時、ステータスコード400とIMG-01を返す", async () => {
        testSetUp({
            isUserDBSetup: "ok",
        });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: { userId: "" },
                body: JSON.stringify({
                    contentType: "image/png",
                    contentLength: 100,
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "IMG-01",
            }),
        );
    });

    test("リクエストのuserIdがundefinedの時、ステータスコード400とIMG-01を返す", async () => {
        testSetUp({
            isUserDBSetup: "ok",
        });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: { userId: undefined },
                body: JSON.stringify({
                    contentType: "image/png",
                    contentLength: 100,
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "IMG-01",
            }),
        );
    });

    test("リクエストボディが無い時、ステータスコード400とIMG-01を返す", async () => {
        testSetUp({
            isUserDBSetup: "ok",
        });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "IMG-01",
            }),
        );
    });

    test.each(["@wl_nozomi", "@wl_nico"])(
        "ブラックリストに登録されているユーザーの時、ステータスコード400とIMG-02を返す",
        async (userId) => {
            testSetUp({
                isUserDBSetup: "ok",
            });

            const response = await postUserImageUploadUrl(
                getHandlerRequest({
                    pathParameters: { userId },
                    body: JSON.stringify({
                        contentType: "image/png",
                        contentLength: 100,
                    }),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "IMG-02",
                }),
            );
        },
    );

    test("リクエストボディのJSON変換に失敗した時、ステータスコード400とIMG-03を返す", async () => {
        testSetUp({
            isUserDBSetup: "ok",
        });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: "invalid-json",
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "IMG-03",
            }),
        );
    });

    test.each([
        {
            contentType: "",
            contentLength: 100,
        },
        {
            contentType: "image/png",
            contentLength: "numberではない",
        },
        {
            contentType: "image/png",
            contentLength: 0,
        },
        {
            contentType: "image/png",
            contentLength: 5242881,
        },
    ])(
        "リクエストボディのcontentTypeが%sで、contentLengthが%sの時、ステータスコード400とIMG-04を返す",
        async ({ contentType, contentLength }) => {
            testSetUp({
                isUserDBSetup: "ok",
            });

            const response = await postUserImageUploadUrl(
                getHandlerRequest({
                    pathParameters: { userId: "@a" },
                    body: JSON.stringify({
                        contentType,
                        contentLength,
                    }),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "IMG-04",
                }),
            );
        },
    );

    test("contentTypeがimage/で始まらない時、ステータスコード400とIMG-05を返す", async () => {
        testSetUp({
            isUserDBSetup: "ok",
        });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({
                    contentType: "text/plain",
                    contentLength: 100,
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(JSON.stringify({ error: "IMG-05" }));
    });

    test("署名URLの取得に失敗した時、ステータスコード500とIMG-06を返す", async () => {
        getSignedUrlMock = jest.fn().mockRejectedValue(new Error());
        testSetUp({
            isUserDBSetup: "ok",
        });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({
                    contentType: "image/png",
                    contentLength: 100,
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "IMG-06" }));
    });

    test("ユーザー画像のURLを登録する時、DynamoDBに接続できない時、ステータスコード500とIMG-07を返す", async () => {
        testSetUp({
            isUserDBSetup: "fail",
        });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: {
                    userId: "@a",
                },
                body: JSON.stringify({
                    contentType: "image/png",
                    contentLength: 100,
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "IMG-07",
            }),
        );
    });
});
