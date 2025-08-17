import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { Uint8ArrayBlobAdapter } from "@aws-sdk/util-stream";
import { envConfig } from "@/config";

export const invokeTokenValidator = async (
    authHeader: string,
    userId: string,
): Promise<"valid" | "invalid"> => {
    const lambdaClient = new LambdaClient({
        region: "us-west-2",
    });
    const invokeCommand = new InvokeCommand({
        FunctionName: envConfig.TOKEN_VALIDATOR_LAMBDA_NAME,
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ authHeader, userId }),
    });

    let payload: Uint8ArrayBlobAdapter;
    try {
        payload = (await lambdaClient.send(invokeCommand)).Payload;
    } catch (error) {
        return "invalid";
    }

    const result = JSON.parse(payload.transformToString()); // NOTE: invalid or valid
    return result;
};
