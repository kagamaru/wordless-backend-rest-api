import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Uint8ArrayBlobAdapter } from "@aws-sdk/util-stream";
import { mockClient } from "aws-sdk-client-mock";
import { invokeTokenValidator } from "@/utility";

const mockLambdaClient = mockClient(LambdaClient);

jest.mock("@/config", () => ({
    envConfig: {
        TOKEN_VALIDATOR_LAMBDA_NAME: "test-lambda-name",
    },
}));

const testSetUp = (setUp: {
    isLambdaSetup: "valid" | "invalid" | "error";
}): void => {
    const lambdaMock = mockLambdaClient.on(InvokeCommand, {
        FunctionName: "test-lambda-name",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({
            authHeader: "test-auth-header",
            userId: "test-user-id",
        }),
    });

    if (setUp.isLambdaSetup === "valid") {
        lambdaMock.resolves({
            Payload: new Uint8ArrayBlobAdapter(
                new TextEncoder().encode("valid"),
            ),
        });
    } else if (setUp.isLambdaSetup === "invalid") {
        lambdaMock.resolves({
            Payload: new Uint8ArrayBlobAdapter(
                new TextEncoder().encode("invalid"),
            ),
        });
    } else if (setUp.isLambdaSetup === "error") {
        lambdaMock.rejects(new Error());
    }
};

describe("invokeTokenValidator", () => {
    test("Lambdaがvalidを返した時、validを返す", async () => {
        testSetUp({
            isLambdaSetup: "valid",
        });

        const result = await invokeTokenValidator(
            "test-auth-header",
            "test-user-id",
        );

        expect(result).toEqual("valid");
    });

    test("Lambdaがinvalidを返した時、invalidを返す", async () => {
        testSetUp({
            isLambdaSetup: "invalid",
        });

        const result = await invokeTokenValidator(
            "test-auth-header",
            "test-user-id",
        );

        expect(result).toEqual("invalid");
    });

    test("Lambdaがエラーを返した時、invalidを返す", async () => {
        testSetUp({
            isLambdaSetup: "error",
        });

        const result = await invokeTokenValidator(
            "test-auth-header",
            "test-user-id",
        );

        expect(result).toEqual("invalid");
    });
});
