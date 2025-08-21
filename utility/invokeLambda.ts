import { InvokeCommand } from "@aws-sdk/client-lambda";
import { getLambdaClient } from "@/utility";

export const invokeLambda = async <T>(
    functionName: string,
    payload: Record<string, any>,
): Promise<T | "lambdaInvokeError"> => {
    const lambdaClient = getLambdaClient();
    const invokeCommand = new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "RequestResponse",
        Payload: JSON.stringify(payload),
    });

    try {
        const lambdaResponse = await lambdaClient.send(invokeCommand);
        const lambdaResponseString = lambdaResponse.Payload.transformToString();

        if (lambdaResponseString === "lambdaError") {
            console.error("lambdaError");
            return "lambdaInvokeError";
        }

        const lambdaResponseJson = JSON.parse(lambdaResponseString) as T;
        return lambdaResponseJson;
    } catch (error) {
        console.error("lambdaInvokeError", error);
        return "lambdaInvokeError";
    }
};
