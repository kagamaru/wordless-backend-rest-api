import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Uint8ArrayBlobAdapter } from "@aws-sdk/util-stream";
import { mockClient } from "aws-sdk-client-mock";
import { invokeTokenValidateAndGetUserSub } from "@/utility";

const mockLambdaClient = mockClient(LambdaClient);

jest.mock("@/config", () => ({
    envConfig: {
        TOKEN_VALIDATOR_AND_GET_USER_SUB_LAMBDA_NAME: "test-lambda-name",
    },
}));

const testSetUp = (setUp: {
    isLambdaSetup: "success" | "error" | "invalidJson";
}): void => {
    const lambdaMock = mockLambdaClient.on(InvokeCommand, {
        FunctionName: "test-lambda-name",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ authHeader: "test-auth-header" }),
    });

    const setLambdaResponse = (response: string): void => {
        lambdaMock.resolves({
            Payload: new Uint8ArrayBlobAdapter(
                new TextEncoder().encode(response),
            ),
        });
    };

    switch (setUp.isLambdaSetup) {
        case "success":
            setLambdaResponse(
                JSON.stringify({
                    userSub: "test-user-sub",
                }),
            );
            break;
        case "error":
            lambdaMock.rejects(new Error());
            break;
        case "invalidJson":
            setLambdaResponse("invalidJson");
            break;
    }
};

describe("invokeTokenValidateAndGetUserSub", () => {
    test("Lambdaがsuccessを返した時、successを返す", async () => {
        testSetUp({
            isLambdaSetup: "success",
        });

        const result =
            await invokeTokenValidateAndGetUserSub("test-auth-header");

        expect(result).toEqual({
            userSub: "test-user-sub",
            isValid: "valid",
        });
    });

    test("Lambdaがエラーを返した時、invalidを返す", async () => {
        testSetUp({
            isLambdaSetup: "error",
        });

        const result =
            await invokeTokenValidateAndGetUserSub("test-auth-header");

        expect(result).toEqual({
            userSub: "",
            isValid: "invalid",
        });
    });

    test("Lambdaがjsonではない形式のレスポンスを返した時、invalidを返す", async () => {
        testSetUp({
            isLambdaSetup: "invalidJson",
        });

        const result =
            await invokeTokenValidateAndGetUserSub("test-auth-header");

        expect(result).toEqual({
            userSub: "",
            isValid: "invalid",
        });
    });
});
