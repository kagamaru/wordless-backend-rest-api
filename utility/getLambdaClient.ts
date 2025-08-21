import { LambdaClient } from "@aws-sdk/client-lambda";
import { envConfig } from "@/config";

export const getLambdaClient = () => {
    return new LambdaClient({ region: envConfig.MY_AWS_REGION });
};
