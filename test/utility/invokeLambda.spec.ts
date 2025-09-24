import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Uint8ArrayBlobAdapter } from "@aws-sdk/util-stream";
import { mockClient } from "aws-sdk-client-mock";
import { invokeLambda } from "@/utility";

const mockLambdaClient = mockClient(LambdaClient);

const testSetUp = (setUp: {
    isLambdaSetup: "success" | "jsonResponse" | "lambdaError" | "invalidJson";
}): void => {
    const lambdaMock = mockLambdaClient.on(InvokeCommand, {
        FunctionName: "test-lambda",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({}),
    });

    if (setUp.isLambdaSetup === "success") {
        lambdaMock.resolves({
            Payload: new Uint8ArrayBlobAdapter(
                new TextEncoder().encode("success"),
            ),
        });
    } else if (setUp.isLambdaSetup === "jsonResponse") {
        lambdaMock.resolves({
            Payload: new Uint8ArrayBlobAdapter(
                new TextEncoder().encode(
                    JSON.stringify({
                        message: "jsonResponse",
                    }),
                ),
            ),
        });
    } else if (setUp.isLambdaSetup === "lambdaError") {
        lambdaMock.resolves({
            Payload: new Uint8ArrayBlobAdapter(
                new TextEncoder().encode("lambdaError"),
            ),
        });
    } else if (setUp.isLambdaSetup === "invalidJson") {
        lambdaMock.resolves({
            Payload: new Uint8ArrayBlobAdapter(
                new TextEncoder().encode("invalidJson"),
            ),
        });
    }
};

beforeEach(() => {
    testSetUp({
        isLambdaSetup: "success",
    });
});

describe("invokeLambda", () => {
    test("Lambdaがsuccessを返した時、successを返す", async () => {
        testSetUp({
            isLambdaSetup: "success",
        });

        const result = await invokeLambda("test-lambda", {});
        expect(result).toBe("success");
    });

    test("Lambdaがjson形式のレスポンスを返した時、json形式で返す", async () => {
        testSetUp({
            isLambdaSetup: "jsonResponse",
        });

        const result = await invokeLambda("test-lambda", {});
        expect(result).toEqual({ message: "jsonResponse" });
    });

    test("Lambdaがエラーを返した時、lambdaInvokeErrorを返す", async () => {
        testSetUp({
            isLambdaSetup: "lambdaError",
        });

        const result = await invokeLambda("test-lambda", {});
        expect(result).toBe("lambdaInvokeError");
    });

    test("Lambdaがjsonではない形式のレスポンスを返した時、lambdaInvokeErrorを返す", async () => {
        testSetUp({
            isLambdaSetup: "invalidJson",
        });

        const result = await invokeLambda("test-lambda", {});
        expect(result).toBe("lambdaInvokeError");
    });
});
