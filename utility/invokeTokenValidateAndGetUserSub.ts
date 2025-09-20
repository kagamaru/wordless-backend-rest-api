import { InvokeCommand } from "@aws-sdk/client-lambda";
import { Uint8ArrayBlobAdapter } from "@aws-sdk/util-stream";
import { envConfig } from "@/config";
import { getLambdaClient } from "@/utility";
import { UserSubAndVerifyResult } from "@/@types";

export const invokeTokenValidateAndGetUserSub = async (
    authHeader: string,
    userId: string,
): Promise<UserSubAndVerifyResult> => {
    const lambdaClient = getLambdaClient();
    const invokeCommand = new InvokeCommand({
        FunctionName: envConfig.TOKEN_VALIDATOR_AND_GET_USER_SUB_LAMBDA_NAME,
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({ authHeader, userId }),
    });

    let payload: Uint8ArrayBlobAdapter;
    try {
        payload = (await lambdaClient.send(invokeCommand)).Payload;
    } catch (error) {
        console.error(error);
        return {
            userSub: "",
            isValid: "invalid",
        };
    }

    try {
        const result = JSON.parse(payload.transformToString());
        return result;
    } catch (error) {
        console.error(error);
        return {
            userSub: "",
            isValid: "invalid",
        };
    }
};
