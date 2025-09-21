import { verifyTokenAndGetUserSub } from "@/app/auth/verifyTokenAndGetUserSub";

const userSub = "userSub";

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
    mockJwtVerify = jest.fn(() => ({
        sub: "userSub",
    }));
});

describe("正常系", () => {
    test("正常時、userSubとvalidを返す", async () => {
        const response = await verifyTokenAndGetUserSub({
            authHeader: "Bearer token",
        });

        expect(response).toEqual({
            userSub,
            isValid: "valid",
        });
    });
});

describe("異常系", () => {
    test("authHeaderがBearer tokenでない場合、invalidを返す", async () => {
        const response = await verifyTokenAndGetUserSub({
            authHeader: undefined,
        });

        expect(response).toBe("invalid");
    });

    test("tokenが無効な場合、invalidを返す", async () => {
        mockJwtVerify = jest.fn().mockRejectedValue(new Error());

        const response = await verifyTokenAndGetUserSub({
            authHeader: "Bearer invalidtoken",
        });

        expect(response).toBe("invalid");
    });
});
