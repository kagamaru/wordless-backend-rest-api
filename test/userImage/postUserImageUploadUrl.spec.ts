import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import MockDate from "mockdate";
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

const testSetUp = (setUp: {
    isUserDBFetchSetup: "ok" | "notFound" | "fail";
    isUserDBPostSetup: "ok" | "fail";
}): void => {
    const userDdbFetchMock = ddbMock.on(GetCommand, {
        TableName: usersTableName,
        Key: {
            userId: "@a",
        },
    });
    const userDdbPostMock = ddbMock.on(PutCommand, {
        TableName: usersTableName,
        Item: {
            userId: "@a",
            userAvatarUrl:
                "https://access-url.test/userProfile/%40a_20250101000000",
        },
    });

    if (setUp.isUserDBFetchSetup === "ok") {
        userDdbFetchMock.resolves({
            Item: {
                userId: "@a",
                userName: "test-user",
            },
        });
    } else if (setUp.isUserDBFetchSetup === "notFound") {
        userDdbFetchMock.resolves({});
    } else if (setUp.isUserDBFetchSetup === "fail") {
        userDdbFetchMock.rejects(new Error());
    }

    if (setUp.isUserDBPostSetup === "ok") {
        userDdbPostMock.resolves({});
    } else if (setUp.isUserDBPostSetup === "fail") {
        userDdbPostMock.rejects(new Error());
    }
};

beforeEach(() => {
    ddbMock.reset();
    getSignedUrlMock = jest
        .fn()
        .mockResolvedValue(
            "https://signed-url.test/userProfile/%40a_20250101000000",
        );
    MockDate.set(new Date(2025, 0, 1, 0, 0, 0));
});

describe("正常系", () => {
    beforeEach(() => {
        testSetUp({
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "ok",
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
                putUrl: "https://signed-url.test/userProfile/%40a_20250101000000",
                publicUrl:
                    "https://access-url.test/userProfile/%40a_20250101000000",
            }),
        );
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とIMG-01を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "ok",
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
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "ok",
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
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "ok",
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
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "ok",
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
                isUserDBFetchSetup: "ok",
                isUserDBPostSetup: "ok",
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
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "ok",
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
                isUserDBFetchSetup: "ok",
                isUserDBPostSetup: "ok",
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
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "ok",
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
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "ok",
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

    test("存在しないuserIdでアクセスしたとき、IMG-07と404エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await postUserImageUploadUrl(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({
                    contentType: "image/png",
                    contentLength: 100,
                }),
            }),
        );
        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "IMG-07",
            }),
        );
    });

    test("UserTableとの接続に失敗したとき、IMG-08と500エラーを返す", async () => {
        ddbMock.on(GetCommand).rejects(new Error());

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
        expect(response.body).toEqual(JSON.stringify({ error: "IMG-08" }));
    });

    test("ユーザー画像のURLを登録する時、DynamoDBに接続できない時、ステータスコード500とIMG-09を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "ok",
            isUserDBPostSetup: "fail",
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
                error: "IMG-09",
            }),
        );
    });
});
