import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { verifyToken } from "@/app/auth/verifyToken";

const ddbMock = mockClient(DynamoDBDocumentClient);

const userSubTableName = "user-sub-table-offline";

const userSub = "userSub";
const userId = "@fuga_fuga";
const userSubTableItem = {
    Item: {
        userSub,
        userId,
    },
};

let mockJwtVerify = jest.fn(() => ({
    sub: "userSub",
}));

jest.mock("@/config", () => ({
    // HACK: 変数へのアクセスが不可のため、ハードコーディングする
    envConfig: {
        USER_SUB_TABLE: "user-sub-table-offline",
    },
}));
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        getCognitoJwtVerifier: jest.fn(() => ({
            verify: () => mockJwtVerify(),
        })),
    };
});

beforeEach(() => {
    ddbMock.reset();
});

const testSetUp = (setUpDB: {
    isUserSubDBSetup: "ok" | "fail" | "notfound";
}): void => {
    const userSubDdbMock = ddbMock.on(GetCommand, {
        TableName: userSubTableName,
        Key: {
            userSub: "userSub",
        },
    });

    if (setUpDB.isUserSubDBSetup === "ok") {
        userSubDdbMock.resolves(userSubTableItem);
    } else if (setUpDB.isUserSubDBSetup === "notfound") {
        userSubDdbMock.resolves({ Item: null });
    } else {
        userSubDdbMock.rejects(new Error());
    }
};

describe("正常系", () => {
    test("正常時、validを返す", async () => {
        testSetUp({ isUserSubDBSetup: "ok" });

        const response = await verifyToken({
            authHeader: "Bearer token",
            userId,
        });

        expect(response).toBe("valid");
    });
});

describe("異常系", () => {
    test("authHeaderがBearer tokenでない場合、invalidを返す", async () => {
        testSetUp({ isUserSubDBSetup: "ok" });

        const response = await verifyToken({
            authHeader: undefined,
            userId,
        });

        expect(response).toBe("invalid");
    });

    test("tokenが無効な場合、invalidを返す", async () => {
        mockJwtVerify = jest.fn().mockRejectedValue(new Error());
        testSetUp({ isUserSubDBSetup: "ok" });

        const response = await verifyToken({
            authHeader: "Bearer invalidtoken",
            userId,
        });

        expect(response).toBe("invalid");
    });

    test("userSubが存在しない場合、invalidを返す", async () => {
        testSetUp({ isUserSubDBSetup: "notfound" });

        const response = await verifyToken({
            authHeader: "Bearer token",
            userId: "@invalid_user",
        });

        expect(response).toBe("invalid");
    });

    test("userSub取得時、エラーが発生した場合、invalidを返す", async () => {
        testSetUp({ isUserSubDBSetup: "fail" });

        const response = await verifyToken({
            authHeader: "Bearer token",
            userId,
        });

        expect(response).toBe("invalid");
    });
});
